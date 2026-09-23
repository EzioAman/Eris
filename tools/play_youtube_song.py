"""Tool: play_youtube_song
Created for ERIS Workspace.
"""

TOOL_NAME = "play_youtube_song"
TOOL_DESCRIPTION = "Searches and plays a song or video directly on YouTube. Primary path uses pywhatkit.playonyt; falls back to opening a YouTube search URL in the default browser. Args format: song_name"

import urllib.parse
import webbrowser


def _open_search_fallback(song: str) -> str:
    query = urllib.parse.quote_plus(song)
    url = f"https://www.youtube.com/results?search_query={query}"
    opened = webbrowser.open(url)
    if opened:
        return f"Opened YouTube search for '{song}' in your default browser: {url}"
    return f"Could not auto-open a browser. Open this URL manually: {url}"


def execute(args: str = "") -> str:
    if args == "__test_ping__":
        return "pong"

    song = (args or "").strip() or "Sunflower Post Malone"

    # Primary path: pywhatkit automated playback
    try:
        import pywhatkit
        result = pywhatkit.playonyt(song)
        if result:
            return f"Now playing '{song}' on YouTube: {result}"
        return f"Playback triggered for '{song}' on YouTube."
    except Exception as e:
        primary_error = str(e)

    # Fallback path: open a YouTube search URL directly
    try:
        fallback = _open_search_fallback(song)
        return f"pywhatkit failed ({primary_error}); fallback used. {fallback}"
    except Exception as e2:
        return (
            f"ERROR: Failed to play '{song}' on YouTube. "
            f"pywhatkit error: {primary_error}. Fallback error: {e2}"
        )