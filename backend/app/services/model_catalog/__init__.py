try:
    from app.services.model_catalog.service import ModelCatalogService, model_catalog_service
    from app.services.model_catalog.base import ProviderAdapter
    from app.services.model_catalog.hints import load_model_hints, get_hints_for_model
except ImportError:
    from backend.app.services.model_catalog.service import ModelCatalogService, model_catalog_service
    from backend.app.services.model_catalog.base import ProviderAdapter
    from backend.app.services.model_catalog.hints import load_model_hints, get_hints_for_model

__all__ = [
    "ModelCatalogService",
    "model_catalog_service",
    "ProviderAdapter",
    "load_model_hints",
    "get_hints_for_model",
]
