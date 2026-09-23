# Hybrid LangGraph Orchestration, Autonomous Tool Generation & Interactive Learning Workflows

## 1. Architectural Evolution: How ERIS Has Changed

| Dimension | Previous Implementation (V1) | Current Implementation (V2) | New Hybrid Architecture (V3) |
| :--- | :--- | :--- | :--- |
| **Orchestration** | Monolithic ReAct tag loop in `engine.py` using regex `[TAG: arg]`. | Multi-turn prompt chaining with Antigravity tool catalog, severity tiers, and subagent stream events. | **Hybrid Dual-Engine**: <br>• **Speed Mode**: Direct zero-overhead LiteLLM ReAct loop.<br>• **Accuracy Mode**: Native LangGraph `StateGraph` + Pydantic v2 state schemas (cyclical reflection, validation, checkpoints). |
| **Model Independence** | LiteLLM direct calls with candidate router. | LiteLLM direct calls with candidate router & filtered observations. | **Zero LangChain Chat Model Dependencies**: We use LangGraph's state machine, but call models directly via LiteLLM inside graph nodes. |
| **Tool Capabilities** | Fixed static tools (`list_dir`, `read_file`, `run_command`). | 13 Antigravity tools with `SAFE`, `MUTATING`, `DANGEROUS` severity metadata. | **Autonomous Tool Generation Loop**: ERIS detects missing tools, asks user permission, codes tool in sandbox, self-tests until 100% verified, and saves to local knowledge. |
| **Plugins vs Tools** | Ambiguous overlap. | Registry in `plugins.py` and `RightSidebar.tsx`. | **Strict Semantic Distinction**: <br>• **Plugin**: User-created or user-configured connectors.<br>• **Tool**: ERIS autonomously created and self-verified capabilities. |
| **User Habit Learning** | Ephemeral context window. | Recent user ratings in `feedback.json`. | **Episodic Preference Memory**: ERIS remembers specific application preferences (e.g. YouTube song playback in browser vs media player) to act without redundant prompts. |
| **Workflow System** | Mock Jira/Slack diagram. | DAG pipeline canvas with ERIS Flow Alerts. | **Interactive Learning & Automation Studio**: Replaces the old canvas with interactive procedural recipes (`StepChecklistTemplate`) defining how ERIS learns and automates tasks. |
| **Transparency** | Hardcoded strings and fallbacks scattered in code. | Dynamic timestamps and live database queries. | **`doc/hardcoded_manifest.md`**: Complete transparent registry of all fallbacks, prompt instructions, and default values. |

---

## 2. User Review & Approval Required

> [!IMPORTANT]
> **No LangChain Chat Model Dependency**: We will install `langgraph` and `langchain-core` for the state graph and conditional routing, but will **NOT** use `langchain_openai`, `langchain_anthropic`, or LangChain model wrappers. All LLM calls inside graph nodes will use our verified LiteLLM async router.

> [!IMPORTANT]
> **Workflows Replacement**: The old static `WorkflowCanvasView.tsx` will be completely replaced by the **Interactable Learning & Automation Studio** using the `StepChecklistTemplate` and `CardTemplate` to configure what ERIS learns, schedules, and automates.

> [!NOTE]
> **Left Sidebar Default**: Left sidebar will be collapsed to icon mode (`w-16`) on initial load, maximizing the center chat and workspace area.

---

## 3. Proposed Changes

### Component A: Backend Hybrid Orchestration Engine (Speed Mode + LangGraph Accuracy Mode)

#### [NEW] [langgraph_engine.py](file:///e:/All%20Projects%20and%20Editors/ERIS/backend/app/agent/langgraph_engine.py)
- Defines Pydantic v2 schemas:
  - `AgentState(BaseModel)`: messages, intent, reasoning_steps, planned_tools, tool_observations, reflection_score, iteration_count, active_node.
  - `ToolSynthesisRequest(BaseModel)`: target_capability, sandbox_code, test_command, test_exit_code, verification_verdict.
- Constructs the LangGraph `StateGraph`:
  1. `classify_node`: Detects user intent and checks if required tools exist.
  2. `planner_node`: Generates structured reasoning and step plan.
  3. `actuator_node`: Executes verified tools with severity checks.
  4. `reflection_node`: Evaluates observation quality (min-max score). If below threshold (< 0.85), loops back to `planner_node` with error context (max 3 cycles).
  5. `synthesizer_node`: Composes final grounded response.
- Exposes node transition callbacks for real-time visual streaming (`graph_node_enter`, `graph_cycle`).

#### [MODIFY] [engine.py](file:///e:/All%20Projects%20and%20Editors/ERIS/backend/app/agent/engine.py)
- In `AgentEngine.process_message()`:
  - If `execution_mode == "speed"`: routes to the fast LiteLLM ReAct loop.
  - If `execution_mode == "accuracy"`: invokes `langgraph_engine.execute_graph()`.

---

### Component B: Autonomous Tool Generation & User Habit Learning

