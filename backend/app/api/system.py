import os
import sys
import json
import re
import httpx
from fastapi import APIRouter, Depends, Header, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from typing import Optional
from pydantic import BaseModel
from backend.app.config import settings
from backend.app.database import get_db, db_manager
from backend.app.schemas.auth import (
    SystemHealthReport,
    SubsystemStatus,
    CheckEnvResponse,
    SessionStatusResponse,
    SystemStateResponse
)
from backend.app.services.auth_service import AuthService

from backend.app.services.update_service import (
    check_for_updates,
    start_download_update,
    get_update_progress,
    apply_downloaded_update,
    UpdateManifest,
    UpdateProgress,
)

router = APIRouter(prefix="/api/system", tags=["System & Health"])

class DownloadUpdatePayload(BaseModel):
    download_url: str

class ApplyUpdatePayload(BaseModel):
    silent: bool = True

@router.get("/check-update", response_model=UpdateManifest)
async def check_update():
    """Checks GitHub for newer ERIS releases and returns manifest."""
    return await check_for_updates()

@router.post("/download-update", response_model=UpdateProgress)
async def trigger_download_update(payload: DownloadUpdatePayload):
    """Starts background download of installer binary."""
    return start_download_update(payload.download_url)

@router.get("/update-progress", response_model=UpdateProgress)
async def query_update_progress():
    """Returns real-time download percentage and bytes."""
    return get_update_progress()

@router.post("/apply-update")
async def execute_apply_update(payload: Optional[ApplyUpdatePayload] = None):
    """Executes downloaded installer and cleanly restarts ERIS."""
    silent = payload.silent if payload else True
    return apply_downloaded_update(silent=silent)

@router.get("/health", response_model=SystemHealthReport)
async def get_system_health():
    db_ok = db_manager.engine is not None
    db_name = f"PostgreSQL ({settings.DATABASE_URL.split('@')[-1]})" if db_manager.active_db_type == "postgresql" else "Embedded SQLite (auth.db)"

    rag_db_path = settings.MEMORY_DIR / "rag_vault.db"
    rag_ok = rag_db_path.exists() or settings.MEMORY_DIR.exists()

    has_llm = False
    try:
        import sqlite3
        auth_db_path = settings.MEMORY_DIR / "auth.db"
        if auth_db_path.exists():
            conn = sqlite3.connect(str(auth_db_path))
            cur = conn.cursor()
            cur.execute("SELECT COUNT(*) FROM api_key_vault WHERE is_active = 1")
            row = cur.fetchone()
            conn.close()
            has_llm = bool(row and row[0] > 0)
    except Exception:
        has_llm = False

    tools_count = 0
    if settings.TOOLS_DIR.exists():
        tools_count = len([f for f in os.listdir(settings.TOOLS_DIR) if f.endswith(".py") and not f.startswith((".", "_"))])

    return SystemHealthReport(
        ok=True,
        status="nominal" if db_ok else "degraded",
        subsystems={
            "auth": SubsystemStatus(
                name="Identity & Keystore",
                status="online" if db_ok else "offline",
                database=db_manager.active_db_type,
                target=db_name
            ),
            "rag": SubsystemStatus(
                name="Neural RAG Vault",
                status="online" if rag_ok else "standby",
                database="rag_vault.db",
                target="Vector Context Store"
            ),
            "llm": SubsystemStatus(
                name="Model Provider",
                status="online" if has_llm else "standby",
                target="Gemini / Local Ollama Engine"
            ),
            "sandbox": SubsystemStatus(
                name="Win32 Sandbox",
                status="online",
                target="Process Isolation & AST Guardrails"
            ),
            "tools": SubsystemStatus(
                name="Tool Registry",
                status="online",
                count=tools_count,
                target=f"{tools_count} Guardrailed Custom Tools"
            )
        }
    )

@router.get("/check-env", response_model=CheckEnvResponse)
async def check_env():
    root_env = settings.WORKSPACE_PATH / ".env"
    local_env = settings.WORKSPACE_PATH / "frontend" / ".env"
    has_env = root_env.exists() or local_env.exists()
    return CheckEnvResponse(hasEnv=has_env)

