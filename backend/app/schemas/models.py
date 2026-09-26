from typing import List, Optional
from pydantic import BaseModel, Field


def format_token_count(tokens: Optional[int]) -> str:
    """
    Formats a raw token count into human-readable compact notation (e.g. 1048576 -> '1M', 128000 -> '128k').
    """
    if not tokens or tokens <= 0:
        return "N/A"
    if tokens >= 1_000_000:
        val = tokens / 1_000_000
        formatted = f"{val:.2f}".rstrip("0").rstrip(".")
        return f"{formatted}M"
    if tokens >= 1_000:
        return f"{tokens // 1_000}k"
    return str(tokens)


def format_context_display(input_tokens: Optional[int], output_tokens: Optional[int] = None) -> str:
    """
    Produces clean context window description including raw count and compact label.
    Example: 1048576 -> '1,048,576 tokens (1M)'
    """
    if not input_tokens or input_tokens <= 0:
        return "Standard Context"
    compact = format_token_count(input_tokens)
    return f"{input_tokens:,} tokens ({compact})"


def compute_context_tier(input_tokens: Optional[int]) -> str:
    """
    Classifies a model's token capacity into standardized tiers for faceted filtering.
    """
    if not input_tokens or input_tokens < 32_000:
        return "< 32k Tokens"
    if input_tokens < 128_000:
        return "32k - 128k Tokens"
    if input_tokens < 1_000_000:
        return "128k - 1M Tokens"
    return "1M+ Tokens"


class ModelCatalogItem(BaseModel):
    """
    Strict Pydantic model for an authenticated LLM in the catalog.
    Exposes full API metadata: token context limits, modalities, features, throughput, and status.
    """
    id: str = Field(description="Canonical model ID for API dispatch (e.g. 'gemini/gemini-3-flash-preview')")
    name: str = Field(description="Human-readable model name")
    provider: str = Field(description="Provider organization (e.g. 'Google Gemini', 'OpenRouter')")
    context: str = Field(description="Formatted context window description (e.g. '1,048,576 tokens (1M)')")
    context_tokens: int = Field(default=0, description="Raw integer token context length for sorting and filtering")
    input_token_limit: Optional[int] = Field(default=None, description="Maximum prompt/input token limit exposed by API")
    output_token_limit: Optional[int] = Field(default=None, description="Maximum generation/completion token limit exposed by API")
    context_tier: str = Field(default="Standard", description="Context tier for faceted filtering (e.g. '1M+ Tokens')")
    capabilities: List[str] = Field(default_factory=list, description="Model capabilities (e.g. ['Coding', 'Reasoning', 'Free'])")
    modalities: List[str] = Field(default_factory=list, description="Input/Output modalities (e.g. ['Text', 'Image', 'Audio', 'Video'])")
    features: List[str] = Field(default_factory=list, description="Advanced API features (e.g. ['Prompt Caching', 'Batching'])")
    speed: str = Field(default="Standard", description="Throughput descriptor (e.g. '120 tps (Flash)', '300+ tps')")
    cost: str = Field(default="Free Tier Available", description="Pricing tier descriptor")
    status: str = Field(default="verified", description="Verification status ('verified', 'unverified')")
    verified: bool = Field(default=True, description="True if verified against an active vault API key")
    recommended: bool = Field(default=False, description="True if marked top recommended model")
    recommendation_reason: Optional[str] = Field(default=None, description="Detailed reason for recommendation")
    description: Optional[str] = Field(default=None, description="Official model description from provider API")
    temperature: Optional[float] = Field(default=None, description="Default sampling temperature")
    top_p: Optional[float] = Field(default=None, description="Default Top-P")
    top_k: Optional[int] = Field(default=None, description="Default Top-K")
