# Official Documentation Verification: LangGraph HITL & Pydantic Tools Architecture

> Verified against official LangChain & LangGraph documentation (`langgraph >= 1.2.11`, `langchain-core >= 1.6.3`, `pydantic >= 2.13.0`).

---

## 1. Dynamic Human-In-The-Loop (HITL) via `interrupt()` & `Command`

In modern LangGraph (v1.2+), the canonical Human-In-The-Loop mechanism uses dynamic `interrupt()` paired with `Command(resume=...)`:

### Core Semantics
1. **Dynamic Placement**: Unlike legacy static breakpoints (`interrupt_before` / `interrupt_after`), `interrupt(payload)` can be placed dynamically anywhere within a node (such as in `approval_gate_node`).
2. **State Checkpointing**: When `interrupt()` is called:
   - The graph execution halts immediately.
   - The entire graph state is snapshotted using the configured `MemorySaver` / checkpointer.
   - The interrupt payload (e.g. tool name, target, consequence, risk level) is surfaced to the caller via `agent_graph.get_state(config)`.
3. **Resumption via `Command(resume=...)`**:
   - To resume, the client passes `Command(resume=human_decision)`.
   - The `interrupt()` call in the node returns `human_decision`.
   - The node completes and routes to the next node (`reasoner` or `tool_runner`).
4. **Idempotency Rule**:
   - Because resumption re-enters the node, all side effects before `interrupt()` must be idempotent.
   - In ERIS, tool execution and database mutations occur strictly *after* `interrupt()` returns the approved decision.

---

## 2. Structured Tools via `StructuredTool.from_function`

In `langchain-core >= 1.6.0`, tools are bound to Pydantic v2 schemas:

```python
from langchain_core.tools import StructuredTool

tool = StructuredTool.from_function(
    func=handler_function,
    name="send_email",
    description="Sends a plain-text email with human confirmation.",
    args_schema=SendEmailInput,
)
```

- Converts directly to native OpenAI function-calling JSON schemas via `convert_to_openai_tool()`.
- Replaces string-split parsing (`to|subject|body`) with strict compile-time and runtime validation.
- Generates descriptive field-level error messages if required parameters are missing.

---

## 3. Learning Service Integration

- Learned decisions are captured upon resumption and persisted in `memory/user_habits.json`.
- When safe criteria are met (>= 3 consecutive approvals with 0 rejections), auto-approval triggers for specific verified recipients.
- Any rejection immediately revokes the threshold.
- Distilled rules are automatically injected into the system prompt via `build_habit_prompt()`.

---

## 4. Verification Summary

| Component | Official Spec | ERIS Implementation | Status |
| :--- | :--- | :--- | :--- |
| **Pause Mechanism** | `from langgraph.types import interrupt` | `approval_gate_node` uses `interrupt(payload)` | Verified |
| **Resume Mechanism** | `from langgraph.types import Command` | `runner.resume_after_decision` invokes `Command(resume=...)` | Verified |
| **Checkpointer** | `from langgraph.checkpoint.memory import MemorySaver` | Compiled with `MemorySaver()` | Verified |
| **Tool Schemas** | Pydantic v2 `BaseModel` args_schema | `backend/app/schemas/tools.py` | Verified |
| **Anti-Slop Guard** | Strict zero-boilerplate production code | Verified clean by `scripts/review_ai_slop.py` | Verified |
| **Adversarial Audit** | Sandboxed shell and path containment | Verified passing by `scripts/test_system_exploits.py` | Verified |
