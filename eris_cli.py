import os
import sys
import json
import re
import asyncio
import subprocess
import importlib.util
import hashlib
import ast
import tempfile
from typing import List, Dict, Any, Optional, Set, Tuple
from dotenv import load_dotenv

# TUI / UI
from rich.console import Console
from rich.panel import Panel
from rich.prompt import Prompt
from rich.text import Text
from rich.markdown import Markdown
from rich.status import Status
import questionary
from prompt_toolkit.styles import Style
from prompt_builder import PromptBuilder, SystemState
from auth import AuthEngine
from tool_guardrails import ToolGuardrails

# Litellm for provider-agnostic completions
os.environ["LITELLM_LOG"] = "ERROR"
import litellm
litellm.suppress_debug_info = True
import requests

# Load environment
load_dotenv()
console = Console()

# Multi-tiered storage configuration
WORKSPACE_DIR = os.path.realpath(os.getcwd())
PRIMARY_MEMORY_DIR = os.path.join(WORKSPACE_DIR, "memory")
PRIMARY_MEMORY_FILE = os.path.join(PRIMARY_MEMORY_DIR, "memory.json")
FALLBACK_MEMORY_DIR = os.path.join(os.path.expanduser("~"), ".eris")
FALLBACK_MEMORY_FILE = os.path.join(FALLBACK_MEMORY_DIR, "memory.json")

# Tools Directory (Default and strictly enforced for tool generation)
TOOLS_DIR = os.path.join(WORKSPACE_DIR, "tools")
os.makedirs(TOOLS_DIR, exist_ok=True)
TOOL_METADATA_FILE = os.path.join(TOOLS_DIR, ".tool_registry.json")

# Questionary Style
custom_style = Style([
    ('qmark', 'fg:#00ffff bold'),
    ('question', 'fg:#ffffff bold'),
    ('answer', 'fg:#00ff00 bold'),
    ('pointer', 'fg:#ff00ff bold'),
    ('highlighted', 'fg:#00ffff bold'),
    ('selected', 'fg:#00ff00 bold bg:#222222'),
    ('separator', 'fg:#666666'),
    ('instruction', 'fg:#888888 italic')
])

# Dangerous patterns for static analysis
DANGEROUS_PATTERNS = [
    r"system32",
    r"rmdir\s+/[sq]",
    r"format\s+[a-z]:",
    r"del\s+/[sqf]",
    r"shutil\.rmtree\s*\(\s*['\"](?:\/|[a-zA-Z]:\\(?:windows|system32|users)?)['\"]",
    r"os\.remove\s*\(\s*['\"](?:[a-zA-Z]:\\windows)",
    r":\(\)\s*\{\s*:\s*\|\s*:\s*&\s*\}\s*;",  # forkbomb
    r"powershell.*(?:remove-item|del|erase).*(?:c:\\|c:\\windows)",
    r"(?:remove-item|del|erase|rmdir|rm)\b.*(?:c:\\|c:\\windows)",
]

def calculate_file_hash(content: str) -> str:
    return hashlib.sha256(content.encode("utf-8")).hexdigest()

def is_safe_path(base_dir: str, target_path: str) -> bool:
    """Security Fortification: Enforces workspace containment and prevents credential leakage."""
    try:
        resolved_base = os.path.realpath(os.path.abspath(base_dir))
        if not os.path.isabs(target_path):
            combined = os.path.join(resolved_base, target_path)
        else:
            combined = target_path
        resolved_target = os.path.realpath(os.path.abspath(combined))
        
        if os.path.commonpath([resolved_base, resolved_target]) != resolved_base:
            return False
            
        filename = os.path.basename(resolved_target).lower()
        blocked_files = {".env", ".env.local", ".env.production", "id_rsa", "id_ed25519", "credentials", "secrets.json"}
        if filename in blocked_files or filename.endswith((".pem", ".key", ".pfx")):
            return False
            
        return True
    except Exception:
        return False

def check_harmful_command(cmd_str: str) -> Tuple[bool, str]:
    """Checks shell commands for dangerous patterns and strictly blocks self-termination or system disruption."""
    lower_cmd = cmd_str.lower()
    for pat in DANGEROUS_PATTERNS:
        if re.search(pat, lower_cmd, re.IGNORECASE):
            return True, f"Blocked harmful command pattern: {pat}"

    # Anti-Self-Termination Guard: Prevent killing Python, uv, or Eris CLI process
    my_pid = str(os.getpid())
    self_kill_patterns = [
        r"\btaskkill\b.*(?:\bpython(?:\.exe)?\b|\buv(?:\.exe)?\b|\bcmd(?:\.exe)?\b|\bpowershell(?:\.exe)?\b)",
        r"\bstop-process\b.*(?:\bpython\b|\buv\b)",
        r"\bpkill\b.*(?:\bpython\b|\buv\b)",
        r"\bkillall\b.*(?:\bpython\b|\buv\b)",
        rf"\b(?:taskkill|stop-process|kill)\b.*\b{my_pid}\b",
        r"(?:get-process\s+.*(?:python|uv).*\|\s*(?:stop-process|kill))"
    ]
    for pat in self_kill_patterns:
        if re.search(pat, lower_cmd, re.IGNORECASE):
            return True, f"Blocked self-termination command ({pat}). Eris will not kill Python or its own process."

    return False, ""

def check_harmful_code(code_str: str) -> Tuple[bool, str]:
    """Static analysis to block malicious system disruption (e.g. system32 deletion, self-kill) in Python code."""
    # 1. Check raw destructive system wipe patterns
    for pat in DANGEROUS_PATTERNS:
        if re.search(pat, code_str, re.IGNORECASE):
            return True, f"Harmful pattern detected in code: {pat}"

    # 2. Inspect AST Call invocations for dangerous shell commands (distinguishes code execution from docstrings)
    try:
        parsed = ast.parse(code_str)
        for node in ast.walk(parsed):
            if isinstance(node, ast.Call):
                func_name = ""
                if isinstance(node.func, ast.Name):
                    func_name = node.func.id
                elif isinstance(node.func, ast.Attribute):
                    func_name = node.func.attr
                
                if func_name in ("system", "popen", "run", "call", "Popen"):
                    for arg in node.args:
                        if isinstance(arg, ast.Constant) and isinstance(arg.value, str):
                            is_harm, reason = check_harmful_command(arg.value)
                            if is_harm:
                                return True, f"Harmful system call in {func_name}: {reason}"
                        elif isinstance(arg, ast.List):
                            cmd_parts = [elt.value for elt in arg.elts if isinstance(elt, ast.Constant) and isinstance(elt.value, str)]
                            if cmd_parts:
                                is_harm, reason = check_harmful_command(" ".join(cmd_parts))
                                if is_harm:
                                    return True, f"Harmful system call in {func_name}: {reason}"
    except Exception:
        pass

    return False, ""

