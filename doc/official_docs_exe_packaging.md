# Official Documentation: Packaging FastAPI, LangGraph & React UI into a Windows .exe

> Sources: [PyInstaller Official Docs](https://pyinstaller.org), [FastAPI Deployment](https://fastapi.tiangolo.com), [Uvicorn Architecture](https://www.uvicorn.org).

---

## 1. Executive Summary & Technology Comparison

To package ERIS into a single standalone Windows `.exe` without sacrificing any UI animations, Three.js shaders, WebSockets, or LangGraph cyclic execution:

| Packaging Technology | UI Fidelity & Animations | Startup Speed | Build Complexity | Compatibility | Recommended |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **PyInstaller + FastAPI Static Mount** | **100% Identical** (Runs in full GPU-accelerated Chrome/Edge engine) | 1–3s | Low (No C/Rust compiler needed) | High | **Yes (Recommended)** |
| **Tauri Desktop Wrapper (Rust)** | **100% Identical** (WebView2) | 0.5–1s | High (Requires Rust `cargo`, MSVC C++ tools) | Medium | Optional Future Upgrade |
| **Nuitka (C Translation)** | **100% Identical** | 0.5s | Very High (15–30 min C compilation) | Medium (Pydantic v2 meta issues) | No |

---

## 2. Why Animations and Functionality Remain 100% Intact with PyInstaller

When ERIS is packaged using **PyInstaller + Static Frontend**:
1. The React 19 app (Framer Motion, OGL, Three.js particle systems, Tailwind CSS v4) is compiled to static assets (`frontend/dist`).
2. FastAPI mounts `frontend/dist` and serves both the REST endpoints (`/api/...`), SSE streams (`/api/chat/message/stream`), WebSockets (`/ws`), and HTML/JS/CSS assets from `127.0.0.1:5174`.
3. The executable opens in the user's default browser or an Edge app window (`msedge.exe --app=http://127.0.0.1:5174`).
4. Because the runtime is the native browser with full WebGL, GPU hardware acceleration, and modern JavaScript V8 engine, **every animation, motion curve, timeline card, and interactive tool works with zero degradation or loss of frame rate**.

---

## 3. Mandatory Engineering Checklist Before Freezing to .exe

To ensure zero crashes upon running the `.exe`:

1. **`sys.frozen` Path Resolution**:
   - In standard Python, paths use `Path(__file__).resolve()`.
   - In PyInstaller, `__file__` resolves to `_MEIPASS` (a temporary extraction folder that is destroyed on exit).
   - **Fix**: Detect `getattr(sys, 'frozen', False)` and bind `WORKSPACE_PATH` to `Path(sys.executable).resolve().parent` so that `memory/user_habits.json` and `tools/` persist on the user's machine.

2. **Multiprocessing Freeze Support**:
   - Must invoke `multiprocessing.freeze_support()` at the entrypoint before initializing async event loops.

3. **Uvicorn Reloading Guard**:
   - In a frozen binary, `reload=True` causes infinite spawning loops on Windows. Must pass `reload=False`.

4. **Hidden Imports Collection**:
   - Dynamic imports for `uvicorn`, `litellm`, `langgraph`, and database drivers must be declared via `collect_submodules()` in the `.spec` file.
