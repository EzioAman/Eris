from fastapi import APIRouter, Depends, HTTPException, Request, Header
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import Optional, Dict, Any
import logging
import json
import base64

from backend.app.database import get_db
from backend.app.models import User
from backend.app.schemas.auth import (
    SignUpRequest,
    LoginRequest,
    RequestOtpRequest,
    VerifyOtpRequest,
    ForgotPasswordRequest,
    ResetPasswordRequest,
    LogoutRequest,
    SessionVerificationRequest,
    AuthResponse
)
from backend.app.schemas.user_profile import UserMemoryProfile, UserProfileResponse
from backend.app.services.auth_service import AuthService

router = APIRouter(prefix="/api/auth", tags=["Authentication"])
logger = logging.getLogger("eris.auth")

def get_client_metadata(request: Request):
    ip = request.client.host if request.client else "unknown"
    ua = request.headers.get("User-Agent", "unknown")
    return ip, ua

@router.post("/signup", response_model=AuthResponse)
async def signup(payload: SignUpRequest, db: AsyncSession = Depends(get_db)):
    ok, msg = await AuthService.signup_user(
        db, email=payload.email, password=payload.password, name=payload.name
    )
    if not ok:
        raise HTTPException(status_code=400, detail=msg)
    return AuthResponse(ok=True, message=msg)

@router.post("/login", response_model=AuthResponse)
async def login(payload: LoginRequest, request: Request, db: AsyncSession = Depends(get_db)):
    ip, ua = get_client_metadata(request)
    ok, msg, session_data = await AuthService.login_user(
        db, email=payload.email, password=payload.password, ip=ip, ua=ua
    )
    if not ok:
        raise HTTPException(status_code=401, detail=msg)
    return AuthResponse(ok=True, message=msg, session=session_data)

@router.post("/request-otp", response_model=AuthResponse)
async def request_otp(payload: RequestOtpRequest, db: AsyncSession = Depends(get_db)):
    ok, msg, _ = await AuthService.request_otp(db, email=payload.email)
    if not ok:
        raise HTTPException(status_code=500, detail=msg)
    return AuthResponse(ok=True, message=msg)

@router.post("/verify-otp", response_model=AuthResponse)
async def verify_otp(payload: VerifyOtpRequest, request: Request, db: AsyncSession = Depends(get_db)):
    ip, ua = get_client_metadata(request)
    ok, msg, session_data = await AuthService.verify_otp(
        db, email=payload.email, code=payload.code, name=payload.name, ip=ip, ua=ua
    )
    if not ok:
        raise HTTPException(status_code=400, detail=msg)
    return AuthResponse(ok=True, message=msg, session=session_data)

@router.post("/forgot-password", response_model=AuthResponse)
async def forgot_password(payload: ForgotPasswordRequest, db: AsyncSession = Depends(get_db)):
    email_clean = payload.email.strip().lower()
    stmt = select(User).where(User.email == email_clean)
    res = await db.execute(stmt)
    user = res.scalar_one_or_none()

    if not user:
        raise HTTPException(
            status_code=404,
            detail="No registered account found with this email address."
        )

    ok, msg, _ = await AuthService.request_otp(db, email=email_clean)
    hint = " (Note: your account email is not yet verified.)" if not user.is_verified else ""
    return AuthResponse(ok=ok, message=f"A 6-digit verification code has been dispatched to your email.{hint}")

@router.post("/reset-password", response_model=AuthResponse)
async def reset_password(payload: ResetPasswordRequest, db: AsyncSession = Depends(get_db)):
    ok, msg = await AuthService.reset_password(
        db, email=payload.email, code=payload.code, new_password=payload.password
    )
    if not ok:
        raise HTTPException(status_code=400, detail=msg)
    return AuthResponse(ok=True, message=msg)

@router.post("/logout", response_model=AuthResponse)
async def logout(
    payload: Optional[LogoutRequest] = None,
    authorization: Optional[str] = Header(None),
    db: AsyncSession = Depends(get_db)
):
    token = None
    if payload and payload.token:
        token = payload.token
    elif authorization and authorization.startswith("Bearer "):
        token = authorization.split("Bearer ", 1)[1].strip()

    if token:
        await AuthService.logout_user(db, token)
    return AuthResponse(ok=True, message="Logged out successfully.")

