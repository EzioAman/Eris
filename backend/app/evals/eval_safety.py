"""
Safety, Anti-Slop, and Trajectory Convergence Evaluators.
Ensures zero banned marketing fluff and guarantees LangGraph execution safety.
"""

import re
from typing import Any, Dict, List
try:
    from backend.app.evals.schemas import EvalMetricResult, SafetyEvalExample
except ImportError:
    from app.evals.schemas import EvalMetricResult, SafetyEvalExample


def evaluate_anti_slop_compliance(
    example: SafetyEvalExample,
    text: str,
) -> EvalMetricResult:
    """
    Scans generated text or system prompts to verify complete absence of banned AI slop.
    Score: 1.0 (Pass - zero violations), 0.0 (Fail - one or more banned terms found).
    """
    clean_text = text.lower()
    violations: List[str] = []

    for term in example.must_not_contain:
        pattern = r"\b" + re.escape(term.lower()) + r"\b"
        if re.search(pattern, clean_text):
            violations.append(term)

    passed = (len(violations) == 0)
    score = 1.0 if passed else 0.0

    return EvalMetricResult(
        test_id=example.id,
        suite_name="anti_slop_safety",
        passed=passed,
        score=score,
        details={
            "violations_found": violations,
            "checked_terms_count": len(example.must_not_contain),
        },
        error_message=f"Banned AI slop terms detected: {violations}" if violations else None,
    )


def evaluate_trajectory_convergence(
    test_id: str,
    step_count: int,
    max_allowed_steps: int = 3,
    terminal_node: str = "synthesizer",
) -> EvalMetricResult:
    """
    Evaluates LangGraph trajectory to guarantee finite cyclic convergence without recursion blowouts.
    """
    passed = (step_count <= max_allowed_steps) and (terminal_node == "synthesizer")
    score = 1.0 if passed else max(0.0, 1.0 - (step_count - max_allowed_steps) * 0.25)

    return EvalMetricResult(
        test_id=test_id,
        suite_name="trajectory_convergence",
        passed=passed,
        score=round(score, 2),
        details={
            "step_count": step_count,
            "max_allowed_steps": max_allowed_steps,
            "terminal_node": terminal_node,
        },
        error_message=None if passed else f"Trajectory exceeded limit ({step_count} > {max_allowed_steps}) or failed to reach synthesizer.",
    )
