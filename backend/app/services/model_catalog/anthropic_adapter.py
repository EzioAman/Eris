import logging
from typing import List
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

logger = logging.getLogger("eris.services.model_catalog.anthropic")


class AnthropicAdapter(ProviderAdapter):
    @property
    def provider_id(self) -> str:
        return "anthropic"

    def fetch_catalog_sync(self, key: str, base_url: str = "") -> List[ModelCatalogItem]:
        if not key:
            return []

        models: List[ModelCatalogItem] = []
        try:
            resp = requests.get(
                "https://api.anthropic.com/v1/models",
                headers={"x-api-key": key, "anthropic-version": "2023-06-01"},
                timeout=6,
            )
            if resp.status_code != 200:
                logger.warning(f"Anthropic API returned status {resp.status_code}")
                return []

            for m in resp.json().get("data", []):
                m_id = m.get("id", "")
                display_name = m.get("display_name") or f"Claude {m_id.replace('claude-', '').title()}"
                ctx_tokens = 200000
                hints = get_hints_for_model("anthropic", m_id)

                features = list(hints.get("features", []))
                features.append("Prompt Caching")

                item = ModelCatalogItem(
                    id=f"anthropic/{m_id}",
                    name=display_name,
                    provider="Anthropic",
                    context=format_context_display(ctx_tokens, 8192),
                    context_tokens=ctx_tokens,
                    input_token_limit=ctx_tokens,
                    output_token_limit=8192,
                    context_tier=compute_context_tier(ctx_tokens),
                    capabilities=["Coding", "Reasoning", "Vision"],
                    modalities=["Text", "Image"],
                    features=list(set(features)),
                    speed="Dynamic",
                    cost="Pay per token",
                    status="verified",
                    verified=True,
                )
                models.append(item)
        except Exception as ex:
            logger.warning(f"Key verification failed for Anthropic: {ex}")

        return models
