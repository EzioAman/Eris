from typing import Annotated, Any, Dict, List, Optional, Sequence
from typing_extensions import TypedDict
from langchain_core.messages import BaseMessage
from langgraph.graph.message import add_messages


class AgentState(TypedDict):
    """
    Typed state object flowing through every node in the LangGraph workflow.
    Uses LangChain BaseMessage sequences combined with human learning context.
    """
    messages: Annotated[Sequence[BaseMessage], add_messages]
    session_id: str
    active_model: str
    execution_mode: str
    user_habits: Dict[str, Any]
    approval_pending: Optional[Dict[str, Any]]
    turn_count: int
    current_thought: str
    executed_tools: List[Dict[str, Any]]
    token_usage: Optional[Dict[str, int]]
    user_id: Optional[str]
    sub_timings: Optional[Dict[str, float]]
