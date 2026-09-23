import logging
from typing import Literal
from langchain_core.messages import AIMessage

try:
    from app.agent.registry import check_if_approval_needed
    from app.schemas.state import AgentState
except ImportError:
    from backend.app.agent.registry import check_if_approval_needed
    from backend.app.schemas.state import AgentState

logger = logging.getLogger("eris.agent.edges")

MAX_REASONING_TURNS = 8


def route_after_reasoning(state: AgentState) -> Literal["tool_runner", "approval_gate", "learning_recorder"]:
    """
    Decides the next node after the reasoner generates a response.
    Routes to approval_gate if any tool requires human confirmation,
    tool_runner if all tools are safe to execute,
    or learning_recorder if reasoning is complete.
    """
    turn_count = state.get("turn_count", 1)
    if turn_count >= MAX_REASONING_TURNS:
        logger.info(f"Reached maximum reasoning turns ({MAX_REASONING_TURNS}). Routing to learning_recorder.")
        return "learning_recorder"

    messages = state.get("messages", [])
    if not messages:
        return "learning_recorder"

    last_msg = messages[-1]
    if not isinstance(last_msg, AIMessage):
        return "learning_recorder"

    if not hasattr(last_msg, "tool_calls") or not last_msg.tool_calls:
        # No tools emitted: pure text answer, finish turn
        return "learning_recorder"

    user_habits = state.get("user_habits", {})

    # Check each requested tool call against risk boundaries and learned trust
    for tc in last_msg.tool_calls:
        tool_name = tc.get("name", "")
        tool_args = tc.get("args", {})
        if check_if_approval_needed(tool_name, tool_args, user_habits):
            logger.info(f"Tool '{tool_name}' requires human approval. Routing to approval_gate.")
            return "approval_gate"

    # All tools are safe/auto-approved
    return "tool_runner"


def route_after_approval(state: AgentState) -> Literal["reasoner", "learning_recorder"]:
    """
    Decides the next node after the approval gate has resumed and handled the decision.
    Cycles back to the reasoner so Eris can synthesize the result or acknowledge the rejection.
    """
    turn_count = state.get("turn_count", 1)
    if turn_count >= MAX_REASONING_TURNS:
        return "learning_recorder"

    return "reasoner"