#### [NEW] [tool_synthesizer.py](file:///e:/All%20Projects%20and%20Editors/ERIS/backend/app/agent/tool_synthesizer.py)
- Workflow for missing capabilities (e.g. "open youtube"):
  1. **Detection**: ERIS checks if any registered tool or plugin satisfies the user intent.
  2. **Interactive Request**: Emits `tool_creation_offer` event to the frontend: *"I do not have the tool required for starting YouTube. Do you want me to create one?"*
  3. **Sandbox Synthesis**: If user accepts, writes Python tool in `backend/app/tools/generated/`.
  4. **Self-Verification Loop**: Runs sandbox test command (`subprocess.run([python, tool.py, test_args])`). If failure, reads traceback, patches code, and loops until exit code == 0 and 100% verified. If repeated failure, honestly reports: *"Could not verify tool safety/functionality."*
  5. **Knowledge Persistence**: Prompts user: *"I have created and verified the tool. Do you want me to add it to my permanent knowledge?"* On approval, registers in `tools/` and persists to SQLite.
  6. **Habit Learning**: Records learned user choices (e.g. `youtube_action`: `open_browser`) in `memory/user_habits.json` so subsequent requests execute seamlessly without repetitive prompting.

---

### Component C: Frontend Layout, Visual Cyclic Graph & UI Cleanup

#### [MODIFY] [ChatWorkspace.tsx](file:///e:/All%20Projects%20and%20Editors/ERIS/frontend/src/components/workspace/ChatWorkspace.tsx)
- Set `isSidebarExpanded = false` by default on mount so the workspace canvas is expansive.
- Handle `tool_creation_offer` and `tool_save_offer` SSE events to render interactive selective menus directly in the chat stream.
- Forward live LangGraph state transitions to `ClaudeThinkingBlock`.

#### [MODIFY] [WorkspaceHeader.tsx](file:///e:/All%20Projects%20and%20Editors/ERIS/frontend/src/components/workspace/WorkspaceHeader.tsx)
- Remove active model pill from top header (already visible in thinking blocks and model matrix modal).
- Center universal search bar (`flex-1 max-w-xl mx-auto`).
- Ensure zero duplicate buttons across all breakpoints.

#### [MODIFY] [ClaudeThinkingBlock.tsx](file:///e:/All%20Projects%20and%20Editors/ERIS/frontend/src/components/workspace/ClaudeThinkingBlock.tsx)
- Add **Live Native Cyclic Graph Visualizer**:
  - Displays state transitions: `[Intent] -> [Planner] -> [Actuator] -> [Reflection Loop] -> [Synthesizer]`.
  - Shows active node highlighted with pulsing aura and iteration counter (e.g., `Cycle 1/3`).
  - Renders the interactive Tool Creation Confirmation Card with `Yes, create tool` / `Decline` buttons.

---

### Component D: Hardcoded Strings Manifest

#### [NEW] [hardcoded_manifest.md](file:///e:/All%20Projects%20and%20Editors/ERIS/doc/hardcoded_manifest.md)
- Documents every single hardcoded string, fallback, prompt default, and constant in both backend and frontend:
  - Exact file and line numbers.
  - Reason for existence (e.g. offline provider failover, system prompt instructions).
  - Remediation plan for making them 100% dynamically configured or user-customizable.

---

### Component E: Workflows Replaced with Interactive Learning Studio

#### [DELETE] `frontend/src/components/workflow/WorkflowCanvasView.tsx` (and related old mock files)
#### [NEW] [LearningWorkflowStudio.tsx](file:///e:/All%20Projects%20and%20Editors/ERIS/frontend/src/components/workflow/LearningWorkflowStudio.tsx)
- Replaces old static DAG canvas with the **Interactable Learning & Automation Studio** built with `StepChecklistTemplate` and `CardTemplate`.
- Allows users to:
  - Create interactive procedures for ERIS: *"When I ask for X, execute Y and learn Z"*.
  - Track step-by-step checklist execution with circular progress and real-time step validation.
  - View learned user habits, generated tools, and trigger schedules.

---

## 4. Verification Plan

### Automated Tests
1. `uv run python -c "from backend.app.agent.langgraph_engine import build_eris_graph; print('Graph build OK')"`
2. Verify Speed Mode vs Accuracy Mode:
   - Send prompt with `mode="speed"` -> verify immediate single-turn ReAct response.
   - Send prompt with `mode="accuracy"` -> verify LangGraph state transitions and reflection scoring.
3. Test Autonomous Tool Generation:
   - Simulated test of tool synthesis for a mock capability in sandbox.
   - Verify self-correction loop catches syntax errors and fixes them.
4. Verify Frontend compilation:
   - `npm run build` in `frontend/` (target: 0 errors).

### Manual Verification
1. Open browser on `http://localhost:5173`:
   - Left sidebar starts closed.
   - Search bar is centered in header; model name is absent from top bar.
   - Ask for a capability ERIS doesn't have -> selective prompt appears -> click Yes -> observe self-testing -> observe tool added to registry.
   - Open Workflow Studio -> see interactive step checklist learning interface.
