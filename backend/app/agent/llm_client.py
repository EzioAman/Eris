import asyncio
import json
import logging
import os
import random
import re
import time
from typing import Any, AsyncGenerator, Dict, List, Optional

from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_openai import ChatOpenAI
from langchain_core.messages import (
    AIMessage,
    AIMessageChunk,
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

_THOUGHT_OPEN_RE = re.compile(r"<(?:think|thought|thinking|reasoning)>", re.IGNORECASE)
_THOUGHT_CLOSE_RE = re.compile(r"</(?:think|thought|thinking|reasoning)>", re.IGNORECASE)


def is_quota_exhaustion_error(error: Exception) -> bool:
    """
    Identifies hard quota limits, rate limit exhaustion, 404 deprecated models, and HTTP 429 codes.
    When True, retries are skipped and the agent fails over immediately.
    """
    err_str = str(error).lower()
    status_code = getattr(error, "status_code", None) or getattr(error, "code", None)
    if status_code in (429, "429", "RESOURCE_EXHAUSTED", 404, "404"):
        return True
    exhaustion_keywords = (
        "429",
        "resource_exhausted",
        "resourceexhausted",
        "quota",
        "rate limit",
        "ratelimit",
        "too many requests",
        "exceeded your current quota",
        "insufficient_quota",
        "tokens per minute",
        "requests per day",
        "no longer available",
        "not found",
        "not_found",
    )
    return any(k in err_str for k in exhaustion_keywords)


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
    def __init__(
        self,
        content: Optional[str] = None,
        tool_calls: Optional[List[ToolCallWrapper]] = None,
        reasoning_content: Optional[str] = None,
    ):
        self.content = content or ""
        self.tool_calls = tool_calls or []
        self.reasoning_content = reasoning_content or ""


class ChoiceWrapper:
    def __init__(self, message: MessageWrapper):
        self.message = message


class LLMResponse:
    """Normalized response matching standard completion choice structure with latency metadata."""
    def __init__(
        self,
        content: str = "",
        tool_calls: Optional[List[ToolCallWrapper]] = None,
        usage: Optional[Dict[str, int]] = None,
        model: Optional[str] = None,
        ttft_ms: Optional[float] = None,
        prompt_chars: int = 0,
        tool_schema_chars: int = 0,
        reasoning_content: Optional[str] = None,
    ):
        self.choices = [ChoiceWrapper(MessageWrapper(content=content, tool_calls=tool_calls, reasoning_content=reasoning_content))]
        self.usage = usage or {"prompt_tokens": 0, "completion_tokens": 0, "total_tokens": 0}
        self.model = model
        self.ttft_ms = ttft_ms
        self.prompt_chars = prompt_chars
        self.tool_schema_chars = tool_schema_chars


def _infer_provider(model_name: str) -> tuple[str, str]:
    """Infers provider and stripped model name across all supported backends."""
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
    elif clean.startswith("nvidia/") or clean.startswith("nvidia_nim/"):
        sub = clean.split("/", 1)[1] if "/" in clean else clean
        return "nvidia", sub
    elif clean.startswith("anthropic/"):
        return "anthropic", clean.replace("anthropic/", "")
    elif clean.startswith("deepseek/"):
        return "deepseek", clean.replace("deepseek/", "")
    return "openrouter", clean


async def _resolve_api_key(provider: str, model_name: str) -> tuple[str, str]:
    """
    Fetches active credentials for provider from the local encrypted vault,
    with automatic fallback to environment settings if vault is uninitialized.
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

    if not api_key:
        p_lower = provider.lower().strip()
        env_map = {
            "gemini": ["GEMINI_API_KEY", "GOOGLE_API_KEY"],
            "openrouter": ["OPENROUTER_API_KEY"],
            "openai": ["OPENAI_API_KEY"],
            "groq": ["GROQ_API_KEY"],
            "nvidia": ["NVIDIA_API_KEY", "NVIDIA_NIM_API_KEY"],
            "nvidia_nim": ["NVIDIA_API_KEY", "NVIDIA_NIM_API_KEY"],
            "anthropic": ["ANTHROPIC_API_KEY"],
            "deepseek": ["DEEPSEEK_API_KEY"],
        }
        for env_var in env_map.get(p_lower, []):
            val = getattr(settings, env_var, None) or os.getenv(env_var, "")
            if val and val.strip():
                api_key = val.strip()
                break

    return api_key, base_url


def get_chat_model(
    model_name: str,
    api_key: str,
    base_url: Optional[str] = None,
    temperature: float = 0.2,
    max_tokens: int = 4096,
    timeout: Optional[float] = None,
    enable_thinking: bool = False,
):
    """
    Factory creating native LangChain ChatModel instances configured with vault credentials.
    Passes max_retries=0 to underlying client so that ERIS's outer retry loop explicitly
    controls retry behavior: retrying transient errors up to 2 times, and failing fast (0 retries)
    only when quota/rate-limit exhaustion is encountered.
    """
    provider, sub_name = _infer_provider(model_name)
    eff_timeout = timeout if timeout is not None else 25.0

    if provider == "gemini":
        gemini_kwargs: Dict[str, Any] = {}
        if enable_thinking:
            gemini_kwargs["thinking_budget"] = 2048  # or -1 for dynamic budget
            gemini_kwargs["include_thoughts"] = True

        return ChatGoogleGenerativeAI(
            model=sub_name,
            google_api_key=api_key,
            temperature=temperature,
            max_output_tokens=max_tokens,
            timeout=eff_timeout,
            max_retries=0,
            **gemini_kwargs,
        )
    else:
        resolved_base = base_url
        if not resolved_base:
            base_url_map = {
                "openrouter": "https://openrouter.ai/api/v1",
                "groq": "https://api.groq.com/openai/v1",
                "ollama": "http://127.0.0.1:11434/v1",
                "nvidia": "https://integrate.api.nvidia.com/v1",
                "nvidia_nim": "https://integrate.api.nvidia.com/v1",
                "openai": "https://api.openai.com/v1",
                "deepseek": "https://api.deepseek.com/v1",
            }
            resolved_base = base_url_map.get(provider)

        extra_body: Dict[str, Any] = {}
        if enable_thinking:
            if provider == "openrouter":
                extra_body["reasoning"] = {"effort": "high"}
            elif provider == "openai":
                extra_body["reasoning_effort"] = "high"
            elif provider == "groq":
                extra_body["reasoning_format"] = "parsed"

        chat_kwargs: Dict[str, Any] = {}
        if extra_body:
            chat_kwargs["extra_body"] = extra_body

        return ChatOpenAI(
            model=sub_name,
            api_key=api_key or "sk-placeholder-local",
            base_url=resolved_base,
            temperature=temperature,
            max_tokens=max_tokens,
            timeout=eff_timeout,
            max_retries=0,
            **chat_kwargs,
        )


async def _prepare_stream_call(
    model: str,
    messages: List[Dict[str, Any]],
    tools: Optional[List[Dict[str, Any]]],
    temperature: float,
    max_tokens: int,
    api_key: Optional[str],
    base_url: Optional[str],
    timeout: Optional[float],
    enable_thinking: bool,
    kwargs: Dict[str, Any],
):
    """Shared setup for both acompletion and astream_completion: resolves credentials,
    builds the chat model, converts messages, and assembles run/trace config."""
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
        enable_thinking=enable_thinking,
    )

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

    if tools:
        model_runnable = chat_model.bind_tools(tools)
    else:
        model_runnable = chat_model

    prompt_chars = sum(len(str(getattr(m, "content", ""))) for m in lc_messages)
    tool_schema_chars = len(json.dumps(tools)) if tools else 0
    trace_metadata = kwargs.get("trace_metadata") or {}
    trace_tags = kwargs.get("trace_tags") or [f"provider:{provider}", f"model:{sub_model}"]

    run_meta = {
        "provider": provider,
        "model": sub_model,
        "prompt_chars": prompt_chars,
        "message_count": len(lc_messages),
        "tool_count": len(tools or []),
        "tool_schema_chars": tool_schema_chars,
    }
    run_meta.update(trace_metadata)

    run_config = {
        "metadata": run_meta,
        "tags": trace_tags,
        "run_name": f"llm_{provider}_{sub_model}",
    }

    return model_runnable, lc_messages, run_config, prompt_chars, tool_schema_chars


def _extract_delta_text(chunk_content: Any) -> tuple[str, str]:
    """Splits a raw chunk's content into (visible_text_delta, structured_reasoning_delta).
    Structured reasoning here means providers (e.g. Gemini w/ include_thoughts) that return
    reasoning as separate 'thinking' content parts rather than inline <think> tags."""
    if chunk_content is None:
        return "", ""
    if isinstance(chunk_content, str):
        return chunk_content, ""
    if isinstance(chunk_content, list):
        text = ""
        thinking = ""
        for part in chunk_content:
            if isinstance(part, dict):
                if part.get("type") == "text":
                    text += part.get("text", "")
                elif part.get("type") == "thinking":
                    thinking += part.get("thinking", "")
            elif isinstance(part, str):
                text += part
        return text, thinking
    return "", ""


def _finalize_ai_message(ai_msg, model, prompt_chars, tool_schema_chars, ttft_ms) -> "LLMResponse":
    """Builds a normalized LLMResponse from a fully-merged AIMessageChunk."""
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
    reasoning_text = (
        ai_msg.additional_kwargs.get("reasoning_content")
        or ai_msg.additional_kwargs.get("reasoning")
        or getattr(ai_msg, "reasoning_content", None)
        or getattr(ai_msg, "reasoning", None)
        or ""
    )
    if not reasoning_text and isinstance(raw_content, list):
        thought_parts = [
            p.get("thinking", "") for p in raw_content
            if isinstance(p, dict) and p.get("type") == "thinking"
        ]
        if thought_parts:
            reasoning_text = "\n\n".join(thought_parts).strip()
    if isinstance(reasoning_text, str):
        reasoning_text = reasoning_text.strip()
    else:
        reasoning_text = ""

    if isinstance(raw_content, list):
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
        ttft_ms=ttft_ms,
        prompt_chars=prompt_chars,
        tool_schema_chars=tool_schema_chars,
        reasoning_content=reasoning_text,
    )


async def acompletion(
    model: str,
    messages: List[Dict[str, Any]],
    tools: Optional[List[Dict[str, Any]]] = None,
    temperature: float = 0.2,
    max_tokens: int = 4096,
    api_key: Optional[str] = None,
    base_url: Optional[str] = None,
    timeout: Optional[float] = None,
    enable_thinking: bool = False,
    **kwargs: Any,
) -> LLMResponse:
    """
    Executes a model completion turn via official LangChain model wrappers and returns
    only the final, fully-assembled response. Unchanged in behavior/signature from before.
    For token-level streaming to a caller, use astream_completion instead.
    """
    model_runnable, lc_messages, run_config, prompt_chars, tool_schema_chars = await _prepare_stream_call(
        model, messages, tools, temperature, max_tokens, api_key, base_url, timeout, enable_thinking, kwargs
    )

    max_retries = 2
    ai_msg: Optional[AIMessage] = None
    last_ex: Optional[Exception] = None
    ttft_ms: Optional[float] = None

    for attempt in range(1, max_retries + 2):
        try:
            combined_msg: Optional[AIMessageChunk] = None
            first_chunk_at: Optional[float] = None
            stream_start = time.perf_counter()

            async for chunk in model_runnable.astream(lc_messages, config=run_config):
                if first_chunk_at is None and (getattr(chunk, "content", None) or getattr(chunk, "tool_call_chunks", None)):
                    first_chunk_at = time.perf_counter()
                if combined_msg is None:
                    combined_msg = chunk
                else:
                    try:
                        combined_msg = combined_msg + chunk
                    except Exception as merge_ex:
                        logger.warning(
                            f"Chunk merge failed for model '{model}', skipping malformed chunk: {merge_ex}",
                            exc_info=True,
                        )
                        continue

            ttft_ms = round(((first_chunk_at or time.perf_counter()) - stream_start) * 1000.0, 2)
            ai_msg = combined_msg or AIMessage(content="")
            break
        except Exception as ex:
            last_ex = ex
            if is_quota_exhaustion_error(ex):
                logger.warning(
                    f"Model '{model}' returned quota exhaustion / 429 ({ex}). "
                    f"Failing fast to dynamic vault fallback without retry delay."
                )
                raise ex
            if attempt <= max_retries:
                backoff = 0.5 * (2 ** (attempt - 1)) + random.uniform(0.1, 0.3)
                logger.warning(
                    f"Model '{model}' encountered transient error ({ex}). "
                    f"Retrying attempt {attempt}/{max_retries} in {backoff:.2f}s...",
                    exc_info=True,
                )
                await asyncio.sleep(backoff)
            else:
                logger.warning(f"Model '{model}' failed after {max_retries} retries: {ex}", exc_info=True)
                raise ex

    if ai_msg is None:
        raise last_ex or RuntimeError(f"Model '{model}' execution yielded no message.")

    return _finalize_ai_message(ai_msg, model, prompt_chars, tool_schema_chars, ttft_ms)


async def astream_completion(
    model: str,
    messages: List[Dict[str, Any]],
    tools: Optional[List[Dict[str, Any]]] = None,
    temperature: float = 0.2,
    max_tokens: int = 4096,
    api_key: Optional[str] = None,
    base_url: Optional[str] = None,
    timeout: Optional[float] = None,
    enable_thinking: bool = False,
    **kwargs: Any,
) -> AsyncGenerator[Dict[str, Any], None]:
    """
    Async-generator variant of acompletion. Yields incremental events as the provider
    streams tokens back, so callers (LangGraph nodes) can forward them to the frontend
    in real time instead of waiting for the full completion:

      {"type": "content_delta", "text": "..."}   - visible answer text, as it arrives
      {"type": "reasoning_delta", "text": "..."} - <think>/reasoning text, as it arrives
      {"type": "final", "response": LLMResponse} - the fully assembled response, always
                                                     the last item yielded, exactly once

    Inline <think>/<thought>/<thinking>/<reasoning> tags in the visible text stream are
    split out into reasoning_delta events as they close, same as structured provider
    reasoning (e.g. Gemini include_thoughts). A tag split exactly across a chunk boundary
    is a known, low-impact edge case (matches the original per-chunk detection approach).

    Retry/fail-fast semantics for transient errors and quota exhaustion match acompletion.
    """
    model_runnable, lc_messages, run_config, prompt_chars, tool_schema_chars = await _prepare_stream_call(
        model, messages, tools, temperature, max_tokens, api_key, base_url, timeout, enable_thinking, kwargs
    )

    max_retries = 2
    ai_msg: Optional[AIMessage] = None
    last_ex: Optional[Exception] = None
    ttft_ms: Optional[float] = None

    for attempt in range(1, max_retries + 2):
        inside_think = False

        def _route_thinking_segments(text: str) -> List[tuple[str, str]]:
            nonlocal inside_think
            segments: List[tuple[str, str]] = []
            remaining = text
            while remaining:
                if not inside_think:
                    m = _THOUGHT_OPEN_RE.search(remaining)
                    if m:
                        before = remaining[:m.start()]
                        if before:
                            segments.append(("content_delta", before))
                        inside_think = True
                        remaining = remaining[m.end():]
                    else:
                        segments.append(("content_delta", remaining))
                        remaining = ""
                else:
                    m = _THOUGHT_CLOSE_RE.search(remaining)
                    if m:
                        before = remaining[:m.start()]
                        if before:
                            segments.append(("reasoning_delta", before))
                        inside_think = False
                        remaining = remaining[m.end():]
                    else:
                        segments.append(("reasoning_delta", remaining))
                        remaining = ""
            return segments

        try:
            combined_msg: Optional[AIMessageChunk] = None
            first_chunk_at: Optional[float] = None
            stream_start = time.perf_counter()

            async for chunk in model_runnable.astream(lc_messages, config=run_config):
                has_signal = getattr(chunk, "content", None) or getattr(chunk, "tool_call_chunks", None)
                if first_chunk_at is None and has_signal:
                    first_chunk_at = time.perf_counter()

                text_delta, structured_reasoning = _extract_delta_text(getattr(chunk, "content", None))
                if structured_reasoning:
                    yield {"type": "reasoning_delta", "text": structured_reasoning}
                if text_delta:
                    for seg_type, seg_text in _route_thinking_segments(text_delta):
                        if seg_text:
                            yield {"type": seg_type, "text": seg_text}

                if combined_msg is None:
                    combined_msg = chunk
                else:
                    try:
                        combined_msg = combined_msg + chunk
                    except Exception as merge_ex:
                        logger.warning(
                            f"Chunk merge failed for model '{model}', skipping malformed chunk: {merge_ex}",
                            exc_info=True,
                        )
                        continue

            ttft_ms = round(((first_chunk_at or time.perf_counter()) - stream_start) * 1000.0, 2)
            ai_msg = combined_msg or AIMessage(content="")
            break
        except Exception as ex:
            last_ex = ex
            if is_quota_exhaustion_error(ex):
                logger.warning(
                    f"Model '{model}' returned quota exhaustion / 429 ({ex}). "
                    f"Failing fast to dynamic vault fallback without retry delay."
                )
                raise ex
            if attempt <= max_retries:
                backoff = 0.5 * (2 ** (attempt - 1)) + random.uniform(0.1, 0.3)
                logger.warning(
                    f"Model '{model}' encountered transient error ({ex}). "
                    f"Retrying attempt {attempt}/{max_retries} in {backoff:.2f}s...",
                    exc_info=True,
                )
                await asyncio.sleep(backoff)
            else:
                logger.warning(f"Model '{model}' failed after {max_retries} retries: {ex}", exc_info=True)
                raise ex

    if ai_msg is None:
        raise last_ex or RuntimeError(f"Model '{model}' execution yielded no message.")

    final_response = _finalize_ai_message(ai_msg, model, prompt_chars, tool_schema_chars, ttft_ms)
    yield {"type": "final", "response": final_response}