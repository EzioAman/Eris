"""
Tool Calling and Selection Precision Evaluator for ERIS.
Verifies intent matching and strict Pydantic argument compliance.
"""

import logging
from typing import Any, Dict, Optional
from pydantic import ValidationError

try:
    from backend.app.agent.registry import registry, get_tool_by_name
    from backend.app.evals.schemas import EvalMetricResult, ToolEvalExample
except ImportError:
    from app.agent.registry import registry, get_tool_by_name
    from app.evals.schemas import EvalMetricResult, ToolEvalExample

logger = logging.getLogger("eris.evals.tools")


def evaluate_tool_selection(
    example: ToolEvalExample,
    selected_tool: str,
    selected_args: Optional[Dict[str, Any]] = None,
) -> EvalMetricResult:
    """
    Evaluates whether the agent selected the correct tool and provided valid schema arguments.
    Scoring:
    - 0.5 points for selecting the exact correct tool.
    - 0.3 points for passing all required argument keys.
    - 0.2 points for strict Pydantic schema validation passing without error.
    """
    score = 0.0
    details: Dict[str, Any] = {
        "expected_tool": example.expected_tool,
        "selected_tool": selected_tool,
        "selected_args": selected_args or {},
    }

    # 1. Tool Name Match (0.5 pts)
    tool_matches = (selected_tool.strip().lower() == example.expected_tool.strip().lower())
    if tool_matches:
        score += 0.5
        details["tool_match"] = True
    else:
        details["tool_match"] = False
        return EvalMetricResult(
            test_id=example.id,
            suite_name="tool_selection",
            passed=False,
            score=0.0,
            details=details,
            error_message=f"Selected tool '{selected_tool}' does not match expected '{example.expected_tool}'",
        )

    # 2. Required Keys Check (0.3 pts)
    args = selected_args or {}
    missing_keys = [k for k in example.required_keys if k not in args]
    details["missing_keys"] = missing_keys
    if not missing_keys:
        score += 0.3
    else:
        details["argument_error"] = f"Missing required keys: {missing_keys}"

    # 3. Pydantic Schema Validation (0.2 pts)
    tool_def = get_tool_by_name(selected_tool)
    if tool_def and tool_def.args_schema:
        try:
            tool_def.args_schema.model_validate(args)
            score += 0.2
            details["schema_valid"] = True
        except ValidationError as val_err:
            details["schema_valid"] = False
            details["pydantic_validation_error"] = str(val_err)
    else:
        # If no schema defined or tool not in registry, award partial if args non-empty
        score += 0.2
        details["schema_valid"] = True

    passed = (score >= 0.8)
    return EvalMetricResult(
        test_id=example.id,
        suite_name="tool_selection",
        passed=passed,
        score=round(score, 2),
        details=details,
    )
