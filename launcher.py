import logging
import multiprocessing
import os
import subprocess
import sys
import threading
import time
import webbrowser
from pathlib import Path

# Configure standard streams early for Windows code pages (CP1252/CP437) and PyInstaller GUI mode
os.environ.setdefault("PYTHONIOENCODING", "utf-8")
os.environ.setdefault("PYTHONUTF8", "1")

if sys.stdout is not None:
    try:
        sys.stdout.reconfigure(encoding="utf-8", errors="replace")
    except (AttributeError, Exception):
        pass
else:
    sys.stdout = open(os.devnull, "w", encoding="utf-8")

if sys.stderr is not None:
    try:
        sys.stderr.reconfigure(encoding="utf-8", errors="replace")
    except (AttributeError, Exception):
        pass
else:
    sys.stderr = open(os.devnull, "w", encoding="utf-8")

# Ensure multiprocessing support in frozen executable
multiprocessing.freeze_support()

# Determine root path
if getattr(sys, "frozen", False):
    BASE_DIR = Path(sys.executable).resolve().parent
else:
    BASE_DIR = Path(__file__).resolve().parent

# Add backend directory to sys.path
backend_path = BASE_DIR / "backend"
if str(backend_path) not in sys.path:
    sys.path.insert(0, str(backend_path))
if str(BASE_DIR) not in sys.path:
    sys.path.insert(0, str(BASE_DIR))

os.environ["ERIS_SERVER_MODE"] = "1"
os.environ["ERIS_RUNTIME"] = "desktop"

import uvicorn
from backend.app.config import settings
from backend.app.main import app

logger = logging.getLogger("eris.launcher")


def open_desktop_window(url: str, delay: float = 1.2):
    """
    Opens the UI after the server has initialized.
    Attempts to launch in native app mode via Microsoft Edge or Google Chrome;
    falls back to standard browser.
    """
    time.sleep(delay)

    # 1. Try Microsoft Edge App Window (Frameless standalone desktop experience)
    edge_paths = [
        Path(os.environ.get("PROGRAMFILES(X86)", "C:\\Program Files (x86)")) / "Microsoft" / "Edge" / "Application" / "msedge.exe",
        Path(os.environ.get("PROGRAMFILES", "C:\\Program Files")) / "Microsoft" / "Edge" / "Application" / "msedge.exe",
    ]
    for ep in edge_paths:
        if ep.exists():
            try:
                subprocess.Popen([str(ep), f"--app={url}", "--new-window"])
                return
            except Exception:
                pass

    # 2. Try Google Chrome App Window
    chrome_paths = [
        Path(os.environ.get("PROGRAMFILES", "C:\\Program Files")) / "Google" / "Chrome" / "Application" / "chrome.exe",
        Path(os.environ.get("PROGRAMFILES(X86)", "C:\\Program Files (x86)")) / "Google" / "Chrome" / "Application" / "chrome.exe",
        Path(os.environ.get("LOCALAPPDATA", "")) / "Google" / "Chrome" / "Application" / "chrome.exe",
    ]
    for cp in chrome_paths:
        if cp.exists():
            try:
                subprocess.Popen([str(cp), f"--app={url}", "--new-window"])
                return
            except Exception:
                pass

    # 3. Fallback to default system browser
    webbrowser.open(url)


def main():
    if "--version" in sys.argv or "-v" in sys.argv:
        print(f"ERIS Core v0.1.1-beta (Python {sys.version.split()[0]})")
        return

    if "--help" in sys.argv or "-h" in sys.argv:
        print("ERIS Desktop Core Launcher")
        print("Usage: eris_backend.exe [--window] [--browser] [--port <PORT>] [--version] [--help]")
        return

    port = settings.PORT or 5174
    if "--port" in sys.argv:
        try:
            idx = sys.argv.index("--port")
            if idx + 1 < len(sys.argv):
                port = int(sys.argv[idx + 1])
        except (ValueError, IndexError):
            pass

    host = settings.HOST or "127.0.0.1"
    url = f"http://{host}:{port}"

    logger.info(f"Launching ERIS Desktop Core on {url}...")
    print(f"[*] Launching ERIS Desktop Core on {url}...")

    # Open app window ONLY if explicitly requested via flag or env var (headless by default)
    should_open_window = (
        "--window" in sys.argv
        or "--browser" in sys.argv
        or os.environ.get("ERIS_BROWSER") == "1"
        or os.environ.get("ERIS_OPEN_WINDOW") == "1"
    )
    if should_open_window:
        threading.Thread(target=open_desktop_window, args=(url,), daemon=True).start()

    # Start Uvicorn without reload (mandatory in frozen .exe)
    uvicorn.run(
        app,
        host=host,
        port=port,
        log_level="info",
    )


if __name__ == "__main__":
    try:
        main()
    except Exception as e:
        logger.critical(f"Fatal error during ERIS startup: {e}", exc_info=True)
        try:
            log_file = BASE_DIR / "eris_startup_error.log"
            with open(log_file, "a", encoding="utf-8") as f:
                import traceback
                f.write(f"\n--- ERIS Fatal Crash [{time.ctime()}] ---\n")
                traceback.print_exc(file=f)
        except Exception:
            pass
        raise
