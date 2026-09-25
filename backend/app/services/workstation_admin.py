"""
Workstation Administration & Data Reset Module for ERIS.
Provides verified functions for resetting local workstation data,
clearing episodic memories, and provisioning local development accounts.
"""

import json
import logging
import os
import shutil
import sqlite3
import time
from pathlib import Path
from typing import Any, Dict, List
from pydantic import BaseModel, Field

from backend.app.config import settings
from backend.app.services.security import hash_password, hash_token
from backend.app.services.user_db_service import UserDatabaseService

logger = logging.getLogger("eris.services.workstation_admin")


class ResetSummary(BaseModel):
    cleared_user_directories: List[str] = Field(default_factory=list)
    deleted_memory_chunks: int = Field(default=0)
    cleared_tables: List[str] = Field(default_factory=list)
    created_dev_account: Dict[str, Any] = Field(default_factory=dict)
    active_profile: Dict[str, Any] = Field(default_factory=dict)


def clear_all_eris_data_and_create_dev_account(
    bio: str = "ben 10 hates peacocks",
    display_name: str = "Dev",
    username: str = "dev",
    email: str = "dev@eris.local",
) -> ResetSummary:
    """
    Clears all episodic memory, conversation history, and user databases.
    Provisions a local workstation developer account with the specified bio.
    """
    cleared_dirs: List[str] = []

    # 1. Clear memory/users/
    users_dir = settings.MEMORY_DIR / "users"
    if users_dir.exists():
        for item in users_dir.iterdir():
            if item.is_dir():
                cleared_dirs.append(item.name)
                shutil.rmtree(item, ignore_errors=True)
            elif item.is_file():
                try:
                    item.unlink(missing_ok=True)
                except Exception:
                    pass

    users_dir.mkdir(parents=True, exist_ok=True)

    # 2. Reset rag_vault.db episodic memories
    deleted_chunks_count = 0
    rag_db_path = settings.MEMORY_DIR / "rag_vault.db"
    if rag_db_path.exists():
        try:
            conn = sqlite3.connect(str(rag_db_path))
            with conn:
                cursor = conn.cursor()
                cursor.execute("SELECT COUNT(*) FROM rag_chunks WHERE category = 'memory' OR source LIKE 'memory/%'")
                deleted_chunks_count = cursor.fetchone()[0]
                cursor.execute("DELETE FROM rag_chunks WHERE category = 'memory' OR source LIKE 'memory/%'")
            conn.close()
        except Exception as ex:
            logger.warning(f"Could not purge memory chunks from rag_vault: {ex}")

    # 3. Purge old users, sessions, otps, and episodic memories from auth.db
    cleared_tables = ["users", "sessions", "otps", "audit_logs", "episodic_memories"]
    auth_db_path = settings.MEMORY_DIR / "auth.db"
    if auth_db_path.exists():
        try:
            conn = sqlite3.connect(str(auth_db_path))
            with conn:
                cursor = conn.cursor()
                for table in cleared_tables:
                    try:
                        cursor.execute(f"DELETE FROM {table}")
                    except Exception:
                        pass

                # Create the local dev user account
                dev_user_id = "local_dev_user"
                from datetime import datetime, timezone
                now_iso = datetime.now(timezone.utc).isoformat()
                now_ts = time.time()
                preferences_dict = {
                    "headline": "Local Workstation Developer",
                    "bio": bio,
                    "timezone": "Asia/Kolkata",
                    "accent": "indigo",
                    "visibility": "private",
                    "notify_product": True,
                    "notify_mentions": True,
                    "notify_digest": False,
                }
                cursor.execute("""
                    INSERT INTO users (
                        id, email, password_hash, display_name, username,
                        is_verified, role, preferences, created_at, updated_at
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """, (
                    dev_user_id,
                    email,
                    hash_password("local_dev_password_123"),
                    display_name,
                    username,
                    1,
                    "owner",
                    json.dumps(preferences_dict),
                    now_iso,
                    now_iso,
                ))

                # Create an active local session token
                dev_token = "eris_sec_local_dev_session_token_workstation"
                cursor.execute("""
                    INSERT INTO sessions (
                        id, user_id, token_hash, ip_address, user_agent, is_revoked, expires_at, created_at
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                """, (
                    "session_dev_local",
                    dev_user_id,
                    hash_token(dev_token),
                    "127.0.0.1",
                    "LocalPC/Workstation",
                    0,
                    datetime.fromtimestamp(now_ts + (86400 * 365), timezone.utc).isoformat(),
                    now_iso,
                ))
            conn.close()
        except Exception as ex:
            logger.warning(f"Could not reset auth.db: {ex}")

    # 4. Provision local user database profile via UserDatabaseService
    dev_profile_data = {
        "user_id": "dev",
        "email": email,
        "display_name": display_name,
        "username": username,
        "headline": "Local Workstation Developer",
        "bio": bio,
        "timezone": "Asia/Kolkata",
        "visibility": "private",
        "accent": "indigo",
        "notify_product": True,
        "notify_mentions": True,
        "notify_digest": False,
    }

    UserDatabaseService.save_user_profile("dev", dev_profile_data)
    UserDatabaseService.save_user_profile("default_user", dev_profile_data)

    # 5. Reset memory/memory.json
    memory_json_path = settings.MEMORY_DIR / "memory.json"
    clean_memory_state = {
        "identity": "You are ERIS, an autonomous pair-programming assistant.",
        "history": [],
        "active_model": "gemini/gemini-3-flash-preview",
        "execution_mode": "speed",
        "user_profile": dev_profile_data,
        "current_user": f"{display_name} (@{username})",
    }
    with open(memory_json_path, "w", encoding="utf-8") as f:
        json.dump(clean_memory_state, f, indent=4)

    # 6. Reset memory/user_profile.json
    user_prof_json_path = settings.MEMORY_DIR / "user_profile.json"
    with open(user_prof_json_path, "w", encoding="utf-8") as f:
        json.dump(dev_profile_data, f, indent=2)

    # 7. Reset user_habits.json
    habits_path = settings.MEMORY_DIR / "user_habits.json"
    with open(habits_path, "w", encoding="utf-8") as f:
        f.write("{}")

    logger.info("ERIS workspace data reset complete. Local dev account initialized with bio: '%s'", bio)

    return ResetSummary(
        cleared_user_directories=cleared_dirs,
        deleted_memory_chunks=deleted_chunks_count,
        cleared_tables=cleared_tables,
        created_dev_account={
            "id": "local_dev_user",
            "username": username,
            "display_name": display_name,
            "email": email,
            "role": "owner",
        },
        active_profile=dev_profile_data,
    )
