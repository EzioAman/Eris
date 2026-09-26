import hashlib
import importlib.util
import inspect
import json
import logging
import re
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path
from typing import Any, Callable, Dict, List, Optional
from langchain_core.tools import StructuredTool
from pydantic import BaseModel, create_model

try:
    from app.agent.core_tools import CoreToolbox
    from app.agent.tool_synthesizer import create_custom_tool
    from app.config import settings
    from app.schemas.tools import (
        ChangeModelInput,
        CreateFolderInput,
        CreateToolInput,
        GreetingInput,
        GrepSearchInput,
        ListDirectoryInput,
        OpenBrowserInput,
        PlayYoutubeInput,
        ReadFileInput,
        RenderUIInput,
        RiskLevel,
        RunCommandInput,
        ScrapeWebpageInput,
        SearchKnowledgeVaultInput,
        SearchWebInput,
        SendEmailInput,
        ToolDefinition,
        ViewFileInput,
        WriteFileInput,
        AskQuestionInput,
    )
    from app.services.rag_service import rag_vault
except ImportError:
    from backend.app.agent.core_tools import CoreToolbox
    from backend.app.agent.tool_synthesizer import create_custom_tool
    from backend.app.config import settings
    from backend.app.schemas.tools import (
        ChangeModelInput,
        CreateFolderInput,
        CreateToolInput,
        GreetingInput,
        GrepSearchInput,
        ListDirectoryInput,
        OpenBrowserInput,
        PlayYoutubeInput,
        ReadFileInput,
        RenderUIInput,
        RiskLevel,
        RunCommandInput,
        ScrapeWebpageInput,
        SearchKnowledgeVaultInput,
        SearchWebInput,
        SendEmailInput,
        ToolDefinition,
        ViewFileInput,
        WriteFileInput,
        AskQuestionInput,
    )
    from backend.app.services.rag_service import rag_vault

logger = logging.getLogger("eris.agent.registry")


