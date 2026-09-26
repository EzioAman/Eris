import logging
from typing import List
import requests

try:
    from app.schemas.models import (
        ModelCatalogItem,
        compute_context_tier,
    )
    from app.services.model_catalog.base import ProviderAdapter
    from app.services.model_catalog.hints import get_hints_for_model
except ImportError:
    from backend.app.schemas.models import (
        ModelCatalogItem,
        compute_context_tier,
    )
    from backend.app.services.model_catalog.base import ProviderAdapter
    from backend.app.services.model_catalog.hints import get_hints_for_model

logger = logging.getLogger("eris.services.model_catalog.ollama")


class OllamaAdapter(ProviderAdapter):
    @property
    def provider_id(self) -> str:
        return "ollama"

    def fetch_catalog_sync(self, key: str, base_url: str = "") -> List[ModelCatalogItem]:
        ollama_url = base_url or "http://localhost:11434"
        models: List[ModelCatalogItem] = []

        try:
            resp = requests.get(f"{ollama_url}/api/tags", timeout=3)
            if resp.status_code != 200:
                return []

            for m in resp.json().get("models", []):
                name = m.get("name", "")
                param_size = m.get("details", {}).get("parameter_size", "Local")
                hints = get_hints_for_model("ollama", name)

                item = ModelCatalogItem(
                    id=f"ollama/{name}",
                    name=f"Ollama {name.title()}",
                    provider="Ollama (Local)",
                    context=f"Local RAM ({param_size})",
                    context_tokens=32000,
                    input_token_limit=32000,
                    output_token_limit=4096,
                    context_tier="32k - 128k Tokens",
                    capabilities=["Local", "Private", "Zero-Cost"],
                    modalities=["Text"],
                    features=list(hints.get("features", ["On-Device Local Inference"])),
                    speed="Local Engine",
                    cost="Free",
                    status="verified",
                    verified=True,
                )
                models.append(item)
        except Exception:
            logger.debug("Local Ollama endpoint not reachable.")

        return models