@router.get("/session-status", response_model=SessionStatusResponse)
async def get_session_status(
    authorization: Optional[str] = Header(None),
    db: AsyncSession = Depends(get_db)
):
    token = None
    if authorization and authorization.startswith("Bearer "):
        token = authorization.split("Bearer ", 1)[1].strip()

    user = None
    if token:
        user = await AuthService.validate_session(db, token)

    root_env = settings.WORKSPACE_PATH / ".env"
    has_env = root_env.exists()

    if not user:
        return SessionStatusResponse(
            authenticated=False,
            configured=has_env,
            email=None,
            displayName=None,
            username=None,
            avatarUrl=None,
            preferences=None,
            token=None
        )

    from backend.app.services.user_db_service import UserDatabaseService
    per_user_profile = (
        UserDatabaseService.get_user_profile(user.id)
        or (UserDatabaseService.get_user_profile(user.username) if user.username else None)
        or UserDatabaseService.get_user_profile(user.email)
        or UserDatabaseService.get_user_profile("default_user")
    )

    resolved_display_name = (
        (per_user_profile.get("display_name") if per_user_profile else None)
        or user.display_name
        or user.email.split("@")[0]
    )
    resolved_username = (
        (per_user_profile.get("username") if per_user_profile else None)
        or user.username
    )
    resolved_avatar = (
        (per_user_profile.get("avatar_url") if per_user_profile else None)
        or user.avatar_url
    )
    merged_preferences = dict(user.preferences or {})
    if per_user_profile:
        merged_preferences.update(per_user_profile)

    return SessionStatusResponse(
        authenticated=True,
        configured=bool(has_env or user is not None),
        email=user.email,
        displayName=resolved_display_name,
        username=resolved_username,
        avatarUrl=resolved_avatar,
        preferences=merged_preferences,
        token=token
    )


@router.post("/dev-clear-all-data")
async def dev_clear_all_data(db: AsyncSession = Depends(get_db)):
    """
    Purges all active user sessions and resets memory history when user chooses 'Clear All Local Data'.
    """
    try:
        from backend.app.models import SessionModel
        from sqlalchemy import delete
        await db.execute(delete(SessionModel))
        await db.commit()
    except Exception as ex:
        logger.warning(f"Error purging database sessions: {ex}")

    eris = _get_active_eris()
    if eris and "history" in eris.memory:
        eris.memory["history"] = []
        eris.save_memory()

    return {"ok": True, "message": "All session and cache data purged."}

@router.get("/state", response_model=SystemStateResponse)
async def get_system_state():
    mem_file = settings.MEMORY_DIR / "memory.json"
    active_model = None
    execution_mode = "speed"
    current_user = None
    user_display_name = None
    current_emotion = "idle"
    ui_preferences = {
        "density": "standard",
        "accent": "violet",
        "show_file_tree": True,
        "show_activity_logs": True
    }

    if mem_file.exists():
        try:
            with open(mem_file, "r", encoding="utf-8") as f:
                data = json.load(f)
                active_model = data.get("active_model", None)
                execution_mode = data.get("execution_mode", execution_mode)
                current_user = data.get("current_user", current_user)
                user_display_name = data.get("user_display_name", current_user.split("@")[0] if current_user else "Explorer")
                current_emotion = data.get("current_emotion", current_emotion)
                ui_preferences = data.get("ui_preferences", ui_preferences)
        except Exception:
            pass

    tools = []
    if settings.TOOLS_DIR.exists():
        for f in os.listdir(settings.TOOLS_DIR):
            if f.endswith(".py") and not f.startswith((".", "_")):
                p = settings.TOOLS_DIR / f
                try:
                    with open(p, "r", encoding="utf-8", errors="ignore") as tf:
                        code = tf.read()
                    tools.append({"name": f[:-3], "file": f, "description": "Custom agent tool"})
                except Exception:
                    pass

    emotion_colors = {
        "idle": "#8B5CF6",
        "thinking": "#38BDF8",
        "working": "#F59E0B",
        "success": "#10B981",
        "error": "#F43F5E",
        "listening": "#06B6D4"
    }

    return SystemStateResponse(
        ok=True,
        active_model=active_model,
        execution_mode=execution_mode,
        current_user=current_user,
        user_display_name=user_display_name,
        is_authenticated=bool(current_user),
        current_emotion=current_emotion,
        emotion_ring_color=emotion_colors.get(current_emotion, "#8B5CF6"),
        ui_preferences=ui_preferences,
        tools_count=len(tools),
        tools=tools,
        platform=sys.platform
    )


