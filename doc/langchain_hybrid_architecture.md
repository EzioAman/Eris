# Technical Specification: LangChain & LangGraph Hybrid Architecture for ERIS

## 1. Overview & Architectural Motivation

### Problem with Bespoke Custom REST Clients
Previously, ERIS used custom HTTP clients in `llm_client.py` (`_call_gemini_native` and `_call_openai_compatible`) with ad-hoc JSON conversion, custom `thoughtSignature` parameters, and manual error recovery.
- Google Gemini repeatedly changed parameters (thought signatures, system instructions, function declaration requirements), causing 400 Invalid Argument rejections and 60-second timeouts.
- Custom state management required manual conversion between LangChain message objects, OpenAI tool dictionaries, and Gemini candidate parts.

### Proposed Architecture: Native LangChain & LangGraph
Delegate model communication, token streaming, function calling schemas, and thought handling directly to official LangChain model providers:
- `ChatGoogleGenerativeAI` (`langchain-google-genai`): Officially maintained by Google & LangChain. Native handling of Gemini thinking tokens (`gemini-2.5-flash`, `gemini-3.8-flash`), function calling schemas, and token usage metadata.
- `ChatOpenAI` (`langchain-openai`): Officially maintained OpenAI client supporting OpenRouter, Groq, Ollama, DeepSeek, and custom base URLs.
- **LangGraph Hybrid State Graph**:
  - `reasoner`: Calls the active model bound with tools (`model.bind_tools(tools)`).
  - `approval_gate`: Enforces human confirmation before high-risk actions (`run_command`, `create_custom_tool`, `send_email`) via LangGraph's native `interrupt()`.
  - `tool_runner`: Executes pre-approved/safe tools and returns `ToolMessage`.
  - `runner.py`: Adapts LangGraph events directly into ERIS's SSE streaming contract (`turn_start`, `thought`, `action`, `observation`, `done`).

---

## 2. Model Factory & Vault Integration

```python
def get_langchain_model(model_name: str, api_key: str, base_url: Optional[str] = None, temperature: float = 0.2):
    """
    Dynamically instantiates official LangChain model wrapper configured with local SQLite credentials.
    """
    clean = model_name.strip()
    if clean.startswith("gemini/") or "gemini" in clean.lower():
        sub_name = clean.replace("gemini/", "")
        return ChatGoogleGenerativeAI(
            model=sub_name,
            google_api_key=api_key,
            temperature=temperature,
            timeout=25.0,
            max_retries=2,
        )
    else:
        provider, sub_name = _infer_provider(clean)
        resolved_base_url = base_url or PROVIDER_DEFAULT_BASE_URLS.get(provider)
        return ChatOpenAI(
            model=sub_name,
            api_key=api_key,
            base_url=resolved_base_url,
            temperature=temperature,
            timeout=25.0,
            max_retries=2,
        )
```

---

## 3. Vulnerability & Security Analysis

1. **Prompt Injection & Tool Hijacking**:
   - *Risk*: A malicious prompt or poisoned web scrape tricks the model into emitting destructive tool calls.
   - *Mitigation*: The `approval_gate` sits between the reasoner and actual execution. Destructive or shell actions cannot execute without explicit human approval.
2. **Credential Leakage**:
   - *Risk*: LLM output includes API keys in reasoning or tool arguments.
   - *Mitigation*: `scrub_sensitive_credentials` applied to all outgoing text and tool arguments before emission to frontend.
3. **Infinite Loop / Recursion Depth**:
   - *Risk*: Agent loops between tool calls and reasoner indefinitely.
   - *Mitigation*: LangGraph recursion limit (`recursion_limit=15`) and `MAX_REASONING_TURNS=8` hard exit.
4. **Timeouts & Graceful Exit**:
   - *Risk*: External API hangs indefinitely.
   - *Mitigation*: `timeout=25.0s`, `max_retries=2`. Catches `httpx.TimeoutException` or `google.api_core.exceptions.GoogleAPIError` and emits a clean user-facing error instead of an unhandled crash.
