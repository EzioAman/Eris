import asyncio
import json
import logging
import os
import re
import time
import uuid
from pathlib import Path
from typing import Any, AsyncGenerator, Dict, List, Optional
from langchain_core.messages import AIMessage, HumanMessage
from langgraph.types import Command
import requests

try:
    from app.agent.subagent_personas import swarm_manager, SubagentTaskSpec
    from app.config import settings
    from app.schemas.models import (
        ModelCatalogItem,
        format_token_count,
        format_context_display,
        compute_context_tier,
    )
    from app.services.learning import load_habits
    from app.services.model_catalog import model_catalog_service
    from app.services.rag_service import rag_vault
    from app.services.vault_service import get_all_active_credentials_sync
except ImportError:
    from backend.app.agent.subagent_personas import swarm_manager, SubagentTaskSpec
    from backend.app.config import settings
    from backend.app.schemas.models import (
        ModelCatalogItem,
        format_token_count,
        format_context_display,
        compute_context_tier,
    )
    from backend.app.services.learning import load_habits
    from backend.app.services.model_catalog import model_catalog_service
    from backend.app.services.rag_service import rag_vault
    from backend.app.services.vault_service import get_all_active_credentials_sync


def _get_agent_graph():
    try:
        from app.agent.graph import agent_graph
    except ImportError:
        from backend.app.agent.graph import agent_graph
    return agent_graph

logger = logging.getLogger("eris.agent.runner")