class ToolRegistry:
    """
    Central registry for all tools in Eris.
    Encapsulates core built-in tools and dynamically discovered tools in tools/.
    Every tool is bound to a strict Pydantic argument schema and risk classification.
    """

    def __init__(self):
        self._tools: Dict[str, ToolDefinition] = {}
        self._initialized: bool = False
        self._tool_embedding_cache: Dict[str, List[float]] = {}
        self._min_plausible_relevance: float = 0.58
        self._noise_floor: float = 1.25

    def initialize(self, force_refresh: bool = False) -> None:
        """Loads core and dynamic tools into the registry and precomputes capability embeddings."""
        if self._initialized and not force_refresh:
            return

        self._tools.clear()
        self._register_core_tools()
        self._register_dynamic_tools()
        self._initialized = True
        self._recompute_tool_embeddings()
        logger.info(f"Tool registry initialized with {len(self._tools)} tools and {len(self._tool_embedding_cache)} embeddings.")

    # --- Tool embedding cache (disk-persisted + parallel cold-fill) ---------
    #
    # Previously this section made one live embedding API call per tool,
    # sequentially - with 22 tools at ~0.7-1.2s per call, that was a ~20s
    # blocking stall, and since get_relevant_tools() is invoked synchronously
    # from reasoner_node (no asyncio.to_thread), it stalled the entire event
    # loop, not just the triggering request. Now:
    #   1. Embeddings are cached to disk keyed by a hash of each tool's doc
    #      string, so a tool whose description hasn't changed is never
    #      re-embedded across restarts.
    #   2. Any remaining cache misses (new/changed tools, or a fresh install
    #      with no cache yet) are embedded concurrently via a thread pool,
    #      since each call is a blocking network request - the API/network,
    #      not the CPU, is the bottleneck, so this is safe to parallelize.

    def _tool_embedding_cache_path(self) -> Path:
        return settings.WORKSPACE_PATH / "memory" / "tool_embeddings_cache.json"

    def _load_persisted_tool_embeddings(self) -> Dict[str, Dict[str, Any]]:
        path = self._tool_embedding_cache_path()
        if not path.exists():
            return {}
        try:
            with open(path, "r", encoding="utf-8") as f:
                return json.load(f)
        except Exception as ex:
            logger.warning(f"Could not read tool embedding cache ({path}): {ex}")
            return {}

    def _save_persisted_tool_embeddings(self, data: Dict[str, Dict[str, Any]]) -> None:
        path = self._tool_embedding_cache_path()
        try:
            path.parent.mkdir(parents=True, exist_ok=True)
            with open(path, "w", encoding="utf-8") as f:
                json.dump(data, f)
        except Exception as ex:
            logger.warning(f"Could not persist tool embedding cache ({path}): {ex}")

    @staticmethod
    def _doc_hash(doc: str) -> str:
        return hashlib.sha256(doc.encode("utf-8")).hexdigest()

    def _recompute_tool_embeddings(self) -> None:
        """Precomputes vector embeddings for each tool's name and dual-boundary description,
        using the disk cache for unchanged tools and a thread pool for any cache misses."""
        persisted = self._load_persisted_tool_embeddings()
        docs_by_tool: Dict[str, str] = {}
        to_compute: List[tuple] = []  # (tool_name, doc)

        for name, tool_def in self._tools.items():
            doc = f"Tool: {name}. Description: {tool_def.description}"
            docs_by_tool[name] = doc
            doc_hash = self._doc_hash(doc)

            cached_entry = persisted.get(name)
            if cached_entry and cached_entry.get("hash") == doc_hash and cached_entry.get("vector"):
                self._tool_embedding_cache[name] = cached_entry["vector"]
            else:
                to_compute.append((name, doc))

        if not to_compute:
            logger.info(f"Tool embeddings fully served from disk cache ({len(self._tool_embedding_cache)} tools, 0 API calls).")
            return

        logger.info(f"Embedding {len(to_compute)} tool(s) not found in cache (out of {len(docs_by_tool)} total)...")

        def _embed_one(item: tuple) -> tuple:
            name, doc = item
            try:
                vec = rag_vault.generate_embedding(doc)
                return name, doc, vec
            except Exception as ex:
                logger.debug(f"Could not compute embedding for tool {name}: {ex}")
                return name, doc, None

        with ThreadPoolExecutor(max_workers=min(10, len(to_compute))) as pool:
            results = list(pool.map(_embed_one, to_compute))

        updated_persisted = dict(persisted)
        for name, doc, vec in results:
            if vec:
                self._tool_embedding_cache[name] = vec
                updated_persisted[name] = {"hash": self._doc_hash(doc), "vector": vec}

        # Drop stale entries for tools that no longer exist in the registry
        updated_persisted = {k: v for k, v in updated_persisted.items() if k in docs_by_tool}
        self._save_persisted_tool_embeddings(updated_persisted)

    # -------------------------------------------------------------------------

    def _register_core_tools(self) -> None:
        """Registers all built-in filesystem and search tools with strict dual-boundary descriptions."""

        # 1. read_file
        def read_file_handler(path: str) -> str:
            return CoreToolbox.read_file(path)

        self.register(
            ToolDefinition(
                name="read_file",
                description="Read raw file contents from the workspace. Use when inspecting an entire source file or configuration. Do NOT use if the file contents have already been returned in recent conversation turns, or for casual chat where no file is referenced.",
                function=read_file_handler,
                args_schema=ReadFileInput,
                risk_level=RiskLevel.SAFE,
                requires_approval=False,
                source="core",
            )
        )

        # 2. write_file
        def write_file_handler(path: str, content: str) -> str:
            return CoreToolbox.write_file(path, content)

        self.register(
            ToolDefinition(
                name="write_file",
                description="Create a new file or completely overwrite an existing file in the workspace with verified code or documentation. Do NOT use for inspecting, reading, or viewing file contents (use read_file or view_file instead), and do NOT use for temporary chat replies.",
                function=write_file_handler,
                args_schema=WriteFileInput,
                risk_level=RiskLevel.MODERATE,
                requires_approval=False,
                source="core",
            )
        )

        # 3. run_command
        def run_command_handler(command: str, is_read_only: bool = False) -> str:
            return CoreToolbox.run_command(command, is_read_only=is_read_only)

        self.register(
            ToolDefinition(
                name="run_command",
                description="Execute a shell command or CLI operation in the workspace (e.g. running tests, building assets, installing packages with uv or npm, git commands). CRITICAL: Do NOT use with 'echo' or shell commands to output conversational answers, greetings, opinions, or text explanations. Do NOT use for read-only inspections when dedicated tools (read_file, list_dir, grep_search) are available.",
                function=run_command_handler,
                args_schema=RunCommandInput,
                risk_level=RiskLevel.HIGH,
                requires_approval=True,
                source="core",
            )
        )

        # 4. list_dir
        def list_dir_handler(path: str = ".") -> str:
            return CoreToolbox.list_dir(path)

        self.register(
            ToolDefinition(
                name="list_dir",
                description="List files and directory structures inside a workspace folder. Use when exploring unfamiliar project layout. Do NOT use if the directory layout is already known or for general conversation.",
                function=list_dir_handler,
                args_schema=ListDirectoryInput,
                risk_level=RiskLevel.SAFE,
                requires_approval=False,
                source="core",
            )
        )

        # 5. search_web
        def search_web_handler(query: str) -> str:
            return CoreToolbox.search_web(query)

        self.register(
            ToolDefinition(
                name="search_web",
                description="Search the live web for real-time external data, current news, recent documentation, or when you lack sufficient knowledge or confidence to answer accurately about an unfamiliar topic, term, or entity. Do NOT use when you can already answer accurately and confidently from existing training knowledge, or for standard creative writing and casual banter.",
                function=search_web_handler,
                args_schema=SearchWebInput,
                risk_level=RiskLevel.SAFE,
                requires_approval=False,
                source="core",
            )
        )

        # 6. scrape_web
        def scrape_web_handler(url: str) -> str:
            return CoreToolbox.scrape_web(url)

        self.register(
            ToolDefinition(
                name="scrape_web",
                description="Fetch and extract readable Markdown content from a given web URL. Use when you need to read documentation or inspect content from a specific link. Do NOT use when no specific URL is provided.",
                function=scrape_web_handler,
                args_schema=ScrapeWebpageInput,
                risk_level=RiskLevel.SAFE,
                requires_approval=False,
                source="core",
            )
        )

        # 7. grep_search
        def grep_search_handler(query: str, path: str = ".") -> str:
            return CoreToolbox.grep_search(query, path)

        self.register(
            ToolDefinition(
                name="grep_search",
                description="Search for exact text strings, symbol names, or regex patterns across files in the workspace. Use to locate function definitions, error strings, or imports. Do NOT use as an internet search or when the file path is already known.",
                function=grep_search_handler,
                args_schema=GrepSearchInput,
                risk_level=RiskLevel.SAFE,
                requires_approval=False,
                source="core",
            )
        )

        # 8. view_file
        def view_file_handler(path: str, start_line: Optional[int] = None, end_line: Optional[int] = None) -> str:
            return CoreToolbox.view_file(path, start_line=start_line, end_line=end_line)

        self.register(
            ToolDefinition(
                name="view_file",
                description="View specific line slices or full content of a file with line numbers. Use to pinpoint code sections before editing or during code review. Do NOT use if the lines have already been displayed in the current turn.",
                function=view_file_handler,
                args_schema=ViewFileInput,
                risk_level=RiskLevel.SAFE,
                requires_approval=False,
                source="core",
            )
        )

        # 9. search_knowledge_vault (Agentic RAG)
        def search_knowledge_vault_handler(query: str, category: Optional[str] = "all") -> str:
            results = rag_vault.query_vault(query=query, category=category or "all", top_k=3)
            if not results:
                return f"No relevant entries found in knowledge vault for query: '{query}'."
            formatted = []
            for r in results:
                formatted.append(f"[{r['category'].upper()}] {r['title']} ({r['source']}):\n{r['content'][:600]}")
            return "\n\n---\n\n".join(formatted)

        self.register(
            ToolDefinition(
                name="search_knowledge_vault",
                description="Query the local vector knowledge database (pgvector/SQLite) for saved user notes, project specifications, past architectural decisions, or learned user habits. Use when questions explicitly reference 'my notes', past decisions, or user preferences. Do NOT use for general world knowledge, public facts, standard coding advice, or casual conversation that does not involve the user's private notes.",
                function=search_knowledge_vault_handler,
                args_schema=SearchKnowledgeVaultInput,
                risk_level=RiskLevel.SAFE,
                requires_approval=False,
                source="core",
            )
        )

        # 10. create_custom_tool (Dynamic Tool Synthesizer)
        def create_custom_tool_handler(tool_name: str = "", description: str = "", code: str = "", **kwargs) -> str:
            actual_name = tool_name or kwargs.get("name") or kwargs.get("filename") or "custom_tool"
            actual_desc = description or kwargs.get("desc") or "Synthesized tool"
            actual_code = code or kwargs.get("content") or ""
            return create_custom_tool(actual_name, actual_desc, actual_code)

        self.register(
            ToolDefinition(
                name="create_custom_tool",
                description="Synthesize, verify, and register a new reusable Python tool inside tools/. Use strictly when the user asks to build or add a new tool. Do NOT use for standard application coding, editing project files, or answering questions.",
                function=create_custom_tool_handler,
                args_schema=CreateToolInput,
                risk_level=RiskLevel.HIGH,
                requires_approval=True,
                source="core",
            )
        )

        # 11. render_ui (Dynamic visual presentation)
        def render_ui_handler(component: str = "", props: Optional[Dict[str, Any]] = None, **kwargs) -> str:
            actual_comp = component or kwargs.get("component") or "unknown"
            return f"UI block rendered: {actual_comp}"

        self.register(
            ToolDefinition(
                name="render_ui",
                description="Call this whenever showing a visual (a code comparison diff, a terminal session, a file tree, safari browser, media player, mobile device preview, subagent chain) would help the user more than describing it in text. Do not guess this from keywords - call it only when you are about to actually show that visual as part of your answer.",
                function=render_ui_handler,
                args_schema=RenderUIInput,
                risk_level=RiskLevel.SAFE,
                requires_approval=False,
                source="core",
            )
        )

        # 12. ask_question (Structured elicitation preference question)
        def ask_question_handler(prompt: str = "", mode: str = "single", options: Optional[List[Dict[str, str]]] = None, allowCustom: bool = False, **kwargs) -> str:
            opts = options or kwargs.get("options") or []
            return f"Structured elicitation question presented [{mode}]: {prompt} with {len(opts)} options."

        self.register(
            ToolDefinition(
                name="ask_question",
                description="Invoke mid-conversation to ask the user a structured clarifying question or preference instead of writing it as chat prose. Provides selectable single or multi-choice options and optional custom text input.",
                function=ask_question_handler,
                args_schema=AskQuestionInput,
                risk_level=RiskLevel.SAFE,
                requires_approval=False,
                source="core",
            )
        )

    def _register_dynamic_tools(self) -> None:
        """Discovers and registers custom Python tools from the tools/ folder."""
        tools_dir = settings.WORKSPACE_PATH / "tools"
        if not tools_dir.exists():
            return

        for tool_file in sorted(tools_dir.glob("*.py")):
            if tool_file.name.startswith((".", "_")):
                continue

            tool_name = tool_file.stem
            try:
                spec = importlib.util.spec_from_file_location(tool_name, tool_file)
                if not spec or not spec.loader:
                    continue
                module = importlib.util.module_from_spec(spec)
                spec.loader.exec_module(module)

                execute_fn = getattr(module, "execute", None)
                if not callable(execute_fn):
                    continue

                description = getattr(module, "TOOL_DESCRIPTION", f"Custom user tool: {tool_name}")

                # Map known dynamic tools to typed schemas
                if tool_name == "send_email":
                    def send_email_wrapper(to: str = "", subject: str = "", body: str = "", save_as_default: bool = False, confirmed: bool = False, _fn=execute_fn, **kwargs) -> str:
                        actual_to = to or kwargs.get("recipient") or kwargs.get("email") or ""
                        actual_subject = subject or kwargs.get("title") or "Message from ERIS"
                        actual_body = body or kwargs.get("message") or kwargs.get("content") or ""
                        flag_confirmed = "|confirmed" if confirmed else ""
                        flag_save = "|save_default" if save_as_default else ""
                        arg_str = f"{actual_to}|{actual_subject}|{actual_body}{flag_confirmed}{flag_save}"
                        return _fn(arg_str)

                    self.register(
                        ToolDefinition(
                            name="send_email",
                            description=description,
                            function=send_email_wrapper,
                            args_schema=SendEmailInput,
                            risk_level=RiskLevel.CRITICAL,
                            requires_approval=True,
                            source="dynamic",
                            file_path=str(tool_file),
                        )
                    )
                elif tool_name == "play_youtube_song":
                    def play_youtube_wrapper(query: str = "", _fn=execute_fn, **kwargs) -> str:
                        actual_query = query or kwargs.get("song") or kwargs.get("args") or kwargs.get("title") or ""
                        return _fn(actual_query)

                    self.register(
                        ToolDefinition(
                            name="play_youtube_song",
                            description=description,
                            function=play_youtube_wrapper,
                            args_schema=PlayYoutubeInput,
                            risk_level=RiskLevel.MODERATE,
                            requires_approval=False,
                            source="dynamic",
                            file_path=str(tool_file),
                        )
                    )
                elif tool_name == "create_desktop_folder":
                    def create_folder_wrapper(name: str = "", _fn=execute_fn, **kwargs) -> str:
                        actual_name = name or kwargs.get("folder_name") or kwargs.get("args") or "New Folder"
                        return _fn(actual_name)

                    self.register(
                        ToolDefinition(
                            name="create_desktop_folder",
                            description=description,
                            function=create_folder_wrapper,
                            args_schema=CreateFolderInput,
                            risk_level=RiskLevel.MODERATE,
                            requires_approval=False,
                            source="dynamic",
                            file_path=str(tool_file),
                        )
                    )
                elif tool_name == "create_and_run_greeting":
                    def greeting_wrapper(name: str = "Developer", _fn=execute_fn, **kwargs) -> str:
                        actual_name = name or kwargs.get("user") or kwargs.get("args") or "Developer"
                        return _fn(actual_name)

                    self.register(
                        ToolDefinition(
                            name="create_and_run_greeting",
                            description=description,
                            function=greeting_wrapper,
                            args_schema=GreetingInput,
                            risk_level=RiskLevel.SAFE,
                            requires_approval=False,
                            source="dynamic",
                            file_path=str(tool_file),
                        )
                    )
                elif tool_name == "change_model":
                    def change_model_wrapper(model_name: str = "", _fn=execute_fn, **kwargs) -> str:
                        actual_model = model_name or kwargs.get("model") or kwargs.get("args") or ""
                        return _fn(actual_model)

                    self.register(
                        ToolDefinition(
                            name="change_model",
                            description=description,
                            function=change_model_wrapper,
                            args_schema=ChangeModelInput,
                            risk_level=RiskLevel.SAFE,
                            requires_approval=False,
                            source="dynamic",
                            file_path=str(tool_file),
                        )
                    )
                elif tool_name == "open_browser":
                    def open_browser_wrapper(url: str = "https://www.google.com", _fn=execute_fn, **kwargs) -> str:
                        actual_url = url or kwargs.get("target_url") or kwargs.get("query") or kwargs.get("args") or "https://www.google.com"
                        return _fn(actual_url)

                    self.register(
                        ToolDefinition(
                            name="open_browser",
                            description=description,
                            function=open_browser_wrapper,
                            args_schema=OpenBrowserInput,
                            risk_level=RiskLevel.SAFE,
                            requires_approval=False,
                            source="dynamic",
                            file_path=str(tool_file),
                        )
                    )
                elif tool_name == "render_ui":
                    def render_ui_dyn_wrapper(component: str = "", props: Optional[Dict[str, Any]] = None, _fn=execute_fn, **kwargs) -> str:
                        actual_comp = component or kwargs.get("component") or "unknown"
                        actual_props = props if isinstance(props, dict) else kwargs.get("props") or {}
                        return _fn(actual_comp, actual_props)

                    self.register(
                        ToolDefinition(
                            name="render_ui",
                            description=description,
                            function=render_ui_dyn_wrapper,
                            args_schema=RenderUIInput,
                            risk_level=RiskLevel.SAFE,
                            requires_approval=False,
                            source="dynamic",
                            file_path=str(tool_file),
                        )
                    )
                else:
                    # Dynamic tool wrapper with automatic schema introspection
                    # 1. Check if tool defines explicit Pydantic model (ToolInput, ArgsSchema, ARGS_SCHEMA)
                    custom_schema = getattr(module, "ToolInput", getattr(module, "ArgsSchema", getattr(module, "ARGS_SCHEMA", None)))
                    if custom_schema and isinstance(custom_schema, type) and issubclass(custom_schema, BaseModel):
                        tool_schema = custom_schema
                    else:
                        # 2. Introspect execute_fn signature
                        try:
                            sig = inspect.signature(execute_fn)
                            fields = {}
                            for p_name, p in sig.parameters.items():
                                if p_name in ("kwargs", "args") and p.kind in (inspect.Parameter.VAR_KEYWORD, inspect.Parameter.VAR_POSITIONAL):
                                    continue
                                p_type = p.annotation if p.annotation != inspect.Parameter.empty else Any
                                p_default = p.default if p.default != inspect.Parameter.empty else ...
                                fields[p_name] = (p_type, p_default)

                            if fields:
                                tool_schema = create_model(f"{tool_name.capitalize()}Input", **fields, __base__=BaseModel)
                                tool_schema.model_config = {"extra": "allow"}
                            else:
                                tool_schema = create_model(f"{tool_name.capitalize()}Input", args=(Optional[str], ""), __base__=BaseModel)
                                tool_schema.model_config = {"extra": "allow"}
                        except Exception:
                            tool_schema = create_model(f"{tool_name.capitalize()}Input", args=(Optional[str], ""), __base__=BaseModel)
                            tool_schema.model_config = {"extra": "allow"}

                    # Read RiskLevel and requires_approval from module if defined
                    raw_risk = getattr(module, "RISK_LEVEL", getattr(module, "risk_level", RiskLevel.SAFE))
                    if isinstance(raw_risk, str):
                        try:
                            tool_risk = RiskLevel(raw_risk.lower())
                        except ValueError:
                            tool_risk = RiskLevel.SAFE
                    elif isinstance(raw_risk, RiskLevel):
                        tool_risk = raw_risk
                    else:
                        tool_risk = RiskLevel.SAFE

                    req_approval = getattr(
                        module,
                        "REQUIRES_APPROVAL",
                        getattr(module, "requires_approval", tool_risk in (RiskLevel.HIGH, RiskLevel.CRITICAL)),
                    )

                    def dynamic_wrapper(_fn=execute_fn, **kwargs) -> str:
                        try:
                            sig = inspect.signature(_fn)
                            if len(sig.parameters) == 1 and "args" in sig.parameters and not kwargs.get("args") and kwargs:
                                return _fn(json.dumps(kwargs))
                            has_varkw = any(p.kind == inspect.Parameter.VAR_KEYWORD for p in sig.parameters.values())
                            if has_varkw:
                                return _fn(**kwargs)
                            valid_kwargs = {k: v for k, v in kwargs.items() if k in sig.parameters}
                            return _fn(**valid_kwargs)
                        except Exception as ex:
                            try:
                                return _fn(str(kwargs.get("args", kwargs)))
                            except Exception:
                                return f"Error executing tool: {ex}"

                    self.register(
                        ToolDefinition(
                            name=tool_name,
                            description=description,
                            function=dynamic_wrapper,
                            args_schema=tool_schema,
                            risk_level=tool_risk,
                            requires_approval=bool(req_approval),
                            source="dynamic",
                            file_path=str(tool_file),
                        )
                    )

            except Exception as ex:
                logger.warning(f"Could not load dynamic tool {tool_file}: {ex}")

    def register(self, tool_def: ToolDefinition) -> None:
        """Adds or replaces a tool definition in the registry."""
        self._tools[tool_def.name] = tool_def

    def get_tool_by_name(self, name: str) -> Optional[ToolDefinition]:
        """Retrieves a single ToolDefinition by name."""
        self.initialize()
        tool_def = self._tools.get(name)
        if not tool_def:
            # Auto-discovery for tools synthesized at runtime
            tool_file = settings.WORKSPACE_PATH / "tools" / f"{name}.py"
            if tool_file.exists():
                logger.info(f"Dynamically discovered new tool on disk '{name}'. Refreshing registry...")
                self.initialize(force_refresh=True)
                tool_def = self._tools.get(name)
        return tool_def

    def get_all_tools(self) -> Dict[str, ToolDefinition]:
        """Returns all registered tools."""
        self.initialize()
        return self._tools.copy()

    def get_langchain_tools(self) -> List[StructuredTool]:
        """Converts registered tools into LangChain StructuredTool objects with Pydantic validation."""
        self.initialize()
        langchain_tools: List[StructuredTool] = []
        for tool_def in self._tools.values():
            risk_val = tool_def.risk_level.value if hasattr(tool_def.risk_level, "value") else str(tool_def.risk_level)
            st = StructuredTool.from_function(
                func=tool_def.function,
                name=tool_def.name,
                description=tool_def.description,
                args_schema=tool_def.args_schema,
                metadata={
                    "source": tool_def.source,
                    "risk_level": risk_val
                }
            )
            langchain_tools.append(st)
        return langchain_tools

    def check_if_approval_needed(
        self,
        tool_name: str,
        args: Dict[str, Any],
        user_habits: Optional[Dict[str, Any]] = None,
    ) -> bool:
        """
        Determines whether tool execution requires explicit human approval.
        Checks tool risk classification and learned patterns from past human interactions.
        """
        tool_def = self.get_tool_by_name(tool_name)
        if not tool_def:
            return True

        if tool_def.risk_level in (RiskLevel.HIGH, RiskLevel.CRITICAL):
            # Safe exception: Pure echo commands used for conversational display never require approval
            if tool_name == "run_command":
                cmd = str(args.get("command", "")).strip()
                if re.match(r"^echo(\s+.*)?$", cmd, re.IGNORECASE):
                    if not any(ch in cmd for ch in [">", "<", "|", "&", ";", "`", "$"]):
                        return False

            # Check if user habits auto-approve this specific action
            if user_habits:
                patterns = user_habits.get("patterns", {}).get(tool_name, {})
                if patterns.get("auto_approve_threshold_met", False):
                    # For emails: check if recipient is in trusted list
                    if tool_name == "send_email":
                        to_addr = str(args.get("to", "")).lower()
                        trusted = [str(x).lower() for x in patterns.get("trusted_recipients", [])]
                        if to_addr in trusted:
                            return False
                    else:
                        return False
            return True

        return False

    def execute_tool(self, name: str, args: Dict[str, Any]) -> str:
        """Executes a tool by name with validated dictionary arguments."""
        tool_def = self.get_tool_by_name(name)
        if not tool_def:
            return f"Error: Tool '{name}' is not recognized in registry."

        try:
            # Validate through Pydantic args_schema
            validated = tool_def.args_schema(**args)
            return tool_def.function(**validated.model_dump())
        except Exception as ex:
            return f"Error executing tool '{name}': {ex}"

    def _find_elbow(self, scores: List[float], max_k: int = 8) -> int:
        """
        Dynamic score-gap / elbow candidate selection:
        1. If top score < min_plausible_relevance (0.58), query is non-tool conversation -> 0 tools.
        2. If top score < 0.60 and top-3 distribution is flat (< 0.03 spread) -> 0 tools.
        3. For actionable queries, select the tightly clustered top-tier tools within (top_score - 0.028),
           or cut at the largest drop in the top tier, capped at max_k.
        """
        if not scores or scores[0] < self._min_plausible_relevance:
            return 0
        if scores[0] < 0.60 and len(scores) >= 3 and (scores[0] - scores[2]) < 0.03:
            return 0

        tier_cutoff = scores[0] - 0.018
        cluster_count = sum(1 for s in scores if s >= tier_cutoff)
        drops = [(scores[i] - scores[i + 1]) for i in range(min(len(scores) - 1, 4))]
        for i, drop in enumerate(drops):
            if drop >= 0.015:
                return min(i + 1, max(1, cluster_count), max_k)

        return min(max(1, cluster_count), max_k)

    def get_relevant_tools(self, query: str = "", max_k: int = 8, top_k: Optional[int] = None) -> List[StructuredTool]:
        """
        Dynamic score-gap / elbow-derived semantic tool selection.
        Calculates cosine similarity of query against precomputed tool embeddings.
        Returns a variable-size candidate set if clear intent is detected; returns [] for flat/noisy chat.
        """
        limit = top_k if top_k is not None else max_k
        self.initialize()
        if not query or not query.strip():
            return []

        clean_query = query.strip()
        query_vec = rag_vault.generate_embedding(clean_query)
        all_lc = {t.name: t for t in self.get_langchain_tools()}

        if not query_vec or not self._tool_embedding_cache:
            # Fallback if embeddings are unavailable: return empty on short chat greetings, or minimal tools
            if len(clean_query.split()) <= 3 and any(w in clean_query.lower() for w in ("hi", "hello", "hey", "thanks")):
                return []
            return list(all_lc.values())[:limit]

        import math
        def cosine_sim(a: List[float], b: List[float]) -> float:
            dot = sum(x * y for x, y in zip(a, b))
            norm_a = math.sqrt(sum(x * x for x in a))
            norm_b = math.sqrt(sum(y * y for y in b))
            if not norm_a or not norm_b:
                return 0.0
            return dot / (norm_a * norm_b)

        scored = []
        for name, tool_vec in self._tool_embedding_cache.items():
            sim = cosine_sim(query_vec, tool_vec)
            scored.append((sim, name))

        scored.sort(key=lambda x: x[0], reverse=True)
        scores = [s for s, _ in scored]

        cut = self._find_elbow(scores[:limit], max_k=limit)
        if cut <= 0:
            return []

        relevant_names = set(name for _, name in scored[:cut])
        return [all_lc[name] for name in relevant_names if name in all_lc]


# Global tool registry instance
registry = ToolRegistry()


def get_all_tools() -> Dict[str, ToolDefinition]:
    """Helper function to retrieve all registered tools."""
    return registry.get_all_tools()


def get_langchain_tools() -> List[StructuredTool]:
    """Helper function to retrieve LangChain tools."""
    return registry.get_langchain_tools()


def get_relevant_tools(query: str = "", max_k: int = 8, top_k: Optional[int] = None) -> List[StructuredTool]:
    """Helper function for Dynamic Tool Selection RAG."""
    return registry.get_relevant_tools(query=query, max_k=max_k, top_k=top_k)


def get_tool_by_name(name: str) -> Optional[ToolDefinition]:
    """Helper function to retrieve a specific tool definition."""
    return registry.get_tool_by_name(name)


def check_if_approval_needed(tool_name: str, args: Dict[str, Any], user_habits: Optional[Dict[str, Any]] = None) -> bool:
    """Helper function to evaluate human approval gate."""
    return registry.check_if_approval_needed(tool_name, args, user_habits)


def execute_tool(name: str, args: Dict[str, Any]) -> str:
    """Helper function to execute a tool."""
    return registry.execute_tool(name, args)