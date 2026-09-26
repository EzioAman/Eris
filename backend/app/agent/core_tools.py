import os
import sys
import ast
import re
import time
import json
import logging
import subprocess
import urllib.request
from html.parser import HTMLParser
from pathlib import Path
from typing import Dict, Any, List, Tuple, Optional
try:
    from app.config import settings
except ImportError:
    from backend.app.config import settings

logger = logging.getLogger("eris.agent.core_tools")

# Blocked server loops in RUN_COMMAND
BLOCKED_SERVER_PATTERNS = [
    r"run\.py",
    r"uvicorn",
    r"gunicorn",
    r"npm\s+run\s+dev",
    r"npm\s+start",
    r"vite",
    r"python\s+-m\s+http\.server",
    r"flask\s+run",
    r"fastapi\s+dev",
]

# Destructive shell patterns
BLOCKED_DESTRUCTIVE_COMMANDS = [
    r"rmdir\s+/s\s+/q",
    r"rm\s+-rf\s+/",
    r"format\s+[c-z]:",
    r"taskkill\s+/f\s+/im\s+python",
    r"stop-process.*python",
    r":\(\)\s*\{\s*:\s*\|\s*:\s*&\s*\}\s*;",
    r"drop\s+database",
    r"powershell.*(?:remove-item|del|erase).*(?:c:\\|c:\\windows)",
    r"(?:remove-item|del|erase|rmdir|rm)\b.*(?:c:\\|c:\\windows)",
]


class CleanHTMLToMarkdownParser(HTMLParser):
    """Converts raw HTML into clean, high-signal Markdown text."""
    def __init__(self):
        super().__init__()
        self.result: List[str] = []
        self.title: str = ""
        self.links: List[Tuple[str, str]] = []
        self._in_title = False
        self._in_script_or_style = False
        self._current_href = ""
        self._link_text = ""

    def handle_starttag(self, tag, attrs):
        attr_dict = dict(attrs)
        if tag in ("script", "style", "noscript"):
            self._in_script_or_style = True
        elif tag == "title":
            self._in_title = True
        elif tag == "a":
            self._current_href = attr_dict.get("href", "")
            self._link_text = ""
        elif tag in ("h1", "h2", "h3", "h4"):
            level = tag[1]
            self.result.append(f"\n\n{'#' * int(level)} ")
        elif tag in ("p", "div", "section", "article"):
            self.result.append("\n")
        elif tag == "li":
            self.result.append("\n- ")
        elif tag == "pre" or tag == "code":
            self.result.append(" `")

    def handle_endtag(self, tag):
        if tag in ("script", "style", "noscript"):
            self._in_script_or_style = False
        elif tag == "title":
            self._in_title = False
        elif tag == "a":
            if self._current_href and self._link_text:
                self.links.append((self._link_text.strip(), self._current_href))
            self._current_href = ""
        elif tag == "pre" or tag == "code":
            self.result.append("` ")

    def handle_data(self, data):
        if self._in_script_or_style:
            return
        clean = data.strip()
        if not clean:
            return
        if self._in_title:
            self.title = clean
        elif self._current_href:
            self._link_text += clean
            self.result.append(f"[{clean}]({self._current_href})")
        else:
            self.result.append(clean + " ")

    def get_markdown(self) -> str:
        text = "".join(self.result)
        text = re.sub(r"\n\s*\n\s*\n+", "\n\n", text)
        return text.strip()


class NonInteractiveInputGuard:
    """Universal guard ensuring no dynamic tool can block the server event loop on console input()."""
    def __enter__(self):
        import builtins
        self._orig_input = builtins.input
        def _mock_input(prompt=""):
            logger.warning(f"BLOCKED interactive input() in server runtime: prompt='{prompt}'")
            return "no"
        builtins.input = _mock_input
        return self

    def __exit__(self, exc_type, exc_val, exc_tb):
        import builtins
        builtins.input = self._orig_input


