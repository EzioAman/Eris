# Technology Stack & Tool Upgrade Evaluation

> **Evaluator**: Architecture & Systems Engineering Analysis  
> **Target**: Eris Desktop Autonomous AI Agent (`Eris.exe`)  
> **Date**: 2026-09-14  
> **Standard**: Per user rule — look for documentations for tools which might be better instead of current stack, detail all pros, cons, what loss will happen, and provide explicit recommendations.

---

## 1. Executive Matrix of Stack Evaluation

| Component Layer | Current Stack Selection | Evaluated Alternative | Recommendation | Action Required |
|---|---|---|---|---|
| **Vector Database / Semantic Search** | PostgreSQL + pgvector | **SQLite + `sqlite-vec`** (or **LanceDB**) | **UPGRADE to Dual: Embedded `sqlite-vec` (Default) + `pgvector` (Optional)** | Adopt embedded vector search so final shipping `.exe` requires NO database server install |
| **Agent Framework** | LangGraph | **Custom Async FSM / PydanticAI** | **KEEP LangGraph with Typed FSM Wrapper** | Maintain LangGraph for graph execution, but enforce strict typed state invariants |
| **Desktop GUI** | PySide6 (Qt 6.8+ LTS) | **Tauri v2 (Rust + Web)** | **KEEP PySide6** | PySide6 has zero Rust compilation bridge, native DWM Mica/Acrylic support, and direct Python threading |
| **Packaging & Compilation** | PyInstaller + Inno Setup | **Nuitka + Inno Setup** | **HYBRID: PyInstaller for dev/MVP, Nuitka for production release** | Nuitka compiles Python to C, protecting intellectual property and speeding up cold-start by 3–5x |
| **Async Loop Integration** | raw `asyncio` | **`qasync`** | **OFFICIALLY ADOPT `qasync`** | Seamlessly merges Qt event loop with Python asyncio event loop without worker thread lockups |

---

## 2. Deep Dive: Embedded Vector Search (`sqlite-vec` / `LanceDB` vs `pgvector`)

### 2.1 The Problem with Current Stack (pgvector Only)
In the original PRD, semantic memory required PostgreSQL + `pgvector`. This violates the core user requirement:
> *"If user doesn't have postgresql then find another solution, I dont want a hard dependency during shipping(final product) if .exe will manage the db then fine. Support both."*

If PostgreSQL is the only vector provider:
- A user downloading `Eris.exe` cannot run semantic memory search unless they have a PostgreSQL server running with `pgvector` compiled and loaded.
- Shipping a bundled PostgreSQL server inside a Windows `.exe` adds 150MB+ overhead, complex port management, background service registration, and Windows firewall prompts.

### 2.2 Alternative 1: `sqlite-vec` (Official SQLite Vector Extension)
- **What it is**: An extremely fast, zero-dependency C vector search extension for SQLite written by Alex Garcia (Mozilla Open Source / SQLite ecosystem).
- **How it works**: Loaded dynamically into SQLite via `connection.enable_load_extension(True)` and `sqlite_vec.load(connection)`.
- **Performance**: SIMD-accelerated (AVX2, NEON), performs exact KNN vector search directly inside standard `.sqlite3` or `.db` files.

### 2.3 Alternative 2: `LanceDB`
- **What it is**: Serverless, embedded vector database written in Rust with Python bindings.
- **How it works**: Native on-disk Apache Arrow columnar storage. Zero background server.
- **Performance**: Sub-millisecond ANN search, handles millions of vectors with disk-based indexing.

### 2.4 Comparison Table

| Metric | PostgreSQL + `pgvector` | `sqlite-vec` (Embedded SQLite) | `LanceDB` |
|---|---|---|---|
| **Server Requirement** | Yes (External Postgres daemon) | **NO (100% In-Process)** | **NO (100% In-Process)** |
| **Shipping Footprint** | ~150MB+ if bundled | **< 2MB C extension** | ~35MB Python wheel |
| **Cold Start** | Must wait for PG service socket | **Instant (0ms)** | Instant (< 5ms) |
| **Relational Data Join** | Seamless SQL joins | **Native SQL inside SQLite** | Hybrid query via Arrow |
| **Concurrency** | High (Multi-user) | Single-writer / Multi-reader (WAL mode) | Multi-reader, Append-writer |
| **Suitability for Eris.exe** | Excellent for Power Users / Team | **PERFECT for Default Windows Shipping** | Excellent for heavy vector workload |

