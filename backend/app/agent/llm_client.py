import json
import logging
import os
import re
from typing import Any, Dict, List, Optional

from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_openai import ChatOpenAI
from langchain_core.messages import (
    AIMessage,
    HumanMessage,
    SystemMessage,
    ToolMessage,
    BaseMessage,
)

try:
    from app.config import settings
    from app.database import db_manager
    from app.services.vault_service import get_active_credentials_for_provider
except ImportError:
    from backend.app.config import settings
    from backend.app.database import db_manager
    from backend.app.services.vault_service import get_active_credentials_for_provider

logger = logging.getLogger("eris.agent.llm_client")


class FunctionCallWrapper:
    def __init__(self, name: str, arguments: str):
        self.name = name
        self.arguments = arguments


class ToolCallWrapper:
    def __init__(self, id: str, name: str, arguments: str, thought_signature: Optional[str] = None):
        self.id = id
        self.type = "function"
        self.function = FunctionCallWrapper(name, arguments)
        self.thought_signature = thought_signature


class MessageWrapper:
    def __init__(self, content: Optional[str] = None, tool_calls: Optional[List[ToolCallWrapper]] = None):
        self.content = content or ""
        self.tool_calls = tool_calls or []


class ChoiceWrapper:
    def __init__(self, message: MessageWrapper):
        self.message = message


class LLMResponse:
    """Normalized response matching standard completion choice structure."""
    def __init__(
        self,
        content: str = "",
        tool_calls: Optional[List[ToolCallWrapper]] = None,
        usage: Optional[Dict[str, int]] = None,
        model: Optional[str] = None,
    ):
        self.choices = [ChoiceWrapper(MessageWrapper(content=content, tool_calls=tool_calls))]
        self.usage = usage or {"prompt_tokens": 0, "completion_tokens": 0, "total_tokens": 0}
        self.model = model


def _infer_provider(model_name: str) -> tuple[str, str]:
    """Infers provider and stripped model name."""
    clean = model_name.strip()
    if clean.startswith("gemini/") or "gemini" in clean.lower():
        sub_name = clean.replace("gemini/", "")
        return "gemini", sub_name
    elif clean.startswith("openrouter/"):
        sub = clean[len("openrouter/"):]
        if sub in ("auto", "openrouter/auto"):
            return "openrouter", "openrouter/auto"
        return "openrouter", sub
    elif clean.startswith("groq/"):
        return "groq", clean.replace("groq/", "")
    elif clean.startswith("ollama/"):
        return "ollama", clean.replace("ollama/", "")
    elif clean.startswith("openai/"):
        return "openai", clean.replace("openai/", "")
    return "openrouter", clean


async def _resolve_api_key(provider: str, model_name: str) -> tuple[str, str]:
    """
    Fetches active credentials for provider STRICTLY from the local encrypted SQLite database vault.
    ERIS will never read or import LLM keys from the .env file.
    """
    api_key = ""
    base_url = ""

    try:
        if not db_manager.session_maker:
            await db_manager.initialize()
        async with db_manager.session_maker() as db:
            cred = await get_active_credentials_for_provider(db, provider, model_name)
            if cred and cred.get("api_key"):
                api_key = cred["api_key"]
                base_url = cred.get("base_url") or ""
    except Exception as ex:
        logger.warning(f"Could not read from API key vault: {ex}")

    return api_key, base_url


def get_chat_model(
    model_name: str,
    api_key: str,
    base_url: Optional[str] = None,
    temperature: float = 0.2,
    max_tokens: int = 2000,
    timeout: Optional[float] = None,
):
    """
    Factory creating native LangChain ChatModel instances configured with vault credentials.
    """
    provider, sub_name = _infer_provider(model_name)
    eff_timeout = timeout if timeout is not None else 25.0

    if provider == "gemini":
        return ChatGoogleGenerativeAI(
            model=sub_name,
            google_api_key=api_key,
            temperature=temperature,
            max_output_tokens=max_tokens,
            timeout=eff_timeout,
            max_retries=2,
        )
    else:
        resolved_base = base_url
        if not resolved_base:
            if provider == "openrouter":
                resolved_base = "https://openrouter.ai/api/v1"
            elif provider == "groq":
                resolved_base = "https://api.groq.com/openai/v1"
            elif provider == "ollama":
                resolved_base = "http://127.0.0.1:11434/v1"

        return ChatOpenAI(
            model=sub_name,
            api_key=api_key or "sk-placeholder-local",
            base_url=resolved_base,
            temperature=temperature,
            max_tokens=max_tokens,
            timeout=eff_timeout,
            max_retries=2,
        )


