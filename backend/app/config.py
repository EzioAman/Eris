import os
import sys
from pathlib import Path
try:
    from dotenv import load_dotenv
except ImportError:
    load_dotenv = None

if getattr(sys, "frozen", False):
    # Packaged production binary
    exe_parents = list(Path(sys.executable).resolve().parents)
    if len(exe_parents) >= 3 and (exe_parents[1].name == "resources" or exe_parents[0].name == "backend"):
        WORKSPACE_DIR = exe_parents[2]  # Folder containing ERIS.exe
    else:
        WORKSPACE_DIR = Path(sys.executable).resolve().parent
else:
    # Development mode: Always resolve to project root
    WORKSPACE_DIR = Path(__file__).resolve().parent.parent.parent

ENV_FILE = WORKSPACE_DIR / ".env"
if load_dotenv and ENV_FILE.exists():
    load_dotenv(ENV_FILE)

try:
    from pydantic_settings import BaseSettings, SettingsConfigDict
except ImportError:
    from pydantic import BaseModel as BaseSettings
    SettingsConfigDict = dict

class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=str(ENV_FILE) if ENV_FILE and ENV_FILE.exists() else None,
        env_file_encoding="utf-8",
        extra="ignore"
    )

    # Core Runtime
    APP_NAME: str = "ERIS Backend"
    ENVIRONMENT: str = "development"
    PORT: int = 5174
    HOST: str = "127.0.0.1"

    # Database Configuration (Centralized PostgreSQL with SQLite Fallback)
    DATABASE_URL: str = "postgresql+asyncpg://postgres:postgres@localhost:5432/eris_db"
    FALLBACK_SQLITE_URL: str = f"sqlite+aiosqlite:///{WORKSPACE_DIR / 'memory' / 'auth.db'}"
    
    # Security
    SECRET_KEY: str = os.getenv("SECRET_KEY", "eris_runtime_master_secret_key_32bytes")
    SESSION_EXPIRE_DAYS: int = int(os.getenv("SESSION_EXPIRE_DAYS", "7"))
    OTP_EXPIRE_MINUTES: int = int(os.getenv("OTP_EXPIRE_MINUTES", "5"))
    MAX_OTP_ATTEMPTS: int = int(os.getenv("MAX_OTP_ATTEMPTS", "5"))

    # Directory Paths
    WORKSPACE_PATH: Path = WORKSPACE_DIR
    MEMORY_DIR: Path = WORKSPACE_DIR / "memory"
    TOOLS_DIR: Path = WORKSPACE_DIR / "tools"

    # SMTP Email Configuration
    SMTP_HOST: str = os.getenv("SMTP_HOST", "")
    SMTP_PORT: int = int(os.getenv("SMTP_PORT", "587"))
    SMTP_USER: str = os.getenv("SMTP_USER", "")
    SMTP_PASSWORD: str = os.getenv("SMTP_PASSWORD", "")
    EMAIL_FROM: str = os.getenv("EMAIL_FROM", "noreply@eris.ai")

settings = Settings()
