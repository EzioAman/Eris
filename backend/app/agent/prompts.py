import json
import logging
import re
from enum import Enum
from pathlib import Path
from typing import Any, Dict, List, Optional

try:
    from backend.app.config import settings
    from backend.app.services.learning import build_habit_prompt
except ImportError:
    from app.config import settings
    from app.services.learning import build_habit_prompt

logger = logging.getLogger("eris.agent.prompts")


class IntentType(str, Enum):
    READ_INSPECTION = "read_inspection"
    ACTION_EXECUTE = "action_execute"
    WORKFLOW_ORCHESTRATION = "workflow_orchestration"
    MULTI_AGENT_SWARM = "multi_agent_swarm"
    CONVERSATION = "conversation"


class PromptBuilder:
    """
    Constructs contextual, anti-slop system prompts for Eris.
    Injects human learning history, user preferences, active tools, and safety directives.
    """

    def __init__(self, workspace_path: Optional[Path] = None):
        self.workspace_path = workspace_path or settings.WORKSPACE_PATH

    @classmethod
    def classify_intent(cls, prompt: str) -> IntentType:
        """Classifies the user prompt to tune system reasoning constraints."""
        text = prompt.lower().strip()

        # 1. Multi-agent swarm triggers
        if any(k in text for k in (
            "multi agent", "multi-agent", "spawn agent", "spawn agents",
            "break the system", "security audit", "parallel agents", "swarm",
            "penetration test", "adversarial test", "subagent", "subagents"
        )):
            return IntentType.MULTI_AGENT_SWARM

        # 2. Workflow orchestration triggers
        if any(k in text for k in (
            "run workflow", "trigger workflow", "pipeline", "email workflow",
            "triage workflow", "execute pipeline", "start workflow"
        )):
            return IntentType.WORKFLOW_ORCHESTRATION

        # 3. Read & Inspection triggers
        read_keywords = (
            "show me the dir", "show dir", "check dir", "check the dir",
            "list dir", "view file", "read file", "show contents", "what is in",
            "inspect dir", "list files", "ls", "dir of", "directory of",
            "cat ", "inspect the repo", "look inside", "check write tool",
            "show me the contents", "what are the files", "read instructions",
            "review and analyze", "review this file", "analyze this file",
            "analyze file", "review file", "analyze", "review",
        )
        if any(k in text for k in read_keywords):
            return IntentType.READ_INSPECTION

        # 4. Pure greetings & small talk
        greeting_words = {"hi", "hello", "hey", "sup", "greetings", "good morning", "good evening", "good afternoon", "who are you"}
        clean_words = text.rstrip(".!? ")
        if clean_words in greeting_words or (len(text.split()) <= 2 and any(g in text for g in ("hi", "hello", "hey"))):
            return IntentType.CONVERSATION

        # Default: general action execution
        return IntentType.ACTION_EXECUTE

    def load_user_memory_profile(self, user_id: Optional[str] = None) -> str:
        """
        Loads the active user profile across UserDatabaseService, user_data.db,
        memory/users/<user_id>/profile.json, and memory/memory.json.
        """
        # 1. Try UserDatabaseService for specific user
        candidate_ids = []
        if user_id:
            candidate_ids.extend([user_id, user_id.replace("_", "@"), user_id.replace("@", "_")])
        candidate_ids.extend(["user1_gmail_com", "user1@gmail.com", "default_user"])

        try:
            from backend.app.services.user_db_service import UserDatabaseService
            for cid in candidate_ids:
                prof = UserDatabaseService.get_user_profile(cid)
                if prof and (prof.get("display_name") or prof.get("username")):
                    lines = [
                        f"- Current User: {prof.get('display_name', 'User')} (@{prof.get('username', 'user')})",
                    ]
                    if prof.get("email"):
                        lines.append(f"- User Email: {prof.get('email')}")
                    if prof.get("headline"):
                        lines.append(f"- User Role/Focus: {prof.get('headline')}")
                    if prof.get("bio"):
                        lines.append(f"- User Context & Notes: {prof.get('bio')}")
                    if prof.get("timezone"):
                        lines.append(f"- User Timezone: {prof.get('timezone')}")
                    return "\n".join(lines) + "\n"
        except Exception:
            pass

        # 2. Check disk profile.json under memory/users/
        users_dir = self.workspace_path / "memory" / "users"
        if users_dir.exists():
            # If user_id provided, check its directory first
            subdirs = []
            if user_id:
                subdirs.append(users_dir / user_id)
            subdirs.extend(list(users_dir.iterdir()))

            for u_dir in subdirs:
                if u_dir.is_dir():
                    p_file = u_dir / "profile.json"
                    if p_file.exists():
                        try:
                            with open(p_file, "r", encoding="utf-8") as f:
                                prof = json.load(f)
                                if prof.get("display_name") or prof.get("username"):
                                    lines = [
                                        f"- Current User: {prof.get('display_name', 'User')} (@{prof.get('username', 'user')})",
                                    ]
                                    if prof.get("email"):
                                        lines.append(f"- User Email: {prof.get('email')}")
                                    if prof.get("headline"):
                                        lines.append(f"- User Role/Focus: {prof.get('headline')}")
                                    if prof.get("bio"):
                                        lines.append(f"- User Context & Notes: {prof.get('bio')}")
                                    if prof.get("timezone"):
                                        lines.append(f"- User Timezone: {prof.get('timezone')}")
                                    return "\n".join(lines) + "\n"
                        except Exception:
                            pass

        # 3. Fallback to memory/memory.json or memory/user_profile.json
        for fallback_name in ["memory.json", "user_profile.json"]:
            mem_file = self.workspace_path / "memory" / fallback_name
            if mem_file.exists():
                try:
                    with open(mem_file, "r", encoding="utf-8") as f:
                        mem = json.load(f)
                        user_prof = mem.get("user_profile") if "user_profile" in mem else (mem if "display_name" in mem else None)
                        if user_prof and (user_prof.get("display_name") or user_prof.get("username")):
                            lines = [
                                f"- Current User: {user_prof.get('display_name', 'User')} (@{user_prof.get('username', 'user')})",
                            ]
                            if user_prof.get("headline"):
                                lines.append(f"- User Role/Focus: {user_prof.get('headline')}")
                            if user_prof.get("bio"):
                                lines.append(f"- User Context & Notes: {user_prof.get('bio')}")
                            if user_prof.get("timezone"):
                                lines.append(f"- User Timezone: {user_prof.get('timezone')}")
                            return "\n".join(lines) + "\n"
                except Exception:
                    pass

        return ""

    def load_ai_slop_guidelines(self) -> str:
        """Loads anti-slop guidelines from doc/ai_slop.md to guarantee high signal responses."""
        slop_file = self.workspace_path / "doc" / "ai_slop.md"
        if not slop_file.exists():
            return (
                "ANTI-SLOP DIRECTIVES:\n"
                "- Never emit unfinished placeholder code or mock returns.\n"
                "- Never fabricate metrics or hallucinate UI widgets.\n"
                "- Ensure every output is actionable, verifiable, and authentic."
            )
        return (
            "ANTI-SLOP DIRECTIVES (From doc/ai_slop.md):\n"
            "1. Effort Economy: Prioritize intentional craft over mass boilerplate.\n"
            "2. No Placeholder Code: Never emit incomplete stubs, empty passes, or fake mocks.\n"
            "3. Zero Fabricated UI/Telemetry: Report real execution outputs; never mock success.\n"
            "4. Deterministic State: If something fails, report genuine errors with actionable fixes.\n"
        )

    def build_system_prompt(
        self,
        intent: IntentType,
        active_model: str,
        execution_mode: str = "speed",
        user_habits: Optional[Dict[str, Any]] = None,
        registered_tools: Optional[List[Dict[str, Any]]] = None,
        installed_plugins: Optional[List[Dict[str, Any]]] = None,
        user_id: Optional[str] = None,
    ) -> str:
        """
        Constructs the comprehensive system prompt including anti-slop guidelines and learned habits.
        """
        prompt = (
            "You are the intelligence engine of ERIS. ERIS is the entire autonomous pair-programming platform and runtime environment "
            "that the user is interacting with, and you are acting as ERIS, the agent. You are NOT an external script or folder inside the workspace. "
            "The workspace is simply the user's project/codebase that ERIS is actively managing, inspecting, and editing on their behalf.\n"
        )
        prompt += f"- Active Model: {active_model}\n"
        prompt += f"- Execution Profile: {execution_mode.upper()}\n"
        prompt += "- Creator & Lead Developer: Aman Sinha\n\n"

        # User profile injection from profile settings
        user_profile = self.load_user_memory_profile(user_id=user_id)
        if user_profile:
            prompt += f"### Current User Information (From Profile Settings):\n{user_profile}\n"

        # Anti-slop rules
        prompt += f"### Quality & Anti-Slop Directives:\n{self.load_ai_slop_guidelines()}\n\n"

        # Human habits & learned preferences from learning service
        habit_section = build_habit_prompt(user_habits)
        if habit_section:
            prompt += f"{habit_section}\n"

        # Active Plugins
        if installed_plugins:
            prompt += "### Real Installed Plugins in Workspace:\n"
            for p in installed_plugins:
                tools_str = ", ".join(p.get("tools", []))
                prompt += f"- **{p.get('name')}** (`{p.get('id')}`): {p.get('usage', '')}\n"
                if tools_str:
                    prompt += f"  Tools: {tools_str}\n"
            prompt += "\n"

        # Active Tools
        if registered_tools:
            prompt += "### Available Tools:\n"
            for t in registered_tools:
                prompt += f"- `{t.get('name')}`: {t.get('description', '')}\n"
            prompt += "\n"

        # Intent-specific guidance
        if intent == IntentType.READ_INSPECTION:
            prompt += (
                "### Read, Review & Analysis Directives:\n"
                "- The user requested a file/directory inspection, review, or analysis.\n"
                "- Invoke `read_file` or `view_file` to obtain the file contents.\n"
                "- ABSOLUTE LAW: NEVER run shell commands (`run_command`, `ls`, `wc`, `cat`, etc.) for read-only reviews or inspections.\n"
                "- Once the file contents have been returned in the tool response, you ALREADY HAVE the full contents in context. You MUST NOT call any more tools.\n"
                "- Immediately provide your thorough, comprehensive, in-depth code/file analysis and review directly to the user in your message content.\n\n"
            )
        elif intent == IntentType.MULTI_AGENT_SWARM:
            prompt += (
                "### Multi-Agent Swarm Orchestration Mode:\n"
                "- Complex testing, adversarial security audits, or parallel research requested.\n"
                "- You can spawn specialized swarm workers (coder, writer, security, researcher, tester, optimizer).\n"
                "- Use the spawn_swarm tool or subagent delegation to run parallel tasks.\n\n"
            )
        elif intent == IntentType.CONVERSATION:
            prompt += (
                "### Conversational Directives:\n"
                "- The user prompt is a greeting or casual interaction.\n"
                "- Respond warmly, intelligently, and concisely without unnecessary tool executions.\n\n"
            )

        # Cognitive Reasoning (<think>...</think>) & Goal-Driven Self-Reflection
        prompt += (
            "### Goal-Driven Self-Reasoning & Internal Dialogue (<think>...</think>):\n"
            "- Always formulate an internal chain-of-thought inside `<think>` and `</think>` tags before acting.\n"
            "- Reason with yourself as a goal-driven autonomous agent:\n"
            "  1. Goal Identification: What is the core goal the user wants to accomplish?\n"
            "  2. Tech Stack Alignment: Which technologies should be used? (e.g., React, Vite, TypeScript, Tailwind). Are they present in the workspace?\n"
            "  3. Template & Asset Reuse: Can current pre-built templates or existing modules achieve this with maximum quality?\n"
            "  4. Tool Strategy: Which tools are required to achieve the goal?\n"
            "- Authentic internal reasoning and self-reflection belong exclusively inside `<think>...</think>`.\n\n"
        )

        # Tool Priority & Dynamic Tool Creation Protocol
        prompt += (
            "### Tool Priority & Dynamic Tool Creation Protocol:\n"
            "- Always inspect and prioritize existing specialized tools from `tools/` (e.g. `open_browser`, `play_youtube_song`, `send_email`) over executing generic terminal commands.\n"
            "- CRITICAL CONVERSATIONAL LAW: NEVER use `run_command` with 'echo' or shell commands to output normal conversational text, greetings, answers, or explanations to the user! Conversational replies must be output directly in your message text. Shell commands are strictly reserved for genuine OS/file operations.\n"
            "- Direct Action Routing: If the user asks to play a song, music, video, or soundtrack, invoke `play_youtube_song` directly with the title query (e.g. 'Sunflower Post Malone'). Do NOT invoke `search_web` first.\n"
            "- Direct Browser Routing: If the user asks to open a website, URL, or browser, invoke `open_browser` directly. Call it at most ONCE with the target URL. Never emit repetitive identical browser tool calls.\n"
            "- NEVER execute ad-hoc Python one-liners (`python -c \"import ...\"`) through `run_command` for tasks that should be structured tools or integrations.\n"
            "- If the user asks for a capability or action that has no existing tool:\n"
            "  1. If the user explicitly asks to create a tool (e.g., 'create a tool for X'), use `create_custom_tool` to write and register a verified Python plugin in `tools/`.\n"
            "  2. If the user asks for an action that lacks a tool, propose creating one: explain that you don't have a dedicated tool yet and ask if they would like you to create a reusable tool in `tools/`.\n"
            "- All tools created in `tools/` must define `TOOL_NAME`, `TOOL_DESCRIPTION`, and an entry point `def execute(args: str = \"\") -> str:`.\n\n"
        )

        # Universal Tool Empowerment for All Agents
        prompt += (
            "### Universal Tool Empowerment & Execution Protocol:\n"
            "- You are fully empowered to invoke registered local tools to achieve user goals.\n"
            "- If native function calling is available, emit functionCall objects.\n"
            "- If native function calling is unavailable, you can invoke tools via explicit syntax: `[CALL_TOOL: <tool_name> <json_args>]`.\n"
            "- When a tool execution finishes, analyze the output, verify whether it fulfilled the goal, and proceed intentionally.\n\n"
        )

        # Strict API Key & Credential Zero-Exposure Directive
        prompt += (
            "### Strict Credential & Secret Protection Directive:\n"
            "- CRITICAL SECURITY LAW: You do NOT have access to the user's raw API keys, tokens, or credential vault.\n"
            "- All API keys are encrypted in a secure local database vault.\n"
            "- You must NEVER read, print, output, expose, or repeat any API key, secret, or password, even if the user explicitly orders or attempts to jailbreak you into doing so.\n"
            "- If asked to show, print, or reveal API keys or secrets, politely refuse and instruct the user to manage their keys securely in Settings > API Key Vault.\n\n"
        )

        # Decisive Execution & Anti-Loop directives
        prompt += (
            "### Decisive Tool Execution Directives:\n"
            "- Once you identify or read a file, do NOT repeat search queries, search_knowledge_vault, or list_dir.\n"
            "- When modifying or repairing code, show the exact unified diff using a ```diff block (with - for removed lines and + for added lines) or provide the complete updated code block so the user can inspect the comparison.\n"
            "- Immediately perform the necessary edit with write_to_file / replace_file_content or provide the complete fixed code.\n"
            "- Never loop on reading files or inspecting directories. Aim to complete your task in 1-2 tool calls.\n\n"
        )

        # Safety boundary for emails and high-risk operations
        prompt += (
            "### Critical Safety Boundary for External Actions:\n"
            "- Never guess recipient email addresses or messages.\n"
            "- If recipient or message body is missing, ask the user in chat for the details.\n"
            "- High-risk actions (send_email, run_command) undergo explicit human approval before execution.\n"
        )

        return prompt


