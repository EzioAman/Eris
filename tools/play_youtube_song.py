"""Tool: play_youtube_song
Created for ERIS Workspace.
"""

TOOL_NAME = "play_youtube_song"
TOOL_DESCRIPTION = "Searches and plays a song or video directly on YouTube. Primary path uses pywhatkit.playonyt; falls back to opening a YouTube search URL in the default browser. Args format: song_name"

import urllib.parse
import webbrowser


def execute(args: str = "") -> str:
    if args == "__test_ping__":
        return "pong"

    song = (args or "").strip() or "Sunflower Post Malone"
    query = urllib.parse.quote_plus(song)
    url = f"https://www.youtube.com/results?search_query={query}"
    
    try:
        opened = webbrowser.open(url)
        if opened:
            return f"Opened YouTube search for '{song}' in your default browser: {url}"
        return f"Browser launch requested. URL: {url}"
    except Exception as ex:
        return f"ERROR: Failed to open browser for '{song}': {ex}"