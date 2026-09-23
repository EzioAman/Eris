# LiteLLM Integration & Asynchronous Streaming Architecture

## 1. Overview
LiteLLM serves as a unified abstraction layer over multiple LLM providers (Google Gemini, Nvidia NIM, OpenRouter, Anthropic, OpenAI, etc.). It translates standard OpenAI-compatible requests and streaming chunks to/from provider-specific protocols.

## 2. Asynchronous Streaming (`acompletion`)
LiteLLM provides `litellm.acompletion` for non-blocking asynchronous streaming inside `asyncio` event loops.

### Syntax
```python
from litellm import acompletion

response = await acompletion(
    model="openrouter/meta-llama/llama-3.3-70b-instruct:free",
    messages=[{"role": "user", "content": "Hello"}],
    stream=True,
    api_key="sk-or-v1-..."
)

async for chunk in response:
    content = chunk.choices[0].delta.content
    if content:
        print(content, end="", flush=True)
```

## 3. Provider Prefix Conventions
- **OpenRouter**: `openrouter/<model-id>` (e.g. `openrouter/anthropic/claude-3.5-sonnet`)
- **Gemini**: `gemini/<model-id>` (e.g. `gemini/gemini-1.5-flash`)
- **Nvidia NIM**: `nvidia_nim/<model-id>` (e.g. `nvidia_nim/meta/llama-3.1-70b-instruct`)

## 4. Key Configuration Flags
- `litellm.suppress_debug_info = True`: Disables standard logging spam in production/TUI environments.
- `litellm.drop_params = True`: Automatically strips unsupported parameters across different backends.