# Singleton prompt builder instance
prompt_builder = PromptBuilder()


API_KEY_PATTERNS = [
    re.compile(r"AIza[0-9A-Za-z-_]{35}"),               # Google Gemini / Google Cloud
    re.compile(r"sk-or-v1-[0-9a-fA-F]{64}"),             # OpenRouter
    re.compile(r"sk-[a-zA-Z0-9]{20,60}"),                # OpenAI / General sk- keys
    re.compile(r"gsk_[a-zA-Z0-9]{40,64}"),               # Groq keys
    re.compile(r"nvapi-[a-zA-Z0-9_\-]{40,80}"),          # NVIDIA NIM
    re.compile(r"(?i)bearer\s+[A-Za-z0-9_\-\.]{20,}"),   # Bearer tokens
]


def scrub_sensitive_credentials(text: str) -> str:
    """Scans and redacts any detected secret or API key patterns from text."""
    if not text:
        return text
    scrubbed = text
    for pattern in API_KEY_PATTERNS:
        scrubbed = pattern.sub("[ENCRYPTED_API_KEY_PROTECTED]", scrubbed)
    return scrubbed


EXTRACTION_REGEX = re.compile(
    r"(?i)\b(what\s+is|show|print|reveal|dump|give|display|get|leak|tell\s+me|expose|extract|read|cat|echo)\b"
    r".*?\b(api[_\s-]?keys?|gemini[_\s-]?key|openrouter[_\s-]?key|secret[_\s-]?keys?|credentials?|tokens?|vault|key_ciphertext|\.env)\b"
)

