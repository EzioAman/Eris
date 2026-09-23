# -*- mode: python ; coding: utf-8 -*-
import os
import sys
from pathlib import Path
from PyInstaller.utils.hooks import collect_data_files, collect_submodules, copy_metadata

block_cipher = None
PROJECT_ROOT = Path(os.path.abspath(".")).resolve()

# Collect submodules for dynamic engines
hidden_imports = []
for pkg in [
    "uvicorn",
    "fastapi",
    "starlette",
    "httpx",
    "httpcore",
    "anyio",
    "cryptography",
    "langgraph",
    "langchain_core",
    "langchain_google_genai",
    "langchain_openai",
    "google.genai",
    "aiosqlite",
    "asyncpg",
    "sqlalchemy",
    "pydantic",
    "pydantic_settings",
    "bcrypt",
    "dotenv",
    "email_validator",
]:
    try:
        hidden_imports.extend(collect_submodules(pkg))
    except Exception:
        hidden_imports.append(pkg)

# Explicit critical submodules
hidden_imports.extend([
    "uvicorn.logging",
    "uvicorn.loops",
    "uvicorn.loops.auto",
    "uvicorn.protocols",
    "uvicorn.protocols.http",
    "uvicorn.protocols.http.auto",
    "uvicorn.protocols.websockets",
    "uvicorn.protocols.websockets.auto",
    "uvicorn.lifespan",
    "uvicorn.lifespan.on",
    "langgraph.checkpoint.memory",
    "langgraph.graph.message",
    "langchain_core.utils.function_calling",
    "starlette.staticfiles",
    "backend.app.main",
    "backend.app.config",
    "backend.app.database",
    "backend.app.models",
    "backend.app.agent.llm_client",
    "backend.app.services.vault_service",
    "backend.app.services.rag_service",
    "backend.app.services.user_db_service",
])

# Data files to bundle (Zero personal memory, sessions, or environment files)
datas = [
    (str(PROJECT_ROOT / "frontend" / "dist"), "frontend/dist"),
    (str(PROJECT_ROOT / "tools"), "tools"),
    (str(PROJECT_ROOT / "assets"), "assets"),
    (str(PROJECT_ROOT / "doc"), "doc"),
    (str(PROJECT_ROOT / "docs"), "docs")
]

for pkg_data in ["cryptography", "langchain_core", "langgraph", "fastapi"]:
    try:
        datas.extend(collect_data_files(pkg_data))
    except Exception as ex:
        pass

a = Analysis(
    ["launcher.py"],
    pathex=[str(PROJECT_ROOT), str(PROJECT_ROOT / "backend")],
    binaries=[],
    datas=datas,
    hiddenimports=hidden_imports,
    hookspath=[],
    hooksconfig={},
    runtime_hooks=[],
    excludes=["tkinter", "matplotlib", "notebook", "IPython"],
    win_no_prefer_redirects=False,
    win_private_assemblies=False,
    cipher=block_cipher,
    noarchive=False,
)

pyz = PYZ(a.pure, a.zipped_data, cipher=block_cipher)

exe = EXE(
    pyz,
    a.scripts,
    [],
    exclude_binaries=True,
    name="eris_backend",
    debug=False,
    bootloader_ignore_signals=False,
    strip=False,
    upx=True,
    console=False,  # Headless mode by default: no console window
    disable_windowed_traceback=False,
    argv_emulation=False,
    target_arch=None,
    codesign_identity=None,
    entitlements_file=None,
)

coll = COLLECT(
    exe,
    a.binaries,
    a.zipfiles,
    a.datas,
    strip=False,
    upx=True,
    upx_exclude=[],
    name="eris_backend",
)