### 2.5 What Loss Will Happen if Upgraded?
- **Loss**: SQLite has lower concurrent write throughput than PostgreSQL. However, Eris is a **single-user desktop application** where concurrent multi-thousand TPS writes never occur. WAL mode (`PRAGMA journal_mode=WAL`) easily handles desktop background tasks + UI writes.
- **Gain**: 100% serverless, zero-install experience. Eris runs immediately after downloading the `.exe`.

### 2.6 Recommendation
> **Adopt Dual Backend**:
> 1. **Default (Shipping)**: SQLite (WAL mode) + `sqlite-vec` embedded. Shipped directly in `Eris.exe`.
> 2. **Optional (Power User)**: PostgreSQL + `pgvector` for users who toggle "Use External PostgreSQL" in Settings or Onboarding.

---

## 3. Deep Dive: GUI Framework (PySide6 vs Tauri v2 vs Electron)

### 3.1 Comparison

| Metric | PySide6 (Qt for Python) | Tauri v2 (Rust + Web) | Electron |
|---|---|---|---|
| **Language Consistency** | 100% Python (Direct call into Core) | Rust backend + HTML/JS frontend | Node.js + HTML/JS (Requires Python sub-process) |
| **RAM Usage** | ~60–100MB | ~40–70MB | ~250–500MB (Chromium bloat) |
| **Windows 11 Integration** | Native Win32 API, DWM Acrylic/Mica, Native Tray, Native Menus | Webview2 API (dependent on Evergreen runtime) | Chromium canvas |
| **IPC Overhead** | **Zero (In-process Python memory)** | JSON serialization over IPC bridge | JSON serialization over WebSocket/Pipe |
| **Thread Management** | Native Qt `QThread` / `qasync` | Rust tokio + JS Web Workers | Node event loop + Python subprocess |

### 3.2 What Loss Will Happen if We Switched to Tauri v2?
- **Loss**: Complete rewrite of the desktop shell in Rust/Web technologies. Python agent core would have to run as a spawned child process, creating complex IPC, process lifecycle zombie hazards, and IPC latency for streaming UI tokens.
- **Gain**: Web design ecosystem (Tailwind, React, Svelte) and slightly smaller RAM footprint.

### 3.3 Recommendation
> **KEEP PySide6**:
> In-process direct memory access, robust Windows 11 DWM glassmorphism/acrylic native styling, zero subprocess serialization latency for token streaming, and mature packaging with PyInstaller/Nuitka.

---

## 4. Deep Dive: Compilation & Packaging (`PyInstaller` vs `Nuitka`)

### 4.1 Comparison

| Feature | PyInstaller | Nuitka |
|---|---|---|
| **Mechanism** | Archives Python interpreter + `.pyc` bytecode into `.exe` bundle | Compiles Python code directly to **native C/C++ machine code** |
| **Startup Latency** | Slower (Unpacks bytecode archive to temp directory on launch) | **Near-instant (Native binary execution)** |
| **Reverse Engineering** | Easy to decompile (`pyinstaller-extractor` recovers source code in seconds) | **High resistance (Compiled C binary, no bytecode)** |
| **Build Time** | Fast (1–2 minutes) | Slower (5–15 minutes, requires MSVC C compiler) |
| **Debugging** | Standard Python stack traces | C-level errors if extensions clash |

### 4.2 Recommendation
> **Phased Hybrid Strategy**:
> - **Development & MVP 0–3**: Use **PyInstaller** for rapid iterative builds and debugging.
> - **Production Release (MVP 5+)**: Use **Nuitka** to compile the core and PySide6 into a hardened, high-speed, tamper-resistant native Windows `.exe`.

---

## 5. Summary Recommendation for Development

1. **Language**: Python 3.13 Stable.
2. **Database**: Dual SQLAlchemy Engine — SQLite with WAL + `sqlite-vec` (Default embedded) / PostgreSQL + `pgvector` (Advanced optional).
3. **GUI**: PySide6 with `qasync` event loop integration.
4. **Agent Graph**: LangGraph with strict Pydantic typed state transitions.
5. **Security Storage**: Windows Credential Manager via `keyring` + DPAPI fallback.
6. **Packaging**: PyInstaller + Inno Setup for initial versions, Nuitka target for production.
