import sys
from pathlib import Path
import pytest

ROOT_DIR = Path(__file__).resolve().parent.parent.parent
if str(ROOT_DIR) not in sys.path:
    sys.path.insert(0, str(ROOT_DIR))

from backend.app.evals import (
    run_all_evals,
    run_tool_evals,
    run_rag_evals,
    run_safety_evals,
    evaluate_anti_slop_compliance,
    evaluate_trajectory_convergence,
    SafetyEvalExample,
)


def test_tool_selection_evals():
    summary = run_tool_evals()
    assert summary.total_cases > 0
    assert summary.passed_cases == summary.total_cases
    assert summary.mean_score >= 0.8


def test_rag_retrieval_evals():
    summary = run_rag_evals()
    assert summary.total_cases > 0
    # At least 50% recall baseline on ground truth docs
    assert summary.mean_score >= 0.5


def test_safety_anti_slop_evals():
    summary = run_safety_evals()
    assert summary.total_cases > 0
    assert summary.passed_cases == summary.total_cases
    assert summary.mean_score == 1.0


def test_banned_slop_detection():
    example = SafetyEvalExample(
        id="slop-test-fail",
        input_text="Our cryptographically sovereign workstation will consecrate your divine desktop sanctuary.",
    )
    result = evaluate_anti_slop_compliance(example, example.input_text)
    assert not result.passed
    assert result.score == 0.0
    assert len(result.details["violations_found"]) >= 3


def test_trajectory_convergence_pass():
    result = evaluate_trajectory_convergence(
        test_id="traj-pass",
        step_count=2,
        max_allowed_steps=3,
        terminal_node="synthesizer",
    )
    assert result.passed
    assert result.score == 1.0


def test_trajectory_convergence_excessive_loops():
    result = evaluate_trajectory_convergence(
        test_id="traj-fail",
        step_count=5,
        max_allowed_steps=3,
        terminal_node="planner",
    )
    assert not result.passed
    assert result.score < 1.0


def test_full_eval_runner_with_sqlite_persistence():
    summaries = run_all_evals(upload_to_langsmith=False)
    assert "tool_selection" in summaries
    assert "rag_retrieval" in summaries
    assert "anti_slop_safety" in summaries
    for s in summaries.values():
        assert s.total_cases > 0


def test_dynamic_tool_rag_selection():
    from backend.app.agent.registry import get_relevant_tools
    # Query for web scraping should retrieve relevant tools and core inspection tools
    tools = get_relevant_tools("Scrape and extract text from website documentation", top_k=6)
    tool_names = [t.name for t in tools]
    assert "read_file" in tool_names  # baseline safety tool
    assert "grep_search" in tool_names  # baseline safety tool
    assert len(tools) >= 3


def test_episodic_memory_indexing_and_recall():
    from backend.app.agent.runner import runner
    from backend.app.services.rag_service import rag_vault

    test_statement = "I always prefer using uv for managing Python dependencies in my project."
    runner.append_to_user_history("test_eval_user", "user", test_statement)

    # Search for semantic recall
    matches = rag_vault.query_vault("uv python dependency manager preference", top_k=3, category="memory")
    assert len(matches) > 0
    contents = [m["content"] for m in matches]
    assert any("uv for managing Python" in c for c in contents)

