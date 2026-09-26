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

logger = logging.getLogger("eris.services.model_catalog.groq")


class GroqAdapter(ProviderAdapter):
    @property
    def provider_id(self) -> str:
        return "groq"

    def fetch_catalog_sync(self, key: str, base_url: str = "") -> List[ModelCatalogItem]:
        if not key:
            return []

        models: List[ModelCatalogItem] = []
        try:
            resp = requests.get(
                "https://api.groq.com/openai/v1/models",
                headers={"Authorization": f"Bearer {key}"},
                timeout=6,
            )
            if resp.status_code != 200:
                logger.warning(f"Groq API returned status {resp.status_code}")
                return []

            for m in resp.json().get("data", []):
                # Only include active models
                if not m.get("active", True):
                    continue

                m_id = m.get("id", "")
                ctx_tokens = m.get("context_window", 128000)
                hints = get_hints_for_model("groq", m_id)

                caps = ["Coding", "Speed"]
                if "vision" in m_id.lower():
                    caps.append("Vision")

                modalities = ["Text"]
                if "vision" in m_id.lower():
                    modalities.append("Image")

                item = ModelCatalogItem(
                    id=f"groq/{m_id}",
                    name=f"Groq {m_id}",
                    provider="Groq",
                    context=format_context_display(ctx_tokens),
                    context_tokens=ctx_tokens,
                    input_token_limit=ctx_tokens,
                    output_token_limit=8192,
                    context_tier=compute_context_tier(ctx_tokens),
                    capabilities=caps,
                    modalities=modalities,
                    features=list(hints.get("features", ["Groq LPU Hardware Acceleration"])),
                    speed="Dynamic",
                    cost="Pay per token",
                    status="verified",
                    verified=True,
                )
                models.append(item)
        except Exception as ex:
            logger.warning(f"Key verification failed for Groq: {ex}")

        return models
