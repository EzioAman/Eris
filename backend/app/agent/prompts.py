import json
import logging
import re
from enum import Enum
from pathlib import Path
from typing import Any, Dict, List, Optional

try:
    from backend.app.config import settings
    from backend.app.services.learning import build_habit_prompt
    from backend.app.services.security import verify_developer_passphrase
except ImportError:
    from app.config import settings
    from app.services.learning import build_habit_prompt
    from app.services.security import verify_developer_passphrase

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
    def infer_orchestration_depth(cls, candidate_tool_names: List[str], query: str = "") -> IntentType:
        """
        Derives orchestration depth from candidate set geometry rather than rigid word lists:
        - 0 candidate tools -> CONVERSATION
        - Purely read tools -> READ_INSPECTION
        - Multiple disjoint capability categories -> MULTI_AGENT_SWARM
        - Otherwise standard -> ACTION_EXECUTE
        """
        if not candidate_tool_names:
            return IntentType.CONVERSATION

        read_tools = {"read_file", "view_file", "grep_search", "list_dir", "search_knowledge_vault"}
        if all(name in read_tools for name in candidate_tool_names):
            return IntentType.READ_INSPECTION

        # If read tools are present and query is an explicit inspection/view request without modification verbs
        q_low = query.lower().strip()
        if any(name in ("read_file", "view_file") for name in candidate_tool_names):
            inspection_verbs = ("show", "read", "view", "inspect", "check", "cat", "what is inside", "display", "print")
            edit_verbs = ("write", "edit", "modify", "update", "fix", "delete", "replace", "add", "refactor")
            if any(iv in q_low for iv in inspection_verbs) and not any(ev in q_low for ev in edit_verbs):
                return IntentType.READ_INSPECTION

        if len(candidate_tool_names) >= 5:
            categories = set()
            for name in candidate_tool_names:
                if name in ("read_file", "view_file", "grep_search", "list_dir"):
                    categories.add("read")
                elif name in ("write_file", "run_command"):
                    categories.add("exec")
                elif name in ("search_web", "scrape_web", "open_browser"):
                    categories.add("web")
                elif name in ("search_knowledge_vault",):
                    categories.add("vault")
                else:
                    categories.add("custom")
            if len(categories) >= 4:
                return IntentType.MULTI_AGENT_SWARM

        return IntentType.ACTION_EXECUTE

    @classmethod
    def classify_intent(cls, prompt: str) -> IntentType:
        """
        Dynamically classifies the user prompt by inspecting retrieved tool candidates
        and semantic capability alignment, without hardcoded regex word lists.
        """
        text = prompt.lower().strip()

        # 1. Obvious conversational greetings
        if text in ("hi", "hello", "hey", "hi eris", "hello eris", "hey eris", "good morning", "good evening", "good afternoon"):
            return IntentType.CONVERSATION

        # 2. Explicit swarm / security audit commands
        if any(k in text for k in (
            "multi agent", "multi-agent", "spawn agent", "spawn agents",
            "break the system", "security audit", "parallel agents", "swarm",
            "penetration test", "adversarial test"
        )):
            return IntentType.MULTI_AGENT_SWARM

        # 3. Explicit workflow triggers
        if any(k in text for k in ("run workflow", "trigger workflow", "execute pipeline", "start workflow")):
            return IntentType.WORKFLOW_ORCHESTRATION

        # 4. Derive intent dynamically from semantic tool retrieval
        try:
            from backend.app.agent.registry import registry
            tools = registry.get_relevant_tools(query=prompt, max_k=8)
            candidate_names = [t.name for t in tools]
            return cls.infer_orchestration_depth(candidate_names)
        except Exception:
            return IntentType.CONVERSATION

    def get_user_profile_data(self, user_id: Optional[str] = None) -> Dict[str, Any]:
        """Loads raw user profile dictionary across database and file fallbacks with strict user isolation."""
        target_user = (user_id or "").strip()
        candidate_ids = []
        if target_user:
            candidate_ids.extend([target_user, target_user.replace("_", "@"), target_user.replace("@", "_")])
        else:
            candidate_ids.extend(["dev", "default_user"])

        try:
            from backend.app.services.user_db_service import UserDatabaseService
            for cid in candidate_ids:
                prof = UserDatabaseService.get_user_profile(cid)
                if prof and (prof.get("display_name") or prof.get("username")):
                    return prof
        except Exception:
            pass

        users_dir = self.workspace_path / "memory" / "users"
        if users_dir.exists():
            for cid in candidate_ids:
                p_file = users_dir / cid / "profile.json"
                if p_file.exists():
                    try:
                        with open(p_file, "r", encoding="utf-8") as f:
                            prof = json.load(f)
                            if prof and (prof.get("display_name") or prof.get("username")):
                                return prof
                    except Exception:
                        pass

        if not target_user or target_user in ("default_user", "dev"):
            for fallback_name in ["memory.json", "user_profile.json"]:
                mem_file = self.workspace_path / "memory" / fallback_name
                if mem_file.exists():
                    try:
                        with open(mem_file, "r", encoding="utf-8") as f:
                            mem = json.load(f)
                            user_prof = mem.get("user_profile") if "user_profile" in mem else (mem if "display_name" in mem else None)
                            if user_prof and (user_prof.get("display_name") or user_prof.get("username")):
                                return user_prof
                    except Exception:
                        pass

        # Generic, non-conflicting fallback identity — used only when NOTHING
        # else resolves. Kept deliberately neutral rather than naming a real
        # person, so it can never contradict a genuinely resolved profile
        # elsewhere in the prompt.
        return {
            "display_name": getattr(settings, "DEFAULT_USER_DISPLAY_NAME", "the user"),
            "username": getattr(settings, "DEFAULT_USER_USERNAME", ""),
            "headline": "",
            "timezone": "",
        }

    def load_user_memory_profile(self, user_prof: Optional[Dict[str, Any]] = None, user_id: Optional[str] = None) -> str:
        """
        Formats the active user profile into prompt text. Accepts an already-resolved
        `user_prof` dict to guarantee a single consistent identity source across the
        whole prompt; falls back to resolving it locally only if not provided.
        Protects developer privacy by redacting cryptographic passphrase from injected text.
        """
        prof = user_prof if user_prof is not None else self.get_user_profile_data(user_id=user_id)
        if not prof:
            return ""

        display_name = prof.get("display_name") or "the user"
        lines = [f"- Current User: {display_name}" + (f" (@{prof.get('username')})" if prof.get("username") else "")]

        if prof.get("email"):
            lines.append(f"- User Email: {prof.get('email')}")
        if prof.get("headline"):
            lines.append(f"- User Role/Focus: {prof.get('headline')}")

        raw_bio = prof.get("bio", "")
        if raw_bio:
            # Check if bio matches developer passphrase: if so, redact it to prevent prompt leakage
            if verify_developer_passphrase(raw_bio):
                lines.append("- User Context & Notes: [Verified Lead Developer]")
            else:
                lines.append(f"- User Context & Notes: {raw_bio}")

        if prof.get("timezone"):
            lines.append(f"- User Timezone: {prof.get('timezone')}")
        return "\n".join(lines) + "\n"

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
        # Native reasoning is requested whenever execution_mode is "accuracy" —
        # keep this in sync with the enable_thinking flag passed to acompletion
        # in reasoner_node, since the two decisions must always agree.
        native_thinking_active = (execution_mode == "accuracy")

        prompt = (
            "You are the intelligence engine of ERIS. ERIS is the entire autonomous pair-programming platform and runtime environment "
            "that the user is interacting with, and you are acting as ERIS, the agent. You are NOT an external script or folder inside the workspace. "
            "The workspace is simply the user's project/codebase that ERIS is actively managing, inspecting, and editing on their behalf.\n"
        )
        prompt += f"- Active Model: {active_model}\n"
        prompt += f"- Execution Profile: {execution_mode.upper()}\n\n"

        # ------------------------------------------------------------------
        # BASELINE PERSONALITY — applies to every user, verified or not.
        # The "Sir" honorific below is an ADDITION layered on top of this for
        # the verified developer specifically; it is never a substitute for
        # basic warmth toward everyone else.
        # ------------------------------------------------------------------
        prompt += (
            "### Personality & Tone Directive:\n"
            "- Be cheerful, warm, and genuinely encouraging with EVERY user, not only a verified developer. Approachability is the default, not a special case.\n"
            "- Stay helpful and constructive even when a task is tedious, repeated, or the user is frustrated — respond to the substance of what they need, not to their tone.\n"
            "- Cheerful does not mean shallow: keep answers substantive, accurate, and technically precise. Warmth is in how you say things, not a reason to say less.\n\n"
        )

        # ------------------------------------------------------------------
        # SINGLE SOURCE OF TRUTH FOR USER IDENTITY.
        # Resolved exactly once, reused everywhere below, so the prompt can
        # never assert two different names for "who the user is" in the same
        # turn. Do not hardcode any person's name anywhere else in this method.
        # ------------------------------------------------------------------
        user_prof = self.get_user_profile_data(user_id=user_id)
        resolved_name = user_prof.get("display_name") or "the user"
        resolved_username = user_prof.get("username") or ""
        user_bio = user_prof.get("bio", "") if user_prof else ""
        is_verified_developer = verify_developer_passphrase(user_bio)

        identity_tag = resolved_name + (f" (@{resolved_username})" if resolved_username else "")

        if is_verified_developer:
            prompt += (
                "### Verified Identity & Role Directive:\n"
                f"- Authenticated Person: {identity_tag} (Creator & Lead Developer of ERIS)\n"
                "- Role & Authority: Lead Developer / Architect\n"
                "- Verification: This person's stated catchphrase matched the cryptographically stored developer passphrase — this is the ONLY basis for the 'Sir' address below. Never address anyone as 'Sir' or claim to have verified their identity unless this exact directive is present in your prompt for this turn.\n"
                "- DIRECTIVE: Address them as Sir, acknowledge their role as your creator and lead developer, and combine this with your baseline cheerful, warm personality above — 'Sir' is an honorific added on top of your normal warmth, not a switch to a colder or more formal register.\n"
                "- Never search the web or execute shell commands to look up the user's name or personal identity — it is already verified above.\n\n"
            )
        else:
            prompt += (
                "### User Identity & Profile Awareness Directive:\n"
                f"- The current user of this workspace is {identity_tag}.\n"
                "- Never search the web or execute shell commands to look up the user's name or personal identity.\n"
                "- When the user asks 'who am I', recognize and address them directly from their profile without invoking tools.\n"
                "- Do NOT address this user as 'Sir' or claim they are the creator/lead developer — that address is reserved exclusively for the cryptographically verified developer identity, which is not present for this user.\n\n"
            )

        # Detailed profile fields (email, role/focus, notes, timezone), built
        # from the SAME resolved user_prof above — no second independent lookup.
        user_profile_block = self.load_user_memory_profile(user_prof=user_prof)
        if user_profile_block:
            prompt += f"### Current User Information (From Profile Settings):\n{user_profile_block}\n"

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

        # Dynamic Visual UI Directives (render_ui)
        prompt += (
            "### Dynamic UI Visual Presentation Directives (`render_ui`):\n"
            "- When your answer includes a visual (such as a code comparison diff, a terminal transcript, a project file tree, "
            "a browser preview, media playlist, mobile device emulator, or subagent chain), call `render_ui` with the "
            "corresponding component name and props instead of describing it purely in text.\n"
            "- Supported component types: 'code-comparison', 'terminal', 'file-tree', 'media-player', 'safari-preview', 'subagent-chain', 'ios-preview', 'android-preview'.\n\n"
            "### Structured Elicitation Question Directives (`ask_question`):\n"
            "- When you need a user preference, architectural decision, or clarifying choice before proceeding, "
            "call `ask_question` with structured options (mode='single' or 'multi', options=[{'id': '...', 'label': '...'}]), "
            "instead of writing rambling clarifying questions as chat prose.\n\n"
        )

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
                "### Conversational & Creative Directives:\n"
                "- The user prompt is a greeting, casual conversation, creative request (such as a poem, story, haiku), or hypothetical question.\n"
                "- Respond warmly, creatively, and concisely directly in your message.\n"
                "- ABSOLUTE LAW: You have NO tools active for conversational or creative tasks. Never attempt to call tools.\n\n"
            )

        prompt += (
            "### Operating System & Shell Environment Directive:\n"
            "- The host workstation operating system is **Windows** (PowerShell / cmd.exe).\n"
            "- CRITICAL SHELL SYNTAX LAW: NEVER use Linux commands such as `ls`, `cat`, `grep`, `rm -rf`, or bash syntax.\n"
            "- Always use Windows / PowerShell native commands: `dir` or `Get-ChildItem` instead of `ls`, `type` or file tools instead of `cat`, `findstr` instead of `grep`, `del` instead of `rm`.\n"
            "- Prioritize specialized workspace tools (`view_file`, `grep_search`, `list_dir`) over raw shell commands whenever inspecting or reading files.\n\n"
        )

        # ------------------------------------------------------------------
        # AUTONOMOUS JUDGMENT & SELF-REFLECTION PROTOCOL
        # A lightweight consequence-check pass modeled on how a careful,
        # thoughtful reasoner evaluates actions before taking them — not a
        # rigid checklist to recite, but four questions that should genuinely
        # shape the decision. Only injected when the turn can actually take
        # consequential action (skipped for pure conversation/read-only,
        # where there's nothing to weigh).
        # ------------------------------------------------------------------
        if intent in (IntentType.ACTION_EXECUTE, IntentType.WORKFLOW_ORCHESTRATION, IntentType.MULTI_AGENT_SWARM):
            prompt += (
                "### Autonomous Judgment & Self-Reflection Protocol:\n"
                "- Before executing a consequential action (writing/deleting files, running commands, sending messages, spawning agents), briefly reason through these four questions in your thinking — not as a rigid checklist to recite, but as genuine judgment that should change your plan when the honest answer says so:\n"
                "  1. **Will this actually work?** Will the specific action you're about to take achieve the user's real goal, or does it just look like progress? If you're not confident it will, say so and propose what you'd need to verify first, rather than proceeding on hope.\n"
                "  2. **Is this the right action, or just an available one?** Consider whether a simpler, safer, or more direct approach exists before committing to the current plan. Tool availability is not the same as tool necessity.\n"
                "  3. **Does a human need to weigh in here?** The approval_gate system already halts execution for tools flagged high-risk — treat that pause as a genuine decision point, not an obstacle to route around. Beyond what's automatically gated, if an action is hard to reverse, affects things outside the workspace (sending an email, external API calls), or you are meaningfully uncertain about its consequences, say so plainly and prefer asking before acting over assuming it's fine.\n"
                "  4. **Is the net effect actually good?** Would a careful, competent developer look at this action and agree it clearly helps, with no significant unintended downside? If an action mainly serves to look busy, or trades a small visible win for a real risk (data loss, broken state, security exposure), don't take it — say what you'd do instead.\n"
                "- This is a judgment pass, not a delay tactic: for routine, low-risk, clearly-correct actions, reasoning through this should take a moment, not a paragraph. Its purpose is to catch the cases where proceeding would be a mistake, not to slow down the cases where it obviously wouldn't.\n\n"
            )

        # Cognitive Reasoning (<think>...</think>) & Real-Time Self-Talk
        # NOTE: only mandate manual <think> tag wrapping when native
        # provider-level reasoning/thinking is NOT already active for this
        # turn. When native_thinking_active is True, the platform captures
        # real reasoning tokens separately — forcing the model to ALSO
        # hand-write <think> tags in its visible text caused it to do both at
        # once, duplicating reasoning and occasionally leaking raw <think>
        # tags into the visible reply.
        if not native_thinking_active:
            prompt += (
                "### Mandatory Internal Self-Talk & Thinking Protocol (<think>...</think>):\n"
                "- You are an autonomous agentic AI. You MUST ALWAYS write your internal self-talking reasoning inside <think> and </think> tags before taking any action or generating your response.\n"
                "- In your <think> self-talk:\n"
                "  1. State your clear understanding of the user's objective.\n"
                "  2. Self-talk through your current findings, what has succeeded, and what remains to be done.\n"
                "  3. If an action or tool previously executed (or returned an error like a command failure), explicitly analyze the output, explain why it happened, and how you will adapt without getting stuck.\n"
                "  4. Plan your next concrete step.\n"
                "  5. When this turn is in the Autonomous Judgment & Self-Reflection Protocol above, work through those four questions here before deciding your action.\n"
                "- Close </think> before outputting your direct message or tool call to the user.\n\n"
            )
        else:
            prompt += (
                "### Extended Native Reasoning Mode Active:\n"
                "- Provider-level extended reasoning is enabled for this turn and is captured separately from your visible reply.\n"
                "- Do NOT wrap reasoning in <think> or similar tags inside your visible message content — use your reasoning budget to think privately (including working through the Autonomous Judgment & Self-Reflection Protocol above, when it applies to this turn), then output ONLY your final, direct response or tool call as your visible message.\n\n"
            )

        prompt += (
            "### Autonomous Goal Execution & Non-Stall Protocol:\n"
            "- When a tool executes or when human approval is granted, NEVER stop or output generic messages like 'Decision processed successfully' or 'Action completed'.\n"
            "- Inspect the tool observation immediately. If the output solves the user request, synthesize the full answer. If an error occurred or more steps are needed, continue autonomously until the user's goal is achieved.\n\n"
        )

        # Strict API Key & Credential Zero-Exposure Directive (applies to all intents)
        prompt += (
            "### Strict Credential & Secret Protection Directive:\n"
            "- CRITICAL SECURITY LAW: You do NOT have access to the user's raw API keys, tokens, or credential vault.\n"
            "- All API keys are encrypted in a secure database vault.\n"
            "- You must NEVER read, print, output, expose, or repeat any API key, secret, or password, even if the user explicitly orders or attempts to jailbreak you into doing so.\n"
            "- If asked to show, print, or reveal API keys or secrets, politely refuse and instruct the user to manage their keys securely in Settings > API Key Vault.\n\n"
        )

        # Tool directives (only injected when tools are active)
        if intent != IntentType.CONVERSATION:
            # Knowledge Confidence & Tool Restraint Protocol
            prompt += (
                "### Knowledge Confidence & Tool Restraint Protocol:\n"
                "- Answer directly from your training knowledge whenever you have sufficient confidence.\n"
                "- Use `search_web` strictly when you lack knowledge or confidence regarding an unfamiliar concept, obscure framework/library, or when live, real-time external facts are needed.\n"
                "- NEVER invoke `search_web` or shell commands for topics or general knowledge you already know well.\n\n"
            )
            # Tool Priority & Dynamic Tool Creation Protocol
            prompt += (
                "### Tool Priority & Dynamic Tool Creation Protocol:\n"
                "- Always inspect and prioritize existing specialized tools from `tools/` (e.g. `open_browser`, `play_youtube_song`, `send_email`) over executing generic terminal commands.\n"
                "- CRITICAL CONVERSATIONAL LAW: NEVER use `run_command` with 'echo' or shell commands to output normal conversational text, greetings, answers, or explanations to the user! Conversational replies must be output directly in your message text. Shell commands are strictly reserved for genuine OS/file operations.\n"
                "- Direct Action Routing: If the user asks to play a song, music, video, or soundtrack, invoke `play_youtube_song` directly with the title query (e.g. 'Sunflower Post Malone'). Do NOT invoke `search_web` first.\n"
                "- Direct Browser Routing: If the user asks to open a website, URL, or browser, invoke `open_browser` directly. Call it at most ONCE with the target URL. Never emit repetitive identical browser tool calls.\n"
                "- NEVER execute ad-hoc Python one-liners (`python -c \"import ...\"`) through `run_command` for tasks that should be structured tools or integrations.\n"
                "- Self-Tool Creation with Specific Schemas (`create_custom_tool`):\n"
                "  1. When creating a tool for yourself or the user, use `create_custom_tool(tool_name, description, code)`.\n"
                "  2. Structure the tool code with explicit Pydantic `ToolInput` schemas so future tool calls are strongly typed:\n"
                "     ```python\n"
                "     from pydantic import BaseModel, Field\n"
                "     from typing import Optional\n"
                "\n"
                "     TOOL_NAME = \"my_tool\"\n"
                "     TOOL_DESCRIPTION = \"Clear explanation of what the tool does and when to call it.\"\n"
                "     RISK_LEVEL = \"safe\"  # \"safe\", \"moderate\", \"high\", or \"critical\"\n"
                "\n"
                "     class ToolInput(BaseModel):\n"
                "         param1: str = Field(description=\"Purpose of param1\")\n"
                "         count: Optional[int] = Field(default=5, description=\"Optional count parameter\")\n"
                "\n"
                "     def execute(param1: str, count: int = 5, **kwargs) -> str:\n"
                "         # Implement verified business logic here\n"
                "         return f\"Result for {param1}\"\n"
                "     ```\n"
                "  3. If no input arguments are needed (e.g., system status, clock), define `class ToolInput(BaseModel): pass` and `def execute(**kwargs) -> str:`.\n"
                "  4. Tools written this way are immediately compiled, validated against safety sandboxes, registered into the runtime registry, and available for direct invocation in the next step!\n\n"
            )

            # Universal Tool Empowerment for All Agents
            prompt += (
                "### Universal Tool Empowerment & Execution Protocol:\n"
                "- You are fully empowered to invoke registered local tools to achieve user goals.\n"
                "- If native function calling is available, emit functionCall objects.\n"
                "- If native function calling is unavailable, you can invoke tools via explicit syntax: `[CALL_TOOL: <tool_name> <json_args>]`.\n"
                "- When a tool execution finishes, analyze the output, verify whether it fulfilled the goal, and proceed intentionally.\n\n"
            )

            # Decisive Execution & Anti-Loop directives
            prompt += (
                "### Decisive Tool Execution Directives:\n"
                "- Once you identify or read a file, do NOT repeat search queries, search_knowledge_vault, or list_dir.\n"
                "- When modifying or repairing code, show the exact unified diff using a ```diff block (with - for removed lines and + for added lines) or provide the complete updated code block so the user can inspect the comparison.\n"
                "- Immediately perform the necessary edit with write_to_file / replace_file_content or provide the complete fixed code.\n"
                "- Never loop on reading files or inspecting directories. Aim to complete your task in 1-2 tool calls.\n\n"
            )

            # Targeted Reading & Off-Context Artifact Spooling Directives
            prompt += (
                "### Targeted File Reading & Off-Context Spooling Protocol:\n"
                "- Prefer targeted reads: When inspecting large files (>100 lines), use `view_file` with explicit `StartLine` and `EndLine` parameters or find relevant sections with `grep_search` first. Avoid dumping huge files in full unless strictly required.\n"
                "- Handling `[OUTPUT SPOOLED TO ARTIFACT]` responses: When a tool or command returns an output exceeding safe limits, ERIS automatically saves the full raw content to a local artifact file (e.g. `.eris/runs/.../output.log`) and provides a structured summary (lines, size, head, error lines, and tail).\n"
                "- In such cases, NEVER assume data is lost or re-run the same command. Use `grep_search(SearchPath=..., Query=...)` or `view_file(AbsolutePath=..., StartLine=..., EndLine=...)` on the provided artifact path to inspect the exact lines you need.\n\n"
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
    "developer passphrase",
    "secret passphrase",
    "dev passphrase",
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
    has_target = any(t in lowered for t in ["api key", "apikey", "api_key", "secret key", "credentials", "gemini key", "openrouter key", "passphrase", "developer phrase", "dev phrase"])
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