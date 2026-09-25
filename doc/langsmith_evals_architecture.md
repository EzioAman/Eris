# LangSmith LLM Evals Architecture & Specification for ERIS

## 1. Executive Summary & Official Framework

LangSmith provides native dataset curation, offline/online evaluation, and experiment tracking for LLM applications and LangGraph agents.
In ERIS, evaluations must measure four core dimensions:
1. **Tool-Calling Precision & Schema Validity**: Ensure the agent selects the exact right tool for an intent and produces schema-compliant arguments without hallucination.
2. **RAG Retrieval Quality (Recall@K, MRR, Precision)**: Validate that semantic and hybrid queries retrieve relevant context chunks from the knowledge vault and user memory.
3. **LangGraph Agent Trajectory & Convergence**: Measure whether cyclic agent graphs reach consensus within acceptable iteration bounds without infinite loops.
4. **Anti-Slop & Output Faithfulness**: Verify that generated responses are strictly grounded in retrieved observations and 100% free of banned terminology.

---

## 2. Official LangSmith Evaluation Pattern

Official LangSmith Python SDK (`langsmith>=0.12.6`) uses `Client.evaluate()` or `aevaluate()`:

```python
from langsmith import Client
from langsmith.evaluation import evaluate

client = Client()

# Standard Evaluation Invocation
experiment_results = evaluate(
    target=target_agent_fn,               # Target pipeline or async callable
    data="eris-tool-selection-v1",        # Dataset name or list of dict examples
    evaluators=[
        tool_selection_evaluator,          # Exact or semantic tool match
        argument_schema_evaluator,         # Pydantic schema validation
        faithfulness_evaluator,            # LLM-as-a-judge context adherence
        anti_slop_compliance_evaluator,    # Banned phrase heuristic detector
    ],
    experiment_prefix="eris-eval-suite",
    max_concurrency=4,
    upload_results=True,                   # Set False for offline local evaluation
)
```

---

## 3. Four Core Evaluation Suites for ERIS

### Suite A: Tool-Calling Precision & Argument Verification
- **Target**: `backend/app/agent/nodes.py` (call_llm / classify / tool selector).
- **Dataset Structure**:
  ```json
  [
    {
      "inputs": {"prompt": "Play Bohemian Rhapsody on YouTube"},
      "outputs": {"expected_tool": "play_youtube_song", "required_args": ["query"]}
    },
    {
      "inputs": {"prompt": "Search the codebase for database connection pool settings"},
      "outputs": {"expected_tool": "grep_search", "required_args": ["Query", "SearchPath"]}
    }
  ]
  ```
- **Metrics**:
  - `ToolSelectionAccuracy`: 1.0 if selected tool matches expected tool, 0.0 otherwise.
  - `ArgumentPydanticCompliance`: 1.0 if input matches Pydantic schema without validation errors.
  - `HallucinatedParamPenalty`: Deduct points if model passes non-existent arguments.

### Suite B: RAG Retrieval Quality (Memory & Knowledge Vault)
- **Target**: `backend/app/services/rag_service.py` (`query_vault` / `search_rag_context`).
- **Dataset Structure**:
  - 50 curated queries mapping to known documentation files (`doc/*.md`) and learned preferences (`memory/user_habits.json`).
- **Metrics**:
  - `Recall@K` (K=3): Fraction of relevant chunks retrieved in top 3 positions.
  - `Mean Reciprocal Rank (MRR)`: Rank position of the first ground-truth relevant chunk.
  - `Context Relevance`: Ratio of relevant tokens to total retrieved context tokens.

### Suite C: Cyclic LangGraph Trajectory & Convergence
- **Target**: `backend/app/agent/langgraph_engine.py` (`eris_graph`).
- **Metrics**:
  - `StepCount`: Must complete within 1-3 iterations.
  - `ReflectionCalibration`: Verify `reflection_score` accurately mirrors observation completeness.
  - `GracefulExitRate`: 100% of failed executions must reach a safe terminal state without uncaught tracebacks.

### Suite D: Anti-Slop & Safety Compliance
- **Target**: Final synthesizer outputs.
- **Metric**:
  - Scan output against strict banlist:
    - `"Sovereign"`, `"Sovereignty"`, `"Zero telemetry"`, `"Cryptographically sovereign"`
    - `"Consecrate"`, `"Sanctuary"`, `"Divine"`, `"Oracle"`, `"Matrix Operational"`
  - Score: 1.0 (Pass - zero violations), 0.0 (Fail - contains banned terms).

---

## 4. Offline Fallback & Environment Guard

When `LANGCHAIN_API_KEY` is not provided in `.env`:
1. `evaluate(..., upload_results=False)` runs locally via Pytest.
2. Results are logged locally to SQLite (`memory/rag_vault.db` or `memory/eval_results.db`).
3. Prevents application crashes or network timeouts on air-gapped workstations.
