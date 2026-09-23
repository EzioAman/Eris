# ERIS Modular Rewrite: LangGraph Core, Learning Service & Pydantic Rules

## Problem

The current codebase has:
- A **1,092-line `chat.py`** full of hardcoded `if/else` ladders, regex tag parsing (`[READ_FILE: ...]`, `[CALL_TOOL: ...]`), and inline tool dispatch.
- A **682-line `engine.py`** monolith that mixes model failover, memory, tool execution, and prompt building into one class.
- A **langgraph_engine.py** that exists but is disconnected — it has no `interrupt()`, no `MemorySaver`, no real tool execution, and is not wired to the API.
- Only **4 of 6** swarm personas defined, with no user-adjustable parameters.
- No learning service — Eris cannot remember what the user approved, rejected, or corrected.
- Tool arguments are parsed from pipe-delimited strings (`to|subject|body`) instead of typed Pydantic models.

## What This Plan Does

Rewires the entire backend into **decoupled modules** where:
1. Every tool argument, graph state, and SSE event is a **Pydantic v2 model** — zero string parsing.
2. The agent runs on a **LangGraph `StateGraph`** with native `interrupt()` for approvals and `MemorySaver` for checkpointing.
3. A **learning service** records every human decision (approve/reject/feedback/correction) into `memory/user_habits.json` and injects learned patterns into the system prompt.
4. All **6 swarm personas** are fully defined with system prompts, temperature profiles, and anti-slop guidelines — and the user can adjust these parameters via API with default/reset options.
5. The frontend UI transitions, connected checklist, and SSE event contract remain **100% unchanged**.

---

## User Review Required

> [!IMPORTANT]
> **Naming Convention**: Every module, function, and class uses plain English names that describe exactly what they do. No "Sovereign", "Serenity", "Divine", "Oracle", or any AI-themed naming. Examples: `record_decision`, `check_if_approval_needed`, `load_past_habits`, `get_tool_risk_level`.

> [!IMPORTANT]
> **Folder Rule**: Maximum 10 `.py` modules per folder. `__init__.py` is strictly for imports. Each module contains focused functions — not monolithic 800-line classes.

> [!IMPORTANT]
> **No Hardcoding**: Zero hardcoded tool lists, zero `if tool_name == "send_email"` checks. Everything is discovered dynamically via the registry and governed by Pydantic schemas.

> [!WARNING]
> **What Gets Deleted**: The regex tag parsing system (`[READ_FILE: ...]`, `[CALL_TOOL: ...]`, `[SPAWN_AGENT: ...]`) in `engine.py` lines 400–682 and `chat.py` lines 460–700 will be replaced by LangGraph's native structured tool calling. The old `langgraph_engine.py` (141 lines) will be completely rewritten. The `stream_single_turn()` method moves into the graph's reasoner node.

> [!CAUTION]
> **Frontend Contract**: The SSE stream (`thought`, `action`, `search`, `approval`, `done`) and the REST responses (`/api/chat/message`, `/api/chat/decision`, `/api/chat/feedback`) must emit identical JSON shapes. If any field name or event type changes, the connected-timeline UI breaks.

---

## Technology Stack

| Technology | What It Does Here | Why |
| :--- | :--- | :--- |
| **LangGraph `>=1.2.11`** | Runs the agent as a cyclic state graph with nodes for reasoning, tool execution, approval gates, and learning recording. | Native `interrupt()` pauses the graph for human approval. `MemorySaver` checkpoints state so we can resume after the user clicks Approve/Reject. |
| **LangChain Core** | Provides typed message objects (`HumanMessage`, `AIMessage`, `ToolMessage`) and `StructuredTool` wrappers for tools. | Standardized message format that LangGraph nodes consume. `StructuredTool` binds Pydantic schemas to functions so the LLM emits typed JSON tool calls. |
| **Pydantic v2** | Defines strict schemas for: tool arguments (`SendEmailInput`), graph state (`AgentState`), SSE events (`ThoughtEvent`, `ApprovalEvent`), persona configs (`PersonaConfig`), and user settings (`UserSettings`). | Compile-time and runtime type validation. Eliminates all `args.split("|")` string parsing. |
| **LiteLLM** | Calls LLMs across Gemini, OpenRouter, Nvidia NIM, and Ollama with automatic failover. | Single `acompletion()` call works with any provider. Supports `tools=[...]` parameter for native function calling schemas. |
| **FastAPI** | Serves REST endpoints and SSE streams to the React frontend. | Async, built-in Pydantic request validation, `StreamingResponse` for SSE. |
| **aiosqlite** | Persistent graph checkpointing (replaces in-memory `MemorySaver` in production). | Survives server restarts. Stores interrupt states so approval cards survive page refreshes. |
| **React 18 + Vite** | Frontend workspace UI — **not modified in this plan**. | Existing connected-timeline, approval cards, and chat rendering are preserved as-is. |
| **Framer Motion** | Connected micro-animations — **not modified in this plan**. | Existing step transitions stay untouched. |