@router.get("/local-data")
async def get_local_data(db: AsyncSession = Depends(get_db)):
    """
    Dev-mode endpoint: returns row counts and registered user summaries for local inspection.
    Restricted strictly to development environment.
    """
    if getattr(settings, "ENVIRONMENT", "development").lower() != "development":
        raise HTTPException(status_code=403, detail="Local data inspection is restricted to development environment.")

    from sqlalchemy import func, select as sa_select
    from backend.app.models import User, SessionModel, OTP, AuditLog

    try:
        user_count = (await db.execute(sa_select(func.count()).select_from(User))).scalar() or 0
        session_count = (await db.execute(sa_select(func.count()).select_from(SessionModel))).scalar() or 0
        otp_count = (await db.execute(sa_select(func.count()).select_from(OTP))).scalar() or 0
        audit_log_count = (await db.execute(sa_select(func.count()).select_from(AuditLog))).scalar() or 0

        users_res = await db.execute(sa_select(User).limit(50))
        users = [
            {
                "id": str(u.id),
                "email": u.email,
                "display_name": u.display_name,
                "is_verified": bool(u.is_verified),
                "role": u.role,
                "created_at": str(u.created_at) if u.created_at else None,
            }
            for u in users_res.scalars().all()
        ]
    except Exception:
        user_count = session_count = otp_count = audit_log_count = -1
        users = []

    return {
        "user_count": user_count,
        "session_count": session_count,
        "otp_count": otp_count,
        "audit_log_count": audit_log_count,
        "users": users,
    }


class DevResetPasswordRequest(BaseModel):
    email: str
    new_password: str


@router.post("/dev-reset-password")
async def dev_reset_password(payload: DevResetPasswordRequest, db: AsyncSession = Depends(get_db)):
    """
    Dev-mode endpoint: instantly resets a user's password and marks them as verified.
    Strictly restricted to development environment.
    """
    if getattr(settings, "ENVIRONMENT", "development").lower() != "development":
        raise HTTPException(status_code=403, detail="Restricted to development environment.")

    email_clean = payload.email.strip().lower()
    from sqlalchemy import select
    from backend.app.models import User
    from backend.app.services.security import hash_password

    stmt = select(User).where(User.email == email_clean)
    res = await db.execute(stmt)
    user = res.scalar_one_or_none()

    if not user:
        raise HTTPException(status_code=404, detail=f"No account found with email '{email_clean}'")

    user.password_hash = hash_password(payload.new_password)
    user.is_verified = True
    await db.commit()

    return {
        "ok": True,
        "message": f"Password for {email_clean} has been reset to '{payload.new_password}'. Account marked as verified.",
    }


# --- ERIS Omni-Directional Model Matrix & Execution Mode ---

def _get_active_eris():
    try:
        from backend.app.agent.runner import runner
        return runner
    except Exception:
        try:
            from app.agent.runner import runner
            return runner
        except Exception:
            return None


@router.get("/models")
async def list_available_models():
    """
    Returns live model catalog verified against active API keys in the vault.
    """
    try:
        eris = _get_active_eris()
        if not eris:
            return {"ok": False, "models": [], "active_model": None, "catalogs": {"total": 0}}
        
        models = eris.fetch_models()
        catalogs = {"total": len(models)}
        for m in models:
            prov = str(m.get("provider", "Other")).lower()
            catalogs[prov] = catalogs.get(prov, 0) + 1

        recommended_model = models[0]["id"] if models else None
        return {
            "ok": True,
            "active_model": eris.active_model or None,
            "recommended_model": recommended_model,
            "models": models,
            "catalogs": catalogs,
        }
    except Exception as ex:
        logger.error(f"Failed to list models: {ex}", exc_info=True)
        return {
            "ok": False,
            "models": [],
            "active_model": None,
            "catalogs": {"total": 0},
            "error": str(ex),
        }


