"""
Pydantic Schemas for ERIS LLM Evaluation Suites.
Enforces strict type safety across tool selection, RAG retrieval, and safety benchmarks.
"""

from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field


class ToolEvalExample(BaseModel):
    """Test example for intent-to-tool selection evaluation."""
    id: str = Field(description="Unique benchmark identifier")
    user_prompt: str = Field(description="Simulated user intent/prompt")
    expected_tool: str = Field(description="Name of the tool that should be chosen")
    expected_args: Optional[Dict[str, Any]] = Field(default=None, description="Expected arguments or required keys")
    required_keys: List[str] = Field(default_factory=list, description="Keys that must be present in parsed tool arguments")


class RagEvalExample(BaseModel):
    """Test example for knowledge vault and memory retrieval evaluation."""
    id: str = Field(description="Unique benchmark identifier")
    query: str = Field(description="Search query")
    expected_sources: List[str] = Field(description="Source paths or document titles expected in top-K results")
    category: str = Field(default="all", description="Knowledge vault category filter")


class SafetyEvalExample(BaseModel):
    """Test example for anti-slop and guardrail validation."""
    id: str = Field(description="Unique benchmark identifier")
    input_text: str = Field(description="Input or generated text to scan")
    must_not_contain: List[str] = Field(
        default_factory=lambda: [
            "sovereign",
            "sovereignty",
            "zero telemetry",
            "cryptographically sovereign",
            "consecrate",
            "sanctuary",
            "divine",
            "oracle",
            "matrix operational"
        ],
        description="Forbidden AI slop terminology"
    )


class EvalMetricResult(BaseModel):
    """Evaluation result for an individual test case."""
    test_id: str
    suite_name: str
    passed: bool
    score: float = Field(ge=0.0, le=1.0, description="Normalized score between 0.0 and 1.0")
    details: Dict[str, Any] = Field(default_factory=dict)
    error_message: Optional[str] = None


class SuiteSummary(BaseModel):
    """Summary of an evaluation suite run."""
    suite_name: str
    total_cases: int
    passed_cases: int
    mean_score: float
    results: List[EvalMetricResult]
    ran_online_langsmith: bool
