"""
Model Provider Testing & Capability Analysis Harness
Ported and Fortified from ErisCore in eris_cli.py

Tests active model providers (Gemini, Nvidia NIM, OpenRouter) and inspects what their API exposes:
- Capabilities (Coding, Vision, Audio, Reasoning / Thinking, Free Tier)
- Context length (Token limit)
- Pricing and Modalities
"""

import os
import sys
import json
from typing import List, Dict, Any, Optional
import urllib.request
import urllib.error
from dotenv import load_dotenv

load_dotenv()

def fetch_json(url: str, headers: Optional[Dict[str, str]] = None, timeout: int = 6) -> Optional[Dict[str, Any]]:
    req = urllib.request.Request(url, headers=headers or {})
    try:
        with urllib.request.urlopen(req, timeout=timeout) as response:
            if response.status == 200:
                data = response.read().decode('utf-8')
                return json.loads(data)
    except Exception as e:
        print(f"Notice: Failed to fetch {url}: {e}", file=sys.stderr)
    return None

def test_gemini_models(api_key: Optional[str]) -> List[Dict[str, Any]]:
    models = []
    if not api_key:
        return models

    url = f"https://generativelanguage.googleapis.com/v1beta/models?key={api_key}"
    data = fetch_json(url)
    if not data or "models" not in data:
        return models

    for m in data.get("models", []):
        methods = m.get("supportedGenerationMethods", [])
        if "generateContent" in methods:
            name = m.get("name", "").replace("models/", "")
            display_name = m.get("displayName", name)
            input_limit = m.get("inputTokenLimit", 32768)
            output_limit = m.get("outputTokenLimit", 8192)
            
            capabilities = ["Coding"]
            name_lower = name.lower()
            if any(k in name_lower for k in ["flash", "pro", "gemini-2", "gemini-3"]):
                capabilities.extend(["Vision", "Audio", "Free"])
            if any(k in name_lower for k in ["thinking", "reasoning", "2.0-flash-thinking", "exp"]):
                capabilities.append("Thinking")

            models.append({
                "id": f"gemini/{name}",
                "name": display_name,
                "model_key": name,
                "provider": "Gemini",
                "context_window": input_limit,
                "max_output": output_limit,
                "pricing": "Free Tier",
                "is_free": True,
                "has_thinking": "Thinking" in capabilities,
                "capabilities": list(dict.fromkeys(capabilities)),
                "description": m.get("description", "Google Gemini foundational multimodal model.")
            })
    return models

def test_nvidia_nim_models(api_key: Optional[str]) -> List[Dict[str, Any]]:
    models = []
    if not api_key:
        return models

    url = "https://integrate.api.nvidia.com/v1/models"
    headers = {"Authorization": f"Bearer {api_key}"}
    data = fetch_json(url, headers=headers)
    if not data or "data" not in data:
        return models

    for m in data.get("data", []):
        mid = m.get("id", "")
        mid_lower = mid.lower()
        capabilities = []
        if any(k in mid_lower for k in ["r1", "reasoning", "thinking", "reason"]):
            capabilities.append("Thinking")
        if any(k in mid_lower for k in ["code", "coder", "devstral", "codestral"]):
            capabilities.append("Coding")
        if any(k in mid_lower for k in ["vision", "neva", "kosmos", "fuyu", "paligemma"]):
            capabilities.append("Vision")

        models.append({
            "id": f"nvidia_nim/{mid}",
            "name": mid,
            "model_key": mid,
            "provider": "Nvidia NIM",
            "context_window": 32768,
            "max_output": 4096,
            "pricing": "NIM Credits",
            "is_free": False,
            "has_thinking": "Thinking" in capabilities,
            "capabilities": list(dict.fromkeys(capabilities or ["LLM"])),
            "description": "Nvidia NIM containerized microservice model."
        })
    return models

def test_openrouter_models(api_key: Optional[str]) -> List[Dict[str, Any]]:
    models = []
    url = "https://openrouter.ai/api/v1/models"
    headers = {"Authorization": f"Bearer {api_key}"} if api_key else {}
    data = fetch_json(url, headers=headers, timeout=8)
    if not data or "data" not in data:
        return models

    for m in data.get("data", []):
        mid = m.get("id", "")
        name = m.get("name", mid)
        desc = m.get("description", "")
        pricing = m.get("pricing", {})
        arch = m.get("architecture", {})
        ctx = m.get("context_length", 32768)

        capabilities = []
        is_free = False
        try:
            prompt_p = float(pricing.get("prompt", 1))
            if prompt_p == 0 or ":free" in mid:
                is_free = True
        except Exception:
            if ":free" in mid:
                is_free = True

        if is_free:
            capabilities.append("Free")

        modalities = arch.get("input_modalities", [])
        if "image" in modalities or "image" in arch.get("modality", ""):
            capabilities.append("Vision")
        if "audio" in modalities:
            capabilities.append("Audio")
        if any(k in mid.lower() for k in ["r1", "thinking", "reasoning", "o1", "o3", "deepseek-r1"]):
            capabilities.append("Thinking")
        if any(k in mid.lower() for k in ["coder", "code", "devstral", "sonnet", "claude"]):
            capabilities.append("Coding")

        models.append({
            "id": f"openrouter/{mid}",
            "name": name,
            "model_key": mid,
            "provider": "OpenRouter",
            "context_window": ctx,
            "max_output": 8192,
            "pricing": "Free" if is_free else f"${float(pricing.get('prompt', 0))*1000000:.2f}/1M tokens",
            "is_free": is_free,
            "has_thinking": "Thinking" in capabilities,
            "capabilities": list(dict.fromkeys(capabilities or ["General"])),
            "description": desc
        })
    return models

def run_provider_catalog_test() -> Dict[str, Any]:
    gemini_key = os.getenv("GEMINI_API_KEY")
    nvidia_key = os.getenv("NVIDIA_API_KEY")
    openrouter_key = os.getenv("OPENROUTER_API_KEY")

    gemini_models = test_gemini_models(gemini_key)
    nvidia_models = test_nvidia_nim_models(nvidia_key)
    openrouter_models = test_openrouter_models(openrouter_key)

    all_models = gemini_models + nvidia_models + openrouter_models

    summary = {
        "providers_checked": {
            "gemini": bool(gemini_key),
            "nvidia_nim": bool(nvidia_key),
            "openrouter": bool(openrouter_key),
        },
        "total_models": len(all_models),
        "free_models_count": sum(1 for m in all_models if m.get("is_free")),
        "thinking_models_count": sum(1 for m in all_models if m.get("has_thinking")),
        "models": all_models
    }
    return summary

if __name__ == "__main__":
    result = run_provider_catalog_test()
    print(json.dumps(result, indent=2))
