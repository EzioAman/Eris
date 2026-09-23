# ERIS Technical Architecture & Lifecycle Execution Blueprint
**Target Execution Platform**: Windows 11 Native Desktop (`ERIS.exe`) via Tauri v2 + Next.js 14 Static Shell + Python Subprocess Engine  
**Architect**: Aman Sinha & Eris Core Architecture Team  
**Date**: 2026-09-14  

---

## 1. Executive Summary & Philosophy

This document defines the absolute, end-to-end technical stack and execution chronology of **ERIS**.  
Every layer—from hardware bootstrap, Win32 Job Object containment, ephemeral secret negotiation, and UI component hydration, to graceful unwinding and crash containment—is explicitly mapped with zero ambiguity.

---

## 2. Technology Stack Breakdown (What, Where, When, and Why)

| Layer | Technology Selected | Scope / Role | Justification / Trade-off |
| :--- | :--- | :--- | :--- |
| **Desktop Host Shell** | **Tauri v2** (`rustc` 1.80+) | Host Window (`Webview2`), OS Keyring, Win32 Job Object Lifecycle, Global Hotkeys | Memory footprint ~40MB idle (vs Electron ~250MB). Native Windows Acrylic/Mica support. Process supervision. |
| **Frontend Framework** | **Next.js 14+ (App Router)** | Static export (`output: 'export'`) | Zero-latency local file serving, typed routing, React 18/19 server-compatible components compiled to static HTML/JS. |
| **Styling & Design Tokens** | **Tailwind CSS v4** + **CSS Design Variables** | Frosted Obsidian Cybernetic Theme | Micro-animations, zero-CSS runtime penalty, design tokens (`--bg-base: #080A10`, `--accent-violet: #7C3AED`, `--accent-cyan: #38BDF8`). |
| **Component Primitives** | **Radix UI** / **React Native Reusables (RNR)** | Accessible component behaviors | Unstyled, accessible primitives for Dialogs, Popovers, Accordions, Context Menus, Tooltips, and Dropdowns. |
| **Visual Effects & Micro-Interactions** | **Magic UI** + **Framer Motion** | Ethereal luminescence & visual wow | Aurora text, Border Beam, Animated Beam, Progressive Blur, Morphing Text greetings, Rainbow Button, Spotlight Physics. |
| **Subprocess Engine** | **Python 3.12+ Embedded Runtime** | FastAPI + Uvicorn (Loopback IPC) | Houses Agentic RAG, LangGraph multi-agent orchestration, dynamic tool sandboxing, and litellm routing. |
| **Security & Key Management** | **Windows Keyring** (`tauri-plugin-keyring-store`) + Argon2id | Secret storage | Zero plaintext API keys or production tokens on disk. `.env` is dev-only; production keys stored via Windows Credential Manager. |
| **Vector & Episodic Memory** | **SQLite + sqlite-vec** | Production ACID & semantic store | Embedded, zero-install vector search running in SQLite (`memory/rag_vault.db`), eliminating heavy external vector servers. |
| **Inter-Process Comm (IPC)** | **Local WebSocket (127.0.0.1:[PORT])** + Ephemeral Token | Front-to-Back duplex streaming | Real-time token streaming, telemetry updates, terminal PTY multiplexing with constant-time bearer token check. |
| **Process Containment** | **Win32 Job Object** | Kernel-level lifecycle safety | Guarantees that terminating `ERIS.exe` instantly terminates all child `python.exe` and `powershell.exe` processes without orphan leaks. |

---

## 3. The Grand Execution Chronology (What Comes First, Next, and Till Exit)

```
[BOOTSTRAP STAGE 1: OS & Rust Kernel]
  │
  ├── 1.1 Win32 Job Object Creation (JOB_OBJECT_LIMIT_KILL_ON_JOB_CLOSE)
  ├── 1.2 Ephemeral Token Generation (256-bit CSPRNG `ERIS_IPC_SECRET`)
  ├── 1.3 Python Subprocess Spawn (`backend/main.py --port AUTO --token ERIS_IPC_SECRET`)
  └── 1.4 Webview2 Native Canvas Composition (Windows 11 Mica / Acrylic Frosted Blur)
        │
[BOOTSTRAP STAGE 2: Backend Ignition & Probe]
  │
  ├── 2.1 FastAPI/Uvicorn binds loopback 127.0.0.1:[PORT]
  ├── 2.2 SQLite Memory Vaults Initialized (`auth.db`, `rag_vault.db`)
  ├── 2.3 RAGEngine Indexing: Pinned facts, workspace files, dynamic tools
  └── 2.4 Health Handshake: Tauri polls `/health` (Exponential backoff max 5000ms)
        │
[BOOTSTRAP STAGE 3: Frontend Hydration & Welcome Ceremony]
  │
  ├── 3.1 Next.js Static Shell loads inside Webview2
  ├── 3.2 WebSocket Handshake (`ws://127.0.0.1:[PORT]/ws?token=ERIS_IPC_SECRET`)
  ├── 3.3 Auth & Onboarding Gate:
  │     ├── IF first-run: Trigger 3-Stage Consecration Sanctuary Modal (`Installation Page Background.png`)
  │     └── IF returning: Morphing text system check greeting ("Matrix Operational")
  └── 3.4 Live Ground Truth Injection: Active model, verified tools count, execution mode
        │
[INTERACTIVE WORKSPACE LOOP]
  │
  ├── 4.1 Speed vs. Accuracy Mode Toggle (Immediate heuristics vs deep AST audit)
  ├── 4.2 Agentic RAG Context-Aware Retrieval (BM25 + vector overlap for user queries)
  ├── 4.3 Universal Tool Guardrail Audit (Detect hardcoded emails/keys, enforce generic template)
  ├── 4.4 Mandatory Package Download Permission (Prompt user on `pip`, `uv`, `npm` installs)
  └── 4.5 Tool Sandbox Dry-Run (Subprocess validation in isolated temp environment)
        │
[EXIT & TEARDOWN PROTOCOL]
  │
  ├── 5.1 User initiates close or `/exit` command
  ├── 5.2 Flush pending SQLite checkpoints (`auth.db`, `rag_vault.db`)
  ├── 5.3 Close WebSocket session gracefully
  └── 5.4 Windows Job Object Kernel Kill: Purges all remaining threads and sub-processes cleanly
```

---

## 4. Architectural Boundaries: Dev (.env) vs Production (Database)

1. **Development Environment (`.env`)**:
   - Strictly a local developer scratchpad for initial bootstrapping (`GEMINI_API_KEY`, `OPENROUTER_API_KEY`, `NVIDIA_API_KEY`).
   - Never treated as a production store. Never writes user passwords, accounts, or persistent runtime facts to `.env`.
2. **Production Environment (SQLite Databases)**:
   - **`memory/auth.db`**: User accounts, cryptographic salts, HMAC-SHA256 OTP hashes, 64-char session tokens.
   - **`memory/rag_vault.db`**: Semantic chunks, token index, pinned episodic memory.
   - **`tools/.tool_registry.json`**: Cryptographic SHA-256 integrity hashes for all verified tools to prevent file tampering.

---

## 5. Security Guardrails & Human-in-the-Loop Constraints

- **Zero-Hardcoding Guardrail**: Rejects tools containing static personal email addresses or plaintext API keys. Forces parameterization via `args` or `os.environ.get(...)`.
- **Package Installation Gate**: Any execution of `pip install`, `uv add`, `npm install`, `yarn add`, or `cargo install` triggers an interactive user permission prompt with package name and rationale.
- **Path Containment**: File writes outside `tools/` require explicit user modal approval.
