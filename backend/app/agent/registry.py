import importlib.util
import logging
import re
from pathlib import Path
from typing import Any, Callable, Dict, List, Optional
from langchain_core.tools import StructuredTool
from pydantic import BaseModel, create_model

try:
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
        RiskLevel,
        RunCommandInput,
        ScrapeWebpageInput,
        SearchKnowledgeVaultInput,
        SearchWebInput,
        SendEmailInput,
        ToolDefinition,
        ViewFileInput,
        WriteFileInput,
    )
    from backend.app.services.rag_service import rag_vault
except ImportError:
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
        RiskLevel,
        RunCommandInput,
        ScrapeWebpageInput,
        SearchKnowledgeVaultInput,
        SearchWebInput,
        SendEmailInput,
        ToolDefinition,
        ViewFileInput,
        WriteFileInput,
    )
    from app.services.rag_service import rag_vault

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

    def initialize(self, force_refresh: bool = False) -> None:
        """Loads core and dynamic tools into the registry."""
        if self._initialized and not force_refresh:
            return

        self._tools.clear()
        self._register_core_tools()
        self._register_dynamic_tools()
        self._initialized = True
        logger.info(f"Tool registry initialized with {len(self._tools)} tools.")

    def _register_core_tools(self) -> None:
        """Registers all built-in filesystem and search tools."""

        # 1. read_file
        def read_file_handler(path: str) -> str:
            return CoreToolbox.read_file(path)

        self.register(
            ToolDefinition(
                name="read_file",
                description="Read contents of a file inside the workspace.",
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
                description="Write, update, or overwrite a file in the workspace.",
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
                description="Execute a shell command in the local environment.",
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
                description="List directory entries, subfolders, and file sizes.",
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
                description="Search the live web for verified documentation and factual sources.",
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
                description="Fetch and extract readable Markdown content from a given web URL.",
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
                description="Search for occurrences of a string or pattern across project files.",
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
                description="View specific line slices or entire content of a file with line numbers.",
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
                description="Search local knowledge vault for project documentation, user habits, specifications, and dynamic tools.",
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
                description="Synthesize, verify, and register a new reusable Python tool in the workspace tools/ folder. Checks syntax, writes SHA256 integrity hash, and activates it immediately for ERIS.",
                function=create_custom_tool_handler,
                args_schema=CreateToolInput,
                risk_level=RiskLevel.HIGH,
                requires_approval=True,
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
                else:
                    # Dynamic generic tool wrapper
                    generic_schema = create_model(
                        f"{tool_name.capitalize()}Input",
                        args=(str, ...),
                        __base__=BaseModel,
                    )

                    def generic_wrapper(args: str = "", _fn=execute_fn, **kwargs) -> str:
                        actual_args = args or str(kwargs)
                        return _fn(actual_args)

                    self.register(
                        ToolDefinition(
                            name=tool_name,
                            description=description,
                            function=generic_wrapper,
                            args_schema=generic_schema,
                            risk_level=RiskLevel.MODERATE,
                            requires_approval=False,
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
        return self._tools.get(name)

    def get_all_tools(self) -> Dict[str, ToolDefinition]:
        """Returns all registered tools."""
        self.initialize()
        return self._tools.copy()

    def get_langchain_tools(self) -> List[StructuredTool]:
        """Converts registered tools into LangChain StructuredTool objects with Pydantic validation."""
        self.initialize()
        langchain_tools: List[StructuredTool] = []
        for tool_def in self._tools.values():
            st = StructuredTool.from_function(
                func=tool_def.function,
                name=tool_def.name,
                description=tool_def.description,
                args_schema=tool_def.args_schema,
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

    def get_relevant_tools(self, query: str = "", top_k: int = 8) -> List[StructuredTool]:
        """
        Fast in-memory tool selection:
        Always preserves baseline inspection tools (read_file, view_file, grep_search, list_dir),
        and ranks remaining workspace tools via in-memory lexical keyword overlap (0.1 ms, 0 API calls).
        """
        self.initialize()
        all_lc_tools = self.get_langchain_tools()
        if len(all_lc_tools) <= top_k or not query or not query.strip():
            return all_lc_tools

        always_included = {"read_file", "view_file", "grep_search", "list_dir"}
        q_tokens = set(re.findall(r"\b[a-zA-Z0-9_\-]{2,}\b", query.lower()))

        scored_tools = []
        for t in all_lc_tools:
            if t.name in always_included:
                continue
            desc_tokens = set(re.findall(r"\b[a-zA-Z0-9_\-]{2,}\b", (t.name + " " + (t.description or "")).lower()))
            overlap = len(q_tokens.intersection(desc_tokens))
            scored_tools.append((overlap, t))

        scored_tools.sort(key=lambda x: x[0], reverse=True)
        remaining_slots = max(0, top_k - len(always_included))
        top_extra = [t for _, t in scored_tools[:remaining_slots]]

        included_names = always_included.union(t.name for t in top_extra)
        return [t for t in all_lc_tools if t.name in included_names]


# Global tool registry instance
registry = ToolRegistry()


def get_all_tools() -> Dict[str, ToolDefinition]:
    """Helper function to retrieve all registered tools."""
    return registry.get_all_tools()


def get_langchain_tools() -> List[StructuredTool]:
    """Helper function to retrieve LangChain tools."""
    return registry.get_langchain_tools()


def get_relevant_tools(query: str = "", top_k: int = 8) -> List[StructuredTool]:
    """Helper function for Dynamic Tool Selection RAG."""
    return registry.get_relevant_tools(query=query, top_k=top_k)


def get_tool_by_name(name: str) -> Optional[ToolDefinition]:
    """Helper function to retrieve a specific tool definition."""
    return registry.get_tool_by_name(name)


def check_if_approval_needed(tool_name: str, args: Dict[str, Any], user_habits: Optional[Dict[str, Any]] = None) -> bool:
    """Helper function to evaluate human approval gate."""
    return registry.check_if_approval_needed(tool_name, args, user_habits)


def execute_tool(name: str, args: Dict[str, Any]) -> str:
    """Helper function to execute a tool."""
    return registry.execute_tool(name, args)

