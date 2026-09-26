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

logger = logging.getLogger("eris.services.model_catalog.gemini")


class GeminiAdapter(ProviderAdapter):
    @property
    def provider_id(self) -> str:
        return "gemini"

    def fetch_catalog_sync(self, key: str, base_url: str = "") -> List[ModelCatalogItem]:
        if not key:
            return []

        models: List[ModelCatalogItem] = []
        try:
            url = f"https://generativelanguage.googleapis.com/v1beta/models?key={key}"
            resp = requests.get(url, timeout=6)
            if resp.status_code != 200:
                logger.warning(f"Gemini API returned status {resp.status_code}: {resp.text[:200]}")
                return []

            for m in resp.json().get("models", []):
                gen_methods = m.get("supportedGenerationMethods", [])
                if "generateContent" not in gen_methods:
                    continue

                raw_name = m.get("name", "").replace("models/", "")
                name_lower = raw_name.lower()

                # Filter non-chat / specialized standalone models
                if any(k in name_lower for k in [
                    "tts", "image", "embedding", "deep-research", "antigravity",
                    "computer-use", "aqa", "realtime", "robotics", "banana"
                ]):
                    continue

                input_limit = m.get("inputTokenLimit")
                output_limit = m.get("outputTokenLimit")
                display_name = m.get("displayName") or f"Gemini {raw_name.replace('-', ' ').title()}"

                hints = get_hints_for_model("gemini", raw_name)
                features = list(hints.get("features", []))

                # Real API generation capability detection
                if "createCachedContent" in gen_methods:
                    features.append("Prompt Caching")
                if "batchGenerateContent" in gen_methods:
                    features.append("Batch Generation")

                caps = ["Coding"]
                if any(k in name_lower for k in ["flash", "pro", "gemini-3", "gemini-2"]):
                    caps.extend(["Vision", "Audio", "Free"])
                if any(k in name_lower for k in ["thinking", "pro", "gemini-3.6", "exp"]):
                    caps.append("Reasoning")

                modalities = ["Text"]
                if any(k in name_lower for k in ["flash", "pro", "gemini-3", "gemini-2"]):
                    modalities.extend(["Image", "Audio", "Video"])

                context_tokens = input_limit or 1048576
                context_str = format_context_display(context_tokens, output_limit)
                context_tier = compute_context_tier(context_tokens)

                item = ModelCatalogItem(
                    id=f"gemini/{raw_name}",
                    name=display_name,
                    provider="Google Gemini",
                    context=context_str,
                    context_tokens=context_tokens,
                    input_token_limit=input_limit,
                    output_token_limit=output_limit,
                    context_tier=context_tier,
                    capabilities=list(set(caps)),
                    modalities=modalities,
                    features=list(set(features)),
                    speed="Dynamic",
                    cost="Free Tier Available",
                    status="verified",
                    verified=True,
                    description=m.get("description"),
                    temperature=m.get("temperature"),
                    top_p=m.get("topP"),
                    top_k=m.get("topK"),
                )
                models.append(item)
        except Exception as ex:
            logger.warning(f"Key verification failed for Gemini: {ex}")

        return models