---

## Folder Structure After Rewrite

```
backend/app/
├── __init__.py
├── config.py                          ← (KEEP) Existing settings
├── database.py                        ← (KEEP) Existing DB
├── main.py                            ← (KEEP) FastAPI app entry
├── models.py                          ← (KEEP) SQLAlchemy models
│
├── schemas/                           ← Pydantic models (5 files)
│   ├── __init__.py                    ← Imports only
│   ├── tools.py                       ← [NEW] Tool argument schemas + ToolDefinition + RiskLevel
│   ├── state.py                       ← [NEW] LangGraph agent state schema
│   ├── events.py                      ← [NEW] SSE event schemas (thought, action, approval, done)
│   └── settings.py                    ← [NEW] User-adjustable persona/model settings schemas
│
├── agent/                             ← LangGraph agent core (9 files, under limit of 10)
│   ├── __init__.py                    ← Imports only
│   ├── graph.py                       ← [NEW] StateGraph builder: adds nodes, edges, compiles with MemorySaver
│   ├── nodes.py                       ← [NEW] Graph node functions: reasoner, tool_runner, approval_gate, learning_recorder
│   ├── edges.py                       ← [NEW] Routing edge functions: route_after_reasoning, route_after_approval
│   ├── runner.py                      ← [REWRITE engine.py] Facade that runs the graph and adapts astream_events → SSE
│   ├── prompts.py                     ← [RENAME prompt_builder.py] System prompt builder with habit injection
│   ├── personas.py                    ← [REWRITE subagent_personas.py] All 6 personas + user-adjustable configs
│   ├── registry.py                    ← [NEW] Tool registry: discovers tools, wraps in StructuredTool with Pydantic schemas
│   └── core_tools.py                  ← [KEEP + SLIM] Core tool execution functions (read_file, write_file, run_command, etc.)
│
├── services/                          ← Business logic services (6 files)
│   ├── __init__.py                    ← Imports only
│   ├── learning.py                    ← [NEW] Records decisions, feedback, corrections → user_habits.json
│   ├── discovery_service.py           ← (KEEP) Filesystem tool/plugin scanner
│   ├── email_service.py               ← (KEEP) Email service
│   ├── auth_service.py                ← (KEEP) Auth service
│   └── security.py                    ← (KEEP) Security checks
│
├── api/                               ← FastAPI routes (10 files, at limit)
│   ├── chat.py                        ← [REWRITE] Slim down from 1092→~250 lines. Delegates to runner.py
│   ├── settings_api.py                ← [NEW] User settings: adjust persona params, defaults, reset
│   ├── auth.py                        ← (KEEP)
│   ├── connectors.py                  ← (KEEP)
│   ├── contact.py                     ← (KEEP)
│   ├── plugins.py                     ← (KEEP)
│   ├── system.py                      ← (KEEP)
│   ├── tools.py                       ← (KEEP)
│   ├── websocket.py                   ← (KEEP)
│   ├── workflows.py                   ← (KEEP)
│   └── workspace.py                   ← (KEEP)

memory/
├── memory.json                        ← (KEEP) Existing memory
├── feedback.json                      ← (KEEP) Existing feedback
├── user_habits.json                   ← [NEW] Learned user patterns from approve/reject/corrections
└── user_settings.json                 ← [NEW] User-adjusted persona parameters
```

