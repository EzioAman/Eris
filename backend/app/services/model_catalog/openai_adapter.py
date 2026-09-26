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

logger = logging.getLogger("eris.services.model_catalog.openai")


class OpenAIAdapter(ProviderAdapter):
    @property
    def provider_id(self) -> str:
        return "openai"

    def fetch_catalog_sync(self, key: str, base_url: str = "") -> List[ModelCatalogItem]:
        if not key:
            return []

        models: List[ModelCatalogItem] = []
        try:
            resp = requests.get(
                "https://api.openai.com/v1/models",
                headers={"Authorization": f"Bearer {key}"},
                timeout=6,
            )
            if resp.status_code != 200:
                logger.warning(f"OpenAI API returned status {resp.status_code}")
                return []

            for m in resp.json().get("data", []):
                m_id = m.get("id", "")
                m_lower = m_id.lower()
                if any(p in m_lower for p in ["gpt-4o", "o1", "o3", "gpt-4-turbo"]):
                    is_reasoning = "o1" in m_lower or "o3" in m_lower
                    ctx_tokens = 200000 if is_reasoning else 128000
                    out_tokens = 100000 if is_reasoning else 16384
                    hints = get_hints_for_model("openai", m_id)

                    caps = ["Coding", "Reasoning"]
                    if "4o" in m_lower:
                        caps.append("Vision")

                    modalities = ["Text"]
                    if "4o" in m_lower:
                        modalities.append("Image")

                    features = list(hints.get("features", []))
                    features.append("Prompt Caching")

                    item = ModelCatalogItem(
                        id=f"openai/{m_id}",
                        name=f"OpenAI {m_id}",
                        provider="OpenAI",
                        context=format_context_display(ctx_tokens, out_tokens),
                        context_tokens=ctx_tokens,
                        input_token_limit=ctx_tokens,
                        output_token_limit=out_tokens,
                        context_tier=compute_context_tier(ctx_tokens),
                        capabilities=caps,
                        modalities=modalities,
                        features=list(set(features)),
                        speed="Dynamic",
                        cost="Pay per token",
                        status="verified",
                        verified=True,
                    )
                    models.append(item)
        except Exception as ex:
            logger.warning(f"Key verification failed for OpenAI: {ex}")

        return models