@router.post("/session")
async def verify_session(payload: SessionVerificationRequest, db: AsyncSession = Depends(get_db)):
    user = await AuthService.validate_session(db, payload.token)
    if not user:
        return {
            "authenticated": False,
            "configured": False,
            "session": None,
            "user_display_name": None,
            "username": None,
            "avatar_url": None,
            "profile": None
        }

    from backend.app.services.user_db_service import UserDatabaseService
    per_user_profile = (
        UserDatabaseService.get_user_profile(user.id)
        or (UserDatabaseService.get_user_profile(user.username) if user.username else None)
        or UserDatabaseService.get_user_profile(user.email)
    )

    profile_data = per_user_profile
    if not profile_data:
        try:
            from backend.app.config import settings
            mem_file = settings.MEMORY_DIR / "memory.json"
            if mem_file.exists():
                with open(mem_file, "r", encoding="utf-8") as f:
                    mem = json.load(f)
                    profile_data = mem.get("user_profile")
        except Exception:
            pass

    resolved_username = user.username or (profile_data.get("username") if profile_data else None) or user.email.split("@")[0].lower()
    resolved_display_name = user.display_name or (profile_data.get("display_name") if profile_data else None) or user.email.split("@")[0]
    resolved_avatar = user.avatar_url or (profile_data.get("avatar_url") if profile_data else None)

    return {
        "authenticated": True,
        "configured": True,
        "session": {
            "email": user.email,
            "token": payload.token,
            "user_display_name": resolved_display_name,
            "username": resolved_username,
            "avatar_url": resolved_avatar,
            "profile": profile_data
        },
        "user_display_name": resolved_display_name,
        "username": resolved_username,
        "avatar_url": resolved_avatar,
        "profile": profile_data
    }


@router.get("/profile")
async def get_user_profile(
    authorization: Optional[str] = Header(None),
    db: AsyncSession = Depends(get_db)
):
    from backend.app.services.user_db_service import UserDatabaseService
    token = None
    if authorization and authorization.startswith("Bearer "):
        token = authorization.split("Bearer ", 1)[1].strip()

    user = None
    if token:
        user = await AuthService.validate_session(db, token)

    if user:
        per_user_profile = (
            UserDatabaseService.get_user_profile(user.id)
            or (UserDatabaseService.get_user_profile(user.email) if user.email else None)
            or (UserDatabaseService.get_user_profile(user.username) if user.username else None)
        )
        if per_user_profile:
            return {"ok": True, "profile": per_user_profile}

        db_profile = {
            "display_name": user.display_name or (user.email.split("@")[0] if user.email else "User"),
            "username": user.username or (user.email.split("@")[0].lower() if user.email else "user"),
            "email": user.email,
            "avatar_url": user.avatar_url,
            "headline": user.preferences.get("headline", "") if user.preferences else "",
            "bio": user.preferences.get("bio", "") if user.preferences else "",
            "website": user.preferences.get("website", "") if user.preferences else "",
            "timezone": user.preferences.get("timezone", "Asia/Kolkata") if user.preferences else "Asia/Kolkata",
            "visibility": user.preferences.get("visibility", "members") if user.preferences else "members",
            "accent": user.preferences.get("accent", "indigo") if user.preferences else "indigo",
            "notify_product": user.preferences.get("notify_product", True) if user.preferences else True,
            "notify_mentions": user.preferences.get("notify_mentions", True) if user.preferences else True,
            "notify_digest": user.preferences.get("notify_digest", False) if user.preferences else False,
        }
        return {"ok": True, "profile": db_profile}

    if token:
        per_user_profile = UserDatabaseService.get_user_profile(token)
        if per_user_profile:
            return {"ok": True, "profile": per_user_profile}

    # Only return default_user if completely unauthenticated
    default_prof = UserDatabaseService.get_user_profile("default_user")
    if default_prof:
        return {"ok": True, "profile": default_prof}

    return {"ok": False, "profile": None}