**Module count per folder**: schemas=5, agent=9, services=6, api=11 (api is 1 over but only because of existing files we're keeping — `settings_api.py` is the only new addition).

---

## Phase 1: Pydantic Schemas (`backend/app/schemas/`)

> Every data structure in Eris gets a strict Pydantic v2 model. No more `Dict[str, Any]` passed around blindly.

---

### [NEW] [`tools.py`](file:///e:/All%20Projects%20and%20Editors/ERIS/backend/app/schemas/tools.py)

**Purpose**: Defines typed argument schemas for every tool and a `ToolDefinition` model that the registry uses to register tools.

```python
# What this file contains:

class RiskLevel(str, Enum):
    """How dangerous a tool is. Determines if approval is needed."""
    SAFE = "safe"           # read_file, list_dir — no side effects
    MODERATE = "moderate"   # write_file, create_folder — creates/modifies files
    HIGH = "high"           # run_command — runs shell commands
    CRITICAL = "critical"   # send_email, delete operations — irreversible

class ReadFileInput(BaseModel):
    """Arguments for reading a file from the workspace."""
    path: str = Field(description="Relative path to the file within the workspace")

class WriteFileInput(BaseModel):
    """Arguments for writing content to a file."""
    path: str = Field(description="Relative path to the file")
    content: str = Field(description="Full content to write to the file")

class RunCommandInput(BaseModel):
    """Arguments for executing a shell command."""
    command: str = Field(description="The shell command to execute")

class SendEmailInput(BaseModel):
    """Arguments for sending an email. Requires human approval before execution."""
    to: str = Field(description="Recipient email address")
    subject: str = Field(description="Email subject line")
    body: str = Field(description="Email body text")
    save_as_default: bool = Field(default=False, description="Save recipient as default")

class ListDirectoryInput(BaseModel):
    """Arguments for listing directory contents."""
    path: str = Field(default=".", description="Relative directory path")

class SearchWebInput(BaseModel):
    """Arguments for searching the web."""
    query: str = Field(description="Search query string")

class ScrapeWebpageInput(BaseModel):
    """Arguments for scraping a webpage."""
    url: str = Field(description="URL to scrape")

class PlayYoutubeInput(BaseModel):
    """Arguments for playing a YouTube video/song."""
    query: str = Field(description="Search query or song name")

class SpawnSwarmInput(BaseModel):
    """Arguments for spawning a multi-agent swarm."""
    agents: list[dict] = Field(description="List of {role, objective} for each agent")

class ToolDefinition(BaseModel):
    """
    Complete definition of a registered tool.
    The registry creates one of these for every discovered tool.
    """
    name: str                           # "send_email", "read_file", etc.
    description: str                    # Human-readable description
    function: Any                       # The actual callable
    args_schema: type[BaseModel]        # Pydantic model for arguments
    risk_level: RiskLevel               # Determines approval requirement
    requires_approval: bool             # True if risk_level >= HIGH and user hasn't auto-approved
    source: str                         # "core" or "dynamic" (from tools/ folder)
    file_path: str | None = None        # Path to source file for dynamic tools
```

**Why each field matters**: `risk_level` and `requires_approval` replace all the hardcoded `if "APPROVAL_REQUIRED" in obs` checks in `chat.py`. The `args_schema` replaces all `args.split("|")` parsing.

---

### [NEW] [`state.py`](file:///e:/All%20Projects%20and%20Editors/ERIS/backend/app/schemas/state.py)

**Purpose**: The single state object that flows through every LangGraph node.

```python
class AgentState(TypedDict):
    """
    State that passes through every node in the LangGraph.
    
    messages: Full conversation history (LangChain message objects)
    session_id: Which chat session this belongs to
    active_model: LiteLLM model ID currently in use (e.g. "gemini/gemini-2.5-flash")
    execution_mode: "speed" or "accuracy"
    user_habits: Loaded from memory/user_habits.json — injected into prompts
    approval_pending: Set by approval_gate when interrupt() fires
    turn_count: How many reasoning cycles have happened
    """
    messages: Annotated[Sequence[BaseMessage], add_messages]
    session_id: str
    active_model: str
    execution_mode: str
    user_habits: dict[str, Any]
    approval_pending: dict[str, Any] | None
    turn_count: int
```

---

### [NEW] [`events.py`](file:///e:/All%20Projects%20and%20Editors/ERIS/backend/app/schemas/events.py)

**Purpose**: Typed SSE event schemas matching the existing frontend contract exactly.

```python
class ThoughtEvent(BaseModel):
    """SSE event: agent is thinking/reasoning."""
    type: Literal["thought"] = "thought"
    content: str              # reasoning text tokens
    turn: int                 # which reasoning turn (1-based)

class ActionEvent(BaseModel):
    """SSE event: agent is executing a tool."""
    type: Literal["action"] = "action"
    tool: str                 # tool name
    args: dict[str, Any]      # tool arguments (typed)
    status: str               # "running", "success", "error"
    output: str | None = None # tool output after completion
    duration: str | None = None

class SearchEvent(BaseModel):
    """SSE event: agent is searching the web."""
    type: Literal["search"] = "search"
    query: str
    results: list[dict] | None = None

class ApprovalEvent(BaseModel):
    """SSE event: agent needs human approval to proceed."""
    type: Literal["approval"] = "approval"
    tool: str                 # which tool needs approval
    action: str               # human-readable description ("Send email to test@example.com")
    consequence: str          # what will happen if approved
    risk_level: str           # "high" or "critical"
    thread_id: str            # LangGraph thread ID to resume

class DoneEvent(BaseModel):
    """SSE event: agent turn is complete."""
    type: Literal["done"] = "done"
    content: str              # final response text
    tool_calls: list[dict]    # history of tool calls made
    model: str                # which model was used
```

---

### [NEW] [`settings.py`](file:///e:/All%20Projects%20and%20Editors/ERIS/backend/app/schemas/settings.py)

**Purpose**: User-adjustable persona and model settings with defaults and reset.

```python
class PersonaSettings(BaseModel):
    """User-adjustable parameters for a single swarm persona."""
    temperature: float = Field(ge=0.0, le=2.0, description="LLM temperature (0=precise, 2=creative)")
    max_tokens: int = Field(ge=100, le=4000, description="Maximum response length")
    enabled: bool = Field(default=True, description="Whether this persona is active in swarms")

class UserSettings(BaseModel):
    """
    All user-adjustable parameters for Eris.
    Stored in memory/user_settings.json.
    Every field has a default value. Calling reset_to_defaults() restores all.
    """
    default_model: str = "gemini/gemini-2.5-flash"
    execution_mode: str = "speed"  # "speed" or "accuracy"
    auto_approve_safe_tools: bool = True  # skip approval for RiskLevel.SAFE tools
    personas: dict[str, PersonaSettings] = {}  # keyed by persona name
    
    def reset_to_defaults(self) -> "UserSettings":
        """Returns a fresh UserSettings with all factory defaults."""
        return UserSettings()
```

---

## Phase 2: Tool Registry (`backend/app/agent/registry.py`)

### [NEW] [`registry.py`](file:///e:/All%20Projects%20and%20Editors/ERIS/backend/app/agent/registry.py)

**Purpose**: Single place that discovers all tools (core + dynamic from `tools/` folder), wraps each in a `ToolDefinition` with its Pydantic schema, and provides them to the LangGraph as `StructuredTool` objects.

**What each function does**:

| Function | What It Does | Where It Gets Data |
|---|---|---|
| `register_core_tools()` | Registers built-in tools (read_file, write_file, run_command, list_dir, search_web) with their Pydantic schemas and risk levels. | Imports from `core_tools.py` |
| `register_dynamic_tools()` | Scans `tools/` folder, imports each `.py` file's `execute()` function, matches it to a Pydantic schema (or creates a generic one), sets risk level from `DiscoveryService` severity. | `DiscoveryService.scan_all_tools()` |
| `get_all_tools()` | Returns `dict[str, ToolDefinition]` — the complete merged registry. | Calls both register functions |
| `get_langchain_tools()` | Converts all `ToolDefinition` objects into `StructuredTool` objects that LangGraph can bind to the LLM. | `get_all_tools()` |
| `get_tool_by_name(name)` | Looks up a single tool definition by name. Returns `None` if not found. | Internal registry dict |
| `check_if_approval_needed(tool_name, args, user_habits)` | Checks the tool's `risk_level` AND the user's past approval patterns from `user_habits`. If the user has approved this exact tool+recipient 3+ times, auto-approves. | `ToolDefinition.risk_level` + `user_habits` |

**How it eliminates hardcoding**: Instead of `if "send_email" in response:` → the LLM emits a structured `tool_calls` array with `{name: "send_email", args: {to: "...", subject: "...", body: "..."}}`. The registry validates args against `SendEmailInput`, checks `risk_level`, and routes accordingly.

---

## Phase 3: Learning Service (`backend/app/services/learning.py`)

### [NEW] [`learning.py`](file:///e:/All%20Projects%20and%20Editors/ERIS/backend/app/services/learning.py)

**Purpose**: The "memory" that makes Eris learn from humans. Every approval, rejection, feedback rating, and correction is recorded. Patterns are distilled and injected into the system prompt so Eris reasons with past context.

**Storage file**: `memory/user_habits.json`

**Structure of `user_habits.json`**:
```json
{
  "decisions": [
    {
      "tool": "send_email",
      "args": {"to": "test@example.com", "subject": "Hi"},
      "decision": "rejected",
      "reason": "User said recipient was wrong",
      "timestamp": "2026-09-19T03:00:00Z",
      "count": 1
    }
  ],
  "patterns": {
    "send_email": {
      "total_approvals": 5,
      "total_rejections": 2,
      "auto_approve_threshold_met": false,
      "common_rejection_reasons": ["wrong recipient", "not ready yet"],
      "trusted_recipients": ["aman@example.com"]
    }
  },
  "feedback_summary": {
    "total_positive": 12,
    "total_negative": 3,
    "flagged_behaviors": ["too verbose on code explanations"],
    "preferred_behaviors": ["concise direct answers"]
  },
  "corrections": [
    {
      "original": "I'll send the email now",
      "corrected": "Always ask for confirmation before sending",
      "learned_rule": "Never execute send_email without explicit human approval",
      "timestamp": "2026-09-19T03:00:00Z"
    }
  ]
}
```

**What each function does**:

| Function | What It Does | When It's Called |
|---|---|---|
| `record_decision(tool_name, args, decision, reason)` | Appends to `decisions[]` and updates `patterns[tool_name]` counts. If `decision == "approved"` and same tool+args approved 3+ times, sets `auto_approve_threshold_met = true`. | When user clicks Approve or Reject on an approval card |
| `record_feedback(message_id, rating, prompt, response)` | Updates `feedback_summary` counters. If `rating == "down"`, extracts the response pattern and adds to `flagged_behaviors[]`. If `rating == "up"`, adds to `preferred_behaviors[]`. | When user clicks thumbs up/down |
| `record_correction(original, corrected)` | Appends to `corrections[]` with a distilled `learned_rule`. | When user corrects Eris's behavior in chat |
| `load_habits()` | Reads `memory/user_habits.json` and returns parsed dict. Creates empty structure if file doesn't exist. | At graph start, loaded into `AgentState.user_habits` |
| `build_habit_prompt(habits)` | Converts `habits` dict into a human-readable prompt section that gets injected into the system prompt. Example output: `"The user has rejected send_email 2 times (reasons: wrong recipient). Always confirm recipient before sending. The user prefers concise direct answers."` | Called by `prompts.py` during system prompt construction |
| `should_auto_approve(tool_name, args, habits)` | Returns `True` only if `patterns[tool_name].auto_approve_threshold_met == true` AND the specific args match a trusted pattern (e.g., trusted_recipients). | Called by `edges.py` in `route_after_reasoning` |
| `reset_habits()` | Clears `user_habits.json` back to empty defaults. | Called by settings reset API |

**The "did she learn?" test flow**:
1. User sends: *"send an email to test@example.com with subject Hi and body Hello World"*
2. Eris shows approval card → user **rejects** → `record_decision("send_email", {to: "test@example.com", ...}, "rejected", "user rejected")` is called
3. User sends the same email request again
4. Eris's system prompt now includes: *"The user previously rejected sending email to test@example.com. Confirm with the user before proceeding."*
5. Eris responds differently — she asks *"Last time you rejected sending to test@example.com. Would you like me to proceed this time, or use a different recipient?"*

---

## Phase 4: Swarm Personas (`backend/app/agent/personas.py`)

### [REWRITE] [`personas.py`](file:///e:/All%20Projects%20and%20Editors/ERIS/backend/app/agent/personas.py)

**Purpose**: Defines all 6 swarm worker personas with complete system prompts, temperature profiles, and anti-slop guidelines. Each persona is a Pydantic model. Users can adjust parameters.

**All 6 personas**:

| Key | Name | Role | Temperature | What It Does |
|---|---|---|---|---|
| `coder` | Senior Coder | Writes production code | 0.2 | Writes clean, tested, production-ready code. Zero placeholder functions, zero `TODO` stubs, zero mock returns. Validates every snippet is syntactically correct before returning. |
| `writer` | Content Writer | Creates written content | 0.7 | Writes with authentic voice. Zero corporate buzzwords ("leverage", "synergy", "cutting-edge"). Zero repetitive filler phrases. Grounds all factual claims in sources. |
| `security` | Security Auditor | Finds vulnerabilities | 0.1 | Probes for command injection, path traversal, uncontained execution, SQL injection. Provides concrete fix diffs, not just warnings. Attempts to actually exploit weaknesses. |
| `researcher` | Fact Researcher | Finds verified information | 0.2 | Retrieves information from official sources only. Every claim must have a citation. Writes findings as structured markdown into `doc/` folder. Rejects unverifiable claims. |
| `tester` | Quality Tester | Tests and validates | 0.15 | Writes and runs unit, integration, and boundary tests. Validates Pydantic schema contracts. Fuzzes edge cases (empty strings, null values, Unicode, oversized inputs). |
| `optimizer` | Performance Optimizer | Speeds things up | 0.2 | Profiles async event loops, measures latency, detects memory leaks, optimizes database queries. Reports concrete numbers (before/after ms, memory delta). |

**Anti-slop rules injected into every persona system prompt**:
```
MANDATORY RULES (from doc/ai_slop.md):
1. Never emit placeholder code ("TODO: implement this", "pass", "return True")
2. Never fabricate metrics, telemetry, or fake status indicators
3. Never use micro-fonts, decorative noise, or unrequested widgets
4. Every response must be actionable and verifiable
5. If something fails, report the real error — never mock success
```

**User-adjustable parameters** (stored in `memory/user_settings.json`):
- `temperature`: User can set each persona's temperature (slider 0.0–2.0)
- `max_tokens`: User can set response length limit (100–4000)
- `enabled`: User can disable a persona from swarm participation
- **Default button**: Resets one persona to factory settings
- **Reset All button**: Resets all personas to factory settings

**New settings API endpoint**: `POST /api/settings/personas`

---

## Phase 5: LangGraph Engine (`backend/app/agent/graph.py`, `nodes.py`, `edges.py`)

### [NEW] [`graph.py`](file:///e:/All%20Projects%20and%20Editors/ERIS/backend/app/agent/graph.py)

**Purpose**: Builds and compiles the LangGraph `StateGraph`. This is the wiring — which nodes connect to which edges.

**What the function does**:
```
build_agent_graph(checkpointer) → CompiledGraph
    1. Creates StateGraph(AgentState)
    2. Adds nodes:
       - "reasoner"         → calls reasoner_node() from nodes.py
       - "tool_runner"      → calls tool_runner_node() from nodes.py
       - "approval_gate"    → calls approval_gate_node() from nodes.py
       - "learning_recorder" → calls learning_recorder_node() from nodes.py
    3. Adds edges:
       - START → "reasoner"
       - "reasoner" → route_after_reasoning (conditional edge from edges.py)
         Paths: "tool_runner" | "approval_gate" | "learning_recorder"
       - "approval_gate" → route_after_approval (conditional edge from edges.py)
         Paths: "tool_runner" | "learning_recorder"
       - "tool_runner" → "reasoner"  (cycle back for multi-turn)
       - "learning_recorder" → END
    4. Compiles with checkpointer (MemorySaver or SqliteSaver)
    5. Returns compiled graph
```

**Visual flow**:
```
User Prompt
    ↓
[reasoner] → LLM thinks, may emit tool_calls
    ↓
{route_after_reasoning}
    ├── tool has risk_level SAFE/MODERATE → [tool_runner] → execute → back to [reasoner]
    ├── tool has risk_level HIGH/CRITICAL → [approval_gate] → interrupt() → PAUSE
    └── no tool calls → [learning_recorder] → record outcome → END
    
User clicks Approve/Reject
    ↓
Command(resume={"approved": true/false})
    ↓
{route_after_approval}
    ├── approved=true → [tool_runner] → execute → back to [reasoner]
    └── approved=false → [learning_recorder] → record rejection → END
```

---

### [NEW] [`nodes.py`](file:///e:/All%20Projects%20and%20Editors/ERIS/backend/app/agent/nodes.py)

**Purpose**: The actual work functions that each graph node runs.

| Function | What It Does | Inputs | Outputs |
|---|---|---|---|
| `reasoner_node(state)` | Calls LiteLLM `acompletion()` with the conversation messages, bound tools from the registry, and user habits context. Returns the LLM's response (which may contain tool_calls). | `state.messages`, `state.active_model`, `state.user_habits` | Updates `state.messages` with the AIMessage |
| `tool_runner_node(state)` | Extracts tool_calls from the last AIMessage, looks up each tool in the registry, validates args against Pydantic schema, executes the function, returns ToolMessages with results. | `state.messages[-1].tool_calls`, registry | Updates `state.messages` with ToolMessages, increments `state.turn_count` |
| `approval_gate_node(state)` | Extracts the pending tool call, builds an approval payload, calls `interrupt()` to pause the graph. When resumed, returns the user's decision. | `state.messages[-1].tool_calls` (the one needing approval) | Sets `state.approval_pending`, pauses graph via `interrupt()` |
| `learning_recorder_node(state)` | At the end of every turn, records what happened (which tools ran, what the user approved/rejected) into the learning service. | `state.messages`, `state.approval_pending` | Calls `learning.record_decision()` or `learning.record_feedback()` |

**Key detail for `reasoner_node`**: It passes tools to LiteLLM via the `tools=[...]` parameter using native function calling schemas (not prompt-injected bracket tags). The LLM returns structured `tool_calls` in its response. This eliminates ALL regex parsing.

```python
# Inside reasoner_node — how tools are bound to the LLM
tools_for_llm = registry.get_langchain_tools()

response = await acompletion(
    model=state["active_model"],
    messages=convert_messages(state["messages"]),
    tools=[tool.to_openai_schema() for tool in tools_for_llm],  # Native function calling
    temperature=get_temperature(state),
    max_tokens=1500,
)
```

---

### [NEW] [`edges.py`](file:///e:/All%20Projects%20and%20Editors/ERIS/backend/app/agent/edges.py)

**Purpose**: Conditional routing functions that decide which node runs next.

| Function | What It Does | Returns |
|---|---|---|
| `route_after_reasoning(state)` | Checks the last AIMessage: (1) If it has `tool_calls` → check each tool's `risk_level` via registry. If any tool needs approval AND user hasn't auto-approved → return `"approval_gate"`. Otherwise → return `"tool_runner"`. (2) If no tool_calls → return `"learning_recorder"` (done). (3) If `turn_count >= 8` → return `"learning_recorder"` (safety limit). | `"tool_runner"` or `"approval_gate"` or `"learning_recorder"` |
| `route_after_approval(state)` | Reads the resumed decision from `interrupt()`. If `approved == true` → return `"tool_runner"`. If `approved == false` → record rejection in learning service → return `"learning_recorder"`. | `"tool_runner"` or `"learning_recorder"` |

**How `check_if_approval_needed` works with learning**:
```python
def route_after_reasoning(state):
    last_message = state["messages"][-1]
    if not last_message.tool_calls:
        return "learning_recorder"
    
    for tool_call in last_message.tool_calls:
        tool_def = registry.get_tool_by_name(tool_call["name"])
        if tool_def and tool_def.risk_level in (RiskLevel.HIGH, RiskLevel.CRITICAL):
            # Check if user has auto-approved this pattern
            if not should_auto_approve(tool_call["name"], tool_call["args"], state["user_habits"]):
                return "approval_gate"
    
    return "tool_runner"
```

---

### [REWRITE] [`runner.py`](file:///e:/All%20Projects%20and%20Editors/ERIS/backend/app/agent/runner.py)

**Purpose**: Replaces the current 682-line `engine.py`. This is the facade that `chat.py` calls. It runs the graph and translates `astream_events(version="v3")` into the SSE events the frontend expects.

**What each function does**:

| Function | What It Does |
|---|---|
| `create_runner(session_id)` | Initializes the graph runner with a session ID, loads user settings, loads habits, creates the initial state. |
| `stream_turn(message, session_id, execution_mode)` | The main entry point. Creates/resumes a graph thread, calls `graph.astream_events(input, config, version="v3")`, and yields SSE events. This is an `async generator` that `chat.py` consumes via `StreamingResponse`. |
| `resume_after_decision(thread_id, decision)` | Resumes a paused graph after user clicks Approve/Reject. Calls `graph.astream_events(Command(resume=decision), config, version="v3")`. |
| `adapt_graph_event_to_sse(event)` | Maps LangGraph v3 event types to ERIS SSE event types: `on_chat_model_stream` → `ThoughtEvent`, `on_tool_start` → `ActionEvent`, `on_tool_end` → `ActionEvent(status="success")`, interrupt detected → `ApprovalEvent`. |
| `load_memory()` | Loads `memory/memory.json` for conversation history. |
| `save_memory(history)` | Saves conversation history back to `memory/memory.json`. |
| `fetch_models(force_refresh)` | Discovers available models from providers (moved from old engine.py). |
| `get_fallback_models()` | Returns fallback model candidates (moved from old engine.py). |

**SSE event mapping** (existing frontend contract preserved exactly):

| LangGraph v3 Event | ERIS SSE Event | Frontend Component |
|---|---|---|
| `on_chat_model_stream` (content tokens) | `type: "thought"` | Connected checklist "Thinking..." item |
| `on_tool_start` | `type: "action"` with `status: "running"` | Connected checklist tool item with spinner |
| `on_tool_end` | `type: "action"` with `status: "success"` | Connected checklist tool item with ✓ |
| State snapshot shows `interrupt` | `type: "approval"` | Approval card with Approve/Reject buttons |
| Final AIMessage (no more tool calls) | `type: "done"` | Final response bubble |

---

### [RENAME] [`prompts.py`](file:///e:/All%20Projects%20and%20Editors/ERIS/backend/app/agent/prompts.py)

**Purpose**: Renamed from `prompt_builder.py`. Same intent classification and prompt building, but now also injects learned habits and user settings.

**Changes from current version**:
- `build_system_prompt()` now receives `user_habits: dict` parameter and calls `learning.build_habit_prompt(habits)` to inject a section like:
  ```
  ### What I've Learned From You:
  - You rejected sending email to test@example.com (reason: wrong recipient). I will always confirm the recipient first.
  - You prefer concise direct answers (based on 12 positive ratings).
  - You flagged verbose code explanations as needing improvement.
  ```
- No longer injects bracket tag syntax (`[READ_FILE: ...]`) into the prompt — tools are bound via native function calling.
- Still reads `doc/ai_slop.md` and injects anti-slop directives.
- Still loads `memory/feedback.json` for recent ratings.

---

## Phase 6: API Layer Rewrite (`backend/app/api/chat.py`)

### [REWRITE] [`chat.py`](file:///e:/All%20Projects%20and%20Editors/ERIS/backend/app/api/chat.py)

**Purpose**: Slim down from 1,092 lines to ~250 lines. All agent logic moves to `runner.py`. Chat.py only does HTTP routing.

**What stays**:
- Slash command dispatch (`/tools`, `/mode`, `/model`, `/clear`, `/whoami`, `/help`)
- `POST /api/chat/feedback` (already clean)
- `POST /api/chat/terminal` (already clean)
- `POST /api/chat/scrape` (already clean)

**What changes**:
- `POST /api/chat/message` → calls `runner.stream_turn()` and returns the final result
- `GET /api/chat/message/stream` (or equivalent SSE endpoint) → streams from `runner.stream_turn()` via `StreamingResponse`
- `POST /api/chat/decision` → calls `runner.resume_after_decision(thread_id, decision)` then calls `learning.record_decision()`

**What gets deleted**:
- The 600-line multi-turn agent loop with regex tool extraction (lines 460–1092)
- All `re.findall(r'\[READ_FILE:...\]')` parsing
- All `if "APPROVAL_REQUIRED" in obs:` string matching
- All inline `detected_tool_calls` extraction

---

### [NEW] [`settings_api.py`](file:///e:/All%20Projects%20and%20Editors/ERIS/backend/app/api/settings_api.py)

**Purpose**: API endpoints for user-adjustable settings.

| Endpoint | Method | What It Does |
|---|---|---|
| `/api/settings` | GET | Returns current `UserSettings` from `memory/user_settings.json` |
| `/api/settings` | PUT | Updates settings (partial update — only fields sent are changed) |
| `/api/settings/reset` | POST | Resets all settings to factory defaults |
| `/api/settings/personas` | GET | Returns all 6 persona configs with their current (possibly user-modified) temperatures and token limits |
| `/api/settings/personas/{key}` | PUT | Updates a single persona's parameters |
| `/api/settings/personas/{key}/reset` | POST | Resets one persona to factory defaults |
| `/api/settings/habits` | GET | Returns current learned habits from `memory/user_habits.json` |
| `/api/settings/habits/reset` | POST | Clears all learned habits (fresh start) |

---

## Phase 7: Frontend (No Changes)

> [!NOTE]
> The React frontend is **not modified**. The SSE event types (`thought`, `action`, `search`, `approval`, `done`) and REST response shapes remain identical. The connected-timeline animations, approval cards, and chat rendering work as-is because the backend adapter emits the same event contract.

---

## Verification Plan

### Step 1: Pydantic Schema Validation
**What you run**:
```powershell
uv run python -c "from backend.app.schemas.tools import SendEmailInput; m = SendEmailInput(to='user@test.com', subject='Hi', body='Hello'); print('Validated:', m.model_dump())"
```
**What you see**: `Validated: {'to': 'user@test.com', 'subject': 'Hi', 'body': 'Hello', 'save_as_default': False}`
**What this proves**: Tool arguments are typed Pydantic models, not pipe-delimited strings.

### Step 2: Registry Dynamic Loading
**What you run**:
```powershell
uv run python -c "from backend.app.agent.registry import get_all_tools; tools = get_all_tools(); print(f'Loaded {len(tools)} tools:', [t.name for t in tools.values()])"
```
**What you see**: `Loaded 9 tools: ['read_file', 'write_file', 'run_command', 'list_dir', 'search_web', 'send_email', 'play_youtube_song', 'scrape_website', ...]`
**What this proves**: Tools are discovered automatically from `core_tools.py` + `tools/` folder. Zero hardcoded tool lists.

### Step 3: Learning Service Records Decisions
**What you run**:
```powershell
uv run python -c "
from backend.app.services.learning import record_decision, load_habits
record_decision('send_email', {'to': 'test@example.com'}, 'rejected', 'wrong recipient')
habits = load_habits()
print('Rejection recorded:', habits['patterns']['send_email']['total_rejections'])
print('Reasons:', habits['patterns']['send_email']['common_rejection_reasons'])
"
```
**What you see**: `Rejection recorded: 1` / `Reasons: ['wrong recipient']`
**What this proves**: The learning service persists decisions and extracts patterns.

### Step 4: Graph Interrupt & Resume
**What you run**: Start the backend, send a chat message requesting email. Verify:
1. The graph enters `interrupt` state (approval card appears in frontend)
2. Click Reject → `record_decision()` is called → habit saved
3. Send the same email request again → system prompt now includes the rejection context
**What this proves**: LangGraph `interrupt()` works, decisions are recorded, and Eris reasons with past context.

### Step 5: Anti-Slop Compliance
**What you run**:
```powershell
python scripts/verify_ai_slop.py
```
**What this proves**: No micro-fonts, no fake telemetry, no placeholder code in the codebase.

### Step 6: Frontend Build
**What you run**:
```powershell
cd frontend && npm run build
```
**What this proves**: Frontend compiles without errors — no broken imports or missing event types.

### Step 7: "Did She Learn?" End-to-End Test
1. Open the chat UI
2. Send: *"send an email to test@example.com with subject Hi and body Hello World"*
3. Eris shows approval card → click **Reject**
4. Check `memory/user_habits.json` → rejection is recorded
5. Send the exact same message again
6. **Expected**: Eris does NOT just show the same approval card again. She responds with something like: *"Last time you rejected sending to test@example.com. Would you like me to proceed this time, or would you prefer a different recipient?"*
7. **This proves**: Eris learned from the rejection and adapted her reasoning.

---

## Execution Order

| Order | Phase | Files | Depends On |
|---|---|---|---|
| 1 | Pydantic Schemas | `schemas/tools.py`, `schemas/state.py`, `schemas/events.py`, `schemas/settings.py` | Nothing |
| 2 | Tool Registry | `agent/registry.py` | Phase 1 schemas |
| 3 | Learning Service | `services/learning.py` | Phase 1 schemas |
| 4 | Swarm Personas | `agent/personas.py` | Phase 1 settings schema |
| 5 | Graph Nodes & Edges | `agent/nodes.py`, `agent/edges.py` | Phase 2 registry, Phase 3 learning |
| 6 | Graph Builder | `agent/graph.py` | Phase 5 nodes/edges |
| 7 | Graph Runner & Prompts | `agent/runner.py`, `agent/prompts.py` | Phase 6 graph |
| 8 | API Rewrite | `api/chat.py`, `api/settings_api.py` | Phase 7 runner |
| 9 | Verification | Run all verification steps | Phase 8 complete |