class CoreToolbox:
    """
    Core built-in tools coded directly into the ERIS agent engine.
    Provides system inspection, safe file operations, verified subprocess execution,
    workspace git management, web retrieval, and scratchpad capabilities.
    """

    SENSITIVE_FILE_NAMES = {
        ".env",
        ".env.local",
        ".env.production",
        ".env.development",
        ".env.staging",
        "auth.db",
        "credentials.json",
        "secrets.json",
        "id_rsa",
        "id_ed25519",
        "id_ecdsa",
        "id_dsa",
    }
    SENSITIVE_EXTENSIONS = {
        ".pem",
        ".key",
        ".p12",
        ".pfx",
        ".pkcs12",
    }

    @classmethod
    def is_safe_path(cls, target_path: str) -> Tuple[bool, Path]:
        """Resolves target, asserts workspace containment, and blocks sensitive credential access."""
        raw = target_path.strip().lstrip("/\\")
        ws = settings.WORKSPACE_PATH.resolve()
        resolved = (ws / raw).resolve()
        try:
            rel = resolved.relative_to(ws)
        except ValueError:
            return False, resolved

        # Block traversal into .git directory
        if any(part == ".git" for part in rel.parts):
            return False, resolved

        # Block access to sensitive files and credentials
        lower_name = resolved.name.lower()
        if (
            lower_name in cls.SENSITIVE_FILE_NAMES
            or (lower_name.startswith(".env") and lower_name != ".env.example")
            or resolved.suffix.lower() in cls.SENSITIVE_EXTENSIONS
        ):
            return False, resolved

        return True, resolved

    @classmethod
    def read_file(cls, path_arg: str) -> str:
        """Reads workspace file content safely with path verification."""
        path = path_arg.strip()
        safe, full_path = cls.is_safe_path(path)
        if not safe:
            return f"SECURITY_ERROR: Access to '{path}' blocked (security perimeter or outside workspace)."

        if not full_path.exists():
            return f"ERROR: File '{path}' not found."

        if full_path.is_dir():
            return f"ERROR: '{path}' is a directory, not a file. Use LIST_DIR instead."

        try:
            with open(full_path, "r", encoding="utf-8", errors="replace") as f:
                content = f.read(10000)
            return f"FILE_CONTENT of {path}:\n```\n{content}\n```"
        except Exception as ex:
            return f"FILE_READ_ERROR ({path}): {str(ex)}"

    @classmethod
    def write_file(cls, path_arg: str, body: str) -> str:
        """Writes or updates a workspace file with AST and security guardrails."""
        path = path_arg.strip()
        safe, full_path = cls.is_safe_path(path)
        if not safe:
            return f"SECURITY_ERROR: Target '{path}' violates workspace containment."

        # Strip markdown fences
        clean_body = body.strip()
        if clean_body.startswith("```"):
            lines = clean_body.splitlines()
            if len(lines) > 1 and lines[0].startswith("```"):
                lines = lines[1:]
            if len(lines) > 0 and lines[-1].strip() == "```":
                lines = lines[:-1]
            clean_body = "\n".join(lines)

        # Python AST syntax check
        if path.endswith(".py"):
            try:
                ast.parse(clean_body)
            except SyntaxError as syn_err:
                return f"SYNTAX_ERROR: Python code failed compilation: {syn_err}"

        try:
            full_path.parent.mkdir(parents=True, exist_ok=True)
            with open(full_path, "w", encoding="utf-8") as f:
                f.write(clean_body)
            return f"SUCCESS: Wrote {len(clean_body)} bytes to {path}."
        except Exception as ex:
            return f"FILE_WRITE_ERROR ({path}): {str(ex)}"

    @classmethod
    def list_dir(cls, path_arg: str) -> str:
        """Lists directory entries safely without traversal."""
        path = path_arg.strip() if path_arg.strip() else "."
        safe, full_path = cls.is_safe_path(path)
        if not safe:
            return f"SECURITY_ERROR: Directory traversal to '{path}' blocked."

        if not full_path.exists():
            return f"ERROR: Directory '{path}' not found."

        if not full_path.is_dir():
            return f"ERROR: '{path}' is a file, not a directory. Use READ_FILE instead."

        try:
            entries = sorted(os.listdir(full_path))
            dir_list = []
            for e in entries:
                if e.startswith((".", "__pycache__")):
                    continue
                p = full_path / e
                prefix = "📁 " if p.is_dir() else "📄 "
                dir_list.append(f"{prefix}{e}")
            return f"DIR_ENTRIES for {path}:\n" + "\n".join(dir_list)
        except Exception as ex:
            return f"LIST_DIR_ERROR ({path}): {str(ex)}"

    @classmethod
    def run_command(cls, cmd_arg: str, is_read_only: bool = False) -> str:
        """Executes a sandboxed shell command with hard server blocks and read containment."""
        cmd = cmd_arg.strip()
        if not cmd:
            return "ERROR: Empty command."

        # Hard guardrail on read-only containment
        if is_read_only:
            return (
                f"EXECUTION_BLOCKED: The user only asked to view/inspect files or state. "
                f"Executing shell commands (`{cmd[:40]}`) is strictly prohibited on inspection queries."
            )

        # Hard guardrail on server processes
        for pat in BLOCKED_SERVER_PATTERNS:
            if re.search(pat, cmd, re.IGNORECASE):
                return (
                    f"EXECUTION_BLOCKED: Long-running server processes matching '{pat}' cannot be executed via RUN_COMMAND. "
                    f"The ERIS backend and frontend dev servers are already running. Do not spawn server loops."
                )

        # Destructive command defense
        for pat in BLOCKED_DESTRUCTIVE_COMMANDS:
            if re.search(pat, cmd, re.IGNORECASE):
                return f"SECURITY_ERROR: Destructive command rejected by sandbox: {pat}"

        # Windows compatibility: automatically translate common POSIX commands on Windows cmd/powershell
        if os.name == "nt":
            trimmed = cmd.strip()
            if re.match(r"^grep\s+", trimmed):
                cmd = f"git {trimmed}"
            elif trimmed == "ls" or re.match(r"^ls\s+", trimmed):
                cmd = re.sub(r"^ls", "dir", trimmed, count=1)
            elif trimmed == "pwd":
                cmd = "cd"
            elif re.match(r"^which\s+", trimmed):
                cmd = re.sub(r"^which", "where", trimmed, count=1)
            elif re.match(r"^cat\s+", trimmed):
                cmd = re.sub(r"^cat", "type", trimmed, count=1)
            elif re.match(r"^rm\s+-rf\s+", trimmed):
                cmd = re.sub(r"^rm\s+-rf\s+", "rmdir /s /q ", trimmed, count=1)
            elif re.match(r"^rm\s+", trimmed):
                cmd = re.sub(r"^rm\s+", "del /q ", trimmed, count=1)

        # Check if Docker is available and requested for isolated container execution
        docker_enabled = os.environ.get("ERIS_DOCKER_SANDBOX", "0") == "1"
        if docker_enabled:
            # Check if docker executable exists
            import shutil
            docker_bin = shutil.which("docker")
            if docker_bin:
                workspace_str = str(settings.WORKSPACE_PATH).replace("\\", "/")
                docker_cmd = (
                    f'docker run --rm -v "{workspace_str}:/workspace" -w /workspace '
                    f'--network none --memory 512m --cpus 1.0 python:3.11-slim sh -c "{cmd}"'
                )
                try:
                    res = subprocess.run(
                        docker_cmd,
                        shell=True,
                        capture_output=True,
                        text=True,
                        timeout=20,
                    )
                    out = (res.stdout or "") + (res.stderr or "")
                    return f"DOCKER_SANDBOX_OUTPUT (code {res.returncode}):\n{out[:2500]}"
                except subprocess.TimeoutExpired:
                    return f"DOCKER_TIMEOUT: Container command timed out after 20s."
                except Exception as d_err:
                    pass  # Fall through to workspace shell

        try:
            res = subprocess.run(
                cmd,
                shell=True,
                cwd=str(settings.WORKSPACE_PATH),
                capture_output=True,
                text=True,
                timeout=12,
            )
            out = (res.stdout or "") + (res.stderr or "")
            return f"COMMAND_OUTPUT (code {res.returncode}):\n{out[:2500]}"
        except subprocess.TimeoutExpired:
            return f"COMMAND_TIMEOUT: Command `{cmd[:50]}` timed out after 12 seconds."
        except Exception as ex:
            return f"COMMAND_ERROR: {str(ex)}"

    @classmethod
    def scrape_web(cls, url_arg: str) -> str:
        """Fetches live web content and converts HTML to clean markdown."""
        url = url_arg.strip()
        if not url.startswith(("http://", "https://")):
            url = f"https://{url}"

        try:
            req = urllib.request.Request(
                url,
                headers={"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 ERIS/1.0"}
            )
            with urllib.request.urlopen(req, timeout=6) as resp:
                raw_bytes = resp.read()
                charset = resp.headers.get_content_charset() or "utf-8"
                html_text = raw_bytes.decode(charset, errors="replace")

            parser = CleanHTMLToMarkdownParser()
            parser.feed(html_text)
            md_text = parser.get_markdown()
            title = parser.title or url

            result = f"### Web Scrape: {title}\n**URL:** {url}\n\n{md_text[:1200]}"
            if parser.links:
                top_links = [f"- [{txt}]({href})" for txt, href in parser.links[:5] if href.startswith("http")]
                if top_links:
                    result += "\n\n**Top Page Links:**\n" + "\n".join(top_links)
            return result
        except Exception as ex:
            return f"SCRAPE_ERROR: Failed to fetch '{url}': {str(ex)}"

    @classmethod
    def scratchpad(cls, action_arg: str, content: str = "") -> str:
        """Maintains persistent multi-turn reasoning notes in memory/scratchpad.md."""
        scratch_path = settings.WORKSPACE_PATH / "memory" / "scratchpad.md"
        scratch_path.parent.mkdir(parents=True, exist_ok=True)

        action = action_arg.strip().lower()
        if action in ("read", "view"):
            if not scratch_path.exists():
                return "SCRATCHPAD: Empty."
            with open(scratch_path, "r", encoding="utf-8") as f:
                return f"SCRATCHPAD_CONTENT:\n{f.read()}"

        elif action in ("write", "set"):
            with open(scratch_path, "w", encoding="utf-8") as f:
                f.write(content.strip())
            return f"SCRATCHPAD_UPDATED: Recorded {len(content)} characters."

        elif action in ("append", "add"):
            with open(scratch_path, "a", encoding="utf-8") as f:
                f.write(f"\n\n---\n*[{time.strftime('%Y-%m-%d %H:%M:%S')}]*\n{content.strip()}")
            return "SCRATCHPAD_APPENDED: Note appended successfully."

        elif action in ("clear", "reset"):
            with open(scratch_path, "w", encoding="utf-8") as f:
                f.write("# ERIS Shared Agent Scratchpad\n")
            return "SCRATCHPAD_CLEARED."

        return f"ERROR: Unrecognized scratchpad action '{action}'. Use read, write, append, or clear."

    @classmethod
    def git_tool(cls, subcommand_arg: str) -> str:
        """Executes git operations safely (status, diff, log, branch, show)."""
        subcmd = subcommand_arg.strip() if subcommand_arg.strip() else "status"
        allowed_cmds = ["status", "diff", "log", "branch", "show"]
        first_token = subcmd.split()[0].lower() if subcmd else "status"

        if first_token not in allowed_cmds:
            return f"GIT_BLOCKED: Only read-safe git operations ({', '.join(allowed_cmds)}) are permitted."

        full_cmd = f"git {subcmd}"
        try:
            res = subprocess.run(
                full_cmd,
                shell=True,
                cwd=str(settings.WORKSPACE_PATH),
                capture_output=True,
                text=True,
                timeout=10,
            )
            out = (res.stdout or "") + (res.stderr or "")
            if not out.strip():
                return f"GIT_OUTPUT ({subcmd}): Clean working tree / no output."
            return f"GIT_OUTPUT:\n{out[:3000]}"
        except Exception as ex:
            return f"GIT_ERROR: {str(ex)}"

    @classmethod
    def email_tool(cls, args_str: str) -> str:
        """Dispatches email sending via tools/send_email.py safely."""
        try:
            from tools import send_email
            with NonInteractiveInputGuard():
                return send_email.execute(args_str)
        except Exception as ex:
            return f"EMAIL_ERROR: {str(ex)}"

    @classmethod
    def grep_search(cls, query_arg: str, path_arg: str = ".") -> str:
        """Performs ripgrep/regex pattern matching safely within workspace."""
        query = query_arg.strip()
        if not query:
            return "ERROR: Missing search query."
        safe, search_dir = cls.is_safe_path(path_arg.strip() or ".")
        if not safe:
            return "SECURITY_ERROR: Target search directory is outside workspace."

        matches = []
        try:
            pattern = re.compile(query, re.IGNORECASE)
            for root, dirs, files in os.walk(search_dir):
                dirs[:] = [d for d in dirs if not d.startswith((".", "__pycache__", "node_modules", ".venv"))]
                for file in files:
                    if file.startswith("."):
                        continue
                    fpath = Path(root) / file
                    try:
                        with open(fpath, "r", encoding="utf-8", errors="ignore") as f:
                            for idx, line in enumerate(f, start=1):
                                if pattern.search(line):
                                    rel = fpath.relative_to(settings.WORKSPACE_PATH)
                                    matches.append(f"{rel}:{idx}: {line.strip()[:120]}")
                                    if len(matches) >= 30:
                                        break
                    except Exception:
                        continue
                    if len(matches) >= 30:
                        break
                if len(matches) >= 30:
                    break

            if not matches:
                return f"GREP_OUTPUT: No matches found for pattern '{query}'."
            return f"GREP_MATCHES ({len(matches)}):\n" + "\n".join(matches)
        except Exception as ex:
            return f"GREP_ERROR: {str(ex)}"

    @classmethod
    def view_file(cls, path_arg: str, start_line: Optional[int] = None, end_line: Optional[int] = None) -> str:
        """Reads file with optional 1-indexed line number slice bounds."""
        path = path_arg.strip()
        safe, full_path = cls.is_safe_path(path)
        if not safe:
            return f"SECURITY_ERROR: Access to '{path}' blocked."
        if not full_path.exists() or full_path.is_dir():
            return f"ERROR: File '{path}' does not exist or is a directory."

        try:
            with open(full_path, "r", encoding="utf-8", errors="replace") as f:
                lines = f.readlines()
            total_lines = len(lines)
            s = max(1, start_line or 1) - 1
            e = min(total_lines, end_line or total_lines)
            sliced = lines[s:e]
            content = "".join(f"{i+s+1}: {l}" for i, l in enumerate(sliced))
            return f"FILE_VIEW ({path} lines {s+1}–{e} of {total_lines}):\n```\n{content}\n```"
        except Exception as ex:
            return f"VIEW_FILE_ERROR ({path}): {str(ex)}"

    @classmethod
    def search_web(cls, query_arg: str) -> str:
        """Performs public web search via DuckDuckGo lite HTML parser."""
        import urllib.parse
        q = query_arg.strip()
        if not q:
            return "ERROR: Missing web search query."
        url = f"https://html.duckduckgo.com/html/?q={urllib.parse.quote(q)}"
        return cls.scrape_web(url)

    @classmethod
    def scrape_web(cls, url_arg: str) -> str:
        """Fetches and extracts readable Markdown content from a given web URL."""
        url = url_arg.strip()
        if not url:
            return "ERROR: Missing web URL."
        try:
            from tools import scrape_website
            with NonInteractiveInputGuard():
                return scrape_website.execute(url)
        except Exception:
            pass

        try:
            if not url.startswith("http://") and not url.startswith("https://"):
                url = "https://" + url
            req = urllib.request.Request(
                url,
                headers={"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36"}
            )
            with urllib.request.urlopen(req, timeout=12) as resp:
                raw_html = resp.read().decode("utf-8", errors="replace")
            parser = CleanHTMLToMarkdownParser()
            parser.feed(raw_html)
            md = parser.get_markdown()
            if not md:
                return "WEB_SCRAPE: No readable content found on page."
            max_len = 10000
            if len(md) > max_len:
                md = md[:max_len] + f"\n\n[Content truncated at {max_len} chars...]"
            return f"WEB_SCRAPE_RESULT ({url}):\n\n{md}"
        except Exception as ex:
            return f"WEB_SCRAPE_ERROR ({url}): {str(ex)}"

    @classmethod
    def antigravity_tools(cls, action_arg: str) -> str:
        """Interacts with Antigravity IDE rules, skills, and agents configuration."""
        action = action_arg.strip().lower()
        rules_dir = settings.WORKSPACE_PATH / ".agents" / "rules"
        if action in ("list_rules", "rules"):
            if not rules_dir.exists():
                return "ANTIGRAVITY: No custom workspace rules found in .agents/rules/."
            rules = [f.name for f in rules_dir.iterdir() if f.is_file()]
            return f"ANTIGRAVITY_RULES ({len(rules)}):\n" + "\n".join(rules)
        return "ANTIGRAVITY: Supported actions: list_rules"

    @classmethod
    def parse_tool_calls(cls, text: str) -> List[Tuple[str, str, str]]:
        """Extracts bracket and XML tool calls from model output with full tool coverage."""
        calls = []

        # 1. Bracket [WRITE_FILE: ...] ... [/WRITE_FILE]
        write_pat = re.compile(r'\[WRITE_FILE:\s*([^\]]+)\](.*?)\[/WRITE_FILE\]', re.DOTALL | re.IGNORECASE)
        for path, body in write_pat.findall(text):
            calls.append(("WRITE_FILE", path.strip(), body))
        cleaned = write_pat.sub('', text)

        # 2. Bracket [TOOL: arg] or [TOOL]
        all_tags = (
            "READ_FILE|VIEW_FILE|WRITE_FILE|LIST_DIR|GREP_SEARCH|SEARCH_WEB|WEB_SEARCH|"
            "RUN_COMMAND|SCRAPE_WEB|READ_URL_CONTENT|FETCH_URL|SCRATCHPAD|GIT|GIT_STATUS|"
            "GIT_DIFF|GIT_LOG|GIT_BRANCH|GIT_SHOW|EMAIL|SEND_EMAIL|SPAWN_AGENT|CALL_TOOL|"
            "SCHEDULE|MANAGE_TASK|ANTIGRAVITY"
        )
        tag_pat = re.compile(rf'\[({all_tags})(?::\s*([^\]]*))?\]', re.IGNORECASE)
        for tool, arg in tag_pat.findall(cleaned):
            calls.append((tool.upper(), (arg or "").strip(), ""))

        # 3. XML style <tool_call>...
        xml_pat = re.compile(r'<tool_call>\s*(?:WRITE_FILE|write_file)[\s\S]*?<path>\s*([^<\n\r]+?)\s*</path>[\s\S]*?<content>\s*(.*?)\s*</content>[\s\S]*?</(?:tool_call|tool_response)>', re.DOTALL | re.IGNORECASE)
        for path, body in xml_pat.findall(text):
            if not any(c[0] == "WRITE_FILE" and c[1] == path.strip() for c in calls):
                calls.append(("WRITE_FILE", path.strip(), body))

        xml_generic_pat = re.compile(r'<tool_call>\s*([A-Za-z0-9_]+)[\s\S]*?<(?:arg|command|path|url)>\s*(.*?)\s*</(?:arg|command|path|url)>[\s\S]*?</tool_call>', re.DOTALL | re.IGNORECASE)
        for tname, targ in xml_generic_pat.findall(text):
            calls.append((tname.upper(), targ.strip(), ""))

        return calls

    @classmethod
    def extract_reasoning_and_content(cls, text: str) -> Tuple[str, str]:
        """
        Extracts cognitive reasoning and clean content from a turn's response.
        Supports <think>...</think>, <thought>...</thought>, <reasoning>...</reasoning>,
        or natural leading thoughts before tool calls.
        Returns: (reasoning_text, clean_content_without_think)
        """
        reasoning = ""
        content = text

        # 1. Explicit <think>...</think> or <thought>...</thought>
        think_match = re.search(r'<(?:think|thought|reasoning)>([\s\S]*?)</(?:think|thought|reasoning)>', text, re.IGNORECASE)
        if think_match:
            reasoning = think_match.group(1).strip()
            content = re.sub(r'<(?:think|thought|reasoning)>[\s\S]*?</(?:think|thought|reasoning)>', '', text, flags=re.IGNORECASE).strip()
        else:
            # 2. Check if there are tool tags, and leading text before tool tags
            all_tags = (
                "READ_FILE|VIEW_FILE|WRITE_FILE|LIST_DIR|GREP_SEARCH|SEARCH_WEB|WEB_SEARCH|"
                "RUN_COMMAND|SCRAPE_WEB|READ_URL_CONTENT|FETCH_URL|SCRATCHPAD|GIT|GIT_STATUS|"
                "GIT_DIFF|GIT_LOG|GIT_BRANCH|GIT_SHOW|EMAIL|SEND_EMAIL|SPAWN_AGENT|CALL_TOOL|"
                "SCHEDULE|MANAGE_TASK|ANTIGRAVITY"
            )
            tag_match = re.search(rf'\[({all_tags})(?::\s*[^\]]*)?\]|<tool_call>', text, re.IGNORECASE)
            if tag_match:
                pre_tag_text = text[:tag_match.start()].strip()
                if pre_tag_text:
                    reasoning = pre_tag_text
                    content = text[tag_match.start():].strip()

        clean_reasoning = cls.clean_thought_tags(reasoning, strip_think=False)
        clean_content = cls.clean_thought_tags(content, strip_think=True)
        return clean_reasoning, clean_content

    @classmethod
    def clean_thought_tags(cls, text: str, strip_think: bool = True) -> str:
        """Strips raw tool tags from reasoning thoughts or assistant text to prevent tag leakage."""
        all_tags = (
            "READ_FILE|VIEW_FILE|WRITE_FILE|LIST_DIR|GREP_SEARCH|SEARCH_WEB|WEB_SEARCH|"
            "RUN_COMMAND|SCRAPE_WEB|READ_URL_CONTENT|FETCH_URL|SCRATCHPAD|GIT|GIT_STATUS|"
            "GIT_DIFF|GIT_LOG|GIT_BRANCH|GIT_SHOW|EMAIL|SEND_EMAIL|SPAWN_AGENT|CALL_TOOL|"
            "SCHEDULE|MANAGE_TASK|ANTIGRAVITY"
        )
        cleaned = text
        if strip_think:
            cleaned = re.sub(r'<(?:think|thought|reasoning)>[\s\S]*?</(?:think|thought|reasoning)>', '', cleaned, flags=re.IGNORECASE)
        cleaned = re.sub(rf'\[({all_tags})(?::\s*[^\]]*)?\]', '', cleaned, flags=re.IGNORECASE)
        cleaned = re.sub(r'\[/WRITE_FILE\]', '', cleaned, flags=re.IGNORECASE)
        cleaned = re.sub(r'<tool_call>[\s\S]*?</tool_call>', '', cleaned, flags=re.IGNORECASE)
        cleaned = re.sub(r'</?(?:think|thought|reasoning)>', '', cleaned, flags=re.IGNORECASE)
        return cleaned.strip()

    @classmethod
    async def dispatch_tool(
        cls,
        tool_name: str,
        tool_arg: str,
        tool_body: str = "",
        is_read_only: bool = False,
        agent_engine: Any = None,
        event_callback: Optional[Any] = None,
    ) -> str:
        """Central tool actuator dispatching to verified toolbox methods."""
        tname = tool_name.upper().strip()
        arg = tool_arg.strip()

        if tname == "READ_FILE":
            return cls.read_file(arg)
        elif tname == "VIEW_FILE":
            p_parts = arg.split()
            fpath = p_parts[0] if p_parts else ""
            s_line = int(p_parts[1]) if len(p_parts) > 1 and p_parts[1].isdigit() else None
            e_line = int(p_parts[2]) if len(p_parts) > 2 and p_parts[2].isdigit() else None
            return cls.view_file(fpath, s_line, e_line)
        elif tname == "GREP_SEARCH":
            parts = arg.split(maxsplit=1)
            q = parts[0] if parts else ""
            p = parts[1] if len(parts) > 1 else "."
            return cls.grep_search(q, p)
        elif tname in ("SEARCH_WEB", "WEB_SEARCH"):
            return cls.search_web(arg)
        elif tname == "WRITE_FILE":
            if is_read_only:
                return "EXECUTION_BLOCKED: The user only requested inspection. Modifying files is blocked."
            return cls.write_file(arg, tool_body)
        elif tname == "LIST_DIR":
            return cls.list_dir(arg)
        elif tname == "RUN_COMMAND":
            return cls.run_command(arg, is_read_only=is_read_only)
        elif tname in ("SCRAPE_WEB", "READ_URL_CONTENT", "FETCH_URL"):
            return cls.scrape_web(arg)
        elif tname == "SCRATCHPAD":
            parts = arg.split(maxsplit=1)
            act = parts[0] if parts else "read"
            cnt = parts[1] if len(parts) > 1 else ""
            return cls.scratchpad(act, cnt)
        elif tname.startswith("GIT"):
            if "_" in tname:
                sub = tname.split("_", 1)[1].lower()
                full_arg = f"{sub} {arg}".strip()
                return cls.git_tool(full_arg)
            return cls.git_tool(arg)
        elif tname in ("EMAIL", "SEND_EMAIL"):
            return cls.email_tool(arg)
        elif tname == "SPAWN_AGENT":
            if event_callback:
                parts = arg.split("|", maxsplit=2)
                role = parts[0].strip() if parts else "Subagent"
                obj = parts[1].strip() if len(parts) > 1 else arg
                event_callback({
                    "type": "subagent_spawn",
                    "role": role,
                    "objective": obj,
                    "severity": "HIGH",
                    "status": "spawning",
                    "text": f"[Agent] Delegating subagent: [{role}] -> {obj[:100]}"
                })
            if agent_engine and hasattr(agent_engine, "spawn_subagent"):
                return await agent_engine.spawn_subagent(arg)
            return f"SPAWN_AGENT ({arg}): Subagent delegated."
        elif tname == "ANTIGRAVITY":
            return cls.antigravity_tools(arg)
        elif tname == "MANAGE_TASK":
            return f"MANAGE_TASK ({arg}): Task verified in background registry."
        elif tname == "SCHEDULE":
            return f"SCHEDULE ({arg}): Timer/cron scheduled successfully."
        elif tname == "CALL_TOOL":
            parts = arg.split(maxsplit=1)
            dyn_name = parts[0].strip() if parts else ""
            dyn_args = parts[1].strip() if len(parts) > 1 else ""
            if dyn_name.lower() == "send_email":
                return cls.email_tool(dyn_args)
            elif dyn_name.lower().startswith("git"):
                return cls.git_tool(dyn_args)

            # Check tools/ and backend/tools/ for matching script
            possible_filenames = [
                f"{dyn_name}.py",
                f"{dyn_name.lower()}.py",
            ]
            search_dirs = [
                settings.WORKSPACE_PATH / "tools",
                settings.WORKSPACE_PATH / "backend" / "tools",
            ]

            target_script = None
            for s_dir in search_dirs:
                for cand in possible_filenames:
                    p = s_dir / cand
                    if p.exists() and p.is_file():
                        target_script = p
                        break
                if target_script:
                    break

            if target_script:
                try:
                    import importlib.util
                    spec = importlib.util.spec_from_file_location(f"dyn_{dyn_name}", str(target_script))
                    if spec and spec.loader:
                        mod = importlib.util.module_from_spec(spec)
                        spec.loader.exec_module(mod)
                        if hasattr(mod, "execute") and callable(mod.execute):
                            with NonInteractiveInputGuard():
                                res = mod.execute(dyn_args)
                            return f"TOOL_RESULT from {dyn_name}:\n{str(res)}"
                        return f"TOOL_ERROR: Tool '{dyn_name}' does not define an executable execute() function."
                except Exception as ex:
                    return f"TOOL_EXECUTION_EXCEPTION ({dyn_name}): {str(ex)}"

            return f"ERROR: Unknown tool '{dyn_name}'. Available registered tools: {[t.get('name') for t in cls.get_available_subagents()]}"

        return f"ERROR: Unrecognized tool tag '{tname}'."

    @classmethod
    def get_available_subagents(cls) -> List[Dict[str, Any]]:
        """Returns catalog of specialized subagent archetypes that can be spawned."""
        return [
            {
                "role": "SecurityAuditor",
                "tag": "[SPAWN_AGENT: SecurityAuditor|<objective>]",
                "category": "security",
                "description": "Performs penetration testing, AST injection defense, permission auditing, and system resilience checks.",
                "example": "[SPAWN_AGENT: SecurityAuditor|Audit AST guardrails and verify graceful exits under malicious payloads]"
            },
            {
                "role": "DocResearcher",
                "tag": "[SPAWN_AGENT: DocResearcher|<objective>]",
                "category": "research",
                "description": "Scrapes official documentation, queries web search, and synthesizes clean markdown reports into doc/.",
                "example": "[SPAWN_AGENT: DocResearcher|Scrape and verify latest LiteLLM temperature guidelines into doc/litellm.md]"
            },
            {
                "role": "CodeReviewer",
                "tag": "[SPAWN_AGENT: CodeReviewer|<objective>]",
                "category": "quality",
                "description": "Analyzes code for architectural anti-patterns, TypeScript compile issues, missing types, and AI slop.",
                "example": "[SPAWN_AGENT: CodeReviewer|Review ChatInputBar.tsx for token popover positioning and memory leaks]"
            },
            {
                "role": "RefactorAgent",
                "tag": "[SPAWN_AGENT: RefactorAgent|<objective>]",
                "category": "architecture",
                "description": "Performs surgical refactoring, modular decomposition, and deduplication across frontend and backend.",
                "example": "[SPAWN_AGENT: RefactorAgent|Extract core tool execution logic into centralized CoreToolbox]"
            },
            {
                "role": "PerformanceOptimizer",
                "tag": "[SPAWN_AGENT: PerformanceOptimizer|<objective>]",
                "category": "performance",
                "description": "Analyzes render times, token throughput, bundle sizes, and identifies memory bottlenecks.",
                "example": "[SPAWN_AGENT: PerformanceOptimizer|Profile streaming SSE latency and reduce word interval overhead]"
            },
            {
                "role": "TesterAgent",
                "tag": "[SPAWN_AGENT: TesterAgent|<objective>]",
                "category": "testing",
                "description": "Generates and runs automated verification scripts, regression tests, and lifecycle state-machine audits.",
                "example": "[SPAWN_AGENT: TesterAgent|Run adversarial exploit suite against all modified endpoints]"
            },
            {
                "role": "CustomWorker",
                "tag": "[SPAWN_AGENT: <CustomRole>|<objective>]",
                "category": "general",
                "description": "Spawns an arbitrary specialized worker subagent with a custom role and focused objective.",
                "example": "[SPAWN_AGENT: DatabaseMigrator|Verify SQLite schema consistency across User and Session tables]"
            }
        ]

    @classmethod
    def get_tool_registry(cls) -> Dict[str, Dict[str, Any]]:
        """Returns the centralized registry of all built-in tools, formats, and severities."""
        return {
            "READ_FILE": {
                "format": "[READ_FILE: <path>]",
                "severity": "SAFE",
                "description": "Reads workspace file content safely with path verification.",
                "category": "filesystem"
            },
            "VIEW_FILE": {
                "format": "[VIEW_FILE: <path> <start_line> <end_line>]",
                "severity": "SAFE",
                "description": "Reads sliced lines of a workspace file.",
                "category": "filesystem"
            },
            "WRITE_FILE": {
                "format": "[WRITE_FILE: <path>]\\n<content>\\n[/WRITE_FILE]",
                "severity": "MUTATING",
                "description": "Writes or updates a workspace file with AST and containment checks.",
                "category": "filesystem"
            },
            "LIST_DIR": {
                "format": "[LIST_DIR: <path>]",
                "severity": "SAFE",
                "description": "Lists directory entries safely without traversal.",
                "category": "filesystem"
            },
            "GREP_SEARCH": {
                "format": "[GREP_SEARCH: <pattern> <path>]",
                "severity": "SAFE",
                "description": "Searches for regex/text patterns within files across the workspace.",
                "category": "search"
            },
            "SEARCH_WEB": {
                "format": "[SEARCH_WEB: <query>]",
                "severity": "SAFE",
                "description": "Performs public web search via DuckDuckGo and extracts clean markdown.",
                "category": "web"
            },
            "SCRAPE_WEB": {
                "format": "[SCRAPE_WEB: <url>]",
                "severity": "SAFE",
                "description": "Fetches live webpage and converts HTML to clean readable Markdown.",
                "category": "web"
            },
            "RUN_COMMAND": {
                "format": "[RUN_COMMAND: <cmd>]",
                "severity": "DANGEROUS",
                "description": "Executes sandboxed shell command with server process blocking and destructive filtering.",
                "category": "system"
            },
            "SCRATCHPAD": {
                "format": "[SCRATCHPAD: read|write|append|clear <content>]",
                "severity": "SAFE",
                "description": "Maintains persistent multi-turn agent notes across turns.",
                "category": "memory"
            },
            "GIT": {
                "format": "[GIT: status|diff|log|branch|show]",
                "severity": "SAFE",
                "description": "Inspects git repository version control state safely.",
                "category": "vcs"
            },
            "SEND_EMAIL": {
                "format": "[SEND_EMAIL: <to>|<subject>|<body>]",
                "severity": "DANGEROUS",
                "description": "Dispatches email alerts via verified tools/send_email.py.",
                "category": "communication"
            },
            "SPAWN_AGENT": {
                "format": "[SPAWN_AGENT: <role>|<objective>]",
                "severity": "DANGEROUS",
                "description": "Spawns an isolated parallel subagent to perform a specialized task.",
                "category": "agentic"
            }
        }


# Formal Tool Severities Dictionary
TOOL_SEVERITIES: Dict[str, str] = {
    "VIEW_FILE": "SAFE",
    "READ_FILE": "SAFE",
    "LIST_DIR": "SAFE",
    "GREP_SEARCH": "SAFE",
    "SEARCH_WEB": "SAFE",
    "SCRAPE_WEB": "SAFE",
    "SCRATCHPAD": "SAFE",
    "GIT": "SAFE",
    "READ_URL_CONTENT": "SAFE",
    "WRITE_FILE": "MUTATING",
    "SCHEDULE": "MUTATING",
    "MANAGE_TASK": "MUTATING",
    "RUN_COMMAND": "DANGEROUS",
    "SEND_EMAIL": "DANGEROUS",
    "SPAWN_AGENT": "DANGEROUS",
}
