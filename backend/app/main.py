import os
import sys
from pathlib import Path
import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

# Ensure UTF-8 stream output on Windows platforms
if sys.stdout is not None:
    try:
        sys.stdout.reconfigure(encoding="utf-8", errors="replace")
    except (AttributeError, Exception):
        pass
if sys.stderr is not None:
    try:
        sys.stderr.reconfigure(encoding="utf-8", errors="replace")
    except (AttributeError, Exception):
        pass

from backend.app.config import settings
from backend.app.database import db_manager
from backend.app.api import auth, system, workspace, websocket, workflows, connectors, chat, contact, plugins, tools, settings_api, keys_api

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s"
)
logger = logging.getLogger("eris.main")

@asynccontextmanager
async def lifespan(app: FastAPI):
    os.environ["ERIS_SERVER_MODE"] = "1"
    os.environ["ERIS_RUNTIME"] = "server"
    logger.info("Starting ERIS Backend (Server Mode)...")
    await db_manager.initialize()
    logger.info("Runtime initialized successfully.")
    yield
    logger.info("Initiating graceful shutdown...")
    await db_manager.close()
    logger.info("Shutdown complete.")

app = FastAPI(
    title=settings.APP_NAME,
    version="0.1.1-beta",
    lifespan=lifespan
)

# CORS configuration for Frontend & Tauri
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:5174",
        "http://127.0.0.1:5174",
        "tauri://localhost",
        "*"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Prevent aggressive webview/browser disk caching of frontend bundles
@app.middleware("http")
async def add_no_cache_headers(request, call_next):
    response = await call_next(request)
    path = request.url.path
    if path == "/" or path.endswith(".html") or path.endswith(".js"):
        response.headers["Cache-Control"] = "no-cache, no-store, must-revalidate"
        response.headers["Pragma"] = "no-cache"
        response.headers["Expires"] = "0"
    return response

# Mount API Routers
app.include_router(auth.router)
app.include_router(auth.user_router)
app.include_router(system.router)
app.include_router(workspace.router)
app.include_router(websocket.router)
app.include_router(workflows.router)
app.include_router(connectors.router)
app.include_router(plugins.router)
app.include_router(tools.router)
app.include_router(chat.router)
app.include_router(contact.router)
app.include_router(settings_api.router)
app.include_router(keys_api.router)

# Mount Frontend Dist if built
frontend_dist = settings.WORKSPACE_PATH / "frontend" / "dist"
if not frontend_dist.exists() and getattr(sys, "frozen", False):
    base_path = Path(getattr(sys, "_MEIPASS", str(settings.WORKSPACE_PATH)))
    frontend_dist = base_path / "frontend" / "dist"

if frontend_dist.exists():
    from fastapi.staticfiles import StaticFiles
    app.mount("/", StaticFiles(directory=str(frontend_dist), html=True), name="frontend")
else:
    @app.get("/")
    async def root():
        return {
            "status": "online",
            "app": settings.APP_NAME,
            "database": db_manager.active_db_type,
            "docs": "/docs"
        }
