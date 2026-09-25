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

def _resolve_writable_memory_dir(base_workspace: Path) -> Path:
    """Ensures memory store is writable, falling back to LocalAppData if Program Files is protected."""
    candidate = base_workspace / "memory"
    try:
        candidate.mkdir(parents=True, exist_ok=True)
        probe = candidate / ".probe_perm"
        probe.write_text("ok", encoding="utf-8")
        probe.unlink(missing_ok=True)
        return candidate
    except (OSError, PermissionError):
        pass

    local_app_data = os.environ.get("LOCALAPPDATA") or os.environ.get("APPDATA")
    if local_app_data:
        fallback = Path(local_app_data) / "ERIS" / "memory"
    else:
        fallback = Path.home() / ".eris" / "memory"

    try:
        fallback.mkdir(parents=True, exist_ok=True)
        return fallback
    except Exception:
        return candidate

def _resolve_tools_dir(base_workspace: Path) -> Path:
    """Discovers bundled tools in developmental or packaged PyInstaller layouts."""
    candidate = base_workspace / "tools"
    if candidate.exists():
        return candidate
    if getattr(sys, "frozen", False):
        exe_tools = Path(sys.executable).resolve().parent / "tools"
        if exe_tools.exists():
            return exe_tools
        internal_tools = Path(sys.executable).resolve().parent / "_internal" / "tools"
        if internal_tools.exists():
            return internal_tools
        meipass = getattr(sys, "_MEIPASS", None)
        if meipass and (Path(meipass) / "tools").exists():
            return Path(meipass) / "tools"
    return candidate

RESOLVED_MEMORY_DIR = _resolve_writable_memory_dir(WORKSPACE_DIR)
RESOLVED_TOOLS_DIR = _resolve_tools_dir(WORKSPACE_DIR)

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
    FALLBACK_SQLITE_URL: str = f"sqlite+aiosqlite:///{(RESOLVED_MEMORY_DIR / 'auth.db').as_posix()}"
    
    # Security
    SECRET_KEY: str = os.getenv("SECRET_KEY", "eris_runtime_master_secret_key_32bytes")
    SESSION_EXPIRE_DAYS: int = int(os.getenv("SESSION_EXPIRE_DAYS", "7"))
    OTP_EXPIRE_MINUTES: int = int(os.getenv("OTP_EXPIRE_MINUTES", "5"))
    MAX_OTP_ATTEMPTS: int = int(os.getenv("MAX_OTP_ATTEMPTS", "5"))

    # Directory Paths
    WORKSPACE_PATH: Path = WORKSPACE_DIR
    MEMORY_DIR: Path = RESOLVED_MEMORY_DIR
    TOOLS_DIR: Path = RESOLVED_TOOLS_DIR

    # SMTP Email Configuration
    SMTP_HOST: str = os.getenv("SMTP_HOST", "")
    SMTP_PORT: int = int(os.getenv("SMTP_PORT", "587"))
    SMTP_USER: str = os.getenv("SMTP_USER", "")
    SMTP_PASSWORD: str = os.getenv("SMTP_PASSWORD", "")
    EMAIL_FROM: str = os.getenv("EMAIL_FROM", "noreply@eris.ai")

    # LLM Provider API Keys
    GEMINI_API_KEY: str = os.getenv("GEMINI_API_KEY", "")
    OPENROUTER_API_KEY: str = os.getenv("OPENROUTER_API_KEY", "")

    # Observability & LLM Evaluations (LangSmith)
    LANGCHAIN_TRACING_V2: str = os.getenv("LANGCHAIN_TRACING_V2", "false")
    LANGCHAIN_ENDPOINT: str = os.getenv("LANGCHAIN_ENDPOINT", "https://api.smith.langchain.com")
    LANGCHAIN_API_KEY: str = os.getenv("LANGCHAIN_API_KEY", "") or os.getenv("LANGSMITH_API_KEY", "")
    LANGCHAIN_PROJECT: str = os.getenv("LANGCHAIN_PROJECT", "eris")

settings = Settings()

# Automatically propagate LLM and LangSmith keys to environment
if settings.GEMINI_API_KEY:
    os.environ["GEMINI_API_KEY"] = settings.GEMINI_API_KEY
if settings.OPENROUTER_API_KEY:
    os.environ["OPENROUTER_API_KEY"] = settings.OPENROUTER_API_KEY

if settings.LANGCHAIN_API_KEY:
    os.environ["LANGCHAIN_TRACING_V2"] = "true"
    os.environ["LANGCHAIN_ENDPOINT"] = settings.LANGCHAIN_ENDPOINT
    os.environ["LANGCHAIN_API_KEY"] = settings.LANGCHAIN_API_KEY
    os.environ["LANGCHAIN_PROJECT"] = settings.LANGCHAIN_PROJECT
