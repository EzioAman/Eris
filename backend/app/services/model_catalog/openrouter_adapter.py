import logging
from typing import List, Optional
import requests

try:
    from app.schemas.models import (
        ModelCatalogItem,
        compute_context_tier,
        format_context_display,
    )
    from app.services.model_catalog.base import ProviderAdapter
    from app.services.model_catalog.hints import get_hints_for_model
except ImportError:
    from backend.app.schemas.models import (
        ModelCatalogItem,
        compute_context_tier,
        format_context_display,
    )
    from backend.app.services.model_catalog.base import ProviderAdapter
    from backend.app.services.model_catalog.hints import get_hints_for_model

logger = logging.getLogger("eris.services.model_catalog.openrouter")


def _format_openrouter_cost(pricing: dict, model_id: str) -> str:
    """Formats OpenRouter pricing into readable per-token cost without fabricated labels."""
    if ":free" in model_id:
        return "Free Tier"
    prompt_price = pricing.get("prompt")
    completion_price = pricing.get("completion")
    try:
        if prompt_price and float(prompt_price) == 0.0 and completion_price and float(completion_price) == 0.0:
            return "Free Tier"
        if prompt_price and float(prompt_price) > 0:
            # Format per million tokens (standard LLM pricing notation)
            per_million = float(prompt_price) * 1_000_000
            return f"${per_million:.2f} / 1M prompt"
    except (ValueError, TypeError):
        pass
    return "Pay per token"


class OpenRouterAdapter(ProviderAdapter):
    @property
    def provider_id(self) -> str:
        return "openrouter"

    def fetch_catalog_sync(self, key: str = "", base_url: str = "") -> List[ModelCatalogItem]:
        models: List[ModelCatalogItem] = []
        try:
            headers = {"Authorization": f"Bearer {key}"} if key else {}
            resp = requests.get(
                "https://openrouter.ai/api/v1/models",
                headers=headers,
                timeout=8,
            )
            if resp.status_code != 200:
                logger.warning(f"OpenRouter API returned status {resp.status_code}")
                return []

            raw_models = resp.json().get("data", [])
            priority_keywords = [
                ":free", "free", "auto", "deepseek", "claude", "gpt-4o", "llama-3.3",
                "qwen-2.5", "qwen3", "gemini-2.5", "mistral-large", "sonnet", "nemotron"
            ]

            # Priority inclusion of openrouter/auto
            models.append(
                ModelCatalogItem(
                    id="openrouter/auto",
                    name="OpenRouter Auto (Smart Dynamic Router)",
                    provider="OpenRouter",
                    context="1,000,000 tokens (1M)",
                    context_tokens=1000000,
                    input_token_limit=1000000,
                    output_token_limit=131072,
                    context_tier="1M+ Tokens",
                    capabilities=["Coding", "Reasoning", "Vision", "Free"],
                    modalities=["Text", "Image"],
                    features=["Multi-Cloud Dynamic Routing", "Prompt Caching", "Free Tier Available"],
                    speed="Dynamic",
                    cost="Dynamic (Optimized)",
                    status="verified" if key else "key_required",
                    verified=bool(key),
                    description="Intelligent dynamic router selecting the fastest, cheapest working model.",
                )
            )

            seen_ids = {"openrouter/openrouter/auto", "openrouter/auto"}

            # First pass: collect ALL genuine free models
            for m in raw_models:
                m_id = m.get("id", "")
                full_id = f"openrouter/{m_id}"
                if full_id in seen_ids:
                    continue

                pricing = m.get("pricing") or {}
                prompt_str = str(pricing.get("prompt", "")).strip()
                comp_str = str(pricing.get("completion", "")).strip()
                is_zero_cost = (prompt_str == "0" and comp_str == "0")
                is_free_suffix = ":free" in m_id.lower() or "free" in m.get("name", "").lower()

                if is_zero_cost or is_free_suffix:
                    seen_ids.add(full_id)
                    ctx_len = m.get("context_length", 128000)
                    top_prov = m.get("top_provider") or {}
                    max_out = top_prov.get("max_completion_tokens")
                    arch = m.get("architecture") or {}

                    hints = get_hints_for_model("openrouter", m_id)
                    features = list(hints.get("features", []))
                    features.append("Free Tier Available")
                    if pricing.get("input_cache_read"):
                        features.append("Prompt Caching")

                    modalities = [mod.title() for mod in arch.get("input_modalities", ["text"])]
                    if not modalities:
                        modalities = ["Text"]

                    caps = ["Coding", "Free"]
                    supported_params = m.get("supported_parameters", [])
                    if "tools" in supported_params:
                        caps.append("Tool Calling")
                    if "reasoning" in supported_params or "thought" in supported_params:
                        caps.append("Reasoning")
                    if "image" in [mod.lower() for mod in modalities]:
                        caps.append("Vision")

                    context_str = format_context_display(ctx_len, max_out)
                    context_tier = compute_context_tier(ctx_len)

                    item = ModelCatalogItem(
                        id=full_id,
                        name=m.get("name", m_id),
                        provider="OpenRouter",
                        context=context_str,
                        context_tokens=ctx_len,
                        input_token_limit=ctx_len,
                        output_token_limit=max_out,
                        context_tier=context_tier,
                        capabilities=list(set(caps)),
                        modalities=modalities,
                        features=list(set(features)),
                        speed="Dynamic",
                        cost="Free Tier",
                        status="verified" if key else "key_required",
                        verified=bool(key),
                        description=m.get("description"),
                    )
                    models.append(item)

            # Second pass: collect high-priority commercial models
            for m in raw_models:
                m_id = m.get("id", "")
                full_id = f"openrouter/{m_id}"
                if full_id in seen_ids:
                    continue

                if any(kw in m_id.lower() for kw in priority_keywords):
                    seen_ids.add(full_id)
                    ctx_len = m.get("context_length", 128000)
                    top_prov = m.get("top_provider") or {}
                    max_out = top_prov.get("max_completion_tokens")
                    pricing = m.get("pricing") or {}
                    arch = m.get("architecture") or {}

                    hints = get_hints_for_model("openrouter", m_id)
                    features = list(hints.get("features", []))

                    if pricing.get("input_cache_read"):
                        features.append("Prompt Caching")

                    modalities = [mod.title() for mod in arch.get("input_modalities", ["text"])]
                    if not modalities:
                        modalities = ["Text"]

                    caps = ["Coding"]
                    supported_params = m.get("supported_parameters", [])
                    if "tools" in supported_params:
                        caps.append("Tool Calling")
                    if "reasoning" in supported_params or "thought" in supported_params:
                        caps.append("Reasoning")
                    if "image" in [mod.lower() for mod in modalities]:
                        caps.append("Vision")

                    context_str = format_context_display(ctx_len, max_out)
                    context_tier = compute_context_tier(ctx_len)

                    item = ModelCatalogItem(
                        id=full_id,
                        name=m.get("name", m_id),
                        provider="OpenRouter",
                        context=context_str,
                        context_tokens=ctx_len,
                        input_token_limit=ctx_len,
                        output_token_limit=max_out,
                        context_tier=context_tier,
                        capabilities=list(set(caps)),
                        modalities=modalities,
                        features=list(set(features)),
                        speed="Dynamic",
                        cost=_format_openrouter_cost(pricing, m_id),
                        status="verified" if key else "key_required",
                        verified=bool(key),
                        description=m.get("description"),
                    )
                    models.append(item)
                    if len(models) >= 65:
                        break
        except Exception as ex:
            logger.warning(f"Catalog discovery failed for OpenRouter: {ex}")

        return models
