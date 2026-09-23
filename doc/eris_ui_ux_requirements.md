# ERIS CLI to UI/UX Architecture & Requirement Specification

> Generated from comprehensive analysis of [`eris_cli.py`](file:///e:/All%20Projects%20and%20Editors/ERIS/eris_cli.py), [`prompt_builder.py`](file:///e:/All%20Projects%20and%20Editors/ERIS/prompt_builder.py), and [`tool_guardrails.py`](file:///e:/All%20Projects%20and%20Editors/ERIS/tool_guardrails.py).

---

## 1. Core System Architecture in `eris_cli.py`

`eris_cli.py` establishes the sovereign AI companion architecture with these fundamental pillars:

### A. Dynamic Model Configuration Matrix
- **Supported Providers**:
  - **Google Gemini**: Direct API (`gemini-3.5-flash`, `gemini-3.6-flash`, etc.)
  - **Nvidia NIM**: Reasoning and coding endpoints
  - **OpenRouter**: Access to open and proprietary models with pricing tier flags (`:free`, paid)
- **Capability Tags**:
  - `⚡Coding`, `⚡Vision`, `⚡Audio`, `⚡Reasoning`, `[Free]`
- **Execution Modes**:
  - `speed`: Rapid iterative execution with soft warnings
  - `accuracy`: Strict AST guardrails requiring zero template violations

### B. Autonomous Tool Creation & Lifecycle
- **Tool Storage**: `tools/` workspace directory strictly contained.
- **Integrity Registry**: `tools/.tool_registry.json` tracks SHA256 hashes and statuses:
  - `verified`: Passed sandbox AST compile and dry-run execution.
  - `edited-needs re-evaluation`: Tool was altered externally; requires automated sandbox re-evaluation before execution.
- **Win32 Sandbox Validation**:
  - Runs isolated temporary Python process executing `mod.execute("__test_ping__")`.
  - Blocks dangerous patterns (e.g. system commands, self-termination, credential leakage).
- **Universal Tool Guardrails**:
  - Enforces generic templates without hardcoded strings/paths.
  - Requires standard contract: `TOOL_NAME`, `TOOL_DESCRIPTION`, `def execute(args: str) -> str`.

### C. Sovereign Memory & State Persistence
- **Multi-tiered Memory**:
  - Primary: `memory/memory.json`
  - Fallback: `~/.eris/memory.json`
- **Episodic Window**: Last 10 conversational turns preserved with identity facts.

---

## 2. UI/UX Requirements for the Dashboard & Workspace

Based on the capabilities and operational lifecycle of `eris_cli.py`, the frontend UI/UX must provide:

### 1. Autonomous Flow Engine (Dynamic Workflow Generation)
- **Requirement**: ERIS must not be restricted to static tasks. ERIS can autonomously decompose any user prompt into a structured multi-step flow diagram (`steps` with `id`, `name`, `detail`, `tool`, `status: 'completed' | 'active' | 'pending' | 'failed'`).
- **Visual Presentation**:
  - Interactive flowchart with connected nodes and status indicator pills.
  - Execution audit timeline tracking agent decisions, tool durations, and safety validations.

### 2. Context Menu Navigation
- **Requirement**: Web/desktop context menu adhering to [react-native-reusables Context Menu](https://reactnativereusables.com/docs/components/context-menu).
- **Items**:
  - `Back` (`Alt+←`)
  - `Forward` (`Alt+→`)
  - `Reload` (`Ctrl+R`)
  - Separator
  - `Copy` (`Ctrl+C`)
  - `Paste` (`Ctrl+V`)

### 3. Collapsible / Expandable Left Navigation Rail
- **Requirement**: Bottom-left expand/collapse toggle button matching reference design.
- **States**:
  - **Collapsed (`w-14`)**: Clean icon-only mode for distraction-free canvas focus.
  - **Expanded (`w-56`)**: Shows full labels and tool descriptions for rapid navigation.

### 4. Inline Tool Approval Gate & Output Inspection
- **Requirement**: As seen in `eris_cli.py` (`WRITE_FILE` outside `tools/`, shell commands, destructive operations), the UI must surface an interactive approval card with risk impact (`critical`, `high`) and JSON payload inspection before executing live backend commands.