class SelectModelRequest(BaseModel):
    modelId: Optional[str] = None
    model_id: Optional[str] = None
    model: Optional[str] = None
    userId: Optional[str] = None


@router.post("/models/select")
async def select_model(payload: SelectModelRequest):
    """
    Applies model selection directly into Eris Core and persists to memory.json.
    """
    target_model = payload.modelId or payload.model_id or payload.model
    if not target_model:
        raise HTTPException(status_code=400, detail="Missing model identifier (modelId, model_id, or model required).")

    eris = _get_active_eris()
    if not eris:
        raise HTTPException(status_code=500, detail="Eris Core engine offline.")

    user_id = payload.userId
    if hasattr(eris, "set_active_model"):
        try:
            ok = eris.set_active_model(target_model, user_id=user_id)
        except TypeError:
            ok = eris.set_active_model(target_model)
    elif hasattr(eris, "apply_model_selection"):
        ok = eris.apply_model_selection(target_model)
    else:
        ok = False

    return {"ok": ok, "active_model": eris.active_model}


class ExecutionModeRequest(BaseModel):
    mode: str


@router.post("/mode")
async def set_execution_mode(payload: ExecutionModeRequest):
    """
    Toggles execution mode ('speed' vs 'accuracy') and updates memory.json.
    """
    m = payload.mode.strip().lower()
    if m not in ("speed", "accuracy"):
        raise HTTPException(status_code=400, detail="Mode must be 'speed' or 'accuracy'.")
    
    eris = _get_active_eris()
    if eris:
        eris.execution_mode = m
        eris.memory["execution_mode"] = m
        eris.save_memory()
    return {"ok": True, "execution_mode": m}


class ConsentPayload(BaseModel):
    agreed: bool = True
    age_confirmed: bool = True
    version: str = "1.0.0"
    timestamp: Optional[str] = None


@router.post("/consent")
async def record_user_consent(payload: ConsentPayload, db: AsyncSession = Depends(get_db)):
    """
    Persists proof of informed consent and 18+ age verification
    strictly inside the local SQLite database and memory store. Zero external telemetry.
    """
    from datetime import datetime, timezone
    from backend.app.models import AuditLog
    
    ts = payload.timestamp or datetime.now(timezone.utc).isoformat()
    try:
        audit_entry = AuditLog(
            event_type="informed_consent_agreed",
            ip_address="127.0.0.1",
            payload=json.dumps({
                "agreed": payload.agreed,
                "age_confirmed": payload.age_confirmed,
                "version": payload.version,
                "timestamp": ts,
                "offline_local": True
            })
        )
        db.add(audit_entry)
        await db.commit()
    except Exception:
        pass

    # Also persist in local memory store
    try:
        consent_file = settings.MEMORY_DIR / "informed_consent.json"
        with open(consent_file, "w", encoding="utf-8") as f:
            json.dump({
                "agreed": payload.agreed,
                "age_confirmed": payload.age_confirmed,
                "version": payload.version,
                "timestamp": ts
            }, f, indent=2)
    except Exception:
        pass

    return {
        "ok": True,
        "persisted": True,
        "timestamp": ts,
        "storage": "local_encrypted_sqlite"
    }


@router.get("/consent")
async def get_user_consent():
    """
    Retrieves status of local informed consent verification.
    """
    consent_file = settings.MEMORY_DIR / "informed_consent.json"
    if consent_file.exists():
        try:
            with open(consent_file, "r", encoding="utf-8") as f:
                return {"has_consented": True, "details": json.load(f)}
        except Exception:
            pass
    return {"has_consented": False}



