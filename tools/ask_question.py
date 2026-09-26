"""
Elicitation Tool for ERIS.
A single component the agent can invoke mid-conversation to ask the user a
structured question, instead of writing clarifying questions as chat prose.
Used when the agent needs a preference before it can proceed usefully.
"""
import uuid
from typing import Any, Dict, List, Literal, Optional
from pydantic import BaseModel, Field

TOOL_NAME = "ask_question"
TOOL_DESCRIPTION = (
    "Invoke mid-conversation to ask the user a structured clarifying question or preference "
    "instead of writing it as chat prose. Provides selectable single or multi-choice options "
    "and optional custom text input."
)


class ElicitationOption(BaseModel):
    id: str = Field(..., description="Stable unique ID for this option")
    label: str = Field(..., description="Display label for the user")


class AskQuestionInput(BaseModel):
    id: Optional[str] = Field(default=None, description="Optional question ID to correlate answer")
    prompt: str = Field(..., description="The structured question text to ask the user")
    mode: Literal["single", "multi"] = Field(
        default="single",
        description="Selection behavior: 'single' (exactly one option) or 'multi' (zero or more checkboxes)",
    )
    options: List[Dict[str, str]] = Field(
        ...,
        description="List of options, each containing 'id' and 'label'",
    )
    allowCustom: Optional[bool] = Field(
        default=False,
        description="Whether to include a 'Type something else…' option revealing a free text input",
    )


def execute(
    prompt: str = "",
    mode: str = "single",
    options: List[Dict[str, str]] = None,
    allowCustom: bool = False,
    id: Optional[str] = None,
    **kwargs,
) -> str:
    """Invokes the elicitation question component in the frontend."""
    q_id = id or kwargs.get("id") or str(uuid.uuid4())
    opts = options or kwargs.get("options") or []
    return f"Structured elicitation question asked [{mode}]: {prompt} with {len(opts)} options."