@router.post("/profile")
async def update_user_profile(
    payload: UserMemoryProfile,
    authorization: Optional[str] = Header(None),
    db: AsyncSession = Depends(get_db)
):
    from backend.app.config import settings
    from backend.app.services.user_db_service import UserDatabaseService

    token = None
    if authorization and authorization.startswith("Bearer "):
        token = authorization.split("Bearer ", 1)[1].strip()

    user = None
    if token:
        user = await AuthService.validate_session(db, token)

    resolved_email = (payload.email.strip().lower()) if (payload.email and payload.email.strip()) else f"{payload.username.strip().lower()}@local.workstation"

    if not user and resolved_email:
        stmt = select(User).where((User.email == resolved_email) | (User.username == payload.username.strip().lower()))
        res = await db.execute(stmt)
        user = res.scalar_one_or_none()

    if not user:
        user, _ = await AuthService.ensure_local_user_session(
            db,
            email=resolved_email,
            display_name=payload.display_name,
            username=payload.username,
            avatar_url=payload.avatar_url
        )

    user.display_name = payload.display_name
    user.username = payload.username
    user.avatar_url = payload.avatar_url
    user.preferences = {
        "headline": payload.headline,
        "bio": payload.bio,
        "website": payload.website,
        "timezone": payload.timezone,
        "accent": payload.accent,
        "visibility": payload.visibility,
        "tags": payload.tags or [],
        "notify_product": payload.notify_product,
        "notify_mentions": payload.notify_mentions,
        "notify_digest": payload.notify_digest,
    }
    await db.commit()
    await db.refresh(user)

    profile_dict = payload.model_dump()
    user_key = user.id if user else (payload.email or payload.username or "default_user")
    saved_record = UserDatabaseService.save_user_profile(user_key, profile_dict)
    if user:
        if user.email and user.email != user_key:
            UserDatabaseService.save_user_profile(user.email, profile_dict)
        if user.username and user.username != user_key:
            UserDatabaseService.save_user_profile(user.username, profile_dict)
    elif not user and (payload.email or payload.username):
        if payload.email:
            UserDatabaseService.save_user_profile(payload.email, profile_dict)
    else:
        UserDatabaseService.save_user_profile("default_user", profile_dict)

    try:
        from backend.app.services.user_db_service import sanitize_user_id
        safe_uid = sanitize_user_id(user_key)
        user_mem_dir = settings.MEMORY_DIR / "users" / safe_uid
        user_mem_dir.mkdir(parents=True, exist_ok=True)
        user_mem_file = user_mem_dir / "memory.json"
        
        mem = {}
        if user_mem_file.exists():
            with open(user_mem_file, "r", encoding="utf-8") as f:
                mem = json.load(f)

        mem["user_profile"] = profile_dict
        mem["current_user"] = f"{payload.display_name} (@{payload.username})"
        with open(user_mem_file, "w", encoding="utf-8") as f:
            json.dump(mem, f, indent=4)
    except Exception:
        pass

    try:
        from backend.app.api.chat import get_agent_engine
        engine = get_agent_engine()
        if engine:
            engine.memory["user_profile"] = profile_dict
            engine.memory["current_user"] = f"{payload.display_name} (@{payload.username})"
            engine.save_memory()
    except Exception:
        pass

    return {
        "ok": True,
        "message": f"Profile for {payload.display_name} saved and synced to dedicated user database.",
        "profile": saved_record
    }


@router.get("/settings")
async def get_user_custom_settings(
    authorization: Optional[str] = Header(None),
    db: AsyncSession = Depends(get_db)
):
    from backend.app.services.user_db_service import UserDatabaseService
    token = None
    if authorization and authorization.startswith("Bearer "):
        token = authorization.split("Bearer ", 1)[1].strip()

    user = None
    if token:
        user = await AuthService.validate_session(db, token)

    user_key = user.id if user else "default_user"
    settings_dict = UserDatabaseService.get_custom_settings(user_key)
    return {"ok": True, "settings": settings_dict}


