from typing import Any, Dict, List, Literal, Optional
from pydantic import BaseModel, Field


class ModelSwitchEvent(BaseModel):
    """SSE event emitted when LLM provider or model changes."""
    type: Literal["model_switch"] = "model_switch"
    model: str
    text: Optional[str] = None


class TurnStartEvent(BaseModel):
    """SSE event emitted at the start of a reasoning iteration."""
    type: Literal["turn_start"] = "turn_start"
    model: Optional[str] = None
    turn: int = 1
    text: Optional[str] = None


class ThoughtEvent(BaseModel):
    """SSE event carrying model reasoning tokens or chain of thought."""
    type: Literal["thought"] = "thought"
    text: str
    turn: Optional[int] = 1


class ActionEvent(BaseModel):
    """SSE event emitted when a tool invocation begins."""
    type: Literal["action"] = "action"
    text: str
    tool: Optional[str] = None
    args: Optional[Dict[str, Any]] = None


class ObservationEvent(BaseModel):
    """SSE event reporting tool execution output back to the agent."""
    type: Literal["observation"] = "observation"
    text: str


class SubagentSpawnEvent(BaseModel):
    """SSE event emitted when delegating a task to a specialized swarm worker."""
    type: Literal["subagent_spawn"] = "subagent_spawn"
    role: str
    objective: str


class SearchEvent(BaseModel):
    """SSE event tracking web or codebase search state."""
    type: Literal["search"] = "search"
    query: str
    status: str = "searching"  # "searching" or "completed"
    results: Optional[List[Dict[str, Any]]] = None


class ApprovalToolCall(BaseModel):
    """Structured representation of a pending action requiring human confirmation."""
    kind: Literal["approval"] = "approval"
    id: str
    action: str
    target: Optional[str] = ""
    input: Optional[str] = ""
    command: Optional[str] = ""
    consequence: str = "Execution requires explicit user approval."
    riskLevel: str = "moderate"
    decision: Literal["pending", "approved", "rejected"] = "pending"


class OutputToolCall(BaseModel):
    """Structured representation of a completed tool execution."""
    kind: Literal["output"] = "output"
    id: str
    name: str
    output: str
    duration: str = "0.05s"


class DoneEvent(BaseModel):
    """Final SSE event containing full reply, tool calls, and model metadata."""
    type: Literal["done"] = "done"
    reply: str
    toolCalls: List[Dict[str, Any]] = Field(default_factory=list)
    model: Optional[str] = None
    memory_updated: bool = False
    execution_mode: Optional[str] = "speed"
