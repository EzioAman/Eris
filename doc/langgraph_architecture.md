# ERIS LangGraph Core Architecture

> Official Reference & Specifications: LangGraph StateGraph, MemorySaver, Human-in-the-Loop Interrupts, and `astream_events(version="v3")`.

---

## 1. Overview & Motivation
ERIS is transitioning its core agent execution engine from custom ReAct string-based tag parsing (`[TOOL: ...]`) to **LangGraph (`langgraph>=1.2.11`)**.

### Key Architectural Shifts:
1. **From Regex Tag Parsing to Native Structured Tool Calling**:
   - Tools are provided via native function schemas (`tools=[...]`) with Pydantic type validation.
   - LLMs emit structured function calls; no `<think>` tags or `[TOOL: ...]` bracket strings leak into the user message stream.
2. **From Fragile Loop State to Persistent StateGraph**:
   - Explicit nodes: `agent_reasoning` ➔ `conditional_edge` ➔ `approval_gate` / `tools_node` ➔ `agent_reasoning`.
3. **From Custom Thread Halts to Native `interrupt()`**:
   - High-severity actions (e.g., `send_email`, destructive shell commands) invoke `interrupt()`.
   - The graph pauses its state in `MemorySaver` (or SQLite checkpointer).
   - When the user approves in the UI, `Command(resume={"approved": True})` resumes the graph deterministically.

---

## 2. Core LangGraph State Specification

```python
from typing import Annotated, Sequence, TypedDict, List, Dict, Any, Optional
from langchain_core.messages import BaseMessage
from langgraph.graph.message import add_messages

class ErisAgentState(TypedDict):
    """Immutable state schema tracking multi-turn agent interaction."""
    messages: Annotated[Sequence[BaseMessage], add_messages]
    session_id: str
    active_model: str
    execution_mode: str
    user_profile: Dict[str, Any]
    approval_pending: Optional[Dict[str, Any]]
    turn_count: int
```

---

## 3. Human-in-the-Loop Approval Pattern (`interrupt` + `Command`)

When a tool requires approval:
1. The `approval_gate` node inspects the pending tool call.
2. If the tool is sensitive (`send_email`, destructive shell commands), it calls:
   ```python
   decision = interrupt({
       "tool": tool_name,
       "args": tool_args,
       "riskLevel": "high",
       "action": f"Send email to {recipient}",
       "consequence": f"Subject: '{subject}'\nBody:\n{body}",
   })
   ```
3. When the user approves in the UI, the backend endpoint sends:
   ```python
   graph.astream_events(Command(resume={"approved": True}), config=config, version="v3")
   ```

---

## 4. SSE Stream Adapter (`astream_events` v3 ➔ ERIS Frontend)

ERIS's React frontend expects standard SSE events:
- `type: "turn_start"`: Triggered when agent turn starts.
- `type: "thought"`: Model reasoning tokens or cognitive trace.
- `type: "search"`: Search query & results.
- `type: "action"`: Tool execution indicators.
- `type: "approval"`: Interactive approval payload when `interrupt` triggers.
- `type: "done"`: Final message, tool calls history, and citations.

The adapter maps LangGraph v3 events:
- `on_chat_model_stream` ➔ emit `type: "thought"` or message tokens.
- `on_tool_start` ➔ emit `type: "action"`.
- `on_tool_end` ➔ emit `type: "observation"`.
- `interrupt` detected via state snapshot ➔ emit `type: "done"` with approval card.