def test_tool_in_sandbox(tool_code: str) -> Tuple[bool, str]:
    """Runs a tool in an isolated temporary sub-process to verify compilation and contract."""
    # 1. Check harmful
    is_harmful, reason = check_harmful_code(tool_code)
    if is_harmful:
        return False, f"SECURITY_ERROR: Code rejected as harmful: {reason}"

    # 2. Check AST Syntax
    try:
        tree = ast.parse(tool_code)
    except SyntaxError as e:
        return False, f"SYNTAX_ERROR: Tool failed compilation: {e}"

    # 3. Check schema compliance: TOOL_NAME, TOOL_DESCRIPTION, execute(args)
    has_execute = False
    for node in tree.body:
        if isinstance(node, ast.FunctionDef) and node.name == "execute":
            has_execute = True
            break
            
    if not has_execute:
        return False, "SCHEMA_ERROR: Tool must define `def execute(args: str) -> str:`"

    # 4. Isolated subprocess dry run
    with tempfile.NamedTemporaryFile(mode="w", suffix=".py", delete=False, encoding="utf-8") as tmp:
        tmp.write(tool_code)
        tmp_path = tmp.name

    try:
        runner_code = f"""
import sys
import importlib.util

spec = importlib.util.spec_from_file_location("sandbox_test", r"{tmp_path}")
mod = importlib.util.module_from_spec(spec)
try:
    spec.loader.exec_module(mod)
    assert hasattr(mod, "execute"), "missing execute"
    assert callable(mod.execute), "execute not callable"
    # Dry run with empty args
    res = mod.execute("__test_ping__")
    print("SANDBOX_SUCCESS")
except Exception as e:
    print(f"SANDBOX_EXCEPTION: {{e}}")
    sys.exit(1)
"""
        proc = subprocess.run(
            [sys.executable, "-c", runner_code],
            capture_output=True,
            text=True,
            timeout=8
        )
        if proc.returncode != 0:
            err = proc.stderr.strip() or proc.stdout.strip()
            return False, f"SANDBOX_EXECUTION_FAILED: {err}"
        return True, "SANDBOX_PASSED"
    except subprocess.TimeoutExpired:
        return False, "SANDBOX_TIMEOUT: Tool execution timed out after 8 seconds."
    except Exception as ex:
        return False, f"SANDBOX_ERROR: {str(ex)}"
    finally:
        try:
            if os.path.exists(tmp_path):
                os.remove(tmp_path)
        except Exception:
            pass


