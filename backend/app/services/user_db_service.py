"""
UserDatabaseService: Manages isolated, per-user SQLite databases for profile,
custom settings, and workspace preferences.
Stored at: memory/users/{safe_user_id}/user_data.db
"""

import sqlite3
import json
import re
from datetime import datetime, timezone
from pathlib import Path
from typing import Optional, Dict, Any
from backend.app.config import settings

def get_utc_now_str() -> str:
    return datetime.now(timezone.utc).isoformat()

def sanitize_user_id(user_id: str) -> str:
    """Sanitizes user ID / username for safe directory naming."""
    clean = re.sub(r'[^a-zA-Z0-9_\-]', '_', str(user_id).strip().lower())
    return clean or "default_user"

class UserDatabaseService:
    @staticmethod
    def get_user_db_path(user_id: str) -> Path:
        safe_id = sanitize_user_id(user_id)
        user_dir = settings.MEMORY_DIR / "users" / safe_id
        user_dir.mkdir(parents=True, exist_ok=True)
        return user_dir / "user_data.db"

    @staticmethod
    def get_connection(user_id: str) -> sqlite3.Connection:
        db_path = UserDatabaseService.get_user_db_path(user_id)
        conn = sqlite3.connect(str(db_path))
        conn.row_factory = sqlite3.Row
        UserDatabaseService._init_tables(conn)
        return conn

    @staticmethod
    def _init_tables(conn: sqlite3.Connection):
        cursor = conn.cursor()
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS profile (
                user_id TEXT PRIMARY KEY,
                email TEXT,
                display_name TEXT,
                username TEXT,
                avatar_url TEXT,
                headline TEXT,
                bio TEXT,
                website TEXT,
                timezone TEXT DEFAULT 'Asia/Kolkata',
                visibility TEXT DEFAULT 'members',
                accent TEXT DEFAULT 'indigo',
                notify_product INTEGER DEFAULT 1,
                notify_mentions INTEGER DEFAULT 1,
                notify_digest INTEGER DEFAULT 0,
                updated_at TEXT
            )
        """)
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS custom_settings (
                key TEXT PRIMARY KEY,
                value TEXT,
                updated_at TEXT
            )
        """)
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS workspace_config (
                key TEXT PRIMARY KEY,
                active_model TEXT DEFAULT 'gemini/gemini-2.5-flash',
                execution_mode TEXT DEFAULT 'speed',
                ui_preferences TEXT,
                updated_at TEXT
            )
        """)
        conn.commit()

    @staticmethod
    def get_user_profile(user_id: str) -> Optional[Dict[str, Any]]:
        conn = UserDatabaseService.get_connection(user_id)
        try:
            cursor = conn.cursor()
            cursor.execute("SELECT * FROM profile WHERE user_id = ? OR email = ?", (user_id, user_id))
            row = cursor.fetchone()
            if row:
                return {
                    "user_id": row["user_id"],
                    "email": row["email"],
                    "display_name": row["display_name"],
                    "username": row["username"],
                    "avatar_url": row["avatar_url"],
                    "headline": row["headline"],
                    "bio": row["bio"],
                    "website": row["website"],
                    "timezone": row["timezone"],
                    "visibility": row["visibility"],
                    "accent": row["accent"],
                    "notify_product": bool(row["notify_product"]),
                    "notify_mentions": bool(row["notify_mentions"]),
                    "notify_digest": bool(row["notify_digest"]),
                    "updated_at": row["updated_at"]
                }
            return None
        finally:
            conn.close()

    @staticmethod
    def save_user_profile(user_id: str, profile_data: Dict[str, Any]) -> Dict[str, Any]:
        conn = UserDatabaseService.get_connection(user_id)
        try:
            cursor = conn.cursor()
            now = get_utc_now_str()
            
            cursor.execute("""
                INSERT INTO profile (
                    user_id, email, display_name, username, avatar_url,
                    headline, bio, website, timezone, visibility, accent,
                    notify_product, notify_mentions, notify_digest, updated_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                ON CONFLICT(user_id) DO UPDATE SET
                    email = excluded.email,
                    display_name = excluded.display_name,
                    username = excluded.username,
                    avatar_url = COALESCE(excluded.avatar_url, profile.avatar_url),
                    headline = excluded.headline,
                    bio = excluded.bio,
                    website = excluded.website,
                    timezone = excluded.timezone,
                    visibility = excluded.visibility,
                    accent = excluded.accent,
                    notify_product = excluded.notify_product,
                    notify_mentions = excluded.notify_mentions,
                    notify_digest = excluded.notify_digest,
                    updated_at = excluded.updated_at
            """, (
                user_id,
                profile_data.get("email", ""),
                profile_data.get("display_name", ""),
                profile_data.get("username", ""),
                profile_data.get("avatar_url"),
                profile_data.get("headline", ""),
                profile_data.get("bio", ""),
                profile_data.get("website", ""),
                profile_data.get("timezone", "Asia/Kolkata"),
                profile_data.get("visibility", "members"),
                profile_data.get("accent", "indigo"),
                1 if profile_data.get("notify_product", True) else 0,
                1 if profile_data.get("notify_mentions", True) else 0,
                1 if profile_data.get("notify_digest", False) else 0,
                now
            ))
            conn.commit()

            # Also persist an easily viewable JSON mirror in user directory
            safe_id = sanitize_user_id(user_id)
            user_dir = settings.MEMORY_DIR / "users" / safe_id
            json_file = user_dir / "profile.json"
            clean_record = {
                "user_id": user_id,
                "email": profile_data.get("email", ""),
                "display_name": profile_data.get("display_name", ""),
                "username": profile_data.get("username", ""),
                "avatar_url": profile_data.get("avatar_url"),
                "headline": profile_data.get("headline", ""),
                "bio": profile_data.get("bio", ""),
                "website": profile_data.get("website", ""),
                "timezone": profile_data.get("timezone", "Asia/Kolkata"),
                "visibility": profile_data.get("visibility", "members"),
                "accent": profile_data.get("accent", "indigo"),
                "notify_product": profile_data.get("notify_product", True),
                "notify_mentions": profile_data.get("notify_mentions", True),
                "notify_digest": profile_data.get("notify_digest", False),
                "updated_at": now
            }
            try:
                with open(json_file, "w", encoding="utf-8") as jf:
                    json.dump(clean_record, jf, indent=2)
            except Exception:
                pass

            return clean_record
        finally:
            conn.close()

    @staticmethod
    def get_custom_settings(user_id: str) -> Dict[str, Any]:
        conn = UserDatabaseService.get_connection(user_id)
        try:
            cursor = conn.cursor()
            cursor.execute("SELECT key, value FROM custom_settings")
            rows = cursor.fetchall()
            result = {}
            for r in rows:
                try:
                    result[r["key"]] = json.loads(r["value"])
                except Exception:
                    result[r["key"]] = r["value"]
            return result
        finally:
            conn.close()

    @staticmethod
    def save_custom_setting(user_id: str, key: str, value: Any):
        conn = UserDatabaseService.get_connection(user_id)
        try:
            cursor = conn.cursor()
            val_str = json.dumps(value) if not isinstance(value, str) else value
            now = get_utc_now_str()
            cursor.execute("""
                INSERT INTO custom_settings (key, value, updated_at) VALUES (?, ?, ?)
                ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at
            """, (key, val_str, now))
            conn.commit()
        finally:
            conn.close()