async def acompletion(
    model: str,
    messages: List[Dict[str, Any]],
    tools: Optional[List[Dict[str, Any]]] = None,
    temperature: float = 0.2,
    max_tokens: int = 2000,
    api_key: Optional[str] = None,
    base_url: Optional[str] = None,
    timeout: Optional[float] = None,
    **kwargs: Any,
) -> LLMResponse:
    """
    Executes a model completion turn via official LangChain model wrappers.
    Translates input messages to LangChain objects, executes tool-bound model call,
    and returns normalized LLMResponse.
    """
    provider, sub_model = _infer_provider(model)
    resolved_api_key = api_key
    resolved_base_url = base_url
    if not resolved_api_key:
        resolved_api_key, resolved_base_url = await _resolve_api_key(provider, sub_model)

    if not resolved_api_key and provider != "ollama":
        raise ValueError(
            f"No active API key found for provider '{provider}'. "
            "Please configure your credentials in Settings > API Key Vault."
        )

    chat_model = get_chat_model(
        model_name=model,
        api_key=resolved_api_key,
        base_url=resolved_base_url,
        temperature=temperature,
        max_tokens=max_tokens,
        timeout=timeout,
    )

    # Convert dictionary messages to LangChain BaseMessage objects
    lc_messages: List[BaseMessage] = []
    for m in messages:
        role = m.get("role")
        content = m.get("content", "")
        if role == "system":
            lc_messages.append(SystemMessage(content=str(content)))
        elif role == "user":
            lc_messages.append(HumanMessage(content=str(content)))
        elif role == "assistant":
            raw_tcs = m.get("tool_calls", [])
            converted_tcs = []
            for tc in raw_tcs:
                fn = tc.get("function", {})
                converted_tcs.append({
                    "id": tc.get("id", "call_0"),
                    "name": fn.get("name", tc.get("name", "")),
                    "args": json.loads(fn.get("arguments", "{}")) if isinstance(fn.get("arguments"), str) else fn.get("arguments", {}),
                })
            lc_messages.append(AIMessage(content=str(content), tool_calls=converted_tcs))
        elif role == "tool":
            lc_messages.append(
                ToolMessage(
                    content=str(content),
                    tool_call_id=m.get("tool_call_id", "call_0"),
                    name=m.get("name", "tool"),
                )
            )
        else:
            lc_messages.append(HumanMessage(content=str(content)))

    # Bind tools if provided
    if tools:
        model_runnable = chat_model.bind_tools(tools)
    else:
        model_runnable = chat_model

    ai_msg: AIMessage = await model_runnable.ainvoke(lc_messages)

    # Extract parsed tool calls
    parsed_tool_calls: List[ToolCallWrapper] = []
    if hasattr(ai_msg, "tool_calls") and ai_msg.tool_calls:
        for idx, tc in enumerate(ai_msg.tool_calls):
            fn_name = tc.get("name", "")
            fn_args = tc.get("args", {})
            args_str = json.dumps(fn_args) if isinstance(fn_args, (dict, list)) else str(fn_args)
            thought_sig = getattr(tc, "thought_signature", None) or tc.get("thought_signature")
            parsed_tool_calls.append(
                ToolCallWrapper(
                    id=tc.get("id") or f"call_{idx}",
                    name=fn_name,
                    arguments=args_str,
                    thought_signature=thought_sig,
                )
            )

    # Extract token usage metadata
    token_usage = {"prompt_tokens": 0, "completion_tokens": 0, "total_tokens": 0}
    if hasattr(ai_msg, "usage_metadata") and ai_msg.usage_metadata:
        um = ai_msg.usage_metadata
        token_usage = {
            "prompt_tokens": um.get("input_tokens", 0),
            "completion_tokens": um.get("output_tokens", 0),
            "total_tokens": um.get("total_tokens", 0),
        }
    elif hasattr(ai_msg, "response_metadata") and ai_msg.response_metadata:
        rm = ai_msg.response_metadata
        usage = rm.get("token_usage") or rm.get("usage") or {}
        if usage:
            token_usage = {
                "prompt_tokens": usage.get("prompt_tokens", 0),
                "completion_tokens": usage.get("completion_tokens", 0),
                "total_tokens": usage.get("total_tokens", 0),
            }

    raw_content = ai_msg.content
    if isinstance(raw_content, list):
        # Extract text blocks from complex content parts
        content_text = ""
        for part in raw_content:
            if isinstance(part, dict) and part.get("type") == "text":
                content_text += part.get("text", "")
            elif isinstance(part, str):
                content_text += part
        raw_content = content_text
    else:
        raw_content = str(raw_content or "")

    return LLMResponse(
        content=raw_content,
        tool_calls=parsed_tool_calls,
        usage=token_usage,
        model=model,
    )
