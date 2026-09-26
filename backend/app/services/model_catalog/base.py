from abc import ABC, abstractmethod
from typing import Any, Dict, List, Optional
import requests

try:
    from app.schemas.models import ModelCatalogItem
except ImportError:
    from backend.app.schemas.models import ModelCatalogItem


class ProviderAdapter(ABC):
    """
    Abstract Base Class for provider-specific model discovery adapters.
    Each adapter handles authenticated HTTP communication with a provider's model API
    and normalizes raw provider payloads into strictly typed ModelCatalogItem instances.
    """

    @property
    @abstractmethod
    def provider_id(self) -> str:
        """Normalized unique identifier for the provider (e.g. 'gemini', 'openrouter', 'groq')."""
        pass

    @abstractmethod
    def fetch_catalog_sync(self, key: str, base_url: str = "") -> List[ModelCatalogItem]:
        """
        Synchronously queries provider's models endpoint and returns normalized ModelCatalogItem objects.
        Must handle exceptions gracefully and return an empty list on authentication failure or network timeout.
        """
        pass
