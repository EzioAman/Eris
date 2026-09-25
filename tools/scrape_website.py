TOOL_NAME = "scrape_website"
TOOL_DESCRIPTION = "Scrapes text content, articles, or conversations from any website URL (including ChatGPT shared chats). Args format: url"

import re
import json
import ssl
import urllib.request
import urllib.error
from html.parser import HTMLParser
from typing import Optional, List, Dict, Any

class HTMLTextExtractor(HTMLParser):
    def __init__(self):
        super().__init__()
        self.text_accumulator = []
        self.in_script = False
        self.in_style = False

    def handle_starttag(self, tag, attrs):
        if tag.lower() in ['script', 'style', 'noscript', 'svg']:
            self.in_script = True

    def handle_endtag(self, tag):
        if tag.lower() in ['script', 'style', 'noscript', 'svg']:
            self.in_script = False

    def handle_data(self, data):
        if not self.in_script:
            stripped = data.strip()
            if stripped:
                self.text_accumulator.append(stripped)


def _scrape_chatgpt_share(url: str) -> Optional[str]:
    """Extracts conversations from public ChatGPT share links using the anonymous API."""
    match = re.search(r"chat(?:gpt)?\.(?:com|openai\.com)/share/([a-zA-Z0-9\-]+)", url)
    if not match:
        return None

    share_id = match.group(1)
    endpoints = [
        f"https://chatgpt.com/backend-anon/share/{share_id}",
        f"https://chatgpt.com/backend-api/share/{share_id}",
    ]

    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
        "Accept": "application/json"
    }

    try:
        import httpx
        with httpx.Client(headers=headers, timeout=12.0) as client:
            for ep in endpoints:
                try:
                    res = client.get(ep)
                    if res.status_code == 200:
                        data = res.json()
                        title = data.get("title", "ChatGPT Conversation")
                        mapping = data.get("mapping", {})
                        
                        turns = []
                        for node in mapping.values():
                            msg = node.get("message")
                            if not msg:
                                continue
                            author = msg.get("author", {}).get("role", "unknown")
                            content = msg.get("content", {})
                            parts = content.get("parts", [])
                            text_parts = [p for p in parts if isinstance(p, str) and p.strip()]
                            if text_parts and author in ("user", "assistant"):
                                turns.append(f"### {author.upper()}:\n{' '.join(text_parts)}")

                        if turns:
                            body = "\n\n".join(turns)
                            max_len = 12000
                            if len(body) > max_len:
                                body = body[:max_len] + f"\n\n[Conversation truncated at {max_len} characters... Total messages: {len(turns)}]"
                            return f"Successfully extracted ChatGPT Shared Conversation: '{title}' ({len(turns)} messages)\n\n{body}"
                except Exception:
                    continue
    except Exception:
        pass

    return None


def execute(args: str = "") -> str:
    if args == "__test_ping__":
        return "pong"
    
    url = args.strip()
    if not url:
        return "Error: No URL provided. Usage: scrape_website <url>"
    
    if not url.startswith("http://") and not url.startswith("https://"):
        url = "https://" + url

    # 1. Specialized handler for ChatGPT shared conversations
    if "chatgpt.com/share" in url or "chat.openai.com/share" in url:
        chatgpt_result = _scrape_chatgpt_share(url)
        if chatgpt_result:
            return chatgpt_result

    # 2. General web scraping via HTTP client
    try:
        try:
            import httpx
            headers = {
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
                "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8"
            }
            with httpx.Client(headers=headers, timeout=12.0, follow_redirects=True) as client:
                resp = client.get(url)
                html_content = resp.text
        except Exception:
            # Fallback to standard library urllib
            req = urllib.request.Request(
                url,
                headers={"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"}
            )
            ctx = ssl.create_default_context()
            ctx.check_hostname = False
            ctx.verify_mode = ssl.CERT_NONE
            with urllib.request.urlopen(req, context=ctx, timeout=12) as response:
                html_content = response.read().decode('utf-8', errors='ignore')

        parser = HTMLTextExtractor()
        parser.feed(html_content)
        extracted_text = "\n".join(parser.text_accumulator)
        
        max_len = 8000
        if len(extracted_text) > max_len:
            extracted_text = extracted_text[:max_len] + f"\n\n[Content truncated at {max_len} characters...]"
            
        return f"Successfully scraped {url}:\n\n{extracted_text}"
    except Exception as e:
        return f"Error scraping website {url}: {str(e)}"


if __name__ == "__main__":
    import sys
    test_url = sys.argv[1] if len(sys.argv) > 1 else "https://chatgpt.com/share/6ab698db-54ac-83ee-844c-7433b3259373"
    print(execute(test_url)[:600])