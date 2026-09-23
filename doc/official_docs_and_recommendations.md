# ERIS Official Documentation & Technology Stack Evaluation

> Collected per ERIS Engineering Standard: Always verify against official documentation, analyze vulnerability surfaces, and evaluate stack upgrades with explicit pros, cons, potential losses, and recommendations.

---

## 1. FastAPI Server-Sent Events (SSE) & Disconnection Handling

### Official Documentation Reference
- **Source**: FastAPI & Starlette Official Docs (`starlette.responses.StreamingResponse`, `anyio.create_task_group`)
- **Key Mechanism**:
  When a frontend client aborts a fetch stream or closes the browser tab, the ASGI server (Uvicorn) triggers an HTTP disconnect event. Starlette propagates this by raising an `asyncio.CancelledError` inside the generator coroutine.

### Best Practice Pattern
```python
import asyncio
import logging
from fastapi import Request
from fastapi.responses import StreamingResponse

logger = logging.getLogger("eris.api.stream")

async def event_generator(request: Request):
    try:
        while True:
            if await request.is_disconnected():
                logger.info("Client disconnected prematurely; breaking event loop.")
                break
            # yield chunk
            await asyncio.sleep(0.05)
    except asyncio.CancelledError:
        logger.info("Task cancelled due to client disconnect. Releasing handles.")
        raise # Critical: Must re-raise to properly close ASGI context
    finally:
        logger.info("Stream cleaned up gracefully.")
```

### Applied to ERIS
- In `backend/app/api/chat.py`, `POST /api/chat/message/stream` generator is structured inside `try...finally` with structured JSON chunks, preventing zombie coroutines or orphaned LLM generation tasks when the user changes conversations.

---

## 2. Windows Subprocess Sandboxing & Command Execution Security

### Official Documentation Reference
- **Source**: Python Official Subprocess Documentation (`subprocess.run`, `subprocess.Popen`) & Microsoft Win32 Process Security
- **Core Security Rule**:
  - `shlex` is strictly Unix-specific; using `shlex.split()` on Windows produces path corruptions and escapes backslashes dangerously.
  - `shell=True` spawns `cmd.exe` or `powershell.exe`, exposing metacharacter chaining (`&`, `|`, `;`, `&&`, `||`).

### ERIS Sandboxed Execution Pattern
1. **Allowlist AST Filtering**: Commands passed to `RUN_COMMAND` or `/api/chat/terminal` are checked against destructive regexes (`rmdir /s /q c:\`, `format`, `del /f /q /s *.*`).
2. **Containment**: Enforces working directory confinement to `settings.WORKSPACE_PATH`.
3. **Execution Mode**:
   - `is_read_only=True` automatically blocks any mutating shell commands or file writes.
   - Dual parameter acceptance: accepts both `{ "command": "..." }` and `{ "cmd": "..." }` to avoid unhandled 422 schema rejections.

---

## 3. Technology Stack Upgrade Evaluation: `@xyflow/react` (React Flow v12)

### Context & User Request
The user previously referenced `https://reactflow.dev/learn` and `npx degit xyflow/vite-react-flow-template app-name`.

### Comparison Matrix

| Dimension | Current Custom Canvas (`FlowDiagramCanvas.tsx`) | `@xyflow/react` (React Flow v12) |
| :--- | :--- | :--- |
| **Rendering Engine** | Custom interactive SVG / Canvas with custom drag/zoom | WebGL/SVG accelerated node graph with built-in mini-map & controls |
| **Node Extensibility** | Custom React node cards with predefined schema | Fully modular custom node components via `nodeTypes` mapping |
| **State Management** | React local state + `workflowTypes.ts` pipeline model | Built-in `useNodesState`, `useEdgesState`, and reactive `useNodesData` |
| **Bundle Size Impact** | Zero external dependencies (0 KB extra) | ~42 KB gzipped (`@xyflow/react` + CSS) |
| **Keyboard Accessibility**| Basic tab navigation | Built-in ARIA graph navigation, multi-node selection, box select |

### Pros of Upgrading to `@xyflow/react`
1. **Standardized Pan/Zoom & MiniMap**: Smooth wheel zooming, infinite canvas panning, and pinch-to-zoom out-of-the-box.
2. **Dynamic Handle Connectivity**: Real draggable bezier/smoothstep connection lines between nodes with cycle detection.
3. **Ecosystem & Community**: Broad ecosystem of templates, layouts (Dagre, Elkjs), and node controls.

### Cons & What Loss Will Happen
1. **CSS Token Coupling**: Custom design system tokens (`--bg-surface`, `--border-workspace`, 10 theme presets) must be bridged into `@xyflow/react/dist/style.css` via custom CSS variable overrides.
2. **Custom Step Inspectors**: Existing step inspector panels (`StepInspector.tsx`) must be adapted to consume `data` props injected by React Flow.
3. **Additional Dependency**: Adds `@xyflow/react` to `frontend/package.json`.

### Recommended Decision
- **Recommendation**: **Upgrade to `@xyflow/react` v12**.
- **Reasoning**: The current custom canvas works well for linear pipelines, but for complex, branching multi-agent workflows with conditional edges and subagent joins, `@xyflow/react` provides rock-solid performance and drag-to-connect ergonomics without rebuilding graph physics from scratch.
