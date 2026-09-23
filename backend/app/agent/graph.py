import logging
from typing import Any, Optional
from langgraph.checkpoint.memory import MemorySaver
from langgraph.graph import END, START, StateGraph

try:
    from app.agent.edges import route_after_approval, route_after_reasoning
    from app.agent.nodes import approval_gate_node, learning_recorder_node, reasoner_node, tool_runner_node
    from app.schemas.state import AgentState
except ImportError:
    from backend.app.agent.edges import route_after_approval, route_after_reasoning
    from backend.app.agent.nodes import approval_gate_node, learning_recorder_node, reasoner_node, tool_runner_node
    from backend.app.schemas.state import AgentState

logger = logging.getLogger("eris.agent.graph")


def build_agent_graph(checkpointer: Optional[Any] = None):
    """
    Constructs and compiles the cyclic LangGraph StateGraph for Eris.
    Integrates reasoner, tool runner, interruptible approval gate, and learning recorder.
    """
    workflow = StateGraph(AgentState)

    # 1. Add state nodes
    workflow.add_node("reasoner", reasoner_node)
    workflow.add_node("tool_runner", tool_runner_node)
    workflow.add_node("approval_gate", approval_gate_node)
    workflow.add_node("learning_recorder", learning_recorder_node)

    # 2. Add entrypoint
    workflow.add_edge(START, "reasoner")

    # 3. Add conditional routing edges
    workflow.add_conditional_edges(
        "reasoner",
        route_after_reasoning,
        {
            "tool_runner": "tool_runner",
            "approval_gate": "approval_gate",
            "learning_recorder": "learning_recorder",
        },
    )

    # Cycle tool runner back to reasoner for multi-turn execution
    workflow.add_edge("tool_runner", "reasoner")

    # Cycle approval gate back to reasoner
    workflow.add_conditional_edges(
        "approval_gate",
        route_after_approval,
        {
            "reasoner": "reasoner",
            "learning_recorder": "learning_recorder",
        },
    )

    # Termination
    workflow.add_edge("learning_recorder", END)

    # Checkpoint with MemorySaver
    if checkpointer is None:
        checkpointer = MemorySaver()

    app = workflow.compile(checkpointer=checkpointer)
    logger.info("LangGraph agent compiled successfully with checkpointer.")
    return app


# Singleton compiled graph instance
agent_graph = build_agent_graph()
