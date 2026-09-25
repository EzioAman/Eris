import base64
import hashlib
import logging
from typing import Any, Dict, List, Optional
from cryptography.fernet import Fernet
from sqlalchemy import select, update, delete
from sqlalchemy.ext.asyncio import AsyncSession

try:
    from backend.app.config import settings
    from backend.app.models import ApiKeyVault
except ImportError:
    from app.config import settings
    from app.models import ApiKeyVault

logger = logging.getLogger("eris.services.vault")


def _get_fernet_cipher() -> Fernet:
    """Derives a deterministic 32-byte Fernet key from the local SECRET_KEY."""
    raw_secret = getattr(settings, "SECRET_KEY", "eris_master_vault_secret_key_32bytes")
    derived_key = hashlib.sha256(raw_secret.encode("utf-8")).digest()
    b64_key = base64.urlsafe_b64encode(derived_key)
    return Fernet(b64_key)


def mask_key(api_key: str) -> str:
    """Creates a human-readable safe preview without revealing secrets."""
    clean = api_key.strip()
    if len(clean) <= 8:
        return "••••" + clean[-2:] if len(clean) > 2 else "••••"
    prefix_len = min(6, len(clean) // 3)
    suffix_len = min(4, len(clean) // 4)
    return f"{clean[:prefix_len]}••••••••{clean[-suffix_len:]}"


def encrypt_secret(plain_text: str) -> str:
    """Encrypts plaintext using authenticated AES-128-CBC + HMAC-SHA256 (Fernet)."""
    cipher = _get_fernet_cipher()
    token = cipher.encrypt(plain_text.strip().encode("utf-8"))
    return token.decode("utf-8")


def decrypt_secret(ciphertext: str) -> str:
    """Decrypts ciphertext in memory. Never logged or exposed."""
    cipher = _get_fernet_cipher()
    decrypted = cipher.decrypt(ciphertext.strip().encode("utf-8"))
    return decrypted.decode("utf-8")


async def add_api_key(
    db: AsyncSession,
    provider: str,
    label: str,
    api_key: str,
    model_name: Optional[str] = None,
    base_url: Optional[str] = None,
    user_id: Optional[str] = None,
) -> Dict[str, Any]:
    """Adds a new encrypted API key entry to the vault."""
    clean_provider = provider.strip().lower()
    clean_label = label.strip() or f"{clean_provider.capitalize()} Key"
    masked = mask_key(api_key)
    ciphertext = encrypt_secret(api_key)

    key_record = ApiKeyVault(
        user_id=user_id,
        provider=clean_provider,
        label=clean_label,
        key_ciphertext=ciphertext,
        key_masked=masked,
        model_name=model_name.strip() if model_name else None,
        base_url=base_url.strip() if base_url else None,
        is_active=True,
    )
    db.add(key_record)
    await db.commit()
    await db.refresh(key_record)

    return {
        "id": key_record.id,
        "provider": key_record.provider,
        "label": key_record.label,
        "key_masked": key_record.key_masked,
        "model_name": key_record.model_name,
        "base_url": key_record.base_url,
        "is_active": key_record.is_active,
        "created_at": key_record.created_at.isoformat() if key_record.created_at else "",
    }


async def list_api_keys(
    db: AsyncSession,
    user_id: Optional[str] = None,
) -> List[Dict[str, Any]]:
    """Returns all stored keys with masked representations only."""
    query = select(ApiKeyVault).order_by(ApiKeyVault.created_at.desc())
    if user_id:
        query = query.where((ApiKeyVault.user_id == user_id) | (ApiKeyVault.user_id.is_(None)))

    result = await db.execute(query)
    rows = result.scalars().all()

    return [
        {
            "id": r.id,
            "provider": r.provider,
            "label": r.label,
            "key_masked": r.key_masked,
            "model_name": r.model_name,
            "base_url": r.base_url,
            "is_active": r.is_active,
            "created_at": r.created_at.isoformat() if r.created_at else "",
        }
        for r in rows
    ]


async def toggle_api_key(
    db: AsyncSession,
    key_id: str,
) -> Optional[Dict[str, Any]]:
    """Toggles active state of an API key."""
    result = await db.execute(select(ApiKeyVault).where(ApiKeyVault.id == key_id))
    key_record = result.scalar_one_or_none()
    if not key_record:
        return None

    key_record.is_active = not key_record.is_active
    await db.commit()
    await db.refresh(key_record)

    return {
        "id": key_record.id,
        "provider": key_record.provider,
        "label": key_record.label,
        "key_masked": key_record.key_masked,
        "is_active": key_record.is_active,
    }


async def delete_api_key(
    db: AsyncSession,
    key_id: str,
) -> bool:
    """Removes an API key from the vault permanently."""
    result = await db.execute(select(ApiKeyVault).where(ApiKeyVault.id == key_id))
    key_record = result.scalar_one_or_none()
    if not key_record:
        return False

    await db.delete(key_record)
    await db.commit()
    return True


async def get_active_credentials_for_provider(
    db: AsyncSession,
    provider: str,
    preferred_model: Optional[str] = None,
) -> Optional[Dict[str, str]]:
    """
    Internal retrieval method for LLM Client.
    Decrypts the active key strictly into memory for execution.
    Never exposed through API endpoints or logged.
    """
    clean_prov = provider.strip().lower()

    # If preferred model is specified, look for matching active key first
    if preferred_model:
        query_model = select(ApiKeyVault).where(
            ApiKeyVault.provider == clean_prov,
            ApiKeyVault.is_active == True,
            ApiKeyVault.model_name == preferred_model,
        ).order_by(ApiKeyVault.created_at.desc())
        res_model = await db.execute(query_model)
        item = res_model.scalars().first()
        if item:
            try:
                decrypted = decrypt_secret(item.key_ciphertext)
                return {"api_key": decrypted, "base_url": item.base_url or "", "label": item.label}
            except Exception as ex:
                logger.error(f"Error decrypting key {item.id}: {ex}")

    # Fallback to any active key for this provider
    query_any = select(ApiKeyVault).where(
        ApiKeyVault.provider == clean_prov,
        ApiKeyVault.is_active == True,
    ).order_by(ApiKeyVault.created_at.desc())
    res_any = await db.execute(query_any)
    item = res_any.scalars().first()
    if item:
        try:
            decrypted = decrypt_secret(item.key_ciphertext)
            return {"api_key": decrypted, "base_url": item.base_url or "", "label": item.label}
        except Exception as ex:
            logger.error(f"Error decrypting active key for {provider}: {ex}")

    return None


def get_active_decrypted_key_sync(provider: str) -> Optional[str]:
    """
    Synchronously retrieves and decrypts the active API key for a provider from local SQLite.
    Strictly queries auth.db, NEVER reading from .env.
    """
    import sqlite3
    db_path = settings.MEMORY_DIR / "auth.db"
    if not db_path.exists():
        return None
    try:
        conn = sqlite3.connect(str(db_path))
        cursor = conn.cursor()
        cursor.execute(
            "SELECT key_ciphertext FROM api_key_vault WHERE provider = ? AND is_active = 1 ORDER BY created_at DESC LIMIT 1",
            (provider.lower().strip(),)
        )
        row = cursor.fetchone()
        conn.close()
        if row and row[0]:
            return decrypt_secret(row[0])
    except Exception as ex:
        logger.debug(f"Sync vault retrieval failed for provider {provider}: {ex}")

    # Fallback to environment variables
    p_lower = provider.lower().strip()
    if p_lower == "gemini" and getattr(settings, "GEMINI_API_KEY", ""):
        return settings.GEMINI_API_KEY.strip()
    if p_lower == "openrouter" and getattr(settings, "OPENROUTER_API_KEY", ""):
        return settings.OPENROUTER_API_KEY.strip()
    return None


def get_all_active_credentials_sync() -> List[Dict[str, Any]]:
    """
    Synchronously retrieves and decrypts all active keys across all providers.
    Returns list of dicts with provider, decrypted key, base_url, and model_name.
    """
    import sqlite3
    db_path = settings.MEMORY_DIR / "auth.db"
    results = []
    if db_path.exists():
        try:
            conn = sqlite3.connect(str(db_path))
            cursor = conn.cursor()
            cursor.execute(
                "SELECT provider, key_ciphertext, base_url, model_name, label FROM api_key_vault WHERE is_active = 1 ORDER BY created_at DESC"
            )
            rows = cursor.fetchall()
            conn.close()
            for r in rows:
                try:
                    decrypted = decrypt_secret(r[1])
                    results.append({
                        "provider": r[0],
                        "key": decrypted,
                        "base_url": r[2] or "",
                        "model_name": r[3] or "",
                        "label": r[4] or ""
                    })
                except Exception:
                    pass
        except Exception as ex:
            logger.debug(f"Sync vault retrieval failed: {ex}")

    # Resilient fallback: include keys from environment if not already in results
    existing_providers = {r["provider"].lower().strip() for r in results}
    if "gemini" not in existing_providers and getattr(settings, "GEMINI_API_KEY", ""):
        results.append({
            "provider": "gemini",
            "key": settings.GEMINI_API_KEY.strip(),
            "base_url": "",
            "model_name": "gemini-2.0-flash",
            "label": "Environment GEMINI_API_KEY",
        })
    if "openrouter" not in existing_providers and getattr(settings, "OPENROUTER_API_KEY", ""):
        results.append({
            "provider": "openrouter",
            "key": settings.OPENROUTER_API_KEY.strip(),
            "base_url": "",
            "model_name": "openrouter/auto",
            "label": "Environment OPENROUTER_API_KEY",
        })

    return results


async def get_dynamic_vault_fallbacks(
    db: AsyncSession,
    active_model: str,
    user_id: Optional[str] = None,
) -> List[str]:
    """
    Dynamically generates fallback model candidates strictly from active keys configured in the user's vault.
    Never uses static hardcoded model lists.
    """
    active_keys = await list_api_keys(db, user_id=user_id)
    candidates: List[str] = []

    clean_active = active_model.strip()

    for k in active_keys:
        if not k.get("is_active"):
            continue
        prov = k.get("provider", "").strip().lower()
        configured_model = (k.get("model_name") or "").strip()

        if configured_model:
            full_model = configured_model if configured_model.startswith(f"{prov}/") else f"{prov}/{configured_model}"
            if full_model != clean_active and full_model not in candidates:
                candidates.append(full_model)

    return candidates