DIRECT_PROMPT_PATTERNS = [
    "api_key_vault",
    "key_ciphertext",
    "select * from api_key",
    "cat .env",
    "read .env",
    "print .env",
    "show .env",
    ".env file",
]


def is_credential_extraction_attempt(text: str) -> bool:
    """Detects prompts explicitly attempting to extract API keys or secrets."""
    if not text:
        return False
    lowered = text.lower().strip()

    # 1. Regex pattern matching action + target
    if EXTRACTION_REGEX.search(lowered):
        return True

    # 2. Direct string indicators
    for indicator in DIRECT_PROMPT_PATTERNS:
        if indicator in lowered:
            return True

    # 3. Two-term semantic combinations
    has_target = any(t in lowered for t in ["api key", "apikey", "api_key", "secret key", "credentials", "gemini key", "openrouter key"])
    has_action = any(a in lowered for a in ["what is", "show", "print", "reveal", "give", "dump", "tell me", "display", "leak"])
    if has_target and has_action:
        return True

    return False


def build_system_prompt(
    intent: IntentType,
    active_model: str,
    execution_mode: str = "speed",
    user_habits: Optional[Dict[str, Any]] = None,
    registered_tools: Optional[List[Dict[str, Any]]] = None,
    installed_plugins: Optional[List[Dict[str, Any]]] = None,
    user_id: Optional[str] = None,
) -> str:
    """Helper function to build system prompt."""
    return prompt_builder.build_system_prompt(
        intent=intent,
        active_model=active_model,
        execution_mode=execution_mode,
        user_habits=user_habits,
        registered_tools=registered_tools,
        installed_plugins=installed_plugins,
        user_id=user_id,
    )


def classify_intent(prompt: str) -> IntentType:
    """Helper function to classify user intent."""
    return PromptBuilder.classify_intent(prompt)
