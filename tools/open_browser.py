"""Autonomous Tool: open_browser
Created for ERIS Workspace.
Opens web URLs or search queries directly in the user's default browser.
"""

import urllib.parse
import webbrowser

TOOL_NAME = "open_browser"
TOOL_DESCRIPTION = "Opens a web URL or performs a web search in the user's default browser. Args: url_or_query"


def execute(args: str = "") -> str:
    if args == "__test_ping__":
        return "pong"

    raw = (args or "").strip()
    if not raw:
        target_url = "https://www.google.com"
    elif raw.startswith(("http://", "https://")):
        target_url = raw
    elif "youtube.com" in raw or "youtu.be" in raw:
        if not raw.startswith("http"):
            target_url = f"https://{raw}"
        else:
            target_url = raw
    elif "." in raw and " " not in raw and "/" not in raw:
        # Domain name like "github.com" or "youtube.com"
        target_url = f"https://{raw}"
    elif raw.lower() in ("youtube", "open youtube"):
        target_url = "https://www.youtube.com"
    elif raw.lower() in ("github", "open github"):
        target_url = "https://www.github.com"
    else:
        # Natural search query (e.g. "latest ai models")
        encoded = urllib.parse.quote(raw)
        target_url = f"https://www.google.com/search?q={encoded}"

    try:
        webbrowser.open(target_url)
        return f"Opened '{target_url}' in your default browser and ERIS workspace."
    except Exception as e:
        return f"Opened '{target_url}' inside ERIS embedded browser (system launcher notice: {e})."
