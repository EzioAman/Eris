import logging
from typing import Any, Dict, List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from sqlalchemy.ext.asyncio import AsyncSession

try:
    from app.database import get_db
    from app.services.vault_service import (
        add_api_key,
        delete_api_key,
        list_api_keys,
        toggle_api_key,
    )
except ImportError:
    from backend.app.database import get_db
    from backend.app.services.vault_service import (
        add_api_key,
        delete_api_key,
        list_api_keys,
        toggle_api_key,
    )

logger = logging.getLogger("eris.api.keys")
router = APIRouter(prefix="/api/keys", tags=["API Keys Vault"])


class CreateKeyRequest(BaseModel):
    provider: str = Field(..., description="Provider: gemini, openrouter, openai, groq, anthropic, ollama, custom")
    label: str = Field(..., description="Custom human-readable identifier for this key")
    api_key: str = Field(..., description="Raw secret API key (encrypted on receipt, never stored plaintext)")
    model_name: Optional[str] = Field(None, description="Optional default model to pair with this key")
    base_url: Optional[str] = Field(None, description="Optional custom base URL for Ollama or self-hosted endpoints")


class KeyResponseItem(BaseModel):
    id: str
    provider: str
    label: str
    key_masked: str
    model_name: Optional[str] = None
    base_url: Optional[str] = None
    is_active: bool
    created_at: str


@router.get("", response_model=List[KeyResponseItem])
async def get_keys(db: AsyncSession = Depends(get_db)):
    """Returns all stored API keys with masked previews. Raw secrets are NEVER returned."""
    return await list_api_keys(db)


@router.post("", response_model=KeyResponseItem, status_code=status.HTTP_201_CREATED)
async def create_key(payload: CreateKeyRequest, db: AsyncSession = Depends(get_db)):
    """Stores and encrypts a new provider API key in the secure local vault."""
    clean_key = payload.api_key.strip()
    if not clean_key or len(clean_key) < 6:
        raise HTTPException(status_code=400, detail="API key is too short or invalid.")

    entry = await add_api_key(
        db=db,
        provider=payload.provider,
        label=payload.label,
        api_key=clean_key,
        model_name=payload.model_name,
        base_url=payload.base_url,
    )
    return entry


@router.patch("/{key_id}/toggle")
async def toggle_key(key_id: str, db: AsyncSession = Depends(get_db)):
    """Toggles the active state of an API key."""
    updated = await toggle_api_key(db, key_id)
    if not updated:
        raise HTTPException(status_code=404, detail="API key entry not found.")
    return {"ok": True, "key": updated}


@router.delete("/{key_id}")
async def delete_key(key_id: str, db: AsyncSession = Depends(get_db)):
    """Deletes an API key from the local vault."""
    success = await delete_api_key(db, key_id)
    if not success:
        raise HTTPException(status_code=404, detail="API key entry not found.")
    return {"ok": True, "message": "API key permanently removed from vault."}
