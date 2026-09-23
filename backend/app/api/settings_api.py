import logging
from typing import Any, Dict
from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel

try:
    from app.agent.personas import (
        get_all_personas,
        get_persona,
        load_user_settings,
        reset_all_personas,
        reset_persona,
        save_user_settings,
        update_persona,
    )
    from app.schemas.settings import PersonaSettings, UserSettings
    from app.services.learning import load_habits, reset_habits
except ImportError:
    from backend.app.agent.personas import (
        get_all_personas,
        get_persona,
        load_user_settings,
        reset_all_personas,
        reset_persona,
        save_user_settings,
        update_persona,
    )
    from backend.app.schemas.settings import PersonaSettings, UserSettings
    from backend.app.services.learning import load_habits, reset_habits

logger = logging.getLogger("eris.api.settings")

router = APIRouter(prefix="/api/settings", tags=["settings"])


@router.get("", response_model=UserSettings)
async def get_settings():
    """Retrieves current user settings including default model and persona parameters."""
    return load_user_settings()


@router.put("", response_model=UserSettings)
async def update_settings(updates: Dict[str, Any]):
    """Updates general settings fields (e.g. default_model, execution_mode, auto_approve_safe_tools)."""
    current = load_user_settings()
    data = current.model_dump()
    for k, v in updates.items():
        if k in data and k != "personas":
            data[k] = v
    new_settings = UserSettings(**data)
    save_user_settings(new_settings)
    return new_settings


@router.post("/reset", response_model=UserSettings)
async def reset_settings():
    """Resets all configuration parameters back to factory defaults."""
    defaults = UserSettings.get_defaults()
    save_user_settings(defaults)
    return defaults


@router.get("/personas", response_model=Dict[str, PersonaSettings])
async def list_personas():
    """Returns all 6 configured swarm personas with temperature and token limits."""
    return get_all_personas()


@router.get("/personas/{key}", response_model=PersonaSettings)
async def get_single_persona(key: str):
    """Retrieves operational configuration for a single swarm worker."""
    return get_persona(key)


@router.put("/personas/{key}", response_model=PersonaSettings)
async def update_single_persona(key: str, updated: PersonaSettings):
    """Updates parameters (temperature, max tokens, enabled) for a specific worker persona."""
    return update_persona(key, updated)


@router.post("/personas/{key}/reset", response_model=PersonaSettings)
async def reset_single_persona(key: str):
    """Resets a single persona back to its factory default parameters."""
    return reset_persona(key)


@router.post("/personas/reset", response_model=Dict[str, PersonaSettings])
async def reset_all_worker_personas():
    """Resets all 6 worker personas back to factory defaults."""
    return reset_all_personas()


@router.get("/habits")
async def get_learned_habits():
    """Returns recorded human habits and learned patterns from memory/user_habits.json."""
    return load_habits()


@router.post("/habits/reset")
async def reset_learned_habits():
    """Clears all learned human habits and patterns, restoring a fresh baseline."""
    return reset_habits()