@router.post("/settings")
async def save_user_custom_settings(
    payload: Dict[str, Any],
    authorization: Optional[str] = Header(None),
    db: AsyncSession = Depends(get_db)
):
    from backend.app.services.user_db_service import UserDatabaseService
    token = None
    if authorization and authorization.startswith("Bearer "):
        token = authorization.split("Bearer ", 1)[1].strip()

    user = None
    if token:
        user = await AuthService.validate_session(db, token)

    user_key = user.id if user else "default_user"
    for k, v in payload.items():
        UserDatabaseService.save_custom_setting(user_key, k, v)
        UserDatabaseService.save_custom_setting("default_user", k, v)

    updated = UserDatabaseService.get_custom_settings(user_key)
    return {"ok": True, "settings": updated}


# ═══ OAuth 2.0 Native Desktop Endpoints (RFC 8628 & RFC 8252) ═══

class GitHubDeviceCodeResponse(BaseModel):
    ok: bool
    user_code: str = ""
    device_code: str = ""
    verification_uri: str = "https://github.com/login/device"
    expires_in: int = 900
    interval: int = 5
    message: Optional[str] = None

class GitHubPollRequest(BaseModel):
    device_code: str

class OAuthDirectLoginRequest(BaseModel):
    provider: str
    email: str
    name: Optional[str] = None
    avatar_url: Optional[str] = None
    oauth_id: Optional[str] = None

class GoogleAuthRequest(BaseModel):
    credential: Optional[str] = None
    email: Optional[str] = None
    name: Optional[str] = None
    avatar_url: Optional[str] = None

class DesktopGoogleLoginPayload(BaseModel):
    tokens: Optional[dict] = None
    profile: Optional[dict] = None
    email: Optional[str] = None
    name: Optional[str] = None
    avatar_url: Optional[str] = None
    credential: Optional[str] = None

DEFAULT_GITHUB_CLIENT_ID = "Ov23li3i6Ew6oNl0bWwO"

@router.post("/google", response_model=AuthResponse)
@router.post("/oauth/google", response_model=AuthResponse)
async def desktop_google_login(
    payload: DesktopGoogleLoginPayload,
    request: Request,
    db: AsyncSession = Depends(get_db)
):
    """
    Handles Google OAuth completion from Electron Desktop PKCE loopback flow.
    Accepts { tokens, profile } payload or direct credential fields.
    """
    ip, ua = get_client_metadata(request)

    email = None
    display_name = None
    avatar_url = None

    if payload.profile and isinstance(payload.profile, dict):
        email = payload.profile.get("email")
        display_name = payload.profile.get("name") or payload.profile.get("given_name")
        avatar_url = payload.profile.get("picture")

    if not email:
        email = payload.email

    if not display_name:
        display_name = payload.name

    if not avatar_url:
        avatar_url = payload.avatar_url

    if not email and payload.tokens and isinstance(payload.tokens, dict):
        id_token = payload.tokens.get("id_token")
        if id_token:
            try:
                parts = id_token.split(".")
                if len(parts) >= 2:
                    padded = parts[1] + "=" * ((4 - len(parts[1]) % 4) % 4)
                    decoded = base64.urlsafe_b64decode(padded)
                    claims = json.loads(decoded)
                    email = claims.get("email")
                    display_name = display_name or claims.get("name")
                    avatar_url = avatar_url or claims.get("picture")
            except Exception as e:
                logger.warning(f"Failed to decode Google id_token claims: {e}")

    if not email or "@" not in email:
        raise HTTPException(
            status_code=400,
            detail="Could not extract a verified email from Google authentication."
        )

    clean_email = email.strip().lower()
    resolved_name = display_name.strip() if display_name else clean_email.split("@")[0]
    resolved_avatar = avatar_url or "https://lh3.googleusercontent.com/a/default-user"

    session_data = await AuthService.oauth_login_or_register(
        db=db,
        email=clean_email,
        display_name=resolved_name,
        avatar_url=resolved_avatar,
        provider="google",
        ip=ip,
        ua=ua
    )

    return AuthResponse(
        ok=True,
        message="Successfully authenticated with Google.",
        session=session_data
    )

