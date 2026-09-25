"""
ERIS LLM Evaluations Module.
Provides programmatic metrics, datasets, and LangSmith integration for tool selection, RAG, and safety.
"""

from backend.app.evals.schemas import (
    ToolEvalExample,
    RagEvalExample,
    SafetyEvalExample,
    EvalMetricResult,
    SuiteSummary,
)
from backend.app.evals.eval_tools import evaluate_tool_selection
from backend.app.evals.eval_rag import evaluate_rag_retrieval
from backend.app.evals.eval_safety import evaluate_anti_slop_compliance, evaluate_trajectory_convergence
from backend.app.evals.runner import (
    check_langsmith_connection,
    run_all_evals,
    run_tool_evals,
    run_rag_evals,
    run_safety_evals,
    TOOL_EVAL_DATASET,
    RAG_EVAL_DATASET,
    SAFETY_EVAL_DATASET,
)

from backend.app.evals.conversation_runner import (
    ConversationTurnMetrics,
    ConversationSessionResult,
    run_live_conversation_session,
)

__all__ = [
    "ToolEvalExample",
    "RagEvalExample",
    "SafetyEvalExample",
    "EvalMetricResult",
    "SuiteSummary",
    "ConversationTurnMetrics",
    "ConversationSessionResult",
    "evaluate_tool_selection",
    "evaluate_rag_retrieval",
    "evaluate_anti_slop_compliance",
    "evaluate_trajectory_convergence",
    "check_langsmith_connection",
    "run_all_evals",
    "run_tool_evals",
    "run_rag_evals",
    "run_safety_evals",
    "run_live_conversation_session",
    "TOOL_EVAL_DATASET",
    "RAG_EVAL_DATASET",
    "SAFETY_EVAL_DATASET",
]