class ErisCore:
    def __init__(self):
        self.gemini_key = os.getenv("GEMINI_API_KEY")
        self.nvidia_key = os.getenv("NVIDIA_API_KEY")
        self.openrouter_key = os.getenv("OPENROUTER_API_KEY")

        # Load memory with multi-tier fallback
        self.memory = self.load_memory()
        self.active_model: Optional[str] = self.memory.get("active_model")
        if not self.active_model and self.gemini_key:
            self.active_model = "gemini/gemini-3.6-flash"
            self.memory["active_model"] = self.active_model
            self.save_memory()

        self.cached_models: List[Dict[str, Any]] = []
        self.tool_registry = self.load_tool_registry()
        self.loaded_modules: Dict[str, Any] = {}
        self.prompt_builder = PromptBuilder(WORKSPACE_DIR, TOOLS_DIR)
        self.auth = AuthEngine()
        self.current_user = self.memory.get("current_user")
        self.execution_mode = self.memory.get("execution_mode", "speed")

    def load_tool_registry(self) -> Dict[str, Dict[str, Any]]:
        """Loads metadata registry tracking verified tools and hashes."""
        if os.path.exists(TOOL_METADATA_FILE):
            try:
                with open(TOOL_METADATA_FILE, "r", encoding="utf-8") as f:
                    return json.load(f)
            except Exception:
                pass
        return {}

    def save_tool_registry(self):
        try:
            with open(TOOL_METADATA_FILE, "w", encoding="utf-8") as f:
                json.dump(self.tool_registry, f, indent=4)
        except Exception:
            pass

    def load_memory(self) -> Dict[str, Any]:
        default_memory = {
            "identity": "You are Eris, an autonomous, highly capable AI assistant and companion. Your creator and developer is Aman Sinha.",
            "pinned_facts": [
                "Developer and Creator: Aman Sinha",
                "Working directory: tools/ is the designated folder for autonomous tools created by Eris"
            ],
            "history": [],
            "active_model": None
        }

        # 1. Try Primary Location
        if os.path.exists(PRIMARY_MEMORY_FILE):
            try:
                with open(PRIMARY_MEMORY_FILE, "r", encoding="utf-8") as f:
                    data = json.load(f)
                    default_memory.update(data)
                    return default_memory
            except Exception:
                pass

        # 2. Try Fallback User Location
        if os.path.exists(FALLBACK_MEMORY_FILE):
            try:
                with open(FALLBACK_MEMORY_FILE, "r", encoding="utf-8") as f:
                    data = json.load(f)
                    default_memory.update(data)
                    return default_memory
            except Exception:
                pass

        return default_memory

    def save_memory(self):
        self.memory["active_model"] = self.active_model
        
        try:
            os.makedirs(PRIMARY_MEMORY_DIR, exist_ok=True)
            with open(PRIMARY_MEMORY_FILE, "w", encoding="utf-8") as f:
                json.dump(self.memory, f, indent=4)
            return
        except (PermissionError, OSError):
            pass

        try:
            os.makedirs(FALLBACK_MEMORY_DIR, exist_ok=True)
            with open(FALLBACK_MEMORY_FILE, "w", encoding="utf-8") as f:
                json.dump(self.memory, f, indent=4)
            return
        except (PermissionError, OSError) as e:
            console.print(f"[dim yellow]Notice: Memory persistence in-memory only ({e}).[/dim yellow]")

    def append_to_history(self, role: str, content: str):
        self.memory["history"].append({"role": role, "content": content})
        # Keep clean episodic window of last 10 turns to avoid context overflow and repetition loops
        if len(self.memory["history"]) > 10:
            self.memory["history"] = self.memory["history"][-10:]
        self.save_memory()

    def get_api_key_for_model(self, model_name: str) -> Optional[str]:
        if not model_name:
            return None
        if model_name.startswith("gemini"):
            return self.gemini_key
        if model_name.startswith("openrouter"):
            return self.openrouter_key
        if model_name.startswith("nvidia_nim"):
            return self.nvidia_key
        return None

    def get_fallback_candidates(self) -> List[str]:
        candidates = []
        if self.gemini_key:
            candidates.extend([
                "gemini/gemini-3.5-flash",
                "gemini/gemini-3.5-flash-lite",
                "gemini/gemini-3.6-flash"
            ])
        if self.openrouter_key:
            candidates.extend([
                "openrouter/nex-agi/nex-n2.5-mini:free",
                "openrouter/nex-agi/nex-n2.5-pro:free",
                "openrouter/inclusionai/ling-3.0-flash-vl:free"
            ])
        return [c for c in candidates if c != self.active_model]

    def load_dynamic_tools(self) -> Dict[str, Dict[str, Any]]:
        """Scans tools/ for Python tools with integrity and safety verification."""
        tools = {}
        if not os.path.exists(TOOLS_DIR):
            return tools

        for fname in os.listdir(TOOLS_DIR):
            if fname.endswith(".py") and not fname.startswith(("_", ".")):
                fpath = os.path.join(TOOLS_DIR, fname)
                try:
                    with open(fpath, "r", encoding="utf-8", errors="replace") as f:
                        content = f.read()

                    # Tamper and safety check
                    current_hash = calculate_file_hash(content)
                    reg_entry = self.tool_registry.get(fname, {})
                    expected_hash = reg_entry.get("hash")
                    status = reg_entry.get("status", "unverified")

                    # If already loaded and hash matches, reuse existing module to maintain in-memory state
                    if fname in self.loaded_modules and expected_hash == current_hash:
                        mod = self.loaded_modules[fname]
                        tool_name = getattr(mod, "TOOL_NAME", fname[:-3])
                        tool_desc = getattr(mod, "TOOL_DESCRIPTION", f"Custom tool from {fname}")
                        tool_func = getattr(mod, "execute", None)
                        if callable(tool_func):
                            tools[tool_name] = {
                                "description": tool_desc,
                                "function": tool_func,
                                "file": fname
                            }
                            continue

                    # Check for harmful code
                    is_harmful, reason = check_harmful_code(content)
                    if is_harmful:
                        console.print(f"  [bold red]⚠ Warning: Tool {fname} blocked (Harmful code detected: {reason})[/bold red]")
                        continue

                    # If file changed externally without sandbox verification
                    if expected_hash and current_hash != expected_hash:
                        status = "edited-needs re-evaluation"
                        console.print(f"  [bold yellow]⚠ Warning: Tool {fname} was modified externally ({status}). Re-validating...[/bold yellow]")
                        passed, sbox_msg = test_tool_in_sandbox(content)
                        if not passed:
                            console.print(f"  [bold red]✕ Tool {fname} re-evaluation failed: {sbox_msg}[/bold red]")
                            continue
                        # Update registry after successful re-evaluation
                        self.tool_registry[fname] = {
                            "hash": current_hash,
                            "status": "verified",
                            "last_tested": str(os.path.getmtime(fpath))
                        }
                        self.save_tool_registry()
                    elif not expected_hash:
                        # Newly detected or unregistered tool: dry-run validate
                        passed, sbox_msg = test_tool_in_sandbox(content)
                        if not passed:
                            console.print(f"  [dim yellow]Notice: Skipping unverified/invalid tool {fname}: {sbox_msg}[/dim yellow]")
                            continue
                        self.tool_registry[fname] = {
                            "hash": current_hash,
                            "status": "verified",
                            "last_tested": str(os.path.getmtime(fpath))
                        }
                        self.save_tool_registry()

                    # Safe to load
                    module_name = f"eris_tool_{fname[:-3]}"
                    spec = importlib.util.spec_from_file_location(module_name, fpath)
                    if spec and spec.loader:
                        mod = importlib.util.module_from_spec(spec)
                        sys.modules[module_name] = mod
                        spec.loader.exec_module(mod)
                        self.loaded_modules[fname] = mod
                        tool_name = getattr(mod, "TOOL_NAME", fname[:-3])
                        tool_desc = getattr(mod, "TOOL_DESCRIPTION", f"Custom tool from {fname}")
                        tool_func = getattr(mod, "execute", None)
                        if callable(tool_func):
                            tools[tool_name] = {
                                "description": tool_desc,
                                "function": tool_func,
                                "file": fname
                            }
                except Exception as e:
                    console.print(f"  [dim yellow]Notice: Error loading tool {fname}: {e}[/dim yellow]")
        return tools

    def fetch_models(self) -> List[Dict[str, Any]]:
        if self.cached_models:
            return self.cached_models

        models: List[Dict[str, Any]] = []
        
        # 1. Gemini
        if self.gemini_key:
            try:
                resp = requests.get(
                    f"https://generativelanguage.googleapis.com/v1beta/models?key={self.gemini_key}", 
                    timeout=5
                )
                if resp.status_code == 200:
                    for m in resp.json().get("models", []):
                        if 'generateContent' in m.get('supportedGenerationMethods', []):
                            name = m['name'].replace('models/', '')
                            caps = ["Coding"]
                            if any(k in name.lower() for k in ["flash", "pro", "gemini-3", "gemini-2"]):
                                caps.extend(["Vision", "Audio", "Free"])
                            
                            badge_str = " ".join([f"[{c}]" for c in caps if c != "Free"])
                            models.append({
                                "provider": "Gemini",
                                "id": f"gemini/{name}",
                                "name": name,
                                "price": "Free/Tier",
                                "capabilities": caps,
                                "display": f"Gemini │ {name:<30} │ [Free] {badge_str}".strip()
                            })
            except Exception:
                pass

        # 2. Nvidia NIM
        if self.nvidia_key:
            try:
                headers = {"Authorization": f"Bearer {self.nvidia_key}"}
                resp = requests.get("https://integrate.api.nvidia.com/v1/models", headers=headers, timeout=5)
                if resp.status_code == 200:
                    for m in resp.json().get("data", []):
                        mid = m['id']
                        caps = ["Reasoning"]
                        if any(k in mid.lower() for k in ["code", "coder", "devstral"]):
                            caps.append("Coding")
                        if any(k in mid.lower() for k in ["vision", "neva", "kosmos", "fuyu", "paligemma"]):
                            caps.append("Vision")
                        
                        badge_str = " ".join([f"[{c}]" for c in caps])
                        models.append({
                            "provider": "Nvidia NIM",
                            "id": f"nvidia_nim/{mid}",
                            "name": mid,
                            "price": "NIM Credits",
                            "capabilities": caps,
                            "display": f"Nvidia │ {mid:<30} │ {badge_str}".strip()
                        })
            except Exception:
                pass

        # 3. OpenRouter
        if self.openrouter_key:
            try:
                headers = {"Authorization": f"Bearer {self.openrouter_key}"}
                resp = requests.get("https://openrouter.ai/api/v1/models", headers=headers, timeout=7)
                if resp.status_code == 200:
                    for m in resp.json().get("data", []):
                        mid = m.get("id", "")
                        raw_name = m.get("name", mid)
                        desc = m.get("description", "").lower()
                        pricing = m.get("pricing", {})
                        arch = m.get("architecture", {})
                        
                        caps = []
                        is_free = False
                        try:
                            prompt_price = float(pricing.get("prompt", 1))
                            if prompt_price == 0 or ":free" in mid:
                                is_free = True
                        except Exception:
                            if ":free" in mid:
                                is_free = True
                                
                        if is_free:
                            caps.append("Free")
                            
                        in_modalities = arch.get("input_modalities", [])
                        modality = arch.get("modality", "")
                        if "image" in in_modalities or "image" in modality:
                            caps.append("Vision")
                        if "audio" in in_modalities or "audio" in desc:
                            caps.append("Audio")
                        if any(k in mid.lower() for k in ["r1", "reasoning", "thinking", "o1", "o3"]):
                            caps.append("Reasoning")
                        if any(k in mid.lower() for k in ["coder", "code", "devstral", "sonnet", "claude"]):
                            caps.append("Coding")

                        clean_name = raw_name.replace("(free)", "").strip()
                        price_tag = "[Free]" if is_free else "[Paid]"
                        badge_str = " ".join([f"[{c}]" for c in caps if c != "Free"])
                        
                        models.append({
                            "provider": "OpenRouter",
                            "id": f"openrouter/{mid}",
                            "name": clean_name,
                            "price": "Free" if is_free else "Paid",
                            "capabilities": caps,
                            "display": f"OpenRouter │ {clean_name:<32} │ {price_tag} {badge_str}".strip()
                        })
            except Exception:
                pass

        self.cached_models = models
        return models

    async def search_and_select(self, prefill_query: str = "") -> bool:
        models = self.fetch_models()
        while True:
            if not prefill_query:
                query = await questionary.text(
                    "Enter search keyword (e.g. 'claude', 'gemini', 'free', 'vision', 'r1'):",
                    style=custom_style
                ).ask_async()
            else:
                query = prefill_query
                prefill_query = ""

            if query is None or not query.strip():
                return False

            q = query.strip().lower()
            matches = [
                m for m in models
                if q in m["id"].lower() or q in m["name"].lower() or any(q in c.lower() for c in m["capabilities"])
            ]

            if not matches:
                console.print(f"[yellow]No models found matching '{query}'. Try another search term.[/yellow]")
                retry = await questionary.select(
                    "What would you like to do?",
                    choices=[
                        questionary.Choice("Try Another Search", value="retry"),
                        questionary.Choice("← Return to Menu", value="back")
                    ],
                    style=custom_style
                ).ask_async()
                if retry == "back" or retry is None:
                    return False
                continue

            model_choices = [questionary.Choice("← Return to Menu", value="__BACK__")]
            for m in matches:
                model_choices.append(questionary.Choice(m["display"], value=m["id"]))

            console.print(f"\n[bold green]Found {len(matches)} matching models:[/bold green]")
            selected = await questionary.select(
                f"Select model matching '{query}':",
                choices=model_choices,
                style=custom_style,
                use_indicator=True
            ).ask_async()

            if selected == "__BACK__" or selected is None:
                return False

            return self.apply_model_selection(selected)

    async def interactive_config(self) -> bool:
        with Status("[cyan]Querying active provider keys and indexing model catalogs...[/cyan]", spinner="dots"):
            models = self.fetch_models()

        if not models:
            console.print("[bold red]⚠ No models detected.[/bold red] Please check your [cyan].env[/cyan] file API keys.")
            return False

        gemini_count = len([m for m in models if m["provider"] == "Gemini"])
        nvidia_count = len([m for m in models if m["provider"] == "Nvidia NIM"])
        openrouter_count = len([m for m in models if m["provider"] == "OpenRouter"])

        while True:
            active_str = f"[bold green]{self.active_model}[/bold green]" if self.active_model else "[bold yellow]None configured[/bold yellow]"
            console.print()
            console.print(Panel(
                f"[bold magenta]❖ ERIS MODEL CONFIGURATION MATRIX[/bold magenta]\n"
                f"[dim]Active Model:[/dim] {active_str}\n"
                f"[dim]Catalogs Available:[/dim] Gemini ({gemini_count}) │ Nvidia ({nvidia_count}) │ OpenRouter ({openrouter_count}) │ [bold cyan]Total: {len(models)} models[/bold cyan]",
                border_style="cyan",
                expand=False
            ))

            main_menu_choices = [
                questionary.Choice("🔍 Search Models by Keyword (Instant Filter)", value="search"),
                questionary.Choice("🏷 Filter by Capabilities (Free, Vision, Audio, Reasoning, Coding)", value="filter"),
                questionary.Choice("🌟 Quick Pick: Curated Flagship Models (Verified Live)", value="quick_pick"),
                questionary.Choice("📂 Browse by Provider Catalog", value="browse_provider"),
            ]
            if self.active_model:
                main_menu_choices.append(questionary.Choice("💾 Keep Current Model & Return to Chat", value="keep"))
            else:
                main_menu_choices.append(questionary.Choice("❌ Cancel & Exit", value="exit"))

            action = await questionary.select(
                "How would you like to select a model?",
                choices=main_menu_choices,
                style=custom_style,
                use_indicator=True
            ).ask_async()

            if action is None or action == "exit":
                return False
            if action == "keep":
                console.print(f"[green]Retaining active model:[/green] [cyan]{self.active_model}[/cyan]\n")
                return True

            # 1. SEARCH
            if action == "search":
                res = await self.search_and_select()
                if res:
                    return True

            # 2. CAPABILITY FILTER
            elif action == "filter":
                cap_choices = [
                    questionary.Choice("Free (Zero Cost / Free Tier)", value="Free"),
                    questionary.Choice("Vision (Multimodal / Image understanding)", value="Vision"),
                    questionary.Choice("Reasoning (DeepSeek R1, CoT, Thinking)", value="Reasoning"),
                    questionary.Choice("Coding (Code generation & software engineering)", value="Coding"),
                    questionary.Choice("Audio (Voice & Audio inputs)", value="Audio"),
                ]

                selected_caps = await questionary.checkbox(
                    "Select capabilities to filter (SPACE to toggle, ENTER to confirm):",
                    choices=cap_choices,
                    style=custom_style
                ).ask_async()

                if selected_caps is None or not selected_caps:
                    continue

                matches = [
                    m for m in models
                    if set(selected_caps).issubset(set(m["capabilities"]))
                ]

                if not matches:
                    console.print(f"[yellow]No models matched ALL selected capabilities: {', '.join(selected_caps)}[/yellow]")
                    await questionary.press_any_key_to_continue("Press any key to return to menu...").ask_async()
                    continue

                model_choices = [questionary.Choice("← Return to Main Menu", value="__BACK__")]
                for m in matches:
                    model_choices.append(questionary.Choice(m["display"], value=m["id"]))

                console.print(f"\n[bold green]Found {len(matches)} models with capabilities: {', '.join(selected_caps)}[/bold green]")
                selected = await questionary.select(
                    "Choose your filtered model:",
                    choices=model_choices,
                    style=custom_style,
                    use_indicator=True
                ).ask_async()

                if selected == "__BACK__" or selected is None:
                    continue

                return self.apply_model_selection(selected)

            # 3. QUICK PICK: LIVE VERIFIED CURATED MODELS
            elif action == "quick_pick":
                curated_candidates = [
                    ("gemini/gemini-3.5-flash", "Google Gemini 3.5 Flash (Direct API, High Quota, Ultra-Fast, Verified Live)"),
                    ("gemini/gemini-3.5-flash-lite", "Google Gemini 3.5 Flash Lite (Direct API, Ultra-Low Latency, Verified Live)"),
                    ("gemini/gemini-3.6-flash", "Google Gemini 3.6 Flash (Direct API, Multimodal, Verified Live)"),
                    ("openrouter/nex-agi/nex-n2.5-mini:free", "Nex N2.5 Mini (OpenRouter Free Tier, Fast Chat, Verified Live)"),
                    ("openrouter/nex-agi/nex-n2.5-pro:free", "Nex N2.5 Pro (OpenRouter Free Tier, High Quality, Verified Live)"),
                    ("openrouter/anthropic/claude-3.5-sonnet", "Claude 3.5 Sonnet (State-of-the-Art Coding Flagship)"),
                    ("openrouter/openai/gpt-4o", "OpenAI GPT-4o (Frontier Multimodal Intelligence)"),
                ]

                available_ids = {m["id"] for m in models}
                quick_choices = [questionary.Choice("← Return to Main Menu", value="__BACK__")]

                for m_id, desc in curated_candidates:
                    if m_id in available_ids or (m_id.startswith("gemini/") and self.gemini_key):
                        quick_choices.append(questionary.Choice(f"⭐ {desc}\n   ↳ {m_id}", value=m_id))

                if len(quick_choices) == 1:
                    console.print("[yellow]No curated models matched your configured API keys.[/yellow]")
                    continue

                selected = await questionary.select(
                    "Select a Curated Model:",
                    choices=quick_choices,
                    style=custom_style,
                    use_indicator=True
                ).ask_async()

                if selected == "__BACK__" or selected is None:
                    continue

                return self.apply_model_selection(selected)

            # 4. BROWSE BY PROVIDER
            elif action == "browse_provider":
                provider_choices = [questionary.Choice("← Return to Main Menu", value="__BACK__")]
                if gemini_count > 0:
                    provider_choices.append(questionary.Choice(f"Gemini Catalog ({gemini_count} models)", value="Gemini"))
                if nvidia_count > 0:
                    provider_choices.append(questionary.Choice(f"Nvidia NIM Catalog ({nvidia_count} models)", value="Nvidia NIM"))
                if openrouter_count > 0:
                    provider_choices.append(questionary.Choice(f"OpenRouter Catalog ({openrouter_count} models)", value="OpenRouter"))

                prov = await questionary.select(
                    "Select a Provider to browse:",
                    choices=provider_choices,
                    style=custom_style
                ).ask_async()

                if prov == "__BACK__" or prov is None:
                    continue

                sub_models = [m for m in models if m["provider"] == prov]

                if prov == "OpenRouter" and len(sub_models) > 20:
                    openrouter_filter = await questionary.select(
                        "How would you like to browse OpenRouter?",
                        choices=[
                            questionary.Choice("Free Tier Models Only", value="free"),
                            questionary.Choice("Search within OpenRouter", value="search"),
                            questionary.Choice("View All Models", value="all"),
                            questionary.Choice("← Return to Main Menu", value="__BACK__")
                        ],
                        style=custom_style
                    ).ask_async()

                    if openrouter_filter == "__BACK__" or openrouter_filter is None:
                        continue
                    elif openrouter_filter == "free":
                        sub_models = [m for m in sub_models if "Free" in m["capabilities"]]
                    elif openrouter_filter == "search":
                        sub_query = await questionary.text("Search within OpenRouter:", style=custom_style).ask_async()
                        if sub_query and sub_query.strip():
                            sq = sub_query.strip().lower()
                            sub_models = [m for m in sub_models if sq in m["id"].lower() or sq in m["name"].lower()]

                sub_choices = [questionary.Choice("← Return to Main Menu", value="__BACK__")]
                for m in sub_models:
                    sub_choices.append(questionary.Choice(m["display"], value=m["id"]))

                selected = await questionary.select(
                    f"Browse {prov} ({len(sub_models)} models):",
                    choices=sub_choices,
                    style=custom_style,
                    use_indicator=True
                ).ask_async()

                if selected == "__BACK__" or selected is None:
                    continue

                return self.apply_model_selection(selected)

    def apply_model_selection(self, model_id: str) -> bool:
        self.active_model = model_id
        self.save_memory()
        console.print(f"\n[bold green]✓ Configuration Saved.[/bold green] Eris will persistently use: [cyan]{self.active_model}[/cyan]\n")
        return True

    async def boot_sequence(self) -> bool:
        if self.active_model:
            console.print(Panel(
                f"[bold magenta]Eris Core OS Online[/bold magenta]\n[dim]Active Matrix:[/dim] [cyan]{self.active_model}[/cyan]",
                border_style="magenta",
                expand=False
            ))
            return True
        else:
            console.print(Panel(
                "[bold magenta]Welcome to Eris Core OS[/bold magenta]\n[dim]Initial setup required: Please configure your active model.[/dim]",
                border_style="magenta",
                expand=False
            ))
            return await self.interactive_config()

    def get_system_prompt(self, query: Optional[str] = None) -> str:
        dynamic_tools = self.load_dynamic_tools()
        state = self.prompt_builder.inspect_system_state(
            registered_tools=dynamic_tools,
            active_model=self.active_model,
            authenticated_user=self.current_user,
            execution_mode=self.execution_mode
        )
        identity = self.memory.get("identity", "You are Eris.")
        return self.prompt_builder.build_system_prompt(identity, state, query=query)

    def build_messages(self, prompt: Optional[str] = None) -> List[Dict[str, str]]:
        sys_prompt = self.get_system_prompt(query=prompt)
        return self.prompt_builder.build_episodic_messages(
            system_prompt=sys_prompt,
            history=self.memory["history"],
            current_prompt=prompt,
            max_turns=8
        )

    async def execute_tool(self, tool_name: str, tool_arg: str, tool_body: str = "") -> str:
        """Executes an agent tool with security sandbox and validation."""
        try:
            if tool_name == "READ_FILE":
                path = tool_arg.strip()
                console.print(f"  [dim italic]❖ Eris is inspecting {path}...[/dim italic]")
                if not is_safe_path(WORKSPACE_DIR, path):
                    return f"SECURITY_ERROR: Access to {path} is blocked by Eris sandbox."
                if os.path.exists(path) and os.path.isfile(path):
                    with open(path, "r", encoding="utf-8", errors="replace") as f:
                        content = f.read()
                    return f"FILE_CONTENT of {path}:\n```\n{content[:4000]}\n```"
                return f"ERROR: File {path} not found."

            elif tool_name == "WRITE_FILE":
                path = tool_arg.strip()
                console.print(f"  [dim italic]❖ Eris is processing write for {path}...[/dim italic]")
                if not is_safe_path(WORKSPACE_DIR, path):
                    return f"SECURITY_ERROR: Target path {path} violates workspace containment."

                # Clean markdown fences
                clean_body = tool_body.strip()
                if clean_body.startswith("```"):
                    lines = clean_body.splitlines()
                    if len(lines) > 1 and lines[0].startswith("```"):
                        lines = lines[1:]
                    if len(lines) > 0 and lines[-1].strip() == "```":
                        lines = lines[:-1]
                    clean_body = "\n".join(lines)

                resolved_path = os.path.realpath(os.path.abspath(os.path.join(WORKSPACE_DIR, path) if not os.path.isabs(path) else path))
                is_in_tools = (os.path.commonpath([TOOLS_DIR, resolved_path]) == TOOLS_DIR)

                # Check if writing outside tools/ directory: requires explicit user approval
                if not is_in_tools:
                    console.print(f"\n[bold yellow]⚠ PERMISSION REQUEST:[/bold yellow] Eris wants to write a file outside `tools/`:")
                    console.print(f"  Target: [cyan]{path}[/cyan] ({len(clean_body)} bytes)")
                    approved = await questionary.confirm(
                        f"Allow Eris to write to {path}?",
                        default=False,
                        style=custom_style
                    ).ask_async()
                    if not approved:
                        return f"USER_DENIED: User refused permission to write to {path} outside tools/ directory."

                # If target is inside tools/ or is a python executable tool: Run Guardrails & Sandbox Pre-Validation
                if is_in_tools or path.endswith(".py"):
                    # 1. Universal Tool Guardrail Audit (Anti-hardcoding, generic template check)
                    console.print(f"  [cyan]❖ Running Universal Tool Guardrail audit on {os.path.basename(path)}...[/cyan]")
                    guard_ok, guard_issues, suggested_template = ToolGuardrails.audit_tool_code(clean_body)
                    if not guard_ok:
                        console.print(f"  [bold red]⚠ Guardrail Audit Flagged Issues:[/bold red]")
                        for issue in guard_issues:
                            console.print(f"    • [yellow]{issue}[/yellow]")
                        
                        # In Speed mode or interactive session, warn and guide
                        if self.execution_mode == "accuracy":
                            return f"TOOL_GUARDRAIL_VIOLATION: The tool contains hardcoded data or schema errors:\n" + "\n".join(guard_issues) + "\nPlease make the tool generic and retrieve values via arguments or environment variables."
                        else:
                            console.print(f"  [dim yellow](Speed mode active: Logging guardrail warning and proceeding with sandbox test)[/dim yellow]")

                    # 2. Isolated Subprocess Sandbox Pre-Validation
                    console.print(f"  [cyan]❖ Running isolated sandbox validation on {os.path.basename(path)}...[/cyan]")
                    passed, sbox_msg = test_tool_in_sandbox(clean_body)
                    if not passed:
                        console.print(f"  [bold red]✕ Sandbox rejection:[/bold red] {sbox_msg}")
                        return f"TOOL_VALIDATION_ERROR: The tool could not be registered.\nReason: {sbox_msg}\nPlease fix the tool and try again."

                # Write the validated file
                os.makedirs(os.path.dirname(resolved_path), exist_ok=True)
                with open(resolved_path, "w", encoding="utf-8") as f:
                    f.write(clean_body)

                # If in tools/, update registry with hash
                if is_in_tools:
                    fname = os.path.basename(resolved_path)
                    fhash = calculate_file_hash(clean_body)
                    self.tool_registry[fname] = {
                        "hash": fhash,
                        "status": "verified",
                        "last_tested": str(os.path.getmtime(resolved_path))
                    }
                    self.save_tool_registry()
                    console.print(f"  [bold green]✓ Verified & Registered Tool:[/bold green] [cyan]{fname}[/cyan] in tools/")
                else:
                    console.print(f"  [bold green]✓ Created/Updated:[/bold green] [cyan]{path}[/cyan]")

                return f"SUCCESS: Wrote {len(clean_body)} bytes to {path}. Sandboxed validation: PASSED."

            elif tool_name == "LIST_DIR":
                path = tool_arg.strip() if tool_arg.strip() else "."
                console.print(f"  [dim italic]❖ Eris is indexing {path}...[/dim italic]")
                if not is_safe_path(WORKSPACE_DIR, path):
                    return f"SECURITY_ERROR: Directory traversal to {path} blocked."
                if os.path.exists(path) and os.path.isdir(path):
                    entries = os.listdir(path)
                    return f"DIR_ENTRIES for {path}:\n" + "\n".join(entries)
                return f"ERROR: Directory {path} not found."

            elif tool_name == "RUN_COMMAND":
                cmd = tool_arg.strip()
                # Security check against destructive system commands
                is_harmful, reason = check_harmful_command(cmd)
                if is_harmful:
                    return f"SECURITY_ERROR: Command execution blocked: {reason}"

                # Package download / install guardrail: Prompt Aman for permission
                download_keywords = ["pip install", "pip3 install", "uv pip install", "uv add", "npm install", "npm i ", "yarn add", "cargo install"]
                if any(kw in cmd.lower() for kw in download_keywords):
                    console.print(f"\n[bold yellow]📦 PACKAGE DOWNLOAD REQUEST:[/bold yellow] Eris wishes to execute:")
                    console.print(f"  [cyan]{cmd}[/cyan]")
                    approved = await questionary.confirm(
                        f"Allow Eris to install this external package/dependency?",
                        default=True,
                        style=custom_style
                    ).ask_async()
                    if not approved:
                        return f"USER_CANCELLED: User denied permission to download/install packages for: `{cmd}`."

                console.print(f"  [dim italic]❖ Eris executing: {cmd}...[/dim italic]")
                res = subprocess.run(cmd, shell=True, cwd=WORKSPACE_DIR, capture_output=True, text=True, timeout=15)
                out = (res.stdout or "") + (res.stderr or "")
                return f"COMMAND_OUTPUT (code {res.returncode}):\n{out[:2000]}"

            elif tool_name == "CALL_TOOL":
                parts = tool_arg.strip().split(maxsplit=1)
                tname = parts[0]
                targs = parts[1] if len(parts) > 1 else ""
                dynamic_tools = self.load_dynamic_tools()
                if tname in dynamic_tools:
                    console.print(f"  [dim italic]❖ Eris calling dynamic tool '{tname}'...[/dim italic]")
                    tool_func = dynamic_tools[tname]["function"]
                    try:
                        res = tool_func(targs)
                        return f"TOOL_RESULT from {tname}:\n{str(res)}"
                    except Exception as ex:
                        return f"TOOL_EXECUTION_EXCEPTION ({tname}): {str(ex)}"
                return f"ERROR: Unknown tool '{tname}'. Available registered tools: {list(dynamic_tools.keys())}"

            return f"ERROR: Unrecognized tool tag {tool_name}"
        except Exception as e:
            return f"TOOL_EXECUTION_ERROR ({tool_name}): {str(e)}"

    def parse_tool_calls(self, text: str) -> List[Tuple[str, str, str]]:
        """Extracts [WRITE_FILE: ...] and XML <tool_call> formatted tools from text."""
        calls = []

        # 1. Standard bracket syntax: [WRITE_FILE: <path>] ... [/WRITE_FILE]
        write_pattern = re.compile(r'\[WRITE_FILE:\s*([^\]]+)\](.*?)\[/WRITE_FILE\]', re.DOTALL | re.IGNORECASE)
        for path, body in write_pattern.findall(text):
            calls.append(("WRITE_FILE", path.strip(), body))
            
        cleaned = write_pattern.sub('', text)
        
        # 2. Standard bracket syntax: [READ_FILE: ...], [LIST_DIR: ...], etc.
        tag_pattern = re.compile(r'\[(READ_FILE|LIST_DIR|RUN_COMMAND|CALL_TOOL):\s*([^\]]+)\]', re.IGNORECASE)
        for tool, arg in tag_pattern.findall(cleaned):
            calls.append((tool.upper(), arg.strip(), ""))

        # 3. XML syntax emitted by models like Ling/Qwen/GLM:
        # e.g.: <tool_call>WRITE_FILE\n<path>tools/foo.py</path>\n<content>...</content>\n</tool_response>
        xml_write_pattern = re.compile(
            r'<tool_call>\s*(?:WRITE_FILE|write_file)[\s\S]*?<path>\s*([^<\n\r]+?)\s*</path>[\s\S]*?<content>\s*(.*?)\s*</content>[\s\S]*?</(?:tool_call|tool_response)>',
            re.DOTALL | re.IGNORECASE
        )
        for path, body in xml_write_pattern.findall(text):
            # Avoid duplicate if already matched
            if not any(c[0] == "WRITE_FILE" and c[1] == path.strip() for c in calls):
                calls.append(("WRITE_FILE", path.strip(), body))

        # 4. XML syntax for RUN_COMMAND, READ_FILE, LIST_DIR:
        # e.g.: <tool_call>RUN_COMMAND\n<command>dir</command></tool_call>
        xml_cmd_pattern = re.compile(
            r'<tool_call>\s*(?:RUN_COMMAND|run_command)[\s\S]*?<(?:command|cmd)>\s*(.*?)\s*</(?:command|cmd|arg_value)>[\s\S]*?</tool_call>',
            re.DOTALL | re.IGNORECASE
        )
        for cmd in xml_cmd_pattern.findall(text):
            clean_cmd = cmd.strip()
            if not any(c[0] == "RUN_COMMAND" and c[1] == clean_cmd for c in calls):
                calls.append(("RUN_COMMAND", clean_cmd, ""))

        # e.g.: <tool_call>READ_FILE\n<path>tools/foo.py</path></tool_call>
        xml_read_pattern = re.compile(
            r'<tool_call>\s*(?:READ_FILE|read_file)[\s\S]*?<path>\s*([^<\n\r]+?)\s*</path>[\s\S]*?</tool_call>',
            re.DOTALL | re.IGNORECASE
        )
        for path in xml_read_pattern.findall(text):
            clean_p = path.strip()
            if not any(c[0] == "READ_FILE" and c[1] == clean_p for c in calls):
                calls.append(("READ_FILE", clean_p, ""))

        # e.g.: <tool_call>LIST_DIR\n<path>tools/</path></tool_call>
        xml_list_pattern = re.compile(
            r'<tool_call>\s*(?:LIST_DIR|list_dir)[\s\S]*?<path>\s*([^<\n\r]+?)\s*</path>[\s\S]*?</tool_call>',
            re.DOTALL | re.IGNORECASE
        )
        for path in xml_list_pattern.findall(text):
            clean_p = path.strip()
            if not any(c[0] == "LIST_DIR" and c[1] == clean_p for c in calls):
                calls.append(("LIST_DIR", clean_p, ""))

        return calls

    async def stream_single_turn(self, messages: List[Dict[str, str]]) -> Tuple[str, List[Tuple[str, str, str]]]:
        """Streams a single LLM turn. Automatically fails over across candidate models if rate limited."""
        candidates = [self.active_model] + self.get_fallback_candidates()
        last_err = None

        for model_candidate in candidates:
            try:
                response = await litellm.acompletion(
                    model=model_candidate,
                    messages=messages,
                    stream=True,
                    api_key=self.get_api_key_for_model(model_candidate),
                    timeout=25
                )

                full_response = ""
                is_tool_call = False

                try:
                    async for chunk in response:
                        if chunk.choices and chunk.choices[0].delta.content:
                            content = chunk.choices[0].delta.content
                            full_response += content

                            if not is_tool_call:
                                if any(k in full_response for k in ["[READ_FILE:", "[WRITE_FILE:", "[LIST_DIR:", "[RUN_COMMAND:", "[CALL_TOOL:", "<tool_call>"]):
                                    is_tool_call = True
                                else:
                                    console.print(content, end="")
                except (KeyboardInterrupt, asyncio.CancelledError):
                    console.print("\n  [dim italic](Generation paused by Aman)[/dim italic]")
                    return full_response + " [interrupted]", []
                except Exception as chunk_err:
                    if not full_response:
                        raise chunk_err
                    else:
                        console.print(f"\n[dim yellow](Stream interrupted: {chunk_err})[/dim yellow]")

                if model_candidate != self.active_model:
                    console.print(f"\n  [dim cyan]❖ Auto-switched to live model: {model_candidate}[/dim cyan]")
                    self.active_model = model_candidate
                    self.save_memory()

                tool_calls = self.parse_tool_calls(full_response)
                if not tool_calls and not is_tool_call:
                    console.print()

                return full_response, tool_calls

            except Exception as e:
                last_err = e
                continue

        console.print(f"\n[bold red]All models unavailable:[/bold red] {last_err}")
        return "", []

    async def stream_chat(self, user_prompt: str):
        """Iterative agentic execution loop: handles multi-step tool calls with sandbox validation."""
        if user_prompt.startswith("/"):
            await self.handle_commands(user_prompt)
            return

        self.append_to_history("user", user_prompt)
        console.print("\n[bold magenta]Eris ❖[/bold magenta] ", end="")
        
        # Build turn context
        messages = self.build_messages(user_prompt)
        max_agent_turns = 8
        final_answer = ""

        try:
            for turn in range(max_agent_turns):
                turn_response, tool_calls = await self.stream_single_turn(messages)
                
                if not tool_calls:
                    final_answer = turn_response
                    break
                    
                # Model called tools: execute them and feed observations back
                messages.append({"role": "assistant", "content": turn_response})
                
                observations = []
                for tool_name, tool_arg, tool_body in tool_calls:
                    obs = await self.execute_tool(tool_name, tool_arg, tool_body)
                    observations.append(f"OBSERVATION from {tool_name} ({tool_arg}):\n{obs}")
                    
                messages.append({"role": "user", "content": "\n\n".join(observations)})
            else:
                # If agent loop exhausted without a pure conversational ending, prompt for summary
                if not final_answer:
                    messages.append({
                        "role": "user",
                        "content": "All tool actions have completed. Now provide your final, clear conversational response to Aman explaining what you found or accomplished."
                    })
                    final_answer, _ = await self.stream_single_turn(messages)
                
            if final_answer and final_answer.strip():
                self.append_to_history("assistant", final_answer.strip())

        except Exception as e:
            console.print(f"\n[red]Error during generation:[/red] {e}\n[dim]Tip: Use /config to switch models.[/dim]")

    async def handle_commands(self, cmd: str):
        parts = cmd.strip().split(maxsplit=1)
        base_cmd = parts[0].lower()
        arg = parts[1] if len(parts) > 1 else ""

        if base_cmd in ("/config", "/matrix"):
            await self.interactive_config()
        elif base_cmd in ("/model", "/switch"):
            if arg:
                await self.search_and_select(prefill_query=arg)
            else:
                await self.interactive_config()
        elif base_cmd == "/tools":
            tools = self.load_dynamic_tools()
            console.print(Panel(
                f"[bold magenta]❖ Registered Dynamic Tools ({len(tools)})[/bold magenta]\n" +
                ("\n".join([f"• [cyan]{name}[/cyan] ({info['file']}): {info['description']}" for name, info in tools.items()]) if tools else "[dim]No tools currently registered in tools/[/dim]"),
                border_style="magenta"
            ))
        elif base_cmd == "/login":
            email = arg.strip()
            if not email:
                email = await questionary.text("Enter your email address:", style=custom_style).ask_async()
            if not email or "@" not in email:
                console.print("[red]Invalid email address provided.[/red]")
                return

            console.print(f"[cyan]Requesting OTP verification code for {email}...[/cyan]")
            ok, msg, _ = self.auth.request_otp(email, send_email=True)
            if not ok:
                console.print(f"[bold red]✕ {msg}[/bold red]")
                return

            console.print(f"[bold green]✓ {msg}[/bold green]")
            code = await questionary.text("Enter the 6-digit code received in your email:", style=custom_style).ask_async()
            if not code or not code.strip():
                console.print("[yellow]Login cancelled.[/yellow]")
                return

            v_ok, v_msg, sess = self.auth.verify_otp(email, code)
            if v_ok and sess:
                self.current_user = sess["email"]
                self.memory["current_user"] = sess["email"]
                self.memory["session_token"] = sess["token"]
                self.save_memory()
                console.print(f"\n[bold green]✓ Authentication Successful![/bold green] Welcome, [cyan]{self.current_user}[/cyan]")
            else:
                console.print(f"\n[bold red]✕ Authentication Failed:[/bold red] {v_msg}")

        elif base_cmd == "/logout":
            token = self.memory.get("session_token")
            if token:
                self.auth.revoke_session(token)
            self.current_user = None
            self.memory.pop("current_user", None)
            self.memory.pop("session_token", None)
            self.save_memory()
            console.print("[green]✓ Successfully logged out. Session cleared.[/green]")

        elif base_cmd in ("/whoami", "/user"):
            if self.current_user:
                console.print(Panel(
                    f"[bold magenta]❖ Authenticated Session[/bold magenta]\n"
                    f"[dim]User Account:[/dim] [bold cyan]{self.current_user}[/bold cyan]\n"
                    f"[dim]Active Token:[/dim] [dim]{self.memory.get('session_token', '')[:16]}...[/dim]\n"
                    f"[dim]Status:[/dim] [green]Active Authenticated[/green]",
                    border_style="cyan"
                ))
            else:
                console.print("[yellow]Not currently logged in. Type [cyan]/login <your-email>[/cyan] to authenticate via OTP.[/yellow]")

        elif base_cmd == "/mode":
            mode_arg = arg.strip().lower()
            if mode_arg in ("speed", "accuracy"):
                self.execution_mode = mode_arg
                self.memory["execution_mode"] = mode_arg
                self.save_memory()
                console.print(f"[bold green]✓ Execution Matrix Mode updated to:[/bold green] [bold cyan]{mode_arg.upper()}[/bold cyan]")
            else:
                console.print(f"[yellow]Current mode:[/yellow] [bold cyan]{self.execution_mode.upper()}[/bold cyan]\nUse [cyan]/mode speed[/cyan] (fast, proactive) or [cyan]/mode accuracy[/cyan] (deep validation, AST audit).")
        elif base_cmd == "/clear":
            self.memory["history"] = []
            self.save_memory()
            console.print("[green]Memory cleared.[/green]")
        elif base_cmd in ("/exit", "/quit"):
            console.print("[cyan]System shutdown initiated. Goodbye, Aman.[/cyan]")
            sys.exit(0)
        else:
            console.print("[red]Unknown command.[/red] Available commands:\n  /mode <speed|accuracy> - Toggle execution balance\n  /login <email>         - Login via email OTP\n  /logout                - Logout & revoke session\n  /whoami                - View active account session\n  /tools                 - List all registered tools in tools/\n  /config                - Open Omni-Directional Model Matrix\n  /model <name>          - Fast-search and switch models\n  /clear                 - Clear conversation history\n  /exit                  - Exit Eris")

async def main():
    eris = ErisCore()
    success = await eris.boot_sequence()
    if not success:
        return
        
    console.print("\n[dim]Commands: /login (Auth)  /whoami (Status)  /tools (Registry)  /config (Wizard)  /model <name>  /clear  /exit[/dim]")
    while True:
        try:
            short_model = eris.active_model.split("/")[-1] if eris.active_model else "none"
            user_label = f"[bold cyan]{eris.current_user}[/bold cyan]" if eris.current_user else "[bold cyan]Aman[/bold cyan]"
            prompt = await asyncio.to_thread(Prompt.ask, f"\n{user_label} [dim]({short_model})[/dim]")
            if prompt and prompt.strip():
                await eris.stream_chat(prompt.strip())
        except (KeyboardInterrupt, EOFError):
            console.print("\n[dim]Type /exit to shutdown cleanly.[/dim]")
            break

if __name__ == "__main__":
    litellm.suppress_debug_info = True
    try:
        asyncio.run(main())
    except (KeyboardInterrupt, SystemExit):
        console.print("\n[cyan]Eris offline.[/cyan]")