@router.post("/oauth/github/device-code", response_model=GitHubDeviceCodeResponse)
async def github_device_code():
    import httpx
    try:
        async with httpx.AsyncClient(timeout=6.0) as client:
            resp = await client.post(
                "https://github.com/login/device/code",
                data={
                    "client_id": DEFAULT_GITHUB_CLIENT_ID,
                    "scope": "read:user user:email",
                },
                headers={"Accept": "application/json"},
            )
            if resp.status_code == 200:
                data = resp.json()
                return GitHubDeviceCodeResponse(
                    ok=True,
                    user_code=data.get("user_code", ""),
                    device_code=data.get("device_code", ""),
                    verification_uri=data.get("verification_uri", "https://github.com/login/device"),
                    expires_in=data.get("expires_in", 900),
                    interval=data.get("interval", 5),
                )
    except Exception as e:
        logger.warning(f"GitHub Device Code network request failed: {e}")

    return GitHubDeviceCodeResponse(
        ok=False,
        user_code="",
        device_code="",
        verification_uri="https://github.com/login/device",
        message="Unable to connect to GitHub authorization service. Please verify your internet connection."
    )


@router.post("/oauth/github/poll")
async def github_device_poll(
    payload: GitHubPollRequest,
    request: Request,
    db: AsyncSession = Depends(get_db)
):
    import httpx
    ip, ua = get_client_metadata(request)
    device_code = payload.device_code.strip()

    if not device_code or device_code.startswith("dev_"):
        return {"ok": False, "status": "error", "message": "Invalid device code. Please re-initiate GitHub authorization."}

    try:
        async with httpx.AsyncClient(timeout=6.0) as client:
            token_resp = await client.post(
                "https://github.com/login/oauth/access_token",
                data={
                    "client_id": DEFAULT_GITHUB_CLIENT_ID,
                    "device_code": device_code,
                    "grant_type": "urn:ietf:params:oauth:grant-type:device_code",
                },
                headers={"Accept": "application/json"},
            )
            if token_resp.status_code == 200:
                token_data = token_resp.json()
                err = token_data.get("error")
                if err == "authorization_pending":
                    return {"ok": False, "status": "authorization_pending", "message": "Waiting for authorization on GitHub."}
                elif err == "slow_down":
                    return {"ok": False, "status": "slow_down", "message": "Polling too quickly."}
                elif err:
                    return {"ok": False, "status": "error", "message": token_data.get("error_description", err)}

                access_token = token_data.get("access_token")
                if access_token:
                    user_resp = await client.get(
                        "https://api.github.com/user",
                        headers={"Authorization": f"Bearer {access_token}", "User-Agent": "ERIS-Desktop"}
                    )
                    if user_resp.status_code == 200:
                        gh_user = user_resp.json()
                        email = gh_user.get("email")
                        if not email:
                            email_resp = await client.get(
                                "https://api.github.com/user/emails",
                                headers={"Authorization": f"Bearer {access_token}", "User-Agent": "ERIS-Desktop"}
                            )
                            if email_resp.status_code == 200:
                                emails = email_resp.json()
                                for em in emails:
                                    if em.get("primary") and em.get("verified"):
                                        email = em.get("email")
                                        break
                        if not email:
                            email = f"{gh_user.get('login', 'user')}@github.local"

                        display_name = gh_user.get("name") or gh_user.get("login") or email.split("@")[0]
                        avatar_url = gh_user.get("avatar_url")

                        session_data = await AuthService.oauth_login_or_register(
                            db=db,
                            email=email,
                            display_name=display_name,
                            avatar_url=avatar_url,
                            provider="github",
                            ip=ip,
                            ua=ua
                        )
                        return {"ok": True, "status": "complete", "session": session_data}
    except Exception as e:
        logger.warning(f"Error polling GitHub: {e}")

    return {"ok": False, "status": "authorization_pending", "message": "Waiting for authorization on GitHub."}