class AgentRunner:
    """
    Primary interface for executing Eris via LangGraph.
    Manages conversational memory, model discovery, SSE stream formatting, and human approval resumption.
    Supports isolated per-user memory and thread scoping.
    """

    def __init__(self, workspace_path: Optional[Path] = None):
        self.workspace_path = workspace_path or settings.WORKSPACE_PATH
        self.memory_file = self.workspace_path / "memory" / "memory.json"
        self.memory = self._load_memory()
        raw_model = self.memory.get("active_model")
        if raw_model and "openrouter/openrouter/" in raw_model:
            raw_model = raw_model.replace("openrouter/openrouter/", "openrouter/")
        self.active_model: Optional[str] = raw_model or "openrouter/auto"
        self.execution_mode: str = self.memory.get("execution_mode", "speed")
        self._cached_models: List[Dict[str, Any]] = []
        self._models_cached_at: float = 0.0
        self._cache_ttl_seconds: float = 300.0

    def _sanitize_user_id(self, user_id: Optional[str]) -> str:
        if not user_id:
            return "default_user"
        clean = re.sub(r"[^a-zA-Z0-9_\-]", "_", str(user_id).strip().lower())
        return clean or "default_user"

    def get_user_memory_file(self, user_id: Optional[str] = None) -> Path:
        safe_id = self._sanitize_user_id(user_id)
        if safe_id == "default_user":
            return self.memory_file
        user_dir = self.workspace_path / "memory" / "users" / safe_id
        user_dir.mkdir(parents=True, exist_ok=True)
        return user_dir / "memory.json"

    def load_user_memory(self, user_id: Optional[str] = None) -> Dict[str, Any]:
        target = self.get_user_memory_file(user_id)
        if target.exists():
            try:
                with open(target, "r", encoding="utf-8") as f:
                    return json.load(f)
            except Exception as ex:
                logger.warning(f"Failed to read memory file {target}: {ex}")
        return {
            "identity": "You are ERIS, an autonomous pair-programming assistant.",
            "history": [],
            "active_model": self.active_model,
            "execution_mode": self.execution_mode,
        }

    def save_user_memory(self, user_id: Optional[str], mem_data: Dict[str, Any]) -> None:
        target = self.get_user_memory_file(user_id)
        try:
            target.parent.mkdir(parents=True, exist_ok=True)
            with open(target, "w", encoding="utf-8") as f:
                json.dump(mem_data, f, indent=4, ensure_ascii=False)
        except Exception as ex:
            logger.error(f"Failed to save user memory to {target}: {ex}")

    def append_to_user_history(self, user_id: Optional[str], role: str, content: str) -> None:
        safe_id = self._sanitize_user_id(user_id)
        mem = self.load_user_memory(safe_id)
        if "history" not in mem or not isinstance(mem["history"], list):
            mem["history"] = []
        mem["history"].append({"role": role, "content": content})
        if len(mem["history"]) > 50:
            mem["history"] = mem["history"][-50:]
        self.save_user_memory(safe_id, mem)

        if safe_id == "default_user":
            self.memory = mem

        # Index episodic preferences into knowledge vault in background without blocking turn startup
        if role == "user" and len(content.strip()) > 15:
            try:
                try:
                    loop = asyncio.get_running_loop()
                    loop.create_task(asyncio.to_thread(
                        rag_vault.add_chunk,
                        source=f"memory/users/{safe_id}",
                        category="memory",
                        title=f"User Statement: {content.strip()[:40]}...",
                        content=content.strip(),
                    ))
                except RuntimeError:
                    rag_vault.add_chunk(
                        source=f"memory/users/{safe_id}",
                        category="memory",
                        title=f"User Statement: {content.strip()[:40]}...",
                        content=content.strip(),
                    )
            except Exception as r_err:
                logger.debug(f"Episodic memory indexing notice: {r_err}")


    def clear_user_history(self, user_id: Optional[str] = None) -> None:
        safe_id = self._sanitize_user_id(user_id)
        mem = self.load_user_memory(safe_id)
        mem["history"] = []
        self.save_user_memory(safe_id, mem)
        if safe_id == "default_user":
            self.memory["history"] = []

    def _load_memory(self) -> Dict[str, Any]:
        """Loads persistent conversation history and active configuration."""
        if self.memory_file.exists():
            try:
                with open(self.memory_file, "r", encoding="utf-8") as f:
                    return json.load(f)
            except Exception as ex:
                logger.warning(f"Failed to read memory file {self.memory_file}: {ex}")
        return {
            "identity": "You are ERIS, an autonomous pair-programming assistant.",
            "history": [],
            "active_model": None,
            "execution_mode": "speed",
        }

    def save_memory(self) -> None:
        """Persists conversational state to memory/memory.json."""
        try:
            self.memory_file.parent.mkdir(parents=True, exist_ok=True)
            with open(self.memory_file, "w", encoding="utf-8") as f:
                json.dump(self.memory, f, indent=4, ensure_ascii=False)
        except Exception as ex:
            logger.error(f"Failed to save memory: {ex}")

    def append_to_history(self, role: str, content: str) -> None:
        """Records a message to memory history, capped at 50 messages."""
        self.append_to_user_history(None, role, content)

    def set_active_model(self, model_id: Optional[str], user_id: Optional[str] = None) -> bool:
        """Updates the active LLM identifier."""
        clean_id = model_id.strip() if model_id else None
        if clean_id and "openrouter/openrouter/" in clean_id:
            clean_id = clean_id.replace("openrouter/openrouter/", "openrouter/")
        self.active_model = clean_id or None
        self.memory["active_model"] = self.active_model
        self.save_memory()
        if user_id:
            safe_u = self._sanitize_user_id(user_id)
            if safe_u != "default_user":
                u_mem = self.load_user_memory(safe_u)
                u_mem["active_model"] = self.active_model
                self.save_user_memory(safe_u, u_mem)
        logger.info(f"Switched active model to: {self.active_model}")
        return True

    def apply_model_selection(self, model_id: Optional[str]) -> bool:
        """Alias for set_active_model."""
        return self.set_active_model(model_id)

    def set_execution_mode(self, mode: str) -> bool:
        """Sets execution mode to speed or accuracy."""
        clean_mode = mode.lower().strip()
        if clean_mode in ("speed", "accuracy"):
            self.execution_mode = clean_mode
            self.memory["execution_mode"] = clean_mode
            self.save_memory()
            return True
        return False

    def fetch_models(self, force_refresh: bool = False) -> List[Dict[str, Any]]:
        """
        Dynamically discovers and verifies real, available models against active API keys
        in the local credential vault via modular ProviderAdapters.
        """
        models = model_catalog_service.fetch_models(force_refresh=force_refresh)

        # If active_model is deprecated (e.g. gemini-2.5 or 2.0-flash), auto-migrate to top recommended model
        if self.active_model and any(dep in self.active_model.lower() for dep in ("gemini-2.5", "gemini-2.0-flash", "gemini-1.0")) and models:
            old = self.active_model
            self.set_active_model(models[0]["id"])
            logger.info(f"Auto-migrated deprecated active model '{old}' to recommended working model '{self.active_model}'.")

        if self.active_model and not any(m["id"] == self.active_model for m in models):
            if not models:
                self.active_model = None

        self._cached_models = models
        return models

    def resolve_active_model(self) -> str:
        """
        Dynamically resolves the active model:
        1. Checks current active_model in memory.
        2. If unset, inspects the verified catalog from model_catalog_service and picks the top verified model.
        3. Falls back to settings.DEFAULT_MODEL without hardcoded model strings.
        """
        if self.active_model and self.active_model.strip():
            return self.active_model.strip()

        models = self._cached_models or model_catalog_service.fetch_models()
        if models:
            resolved = models[0]["id"]
            self.set_active_model(resolved)
            return resolved

        return getattr(settings, "DEFAULT_MODEL", "openrouter/auto")

    async def spawn_subagent(self, spec_or_str: Any) -> str:
        """
        Executes a specialized subagent asynchronously with full persona directives.
        Supports tag strings '[SPAWN_AGENT: SecurityAuditor|Audit AST]' or structured specs.
        """
        role = "coder"
        objective = "Analyze task"
        prereq = None

        if isinstance(spec_or_str, dict):
            role = spec_or_str.get("role", "coder")
            objective = spec_or_str.get("objective", "Execute subtask")
            prereq = spec_or_str.get("prerequisite_context")
        elif isinstance(spec_or_str, str):
            cleaned = spec_or_str.replace("[SPAWN_AGENT:", "").replace("]", "").strip()
            if "|" in cleaned:
                parts = cleaned.split("|", 1)
                role = parts[0].strip()
                objective = parts[1].strip()
            else:
                objective = cleaned

        target_model = self.resolve_active_model()
        res = await swarm_manager.execute_subagent(
            role=role,
            objective=objective,
            active_model=target_model,
            prerequisite_context=prereq,
        )

        if res.get("ok"):
            return f"### Subagent [{res.get('role', role)}] Completed ({res.get('duration_seconds', 0)}s)\n\n{res.get('report')}"
        return f"### Subagent [{res.get('role', role)}] Failed ({res.get('duration_seconds', 0)}s)\n\nError: {res.get('error')}"

    async def spawn_swarm(
        self, subagent_specs: List[Union[Dict[str, Any], SubagentTaskSpec]]
    ) -> List[Dict[str, Any]]:
        """
        Spawns an elastic swarm of parallel subagents with asynchronous DAG dependency coordination.
        Independent subagents run concurrently; dependent subagents wait for prerequisite actions.
        """
        target_model = self.resolve_active_model()
        return await swarm_manager.spawn_dag_swarm(
            subagent_specs=subagent_specs,
            active_model=target_model,
        )

    async def stream_turn(
        self,
        message: str,
        session_id: str = "default_session",
        user_id: Optional[str] = None,
        active_model: Optional[str] = None,
        execution_mode: Optional[str] = None,
    ) -> AsyncGenerator[Dict[str, Any], None]:
        """
        Executes a multi-turn reasoning and tool invocation cycle using LangGraph.
        Emits SSE events strictly adhering to the frontend timeline contract.

        Consumes the graph via stream_mode=["custom", "updates"]:
          - "custom" carries live token/thought deltas pushed by reasoner_node via
            get_stream_writer() as the model streams (real-time UX).
          - "updates" carries each node's full state delta on completion, same shape
            as resume_after_decision below, used for tool calls / timing / usage events.
        """
        model_to_use = active_model or self.active_model
        mode_to_use = execution_mode or self.execution_mode
        safe_user = self._sanitize_user_id(user_id)

        if not model_to_use:
            discovered = await asyncio.to_thread(self.fetch_models)
            if discovered:
                best_model = discovered[0]["id"]
                model_to_use = best_model
                self.set_active_model(best_model)
                logger.info(f"Auto-selected verified recommended model {model_to_use} from active credentials.")


        if not model_to_use:
            yield {
                "type": "turn_start",
                "model": "None",
                "turn": 1,
                "text": "No active model configured.",
            }
            yield {
                "type": "error",
                "message": "No model selected. Please open the Model Matrix or Key Vault to configure your API keys.",
            }
            return

        user_habits, _ = await asyncio.gather(
            asyncio.to_thread(load_habits),
            asyncio.to_thread(self.append_to_user_history, safe_user, "user", message),
        )
        scoped_thread = f"{safe_user}_{session_id}" if not session_id.startswith(f"{safe_user}_") else session_id
        config = {
            "configurable": {"thread_id": scoped_thread},
            "metadata": {
                "session_id": scoped_thread,
                "user_id": safe_user,
                "model": model_to_use,
            },
            "tags": [f"user:{safe_user}", f"model:{model_to_use}"],
        }

        yield {
            "type": "turn_start",
            "model": model_to_use,
            "turn": 1,
            "text": f"Analyzing request with {model_to_use}...",
        }

        # Clear per-turn keys while preserving overall conversation context
        initial_state = {
            "messages": [HumanMessage(content=message)],
            "session_id": scoped_thread,
            "active_model": model_to_use,
            "execution_mode": mode_to_use,
            "user_habits": user_habits,
            "approval_pending": None,
            "turn_count": 1,
            "current_thought": "",
            "executed_tools": [],
            "user_id": safe_user,
        }

        final_reply = ""
        tool_calls: List[Dict[str, Any]] = []
        accumulated_thoughts: List[str] = []
        token_usage: Optional[Dict[str, Any]] = None

        node_timings: Dict[str, float] = {}
        sub_timings: Dict[str, float] = {}

        try:
            node_start = time.perf_counter()
            graph = _get_agent_graph()
            async for stream_mode, payload in graph.astream(
                initial_state, config=config, stream_mode=["custom", "updates"]
            ):
                # 1. Real-time token/thought streaming pushed by reasoner_node via get_stream_writer()
                if stream_mode == "custom":
                    ev_type = payload.get("type") if isinstance(payload, dict) else None
                    if ev_type == "chunk":
                        text = payload.get("text", "")
                        if text:
                            yield {"type": "chunk", "text": text}
                    elif ev_type == "thought":
                        text = payload.get("text", "")
                        if text.strip():
                            yield {"type": "thought", "text": text}
                    continue

                # 2. "updates": payload is {node_name: node_output} for nodes that just finished
                if not isinstance(payload, dict):
                    continue

                for node_name, node_output in payload.items():
                    if node_name not in ("reasoner", "tool_runner", "approval_gate", "learning_recorder"):
                        continue
                    if not isinstance(node_output, dict):
                        continue

                    node_elapsed = round((time.perf_counter() - node_start) * 1000.0, 2)
                    node_timings[node_name] = node_elapsed
                    yield {
                        "type": "node_timing",
                        "node": node_name,
                        "duration_ms": node_elapsed,
                    }

                    # 2a. Reasoner node output
                    if node_name == "reasoner":
                        if "sub_timings" in node_output and isinstance(node_output["sub_timings"], dict):
                            sub_timings.update(node_output["sub_timings"])
                            yield {
                                "type": "telemetry",
                                "sub_timings": sub_timings,
                            }

                        thought = node_output.get("current_thought", "")
                        if thought:
                            accumulated_thoughts.append(thought)
                            yield {
                                "type": "thought",
                                "text": thought,
                                "turn": node_output.get("turn_count", 1),
                            }

                        usage = node_output.get("token_usage")
                        if usage:
                            token_usage = usage
                            yield {
                                "type": "usage",
                                "prompt_tokens": usage.get("prompt_tokens", 0),
                                "completion_tokens": usage.get("completion_tokens", 0),
                                "total_tokens": usage.get("total_tokens", 0),
                                "model": node_output.get("active_model") or model_to_use,
                            }

                        node_model = node_output.get("active_model")
                        if node_model and node_model != model_to_use:
                            model_to_use = node_model
                            self.set_active_model(node_model)
                            yield {
                                "type": "model_switch",
                                "model": node_model,
                                "text": f"Switched active model to {node_model}",
                            }

                        msgs = node_output.get("messages", [])
                        if msgs:
                            last_msg = msgs[-1]
                            if isinstance(last_msg, AIMessage):
                                has_tool_calls = bool(getattr(last_msg, "tool_calls", None))
                                # Only set final_reply if it's not purely intermediate tool dispatch
                                if last_msg.content and not has_tool_calls:
                                    final_reply = str(last_msg.content)

                                if has_tool_calls:
                                    for tc in last_msg.tool_calls:
                                        t_name = tc.get("name", "")
                                        t_args = tc.get("args", {})
                                        tc_id = tc.get("id") or str(uuid.uuid4())
                                        if t_name == "render_ui":
                                            comp = t_args.get("component") if isinstance(t_args, dict) else "unknown"
                                            raw_props = t_args.get("props", {}) if isinstance(t_args, dict) else {}
                                            if isinstance(raw_props, str):
                                                try:
                                                    props = json.loads(raw_props)
                                                except Exception:
                                                    props = {"raw": raw_props}
                                            else:
                                                props = raw_props if isinstance(raw_props, dict) else {}
                                            status = t_args.get("status", "ready") if isinstance(t_args, dict) else "ready"
                                            yield {
                                                "type": "ui_intent",
                                                "id": tc_id,
                                                "component": comp,
                                                "props": props,
                                                "status": status,
                                            }
                                        elif t_name == "ask_question":
                                            yield {
                                                "type": "elicitation",
                                                "question": t_args if isinstance(t_args, dict) else {
                                                    "id": tc_id,
                                                    "prompt": str(t_args),
                                                    "mode": "single",
                                                    "options": [],
                                                },
                                            }
                                        elif t_name == "search_web":
                                            yield {
                                                "type": "search",
                                                "query": t_args.get("query", "") if isinstance(t_args, dict) else str(t_args),
                                                "status": "searching",
                                                "results": [],
                                            }
                                        else:
                                            yield {
                                                "type": "action",
                                                "text": f"Invoking tool: {t_name}",
                                                "tool": t_name,
                                                "args": t_args,
                                            }

                    # 2b. Tool runner node output
                    elif node_name == "tool_runner":
                        tools_run = node_output.get("executed_tools", [])
                        for t in tools_run:
                            if t.get("name") in ("render_ui", "ask_question"):
                                continue  # Visual block is dispatched via ui_intent/elicitation; avoid duplicate text noise
                            yield {
                                "type": "observation",
                                "text": f"[{t.get('name', 'Tool')}]: {t.get('output', '')[:120]}...",
                            }
                            tool_calls.append(t)

                    node_start = time.perf_counter()

            # Check for human-in-the-loop interrupts
            state_snapshot = graph.get_state(config)
            if state_snapshot.tasks:
                for task in state_snapshot.tasks:
                    if hasattr(task, "interrupts") and task.interrupts:
                        for intr in task.interrupts:
                            payload = intr.value
                            if isinstance(payload, dict) and payload.get("kind") == "approval":
                                yield {
                                    "type": "action",
                                    "text": f"Security approval required: {payload.get('action')}",
                                }
                                tool_calls.append(payload)

            if not final_reply and tool_calls:
                for t in reversed(tool_calls):
                    out = t.get("output", "")
                    if out and ("FILE_CONTENT" in out or "DIR_ENTRIES" in out):
                        final_reply = f"Here is the content retrieved:\n\n{out}"
                        break

            if final_reply:
                self.append_to_user_history(safe_user, "assistant", final_reply)

            yield {
                "type": "done",
                "reply": final_reply or "Action completed.",
                "toolCalls": tool_calls,
                "model": model_to_use,
                "memory_updated": True,
                "execution_mode": mode_to_use,
                "reasoning": "\n\n".join(accumulated_thoughts) if accumulated_thoughts else None,
                "reasoningSteps": [{"turn": idx + 1, "thought": t} for idx, t in enumerate(accumulated_thoughts)] if accumulated_thoughts else None,
                "usage": token_usage,
                "node_timings": node_timings,
                "sub_timings": sub_timings,
            }

        except Exception as ex:
            logger.error(f"Error in stream_turn: {ex}", exc_info=True)
            from backend.app.agent.nodes import format_user_friendly_error
            friendly_reply = format_user_friendly_error(ex, model_to_use)
            yield {
                "type": "done",
                "reply": friendly_reply,
                "toolCalls": tool_calls,
                "model": model_to_use,
                "memory_updated": False,
                "execution_mode": mode_to_use,
                "reasoning": "\n\n".join(accumulated_thoughts) if accumulated_thoughts else None,
                "reasoningSteps": [{"turn": idx + 1, "thought": t} for idx, t in enumerate(accumulated_thoughts)] if accumulated_thoughts else None,
                "usage": token_usage,
            }

    async def resume_after_decision(
        self,
        session_id: str,
        decision: Dict[str, Any],
        user_id: Optional[str] = None,
        active_model: Optional[str] = None,
        execution_mode: Optional[str] = None,
    ) -> AsyncGenerator[Dict[str, Any], None]:
        """
        Resumes a paused graph after a human decision (approval or rejection) is submitted.
        """
        model_to_use = active_model or self.active_model
        mode_to_use = execution_mode or self.execution_mode
        safe_user = self._sanitize_user_id(user_id)
        scoped_thread = f"{safe_user}_{session_id}" if not session_id.startswith(f"{safe_user}_") else session_id
        config = {"configurable": {"thread_id": scoped_thread}}

        yield {
            "type": "turn_start",
            "model": model_to_use,
            "turn": 2,
            "text": "Resuming execution following human decision...",
        }

        final_reply = ""
        accumulated_thoughts: List[str] = []
        tool_calls: List[Dict[str, Any]] = []

        try:
            resume_command = Command(resume=decision)
            graph = _get_agent_graph()
            async for step in graph.astream(resume_command, config=config):
                for node_name, node_output in step.items():
                    if not isinstance(node_output, dict):
                        continue

                    if node_name == "reasoner":
                        thought = node_output.get("current_thought", "")
                        if thought:
                            accumulated_thoughts.append(thought)
                            yield {
                                "type": "thought",
                                "text": thought,
                                "turn": node_output.get("turn_count", 2),
                            }
                        msgs = node_output.get("messages", [])
                        if msgs:
                            last_msg = msgs[-1]
                            if isinstance(last_msg, AIMessage):
                                has_tool_calls = bool(getattr(last_msg, "tool_calls", None))
                                if last_msg.content and not has_tool_calls:
                                    final_reply = str(last_msg.content)

                    elif node_name in ("approval_gate", "tool_runner"):
                        tools_run = node_output.get("executed_tools", [])
                        for t in tools_run:
                            if t.get("kind") == "output":
                                yield {
                                    "type": "observation",
                                    "text": f"[{t.get('name', 'Action')} completed]: {t.get('output', '')[:120]}",
                                }
                            tool_calls.append(t)

            if final_reply:
                self.append_to_user_history(safe_user, "assistant", final_reply)

            combined_reasoning = "\n\n".join(accumulated_thoughts) if accumulated_thoughts else None

            yield {
                "type": "done",
                "reply": final_reply,
                "reasoning": combined_reasoning,
                "toolCalls": tool_calls,
                "model": model_to_use,
                "memory_updated": True,
                "execution_mode": mode_to_use,
            }

        except Exception as ex:
            logger.error(f"Error resuming after decision: {ex}", exc_info=True)
            yield {
                "type": "done",
                "reply": f"Failed to resume execution: {ex}",
                "toolCalls": tool_calls,
                "model": model_to_use,
                "memory_updated": False,
                "execution_mode": mode_to_use,
            }


runner = AgentRunner()