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

logger = logging.getLogger("eris.services.model_catalog.nvidia")


class NvidiaAdapter(ProviderAdapter):
    @property
    def provider_id(self) -> str:
        return "nvidia"

    def fetch_catalog_sync(self, key: str, base_url: str = "") -> List[ModelCatalogItem]:
        if not key:
            return []

        models: List[ModelCatalogItem] = []
        try:
            resp = requests.get(
                "https://integrate.api.nvidia.com/v1/models",
                headers={"Authorization": f"Bearer {key}"},
                timeout=6,
            )
            if resp.status_code != 200:
                logger.warning(f"Nvidia NIM API returned status {resp.status_code}")
                return []

            for m in resp.json().get("data", []):
                m_id = m.get("id", "")
                display_name = f"Nvidia {m_id.split('/')[-1].replace('-', ' ').title()}"
                ctx_tokens = 128000
                hints = get_hints_for_model("nvidia", m_id)

                item = ModelCatalogItem(
                    id=f"nvidia_nim/{m_id}",
                    name=display_name,
                    provider="Nvidia NIM",
                    context=format_context_display(ctx_tokens),
                    context_tokens=ctx_tokens,
                    input_token_limit=ctx_tokens,
                    output_token_limit=4096,
                    context_tier=compute_context_tier(ctx_tokens),
                    capabilities=["Reasoning", "Coding"],
                    modalities=["Text"],
                    features=list(hints.get("features", ["Nvidia TensorRT-LLM Acceleration"])),
                    speed="Dynamic",
                    cost="Included in NIM Tier",
                    status="verified",
                    verified=True,
                )
                models.append(item)
        except Exception as ex:
            logger.warning(f"Key verification failed for Nvidia NIM: {ex}")

        return models