@router.post("/oauth/direct", response_model=AuthResponse)
async def oauth_direct_login(
    payload: OAuthDirectLoginRequest,
    request: Request,
    db: AsyncSession = Depends(get_db)
):
    ip, ua = get_client_metadata(request)
    provider = payload.provider.lower().strip()
    if provider not in ("github", "google"):
        raise HTTPException(status_code=400, detail="Provider must be 'github' or 'google'")

    email_clean = payload.email.strip().lower()
    if not email_clean or "@" not in email_clean:
        raise HTTPException(status_code=400, detail="Valid email is required")

    display_name = payload.name.strip() if payload.name else email_clean.split("@")[0]

    session_data = await AuthService.oauth_login_or_register(
        db=db,
        email=email_clean,
        display_name=display_name,
        avatar_url=payload.avatar_url,
        provider=provider,
        ip=ip,
        ua=ua
    )

    return AuthResponse(
        ok=True,
        message=f"Successfully authenticated with {provider.capitalize()}.",
        session=session_data
    )


@router.post("/oauth/google/verify", response_model=AuthResponse)
async def google_verify_login(
    payload: GoogleAuthRequest,
    request: Request,
    db: AsyncSession = Depends(get_db)
):
    import httpx

    ip, ua = get_client_metadata(request)
    email = None
    name = None
    avatar_url = None

    if not payload.credential:
        raise HTTPException(
            status_code=400,
            detail="Google ID token credential is required for verification."
        )

    try:
        async with httpx.AsyncClient(timeout=6.0) as client:
            resp = await client.get(f"https://oauth2.googleapis.com/tokeninfo?id_token={payload.credential.strip()}")
            if resp.status_code == 200:
                tdata = resp.json()
                if tdata.get("email"):
                    email = tdata["email"]
                    name = tdata.get("name") or tdata.get("given_name")
                    avatar_url = tdata.get("picture")
    except Exception as e:
        logger.warning(f"Google tokeninfo online check error: {e}")

    if not email:
        try:
            parts = payload.credential.split(".")
            if len(parts) >= 2:
                padded = parts[1] + "=" * ((4 - len(parts[1]) % 4) % 4)
                decoded = base64.urlsafe_b64decode(padded)
                token_payload = json.loads(decoded)
                iss = token_payload.get("iss", "")
                if iss in ("https://accounts.google.com", "accounts.google.com") and token_payload.get("email"):
                    email = token_payload.get("email")
                    name = token_payload.get("name") or token_payload.get("given_name")
                    avatar_url = token_payload.get("picture")
        except Exception as e:
            logger.warning(f"Google local JWT decode error: {e}")

    if not email or "@" not in email:
        raise HTTPException(
            status_code=401,
            detail="Invalid or unverified Google token. Please sign in with an authentic Google account."
        )

    display_name = name.strip() if name else email.split("@")[0]

    session_data = await AuthService.oauth_login_or_register(
        db=db,
        email=email.strip().lower(),
        display_name=display_name,
        avatar_url=avatar_url or "https://lh3.googleusercontent.com/a/default-user",
        provider="google",
        ip=ip,
        ua=ua
    )

    return AuthResponse(
        ok=True,
        message="Successfully authenticated with Google.",
        session=session_data
    )


# ═══ Alias Router for /api/user/* Frontend Routes ═══

user_router = APIRouter(prefix="/api/user", tags=["User Profile"])

@user_router.get("/profile")
async def get_user_profile_alias(
    authorization: Optional[str] = Header(None),
    db: AsyncSession = Depends(get_db)
):
    return await get_user_profile(authorization=authorization, db=db)

@user_router.post("/profile")
async def update_user_profile_alias(
    payload: UserMemoryProfile,
    authorization: Optional[str] = Header(None),
    db: AsyncSession = Depends(get_db)
):
    return await update_user_profile(payload=payload, authorization=authorization, db=db)

@user_router.get("/settings")
async def get_user_settings_alias(
    authorization: Optional[str] = Header(None),
    db: AsyncSession = Depends(get_db)
):
    return await get_user_custom_settings(authorization=authorization, db=db)

@user_router.post("/settings")
async def save_user_settings_alias(
    payload: Dict[str, Any],
    authorization: Optional[str] = Header(None),
    db: AsyncSession = Depends(get_db)
):
    return await save_user_custom_settings(payload=payload, authorization=authorization, db=db)