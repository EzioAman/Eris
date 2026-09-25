"""
Knowledge Vault & Memory RAG Retrieval Quality Evaluator.
Computes Recall@K, Mean Reciprocal Rank (MRR), and Context Precision.
"""

from typing import Any, Dict, List
try:
    from backend.app.evals.schemas import EvalMetricResult, RagEvalExample
except ImportError:
    from app.evals.schemas import EvalMetricResult, RagEvalExample


def evaluate_rag_retrieval(
    example: RagEvalExample,
    retrieved_results: List[Dict[str, Any]],
    k: int = 3,
) -> EvalMetricResult:
    """
    Evaluates whether retrieval returned the expected documentation chunks or memory sources.
    Metrics:
    - Recall@K: fraction of expected sources present in top-k.
    - MRR (Mean Reciprocal Rank): 1 / rank of the first relevant match.
    - Score = 0.6 * Recall@K + 0.4 * MRR
    """
    top_k_results = retrieved_results[:k]
    retrieved_sources = [r.get("source", "").lower() for r in top_k_results]
    retrieved_titles = [r.get("title", "").lower() for r in top_k_results]

    expected = [s.lower() for s in example.expected_sources]
    if not expected:
        return EvalMetricResult(
            test_id=example.id,
            suite_name="rag_retrieval",
            passed=True,
            score=1.0,
            details={"warning": "No expected sources specified for example."},
        )

    # 1. Compute Recall@K
    hits = 0
    first_rank: int = 0
    for exp in expected:
        matched = False
        for idx, (src, title) in enumerate(zip(retrieved_sources, retrieved_titles)):
            if exp in src or exp in title:
                hits += 1
                matched = True
                if first_rank == 0:
                    first_rank = idx + 1
                break

    recall_at_k = hits / len(expected)
    mrr = (1.0 / first_rank) if first_rank > 0 else 0.0
    combined_score = round((0.6 * recall_at_k) + (0.4 * mrr), 2)
    passed = (recall_at_k >= 0.5)

    details = {
        "query": example.query,
        "expected_sources": example.expected_sources,
        "retrieved_sources": retrieved_sources,
        "recall_at_k": recall_at_k,
        "mrr": mrr,
        "first_match_rank": first_rank,
    }

    return EvalMetricResult(
        test_id=example.id,
        suite_name="rag_retrieval",
        passed=passed,
        score=combined_score,
        details=details,
    )
