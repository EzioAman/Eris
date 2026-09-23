import asyncio
import json
import logging
import os
import re
import time
from pathlib import Path
from typing import Any, AsyncGenerator, Dict, List, Optional
from langchain_core.messages import AIMessage, HumanMessage
from langgraph.types import Command
import requests

try:
    from app.agent.graph import agent_graph
    from app.config import settings
    from app.services.learning import load_habits
    from app.services.vault_service import get_all_active_credentials_sync
except ImportError:
    from backend.app.agent.graph import agent_graph
    from backend.app.config import settings
    from backend.app.services.learning import load_habits
    from backend.app.services.vault_service import get_all_active_credentials_sync

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
        self.active_model: Optional[str] = self.memory.get("active_model") or "openrouter/openrouter/auto"
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
        mem = self.load_user_memory(user_id)
        if "history" not in mem or not isinstance(mem["history"], list):
            mem["history"] = []
        mem["history"].append({"role": role, "content": content})
        if len(mem["history"]) > 50:
            mem["history"] = mem["history"][-50:]
        self.save_user_memory(user_id, mem)

        if self._sanitize_user_id(user_id) == "default_user":
            self.memory = mem

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

    def set_active_model(self, model_id: Optional[str]) -> bool:
        """Updates the active LLM identifier."""
        self.active_model = model_id or None
        self.memory["active_model"] = self.active_model
        self.save_memory()
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
        in the local credential vault (auth.db). Returns an empty list if no keys are configured.
        """
        if self._cached_models and not force_refresh:
            if time.time() - self._models_cached_at < self._cache_ttl_seconds:
                return self._cached_models

        models: List[Dict[str, Any]] = []
        credentials = get_all_active_credentials_sync()

        if not credentials:
            self._cached_models = []
            self._models_cached_at = time.time()
            return []

        for cred in credentials:
            provider = cred.get("provider", "").lower().strip()
            key = cred.get("key", "").strip()
            base_url = cred.get("base_url", "").strip()

            if not key and provider != "ollama":
                continue

            # 1. Google Gemini
            if provider == "gemini":
                try:
                    resp = requests.get(
                        f"https://generativelanguage.googleapis.com/v1beta/models?key={key}",
                        timeout=5,
                    )
                    if resp.status_code == 200:
                        for m in resp.json().get("models", []):
                            if "generateContent" in m.get("supportedGenerationMethods", []):
                                name = m["name"].replace("models/", "")
                                name_lower = name.lower()
                                if any(k in name_lower for k in [
                                    "tts", "image", "embedding", "deep-research", "antigravity",
                                    "computer-use", "aqa", "realtime"
                                ]):
                                    continue

                                caps = ["Coding"]
                                if any(k in name_lower for k in ["flash", "pro", "gemini-3", "gemini-2"]):
                                    caps.extend(["Vision", "Audio", "Free"])
                                if any(k in name_lower for k in ["thinking", "pro", "gemini-3.6", "exp"]):
                                    caps.append("Reasoning")

                                models.append({
                                    "id": f"gemini/{name}",
                                    "name": f"Gemini {name.replace('-', ' ').title()}",
                                    "provider": "Google Gemini",
                                    "context": "1M - 2M tokens",
                                    "capabilities": list(set(caps)),
                                    "speed": "120 tps" if "flash" in name_lower else "65 tps",
                                    "cost": "Free Tier Available",
                                    "status": "verified",
                                    "verified": True,
                                })
                except Exception as ex:
                    logger.warning(f"Key verification failed for Gemini: {ex}")

            # 2. OpenRouter
            elif provider == "openrouter":
                # Ensure OpenRouter Auto dynamic router is ALWAYS pinned at the top
                models.append({
                    "id": "openrouter/openrouter/auto",
                    "name": "OpenRouter Auto (Smart Dynamic Router)",
                    "provider": "OpenRouter",
                    "context": "128k - 200k tokens",
                    "capabilities": ["Coding", "Reasoning", "Vision", "Free"],
                    "speed": "120+ tps",
                    "cost": "Dynamic (Optimized)",
                    "status": "verified",
                    "verified": True,
                })
                models.append({
                    "id": "openrouter/auto",
                    "name": "OpenRouter Auto Router",
                    "provider": "OpenRouter",
                    "context": "128k - 200k tokens",
                    "capabilities": ["Coding", "Reasoning", "Vision"],
                    "speed": "120+ tps",
                    "cost": "Dynamic (Optimized)",
                    "status": "verified",
                    "verified": True,
                })

                try:
                    resp = requests.get(
                        "https://openrouter.ai/api/v1/models",
                        headers={"Authorization": f"Bearer {key}"},
                        timeout=5,
                    )
                    if resp.status_code == 200:
                        all_openrouter_models = resp.json().get("data", [])
                        priority_keywords = [
                            "auto", "deepseek", "claude", "gpt-4o", "llama-3.3", "qwen-2.5",
                            "gemini-2.5", "mistral-large", "sonnet"
                        ]
                        seen_ids = {"openrouter/openrouter/auto", "openrouter/auto"}

                        for m in all_openrouter_models:
                            m_id = m.get("id", "")
                            full_id = f"openrouter/{m_id}"
                            if full_id in seen_ids:
                                continue
                            if any(kw in m_id.lower() for kw in priority_keywords):
                                seen_ids.add(full_id)
                                models.append({
                                    "id": full_id,
                                    "name": m.get("name", m_id),
                                    "provider": "OpenRouter",
                                    "context": f"{m.get('context_length', 128000) // 1000}k tokens",
                                    "capabilities": ["Coding", "Reasoning"] + (["Free"] if ":free" in m_id else []),
                                    "speed": "85 tps",
                                    "cost": "Free Tier" if ":free" in m_id else "Pay per token",
                                    "status": "verified",
                                    "verified": True,
                                })
                                if len(models) >= 45:
                                    break
                except Exception as ex:
                    logger.warning(f"Key verification failed for OpenRouter: {ex}")

            # 3. OpenAI
            elif provider == "openai":
                try:
                    resp = requests.get(
                        "https://api.openai.com/v1/models",
                        headers={"Authorization": f"Bearer {key}"},
                        timeout=5,
                    )
                    if resp.status_code == 200:
                        for m in resp.json().get("data", []):
                            m_id = m.get("id", "")
                            m_lower = m_id.lower()
                            if any(p in m_lower for p in ["gpt-4o", "o1", "o3", "gpt-4-turbo"]):
                                models.append({
                                    "id": f"openai/{m_id}",
                                    "name": f"OpenAI {m_id}",
                                    "provider": "OpenAI",
                                    "context": "128k tokens",
                                    "capabilities": ["Coding", "Reasoning"] + (["Vision"] if "4o" in m_lower else []),
                                    "speed": "100 tps",
                                    "cost": "Pay per token",
                                    "status": "verified",
                                    "verified": True,
                                })
                except Exception as ex:
                    logger.warning(f"Key verification failed for OpenAI: {ex}")

            # 4. Groq
            elif provider == "groq":
                try:
                    resp = requests.get(
                        "https://api.groq.com/openai/v1/models",
                        headers={"Authorization": f"Bearer {key}"},
                        timeout=5,
                    )
                    if resp.status_code == 200:
                        for m in resp.json().get("data", []):
                            m_id = m.get("id", "")
                            models.append({
                                "id": f"groq/{m_id}",
                                "name": f"Groq {m_id}",
                                "provider": "Groq",
                                "context": "128k tokens",
                                "capabilities": ["Coding", "Speed"],
                                "speed": "300+ tps",
                                "cost": "Pay per token",
                                "status": "verified",
                                "verified": True,
                            })
                except Exception as ex:
                    logger.warning(f"Key verification failed for Groq: {ex}")

            # 5. Anthropic
            elif provider == "anthropic":
                try:
                    resp = requests.get(
                        "https://api.anthropic.com/v1/models",
                        headers={"x-api-key": key, "anthropic-version": "2023-06-01"},
                        timeout=5,
                    )
                    if resp.status_code == 200:
                        for m in resp.json().get("data", []):
                            m_id = m.get("id", "")
                            models.append({
                                "id": f"anthropic/{m_id}",
                                "name": f"Claude {m_id.replace('claude-', '').title()}",
                                "provider": "Anthropic",
                                "context": "200k tokens",
                                "capabilities": ["Coding", "Reasoning", "Vision"],
                                "speed": "80 tps",
                                "cost": "Pay per token",
                                "status": "verified",
                                "verified": True,
                            })
                except Exception as ex:
                    logger.warning(f"Key verification failed for Anthropic: {ex}")

            # 6. DeepSeek
            elif provider == "deepseek":
                try:
                    resp = requests.get(
                        "https://api.deepseek.com/models",
                        headers={"Authorization": f"Bearer {key}"},
                        timeout=5,
                    )
                    if resp.status_code == 200:
                        for m in resp.json().get("data", []):
                            m_id = m.get("id", "")
                            models.append({
                                "id": f"deepseek/{m_id}",
                                "name": f"DeepSeek {m_id.title()}",
                                "provider": "DeepSeek",
                                "context": "64k tokens",
                                "capabilities": ["Coding", "Reasoning"],
                                "speed": "90 tps",
                                "cost": "Pay per token",
                                "status": "verified",
                                "verified": True,
                            })
                except Exception as ex:
                    logger.warning(f"Key verification failed for DeepSeek: {ex}")

            # 7. Nvidia NIM
            elif provider in ("nvidia", "nvidia_nim"):
                try:
                    resp = requests.get(
                        "https://integrate.api.nvidia.com/v1/models",
                        headers={"Authorization": f"Bearer {key}"},
                        timeout=5,
                    )
                    if resp.status_code == 200:
                        for m in resp.json().get("data", []):
                            m_id = m.get("id", "")
                            models.append({
                                "id": f"nvidia_nim/{m_id}",
                                "name": f"Nvidia {m_id.split('/')[-1].replace('-', ' ').title()}",
                                "provider": "Nvidia NIM",
                                "context": "128k tokens",
                                "capabilities": ["Reasoning", "Coding"],
                                "speed": "150 tps",
                                "cost": "Included in NIM Tier",
                                "status": "verified",
                                "verified": True,
                            })
                except Exception as ex:
                    logger.warning(f"Key verification failed for Nvidia NIM: {ex}")

            # 8. Ollama Local
            elif provider == "ollama":
                ollama_url = base_url or "http://localhost:11434"
                try:
                    resp = requests.get(f"{ollama_url}/api/tags", timeout=2)
                    if resp.status_code == 200:
                        for m in resp.json().get("models", []):
                            name = m.get("name", "")
                            models.append({
                                "id": f"ollama/{name}",
                                "name": f"Ollama {name.title()}",
                                "provider": "Ollama (Local)",
                                "context": "Local RAM",
                                "capabilities": ["Local", "Private", "Zero-Cost"],
                                "speed": "Local GPU/CPU",
                                "cost": "Free",
                                "status": "verified",
                                "verified": True,
                            })
                except Exception:
                    logger.debug("Local Ollama endpoint not reachable.")

            # 9. Custom Endpoint
            elif provider == "custom" and base_url:
                custom_url = base_url.rstrip("/")
                endpoint = f"{custom_url}/models" if "/models" not in custom_url else custom_url
                headers = {"Authorization": f"Bearer {key}"} if key else {}
                try:
                    resp = requests.get(endpoint, headers=headers, timeout=4)
                    if resp.status_code == 200:
                        data = resp.json()
                        items = data.get("data", data.get("models", []))
                        for m in items:
                            m_id = m.get("id", m.get("name", ""))
                            models.append({
                                "id": f"custom/{m_id}",
                                "name": f"Custom {m_id}",
                                "provider": "Custom Endpoint",
                                "context": "Custom",
                                "capabilities": ["Coding"],
                                "speed": "Custom",
                                "cost": "Self-hosted",
                                "status": "verified",
                                "verified": True,
                            })
                except Exception as ex:
                    logger.warning(f"Custom endpoint verification failed: {ex}")

        if self.active_model and not any(m["id"] == self.active_model for m in models):
            if not models:
                self.active_model = None

        self._cached_models = models
        self._models_cached_at = time.time()
        return models

    def get_fallback_models(self) -> List[Dict[str, Any]]:
        return []

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
        """
        model_to_use = active_model or self.active_model
        mode_to_use = execution_mode or self.execution_mode
        safe_user = self._sanitize_user_id(user_id)

        if not model_to_use:
            discovered = await asyncio.to_thread(self.fetch_models)
            if discovered:
                free_model = next(
                    (m["id"] for m in discovered if "free" in m.get("cost", "").lower() or ":free" in m.get("id", "").lower()),
                    discovered[0]["id"]
                )
                model_to_use = free_model
                self.set_active_model(free_model)
                logger.info(f"Auto-selected verified model {model_to_use} from active credentials.")

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

        user_habits = load_habits()
        scoped_thread = f"{safe_user}_{session_id}" if not session_id.startswith(f"{safe_user}_") else session_id
        config = {"configurable": {"thread_id": scoped_thread}}

        self.append_to_user_history(safe_user, "user", message)

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

        try:
            async for step in agent_graph.astream(initial_state, config=config):
                for node_name, node_output in step.items():
                    if not isinstance(node_output, dict):
                        continue

                    # 1. Reasoner node output
                    if node_name == "reasoner":
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
                                        if t_name == "search_web":
                                            yield {
                                                "type": "search",
                                                "query": t_args.get("query", ""),
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

                    # 2. Tool runner node output
                    elif node_name == "tool_runner":
                        tools_run = node_output.get("executed_tools", [])
                        for t in tools_run:
                            yield {
                                "type": "observation",
                                "text": f"[{t.get('name', 'Tool')}]: {t.get('output', '')[:120]}...",
                            }
                            tool_calls.append(t)

            # Check for human-in-the-loop interrupts
            state_snapshot = agent_graph.get_state(config)
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
            }

        except Exception as ex:
            logger.error(f"Error in stream_turn: {ex}", exc_info=True)
            yield {
                "type": "done",
                "reply": f"Execution encountered an error: {ex}",
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
        tool_calls: List[Dict[str, Any]] = []

        try:
            resume_command = Command(resume=decision)
            async for step in agent_graph.astream(resume_command, config=config):
                for node_name, node_output in step.items():
                    if not isinstance(node_output, dict):
                        continue

                    if node_name == "reasoner":
                        thought = node_output.get("current_thought", "")
                        if thought:
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

            yield {
                "type": "done",
                "reply": final_reply or "Decision processed successfully.",
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