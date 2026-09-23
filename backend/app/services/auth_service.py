import logging
from datetime import datetime, timedelta, timezone
from typing import Optional, Tuple
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update, and_
from backend.app.config import settings
from backend.app.models import User, SessionModel, OTP, AuditLog, WorkspaceConfig, utc_now
from backend.app.schemas.auth import SessionData
from backend.app.services.security import (
    hash_password,
    verify_password,
    generate_bearer_token,
    hash_token,
    generate_numeric_otp,
    hash_otp,
    verify_otp_hash,
)
from backend.app.services.email_service import dispatch_verification_email

logger = logging.getLogger("eris.auth")

class AuthService:
    @staticmethod
    async def signup_user(
        db: AsyncSession, email: str, password: str, name: Optional[str] = None
    ) -> Tuple[bool, str]:
        email_clean = email.strip().lower()
        stmt = select(User).where(User.email == email_clean)
        result = await db.execute(stmt)
        existing_user = result.scalar_one_or_none()

        pw_hash = hash_password(password)

        if existing_user:
            if existing_user.is_verified:
                return False, "An account with this email address is already registered. Please sign in."
            # Unverified account: refresh password & re-issue OTP
            existing_user.password_hash = pw_hash
            if name:
                existing_user.display_name = name.strip()
            await db.commit()
        else:
            new_user = User(
                email=email_clean,
                password_hash=pw_hash,
                display_name=name.strip() if name else email_clean.split("@")[0],
                is_verified=False,
                role="owner"
            )
            db.add(new_user)
            await db.commit()

        # Issue initial OTP verification code
        ok, msg, _ = await AuthService.request_otp(db, email_clean)
        if not ok:
            return False, msg
        return True, "Verification code sent to your email."

    @staticmethod
    async def request_otp(db: AsyncSession, email: str) -> Tuple[bool, str, str]:
        email_clean = email.strip().lower()

        # Invalidate previous unconsumed OTPs for this email
        await db.execute(
            update(OTP)
            .where(and_(OTP.email == email_clean, OTP.consumed == False))
            .values(consumed=True)
        )

        code = generate_numeric_otp(6)
        code_h = hash_otp(code)
        expires = utc_now() + timedelta(minutes=settings.OTP_EXPIRE_MINUTES)

        otp_record = OTP(
            email=email_clean,
            code_hash=code_h,
            attempts=0,
            consumed=False,
            expires_at=expires
        )
        db.add(otp_record)
        await db.commit()

        # Dispatch verification email via configured SMTP (and log for visibility)
        logger.info(f"🔑 [AUTH OTP DISPATCH] Code for {email_clean}: {code} (Valid for {settings.OTP_EXPIRE_MINUTES}m)")
        print(f"\n=======================================================\n[ERIS AUTH OTP] Code for {email_clean}: {code}\n=======================================================\n")
        
        # Async SMTP send to actual inbox
        sent = await dispatch_verification_email(email_clean, code)
        if not sent:
            logger.warning(f"SMTP dispatch failed for {email_clean}.")
            return False, "Failed to send verification email. Please check SMTP settings or network.", ""

        return True, "A fresh verification code has been dispatched.", code

    @staticmethod
    async def verify_otp(
        db: AsyncSession,
        email: str,
        code: str,
        name: Optional[str] = None,
        ip: Optional[str] = None,
        ua: Optional[str] = None
    ) -> Tuple[bool, str, Optional[SessionData]]:
        email_clean = email.strip().lower()
        now = utc_now()

        # Find latest unconsumed OTP
        stmt = (
            select(OTP)
            .where(and_(OTP.email == email_clean, OTP.consumed == False, OTP.expires_at > now))
            .order_by(OTP.created_at.desc())
        )
        result = await db.execute(stmt)
        otp_record = result.scalars().first()

        if not otp_record:
            return False, "Verification code has expired or was not requested. Please request a new code.", None

        if otp_record.attempts >= settings.MAX_OTP_ATTEMPTS:
            otp_record.consumed = True
            await db.commit()
            return False, "Too many failed attempts. This code has been locked. Please request a fresh code.", None

        # Verify code constant-time
        if not verify_otp_hash(code, otp_record.code_hash):
            otp_record.attempts += 1
            await db.commit()
            remaining = settings.MAX_OTP_ATTEMPTS - otp_record.attempts
            return False, f"Invalid verification code. ({remaining} attempts remaining)", None

        # Success: consume OTP and verify user
        otp_record.consumed = True

        user_stmt = select(User).where(User.email == email_clean)
        user_res = await db.execute(user_stmt)
        user = user_res.scalar_one_or_none()

        if not user:
            user = User(
                email=email_clean,
                password_hash=hash_password(secrets.token_urlsafe(16)), # Nominal password if OTP-only
                display_name=name.strip() if name else email_clean.split("@")[0],
                is_verified=True,
                role="owner"
            )
            db.add(user)
            await db.flush()
        else:
            user.is_verified = True
            if name:
                user.display_name = name.strip()

        # Create session
        raw_token = generate_bearer_token()
        token_h = hash_token(raw_token)
        sess_expires = utc_now() + timedelta(days=settings.SESSION_EXPIRE_DAYS)

        session_record = SessionModel(
            user_id=user.id,
            token_hash=token_h,
            ip_address=ip,
            user_agent=ua,
            expires_at=sess_expires,
            is_revoked=False
        )
        db.add(session_record)

        # Audit log
        db.add(AuditLog(
            user_id=user.id,
            event_type="auth.otp_verified",
            ip_address=ip,
            payload=f"OTP verified for {email_clean}"
        ))

        await db.commit()

        return True, "Email verified successfully.", SessionData(
            email=user.email,
            token=raw_token,
            expires_at=int(sess_expires.timestamp()),
            user_display_name=user.display_name,
            username=user.username,
            avatar_url=user.avatar_url
        )

    @staticmethod
    async def login_user(
        db: AsyncSession,
        email: str,
        password: str,
        ip: Optional[str] = None,
        ua: Optional[str] = None
    ) -> Tuple[bool, str, Optional[SessionData]]:
        email_clean = email.strip().lower()
        stmt = select(User).where(User.email == email_clean)
        result = await db.execute(stmt)
        user = result.scalar_one_or_none()

        if not user or not verify_password(password, user.password_hash):
            return False, "Invalid email or password.", None

        if not user.is_verified:
            # Re-dispatch OTP to allow user to complete registration
            await AuthService.request_otp(db, email_clean)
            return False, "Account email is not verified yet. A fresh verification code has been dispatched.", None

        # Issue active session
        raw_token = generate_bearer_token()
        token_h = hash_token(raw_token)
        sess_expires = utc_now() + timedelta(days=settings.SESSION_EXPIRE_DAYS)

        session_record = SessionModel(
            user_id=user.id,
            token_hash=token_h,
            ip_address=ip,
            user_agent=ua,
            expires_at=sess_expires,
            is_revoked=False
        )
        db.add(session_record)

        db.add(AuditLog(
            user_id=user.id,
            event_type="auth.login",
            ip_address=ip,
            payload=f"User login from {ip or 'local'}"
        ))

        await db.commit()

        return True, "Signed in successfully.", SessionData(
            email=user.email,
            token=raw_token,
            expires_at=int(sess_expires.timestamp()),
            user_display_name=user.display_name,
            username=user.username,
            avatar_url=user.avatar_url
        )

    @staticmethod
    async def logout_user(db: AsyncSession, raw_token: str) -> bool:
        if not raw_token:
            return True
        token_h = hash_token(raw_token)
        await db.execute(
            update(SessionModel)
            .where(SessionModel.token_hash == token_h)
            .values(is_revoked=True)
        )
        await db.commit()
        return True

    @staticmethod
    async def validate_session(
        db: AsyncSession, raw_token: str
    ) -> Optional[User]:
        if not raw_token:
            return None
        token_h = hash_token(raw_token)
        now = utc_now()

        stmt = (
            select(User)
            .join(SessionModel, SessionModel.user_id == User.id)
            .where(
                and_(
                    SessionModel.token_hash == token_h,
                    SessionModel.is_revoked == False,
                    SessionModel.expires_at > now
                )
            )
        )
        result = await db.execute(stmt)
        user = result.scalar_one_or_none()
        return user

    @staticmethod
    async def ensure_local_user_session(
        db: AsyncSession,
        email: Optional[str] = None,
        display_name: Optional[str] = None,
        username: Optional[str] = None,
        avatar_url: Optional[str] = None
    ) -> Tuple[User, str]:
        """Ensures a user and active session exist in the database, auto-creating if needed."""
        target_email = (email or "user@eris.local").strip().lower()
        stmt = select(User).where(User.email == target_email)
        res = await db.execute(stmt)
        user = res.scalar_one_or_none()

        if not user:
            # Check if ANY user exists in database
            stmt_any = select(User).order_by(User.created_at.asc())
            res_any = await db.execute(stmt_any)
            user = res_any.scalars().first()

        if not user:
            # Create primary workstation owner user
            import secrets
            clean_uname = (username or target_email.split("@")[0]).lower().replace(" ", "_")
            user = User(
                email=target_email,
                password_hash=hash_password(secrets.token_urlsafe(16)),
                display_name=display_name or target_email.split("@")[0].capitalize(),
                username=clean_uname,
                avatar_url=avatar_url,
                is_verified=True,
                role="owner"
            )
            db.add(user)
            await db.commit()
            await db.refresh(user)
        else:
            # Update fields if provided
            updated = False
            if display_name and not user.display_name:
                user.display_name = display_name
                updated = True
            if username and not user.username:
                user.username = username
                updated = True
            if avatar_url and not user.avatar_url:
                user.avatar_url = avatar_url
                updated = True
            if updated:
                await db.commit()
                await db.refresh(user)

        # Create or find active session
        now = utc_now()
        sess_stmt = (
            select(SessionModel)
            .where(and_(SessionModel.user_id == user.id, SessionModel.is_revoked == False, SessionModel.expires_at > now))
            .order_by(SessionModel.created_at.desc())
        )
        sess_res = await db.execute(sess_stmt)
        active_sess = sess_res.scalars().first()

        raw_token = generate_bearer_token()
        token_h = hash_token(raw_token)
        sess_expires = now + timedelta(days=settings.SESSION_EXPIRE_DAYS)

        new_sess = SessionModel(
            user_id=user.id,
            token_hash=token_h,
            ip_address="127.0.0.1",
            user_agent="ERIS Workstation Client",
            expires_at=sess_expires,
            is_revoked=False
        )
        db.add(new_sess)
        await db.commit()
        return user, raw_token

    @staticmethod
    async def reset_password(
        db: AsyncSession, email: str, code: str, new_password: str
    ) -> Tuple[bool, str]:
        email_clean = email.strip().lower()
        now = utc_now()

        stmt = (
            select(OTP)
            .where(and_(OTP.email == email_clean, OTP.consumed == False, OTP.expires_at > now))
            .order_by(OTP.created_at.desc())
        )
        result = await db.execute(stmt)
        otp_record = result.scalars().first()

        if not otp_record or not verify_otp_hash(code, otp_record.code_hash):
            return False, "Invalid or expired verification code."

        otp_record.consumed = True

        user_stmt = select(User).where(User.email == email_clean)
        user_res = await db.execute(user_stmt)
        user = user_res.scalar_one_or_none()

        if not user:
            return False, "User account not found."

        user.password_hash = hash_password(new_password)

        # Security policy: revoke all existing sessions on password change
        await db.execute(
            update(SessionModel)
            .where(SessionModel.user_id == user.id)
            .values(is_revoked=True)
        )

        await db.commit()
        return True, "Password reset successfully. You may now sign in."

    @staticmethod
    async def oauth_login_or_register(
        db: AsyncSession,
        email: str,
        display_name: str,
        avatar_url: Optional[str] = None,
        provider: str = "oauth",
        ip: str = "127.0.0.1",
        ua: str = "ERIS-Desktop"
    ) -> SessionData:
        import secrets
        import json
        email_clean = email.strip().lower()
        stmt = select(User).where(User.email == email_clean)
        res = await db.execute(stmt)
        user = res.scalar_one_or_none()

        if not user:
            clean_uname = (display_name.lower().replace(" ", "_") if display_name else email_clean.split("@")[0].lower().replace(".", "_"))
            user = User(
                email=email_clean,
                password_hash=hash_password(secrets.token_urlsafe(32)),
                display_name=display_name.strip() if display_name else email_clean.split("@")[0],
                username=clean_uname,
                avatar_url=avatar_url,
                is_verified=True,
                role="owner"
            )
            db.add(user)
            await db.flush()
        else:
            user.is_verified = True
            if not user.username:
                user.username = (display_name.lower().replace(" ", "_") if display_name else email_clean.split("@")[0].lower().replace(".", "_"))
            if not user.avatar_url and avatar_url:
                user.avatar_url = avatar_url
            if not user.display_name and display_name:
                user.display_name = display_name

        raw_token = generate_bearer_token()
        token_h = hash_token(raw_token)
        sess_expires = utc_now() + timedelta(days=settings.SESSION_EXPIRE_DAYS)

        session_record = SessionModel(
            user_id=user.id,
            token_hash=token_h,
            ip_address=ip,
            user_agent=ua,
            expires_at=sess_expires,
            is_revoked=False
        )
        db.add(session_record)

        db.add(AuditLog(
            user_id=user.id,
            event_type=f"auth.{provider}_login",
            ip_address=ip,
            payload=f"OAuth login via {provider} for {email_clean}"
        ))

        await db.commit()

        # Update local profile
        try:
            mem_file = settings.MEMORY_DIR / "user_profile.json"
            settings.MEMORY_DIR.mkdir(parents=True, exist_ok=True)
            profile_data = {
                "display_name": user.display_name or email_clean.split("@")[0],
                "email": user.email,
                "avatar_url": user.avatar_url,
                "provider": provider,
                "updated_at": utc_now().isoformat()
            }
            with open(mem_file, "w", encoding="utf-8") as f:
                json.dump(profile_data, f, indent=2)

            from backend.app.services.user_db_service import UserDatabaseService
            UserDatabaseService.save_user_profile(str(user.id), {
                "user_id": str(user.id),
                "email": user.email,
                "display_name": user.display_name,
                "username": getattr(user, "username", None) or user.email.split("@")[0],
                "avatar_url": user.avatar_url,
            })
        except Exception:
            pass

        return SessionData(
            email=user.email,
            user_id=user.id,
            role=user.role,
            token=raw_token,
            user_display_name=user.display_name,
            username=getattr(user, "username", None) or user.email.split("@")[0],
            avatar_url=user.avatar_url,
            is_verified=user.is_verified,
            expires_at=int(sess_expires.timestamp())
        )
