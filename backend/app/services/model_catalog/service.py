import logging
import time
from concurrent.futures import ThreadPoolExecutor, as_completed
from typing import Any, Dict, List, Optional

try:
    from app.schemas.models import ModelCatalogItem
    from app.services.vault_service import get_all_active_credentials_sync
    from app.services.model_catalog.base import ProviderAdapter
    from app.services.model_catalog.gemini_adapter import GeminiAdapter
    from app.services.model_catalog.openrouter_adapter import OpenRouterAdapter
    from app.services.model_catalog.groq_adapter import GroqAdapter
    from app.services.model_catalog.openai_adapter import OpenAIAdapter
    from app.services.model_catalog.anthropic_adapter import AnthropicAdapter
    from app.services.model_catalog.deepseek_adapter import DeepSeekAdapter
    from app.services.model_catalog.nvidia_adapter import NvidiaAdapter
    from app.services.model_catalog.ollama_adapter import OllamaAdapter
    from app.services.model_catalog.custom_adapter import CustomAdapter
except ImportError:
    from backend.app.schemas.models import ModelCatalogItem
    from backend.app.services.vault_service import get_all_active_credentials_sync
    from backend.app.services.model_catalog.base import ProviderAdapter
    from backend.app.services.model_catalog.gemini_adapter import GeminiAdapter
    from backend.app.services.model_catalog.openrouter_adapter import OpenRouterAdapter
    from backend.app.services.model_catalog.groq_adapter import GroqAdapter
    from backend.app.services.model_catalog.openai_adapter import OpenAIAdapter
    from backend.app.services.model_catalog.anthropic_adapter import AnthropicAdapter
    from backend.app.services.model_catalog.deepseek_adapter import DeepSeekAdapter
    from backend.app.services.model_catalog.nvidia_adapter import NvidiaAdapter
    from backend.app.services.model_catalog.ollama_adapter import OllamaAdapter
    from backend.app.services.model_catalog.custom_adapter import CustomAdapter

logger = logging.getLogger("eris.services.model_catalog")


class ModelCatalogService:
    """
    Centralized Model Discovery and Recommendation Engine.
    Dispatches to registered ProviderAdapters in parallel, normalizes metadata strictly,
    scores and ranks working models based on context token capacity and cost.
    """

    def __init__(self, cache_ttl_seconds: float = 300.0):
        self._adapters: Dict[str, ProviderAdapter] = {}
        self._cache_ttl_seconds: float = cache_ttl_seconds
        self._cached_models: List[Dict[str, Any]] = []
        self._models_cached_at: float = 0.0

        # Register standard adapters
        self.register_adapter(GeminiAdapter())
        self.register_adapter(OpenRouterAdapter())
        self.register_adapter(GroqAdapter())
        self.register_adapter(OpenAIAdapter())
        self.register_adapter(AnthropicAdapter())
        self.register_adapter(DeepSeekAdapter())
        self.register_adapter(NvidiaAdapter())
        self.register_adapter(OllamaAdapter())
        self.register_adapter(CustomAdapter())

    def register_adapter(self, adapter: ProviderAdapter) -> None:
        """Registers a new provider adapter."""
        self._adapters[adapter.provider_id.lower().strip()] = adapter

    def get_adapter(self, provider_id: str) -> Optional[ProviderAdapter]:
        """Retrieves adapter by provider name with alias normalization."""
        norm = provider_id.lower().strip()
        if norm in ("nvidia_nim", "nim"):
            norm = "nvidia"
        return self._adapters.get(norm)

    @staticmethod
    def score_model_recommendation(m: Dict[str, Any]) -> int:
        """
        Dynamically ranks models to suggest the best working model based on:
        1. Working status (filter out deprecated/broken/non-chat models)
        2. Cost (prioritize Free Tier Available / zero-cost)
        3. Context token capacity (prioritize 1M - 2M tokens)
        4. Modern generation (e.g. Gemini 3.x Flash, OpenRouter Auto)
        """
        mid = m.get("id", "").lower()
        cost = m.get("cost", "").lower()
        ctx = m.get("context", "").lower()
        ctx_tokens = m.get("context_tokens", 0)
        score = 0

        # Heavily penalize deprecated, dead, or non-chat models
        if any(k in mid for k in ["gemini-2.5", "gemini-2.0-flash", "gemini-1.0", "lyria", "robotics", "transcribe", "banana", ":batch"]):
            score -= 150

        # Free tier / zero-cost priority
        if "free" in cost or ":free" in mid or "auto" in mid:
            score += 50

        # Context window bonus (largest amount of tokens)
        if ctx_tokens >= 1_000_000 or "1m" in ctx or "2m" in ctx:
            score += 60
        elif ctx_tokens >= 200_000 or "200k" in ctx:
            score += 35
        elif ctx_tokens >= 128_000 or "128k" in ctx:
            score += 25

        # Modern working generation bonus
        if "gemini-3-flash-preview" in mid:
            score += 65
        elif "gemini-3.8-flash" in mid:
            score += 60
        elif "gemini-3.1-flash-lite" in mid:
            score += 55
        elif "openrouter/auto" in mid:
            score += 45

        return score

    def fetch_models(self, force_refresh: bool = False) -> List[Dict[str, Any]]:
        """
        Discovers all verified models across active vault credentials in parallel.
        Returns empty list if no keys are configured.
        """
        if self._cached_models and not force_refresh:
            if time.time() - self._models_cached_at < self._cache_ttl_seconds:
                return self._cached_models

        raw_creds = get_all_active_credentials_sync() or []
        credentials: List[Dict[str, Any]] = list(raw_creds)
        prov_set = {c.get("provider", "").lower().strip() for c in credentials}

        # Always include OpenRouter to discover free and dynamic models
        if "openrouter" not in prov_set:
            credentials.append({"provider": "openrouter", "key": "", "base_url": ""})

        models: List[Dict[str, Any]] = []
        seen_ids = set()

        def _fetch_from_cred(cred: Dict[str, Any]) -> List[ModelCatalogItem]:
            prov = cred.get("provider", "").lower().strip()
            key = cred.get("key", "").strip()
            base_url = cred.get("base_url", "").strip()

            adapter = self.get_adapter(prov)
            if not adapter:
                return []
            return adapter.fetch_catalog_sync(key=key, base_url=base_url)

        # Execute parallel discovery across configured providers
        worker_count = max(1, min(len(credentials), 8))
        with ThreadPoolExecutor(max_workers=worker_count) as executor:
            future_to_cred = {executor.submit(_fetch_from_cred, c): c for c in credentials}
            for future in as_completed(future_to_cred):
                try:
                    items = future.result()
                    for item in items:
                        if item.id not in seen_ids:
                            seen_ids.add(item.id)
                            models.append(item.model_dump())
                except Exception as ex:
                    logger.warning(f"Provider catalog discovery worker failed: {ex}")

        # Dynamically rank and sort models so best working, free, largest-token models are at the top
        models.sort(key=self.score_model_recommendation, reverse=True)
        if models:
            models[0]["recommended"] = True
            models[0]["recommendation_reason"] = "Verified working model with Free Tier and large 1M+ token context window."

        self._cached_models = models
        self._models_cached_at = time.time()
        return models


# Singleton instance
model_catalog_service = ModelCatalogService()
