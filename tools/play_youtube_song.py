"""Tool: play_youtube_song
Created for ERIS Workspace.
"""

TOOL_NAME = "play_youtube_song"
TOOL_DESCRIPTION = (
    "Builds a YouTube search URL for a song or video and returns it as text. "
    "Does NOT open the browser by default; set open_browser=True to launch it. "
    "Args format: song_name [open_browser=true|false]"
)

import urllib.parse
import webbrowser


def execute(args: str = "") -> str:
    if args == "__test_ping__":
        return "pong"

    open_browser = False
    parts = [p.strip() for p in (args or "").split() if p.strip()]

    # Extract optional trailing open_browser flag
    if parts and parts[-1].lower() in ("open_browser=true", "open_browser=yes", "open_browser=1"):
        open_browser = True
        parts = parts[:-1]

    song = " ".join(parts) or "Sunflower Post Malone"
    query = urllib.parse.quote_plus(song)
    url = f"https://www.youtube.com/results?search_query={query}"

    if not open_browser:
        return (
            f"YouTube link for '{song}' (browser not opened): {url}\n"
            f"Say the word and I can open it for you."
        )

    try:
        opened = webbrowser.open(url)
        if opened:
            return f"Opened YouTube search for '{song}' in your default browser: {url}"
        return f"Browser launch requested. URL: {url}"
    except Exception as ex:
        return f"ERROR: Failed to open browser for '{song}': {ex}"