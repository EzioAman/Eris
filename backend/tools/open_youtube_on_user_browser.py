TOOL_NAME = "open_youtube_on_user_browser"
TOOL_DESCRIPTION = "Opens YouTube in the default web browser or searches/plays a video or song. Args: query (optional)"

import webbrowser
import urllib.parse

def execute(args: str = "") -> str:
    if args == "__test_ping__":
        return "pong"
    
    query = args.strip()
    if not query:
        # Generic YouTube homepage if no specific song is requested
        url = "https://www.youtube.com"
        webbrowser.open(url)
        return "Opened YouTube homepage successfully!"
    else:
        # Specific song/search request
        encoded_query = urllib.parse.quote(query)
        url = f"https://www.youtube.com/results?search_query={encoded_query}"
        webbrowser.open(url)
        return f"Searched and opened YouTube for: '{query}' successfully!"