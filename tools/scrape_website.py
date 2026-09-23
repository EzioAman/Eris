TOOL_NAME = "scrape_website"
TOOL_DESCRIPTION = "Scrapes text content or metadata from a given website URL. Args format: url"

import urllib.request
import urllib.error
from html.parser import HTMLParser
import ssl

class HTMLTextExtractor(HTMLParser):
    def __init__(self):
        super().__init__()
        self.text_accumulator = []
        self.in_script = False
        self.in_style = False

    def handle_starttag(self, tag, attrs):
        if tag.lower() in ['script', 'style']:
            if tag.lower() == 'script':
                self.in_script = True
            elif tag.lower() == 'style':
                self.in_style = True

    def handle_endtag(self, tag):
        if tag.lower() == 'script':
            self.in_script = False
        elif tag.lower() == 'style':
            self.in_style = False

    def handle_data(self, data):
        if not self.in_script and not self.in_style:
            stripped = data.strip()
            if stripped:
                self.text_accumulator.append(stripped)

def execute(args: str = "") -> str:
    if args == "__test_ping__":
        return "pong"
    
    url = args.strip()
    if not url:
        return "Error: No URL provided. Usage: scrape_website <url>"
    
    if not url.startswith("http://") and not url.startswith("https://"):
        url = "https://" + url

    try:
        req = urllib.request.Request(
            url,
            headers={"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) ErisCyberCompanion/1.0"}
        )
        ctx = ssl.create_default_context()
        ctx.check_hostname = False
        ctx.verify_mode = ssl.CERT_NONE
        
        with urllib.request.urlopen(req, context=ctx, timeout=10) as response:
            html_content = response.read().decode('utf-8', errors='ignore')
            
        parser = HTMLTextExtractor()
        parser.feed(html_content)
        extracted_text = "\n".join(parser.text_accumulator)
        
        max_len = 4000
        if len(extracted_text) > max_len:
            extracted_text = extracted_text[:max_len] + f"\n\n[Content truncated at {max_len} characters...]"
            
        return f"Successfully scraped {url}:\n\n{extracted_text}"
    except Exception as e:
        return f"Error scraping website {url}: {str(e)}"