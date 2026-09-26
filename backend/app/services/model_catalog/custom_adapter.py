import logging
from typing import List
import requests

try:
    from app.schemas.models import ModelCatalogItem
    from app.services.model_catalog.base import ProviderAdapter
except ImportError:
    from backend.app.schemas.models import ModelCatalogItem
    from backend.app.services.model_catalog.base import ProviderAdapter

logger = logging.getLogger("eris.services.model_catalog.custom")


class CustomAdapter(ProviderAdapter):
    @property
    def provider_id(self) -> str:
        return "custom"

    def fetch_catalog_sync(self, key: str, base_url: str = "") -> List[ModelCatalogItem]:
        if not base_url:
            return []

        custom_url = base_url.rstrip("/")
        endpoint = f"{custom_url}/models" if "/models" not in custom_url else custom_url
        headers = {"Authorization": f"Bearer {key}"} if key else {}
        models: List[ModelCatalogItem] = []

        try:
            resp = requests.get(endpoint, headers=headers, timeout=5)
            if resp.status_code != 200:
                return []

            data = resp.json()
            items = data.get("data", data.get("models", []))
            for m in items:
                m_id = m.get("id", m.get("name", ""))
                item = ModelCatalogItem(
                    id=f"custom/{m_id}",
                    name=f"Custom {m_id}",
                    provider="Custom Endpoint",
                    context="Custom Limit",
                    context_tokens=64000,
                    input_token_limit=64000,
                    output_token_limit=4096,
                    context_tier="32k - 128k Tokens",
                    capabilities=["Coding"],
                    modalities=["Text"],
                    features=["Self-hosted"],
                    speed="Custom",
                    cost="Self-hosted",
                    status="verified",
                    verified=True,
                )
                models.append(item)
        except Exception as ex:
            logger.warning(f"Custom endpoint verification failed: {ex}")

        return models
