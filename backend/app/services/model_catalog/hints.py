import json
import logging
from pathlib import Path
from typing import Any, Dict

logger = logging.getLogger("eris.services.model_catalog.hints")

# Built-in fallback hints in case config file is unavailable
DEFAULT_HINTS: Dict[str, Dict[str, Any]] = {
    "groq": {
        "features": ["Groq LPU Hardware Acceleration"],
        "capabilities": ["Coding", "Speed"],
    },
    "gemini": {
        "features": ["Google Cloud AI Infrastructure"],
        "capabilities": ["Coding", "Reasoning", "Vision", "Audio"],
    },
    "anthropic": {
        "features": ["Constitutional AI Guardrails"],
        "capabilities": ["Coding", "Reasoning", "Vision"],
    },
    "deepseek": {
        "features": ["DeepSeek Sparse MoE"],
        "capabilities": ["Coding", "Reasoning"],
    },
    "openai": {
        "features": ["OpenAI Supercomputing Cluster"],
        "capabilities": ["Coding", "Reasoning"],
    },
    "nvidia": {
        "features": ["Nvidia TensorRT-LLM Acceleration"],
        "capabilities": ["Reasoning", "Coding"],
    },
    "ollama": {
        "features": ["On-Device Local Inference"],
        "capabilities": ["Local", "Private", "Zero-Cost"],
    },
    "openrouter": {
        "features": ["Multi-Cloud Dynamic Routing"],
        "capabilities": ["Coding", "Reasoning"],
    },
}

_cached_hints: Dict[str, Any] = {}
_last_mtime: float = 0.0


def get_hints_config_path() -> Path:
    """Resolves path to model_hints.json configuration file."""
    return Path(__file__).resolve().parent.parent.parent / "config" / "model_hints.json"


def load_model_hints() -> Dict[str, Dict[str, Any]]:
    """
    Loads external model capability hints from config file with hot-reload support.
    Checks file mtime; if modified, reloads without application restart.
    Falls back gracefully to DEFAULT_HINTS if file is missing or malformed.
    """
    global _cached_hints, _last_mtime
    config_path = get_hints_config_path()

    if not config_path.exists():
        return DEFAULT_HINTS

    try:
        current_mtime = config_path.stat().st_mtime
        if _cached_hints and current_mtime == _last_mtime:
            return _cached_hints

        data = json.loads(config_path.read_text(encoding="utf-8"))
        hints = data.get("hints", DEFAULT_HINTS)
        _cached_hints = hints
        _last_mtime = current_mtime
        return hints
    except Exception as ex:
        logger.warning(f"Failed to load model_hints.json, using built-in defaults: {ex}")
        return DEFAULT_HINTS


def get_hints_for_model(provider: str, model_id: str) -> Dict[str, Any]:
    """Retrieves features and capability hints matching a given provider or model ID."""
    all_hints = load_model_hints()
    prov_lower = provider.lower()
    mid_lower = model_id.lower()

    for key, spec in all_hints.items():
        match_pattern = spec.get("match", key).lower()
        if match_pattern in prov_lower or match_pattern in mid_lower:
            return spec

    return {"features": [], "capabilities": ["Coding"]}
