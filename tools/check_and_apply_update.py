"""Autonomous Tool: check_and_apply_update
Created for ERIS Workspace.
Enables ERIS to inspect GitHub releases, download new versions, and self-update her own runtime.
"""

import asyncio
import json
import logging
import sys
from pathlib import Path

# Ensure repository root is on sys.path for direct tool execution
REPO_ROOT = Path(__file__).resolve().parent.parent
if str(REPO_ROOT) not in sys.path:
    sys.path.insert(0, str(REPO_ROOT))

from backend.app.services.update_service import (
    check_for_updates,
    start_download_update,
    get_update_progress,
    apply_downloaded_update,
)

logger = logging.getLogger("eris.tools.updater")

TOOL_NAME = "check_and_apply_update"
TOOL_DESCRIPTION = "Checks for ERIS updates, downloads the setup installer, or triggers autonomous self-update installation. Args: 'check' | 'download' | 'apply' | 'status'"


def execute(args: str = "check") -> str:
    if args == "__test_ping__":
        return "pong"

    mode = (args or "check").strip().lower()

    if mode in ("check", "info", "verify"):
        try:
            loop = asyncio.get_event_loop()
        except RuntimeError:
            loop = asyncio.new_event_loop()
            asyncio.set_event_loop(loop)

        manifest = loop.run_until_complete(check_for_updates())
        if manifest.update_available:
            return (
                f"Update Available: ERIS v{manifest.latest_version} (Current: v{manifest.current_version}).\n"
                f"Release Name: {manifest.release_name}\n"
                f"Download Size: {round(manifest.size_bytes / (1024 * 1024), 1)} MB\n"
                f"Download URL: {manifest.download_url}\n"
                f"Run with 'download' or click 'Update now' in UI to install."
            )
        return f"ERIS is up to date (Running v{manifest.current_version}). Latest release on GitHub is v{manifest.latest_version}."

    elif mode in ("download", "install", "update"):
        try:
            loop = asyncio.get_event_loop()
        except RuntimeError:
            loop = asyncio.new_event_loop()
            asyncio.set_event_loop(loop)

        manifest = loop.run_until_complete(check_for_updates())
        if not manifest.download_url:
            return f"Cannot download update: No installer asset discovered for v{manifest.latest_version}."

        start_download_update(manifest.download_url)
        return f"Started background download of ERIS v{manifest.latest_version} installer ({round(manifest.size_bytes / (1024 * 1024), 1)} MB)."

    elif mode in ("status", "progress"):
        prog = get_update_progress()
        return (
            f"Update Status: {prog.status.upper()}\n"
            f"Progress: {prog.progress_percent}%\n"
            f"Downloaded: {round(prog.downloaded_bytes / (1024 * 1024), 1)} MB / {round(prog.total_bytes / (1024 * 1024), 1)} MB\n"
            f"Installer: {prog.installer_path or 'None'}"
        )

    elif mode in ("apply", "restart"):
        res = apply_downloaded_update(silent=True)
        if res.get("ok"):
            return "Executing update installer and restarting ERIS cleanly..."
        return f"Failed to apply update: {res.get('error')}"

    return f"Unknown update action '{args}'. Valid actions: check, download, status, apply."


if __name__ == "__main__":
    action = sys.argv[1] if len(sys.argv) > 1 else "check"
    print(execute(action))

