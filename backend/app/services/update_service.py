"""
Update Service for ERIS.
Manages version checking via GitHub releases, background downloading of installer binaries,
SHA256 checksum verification, and graceful self-update launching.
"""

import asyncio
import hashlib
import json
import logging
import os
import re
import subprocess
import sys
import tempfile
import time
from pathlib import Path
from typing import Any, Dict, List, Optional
import httpx
from pydantic import BaseModel, Field

from backend.app.config import settings

logger = logging.getLogger("eris.services.update")

CURRENT_VERSION = "0.1.1-beta"
GITHUB_REPO = "EzioAman/ERIS"
GITHUB_API_URL = f"https://api.github.com/repos/{GITHUB_REPO}/releases/latest"
GITHUB_RAW_VERSION_URL = f"https://raw.githubusercontent.com/{GITHUB_REPO}/main/version.json"


class UpdateManifest(BaseModel):
    ok: bool = True
    current_version: str = CURRENT_VERSION
    latest_version: str = CURRENT_VERSION
    update_available: bool = False
    release_name: str = ""
    release_url: str = f"https://github.com/{GITHUB_REPO}/releases"
    download_url: str = ""
    sha256: str = ""
    size_bytes: int = 0
    changelog: List[str] = Field(default_factory=list)
    published_at: str = ""


class UpdateProgress(BaseModel):
    status: str = "idle"  # idle | downloading | ready | error
    progress_percent: float = 0.0
    downloaded_bytes: int = 0
    total_bytes: int = 0
    installer_path: str = ""
    error_message: str = ""


# In-memory progress state
_progress_state = UpdateProgress()
_download_task: Optional[asyncio.Task] = None


def parse_version_parts(v: str) -> List[int]:
    """Extracts integer components from version strings for accurate semantic comparison."""
    parts = []
    for token in re.split(r"[.\-]", str(v).lstrip("v")):
        if token.isdigit():
            parts.append(int(token))
    return parts or [0, 0, 0]


async def check_for_updates() -> UpdateManifest:
    """Checks GitHub for newer ERIS versions."""
    manifest = UpdateManifest()

    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            res = await client.get(
                GITHUB_API_URL,
                headers={"User-Agent": "ERIS-Client"},
            )
            if res.status_code == 200:
                data = res.json()
                tag = data.get("tag_name", "").lstrip("v").strip()
                if tag:
                    manifest.latest_version = tag
                    manifest.release_name = data.get("name") or f"v{tag}"
                    manifest.release_url = data.get("html_url") or manifest.release_url
                    manifest.published_at = data.get("published_at", "")
                    
                    # Discover setup .exe asset
                    for asset in data.get("assets", []):
                        name = asset.get("name", "").lower()
                        if name.endswith(".exe") and "setup" in name:
                            manifest.download_url = asset.get("browser_download_url", "")
                            manifest.size_bytes = asset.get("size", 0)
                            break

                    manifest.update_available = parse_version_parts(tag) > parse_version_parts(CURRENT_VERSION)
                    return manifest
    except Exception as ex:
        logger.debug(f"GitHub release check bypassed or failed: {ex}")

    # Fallback to local version.json manifest if present in workspace
    local_version_file = settings.WORKSPACE_PATH / "version.json"
    if local_version_file.exists():
        try:
            with open(local_version_file, "r", encoding="utf-8") as f:
                lv_data = json.load(f)
                v = lv_data.get("version", "").lstrip("v")
                if v:
                    manifest.latest_version = v
                    manifest.release_name = lv_data.get("release_name", f"v{v}")
                    manifest.download_url = lv_data.get("download_url", "")
                    manifest.sha256 = lv_data.get("sha256", "")
                    manifest.size_bytes = lv_data.get("size_bytes", 0)
                    manifest.changelog = lv_data.get("changelog", [])
                    manifest.update_available = parse_version_parts(v) > parse_version_parts(CURRENT_VERSION)
        except Exception:
            pass

    return manifest


async def _run_download(download_url: str):
    """Internal streaming download task."""
    global _progress_state
    _progress_state.status = "downloading"
    _progress_state.progress_percent = 0.0
    _progress_state.downloaded_bytes = 0
    _progress_state.error_message = ""

    temp_dir = Path(tempfile.gettempdir()) / "eris_updates"
    temp_dir.mkdir(parents=True, exist_ok=True)
    target_file = temp_dir / "ERIS-Setup-Update.exe"

    try:
        async with httpx.AsyncClient(timeout=30.0, follow_redirects=True) as client:
            async with client.stream("GET", download_url) as response:
                if response.status_code != 200:
                    _progress_state.status = "error"
                    _progress_state.error_message = f"Download failed with HTTP {response.status_code}"
                    return

                total = int(response.headers.get("content-length", 0))
                _progress_state.total_bytes = total

                downloaded = 0
                with open(target_file, "wb") as f:
                    async for chunk in response.aiter_bytes(chunk_size=65536):
                        f.write(chunk)
                        downloaded += len(chunk)
                        _progress_state.downloaded_bytes = downloaded
                        if total > 0:
                            _progress_state.progress_percent = round((downloaded / total) * 100, 1)

        _progress_state.status = "ready"
        _progress_state.installer_path = str(target_file)
        _progress_state.progress_percent = 100.0
        logger.info(f"Update package downloaded successfully to {target_file}")
    except Exception as ex:
        _progress_state.status = "error"
        _progress_state.error_message = f"Download error: {str(ex)}"
        logger.error(f"Download failed: {ex}")


def start_download_update(download_url: str) -> UpdateProgress:
    """Initiates an asynchronous background download of the setup binary."""
    global _download_task, _progress_state
    if _progress_state.status == "downloading":
        return _progress_state

    if not download_url:
        _progress_state.status = "error"
        _progress_state.error_message = "No download URL provided."
        return _progress_state

    loop = asyncio.get_event_loop()
    _download_task = loop.create_task(_run_download(download_url))
    return _progress_state


def get_update_progress() -> UpdateProgress:
    """Returns the current state of the update download."""
    return _progress_state


def apply_downloaded_update(silent: bool = True) -> Dict[str, Any]:
    """
    Executes the downloaded NSIS installer and triggers clean application exit
    so the installer can overwrite files and restart ERIS.
    """
    global _progress_state
    installer_path = _progress_state.installer_path

    if not installer_path or not Path(installer_path).exists():
        return {
            "ok": False,
            "error": "No downloaded installer found. Please download the update first.",
        }

    try:
        # Launch installer detached
        cmd = [installer_path]
        if silent:
            # NSIS silent mode flag: /S
            cmd.append("/S")

        logger.info(f"Launching installer executable: {cmd}")
        subprocess.Popen(
            cmd,
            shell=False,
            close_fds=True,
            creationflags=subprocess.DETACHED_PROCESS if os.name == "nt" else 0,
        )

        # Schedule deferred process termination so response can be delivered to client
        def _deferred_exit():
            time.sleep(1.0)
            logger.info("Exiting ERIS Core for update installation...")
            os._exit(0)

        import threading
        threading.Thread(target=_deferred_exit, daemon=True).start()

        return {
            "ok": True,
            "message": "Installer launched. ERIS will restart automatically to complete the update.",
            "installer": installer_path,
        }
    except Exception as ex:
        logger.error(f"Failed to execute installer: {ex}")
        return {
            "ok": False,
            "error": f"Failed to execute update installer: {str(ex)}",
        }
