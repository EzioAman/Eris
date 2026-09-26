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

logger = logging.getLogger("eris.services.model_catalog.deepseek")


class DeepSeekAdapter(ProviderAdapter):
    @property
    def provider_id(self) -> str:
        return "deepseek"

    def fetch_catalog_sync(self, key: str, base_url: str = "") -> List[ModelCatalogItem]:
        if not key:
            return []

        models: List[ModelCatalogItem] = []
        try:
            resp = requests.get(
                "https://api.deepseek.com/models",
                headers={"Authorization": f"Bearer {key}"},
                timeout=6,
            )
            if resp.status_code != 200:
                logger.warning(f"DeepSeek API returned status {resp.status_code}")
                return []

            for m in resp.json().get("data", []):
                m_id = m.get("id", "")
                ctx_tokens = 64000
                hints = get_hints_for_model("deepseek", m_id)

                item = ModelCatalogItem(
                    id=f"deepseek/{m_id}",
                    name=f"DeepSeek {m_id.title()}",
                    provider="DeepSeek",
                    context=format_context_display(ctx_tokens, 8192),
                    context_tokens=ctx_tokens,
                    input_token_limit=ctx_tokens,
                    output_token_limit=8192,
                    context_tier=compute_context_tier(ctx_tokens),
                    capabilities=["Coding", "Reasoning"],
                    modalities=["Text"],
                    features=list(hints.get("features", ["DeepSeek Sparse MoE"])),
                    speed="Dynamic",
                    cost="Pay per token",
                    status="verified",
                    verified=True,
                )
                models.append(item)
        except Exception as ex:
            logger.warning(f"Key verification failed for DeepSeek: {ex}")

        return models
