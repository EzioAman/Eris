# Research & Blueprint: Complete UI/UX Specification & Architectural Chronology

## Overview

In accordance with your request, deep technical research was conducted across:
- **[React Native Reusables](https://reactnativereusables.com)**: Authentication blocks (Sign-in, Sign-up, OTP Verify, Password Reset, User Menus) and headless accessible primitives (Radix-like).
- **[Magic UI](https://magicui.design)**: Modern interactive effects (Animated Beam, Border Beam, Progressive Blur, Aurora Text, Morphing Text, Highlighter, Rainbow Button, File Tree, Code Comparison).
- **[SeraUI](https://github.com/seraui/seraui)**: Copy-paste component architectures for modern web apps.
- **Tauri v2 AI Desktop Architectures**: Local loopback WebSocket IPC proxy patterns, Win32 Job Object containment, sidecar process supervision, and zero-trust Windows Keyring secrets storage.

Two architectural documentation files have been created in the [doc/](file:///e:/All%20Projects%20and%20Editors/ERIS/doc) directory:
1. [doc/tech_stack_usage.md](file:///e:/All%20Projects%20and%20Editors/ERIS/doc/tech_stack_usage.md): The end-to-end execution chronology from OS kernel boot to graceful termination.
2. [doc/instructions-detailed.md](file:///e:/All%20Projects%20and%20Editors/ERIS/doc/instructions-detailed.md): The atomic component catalog and visual interaction specifications.

---

## 1. Technical Stack & Execution Chronology ([tech_stack_usage.md](file:///e:/All%20Projects%20and%20Editors/ERIS/doc/tech_stack_usage.md))

### The Lifecycle Pipeline (What Comes First, Next, and Till Exit)

```
[BOOTSTRAP STAGE 1: OS Kernel & Tauri Rust Shell]
  │
  ├── 1.1 Win32 Job Object Creation (JOB_OBJECT_LIMIT_KILL_ON_JOB_CLOSE)
  ├── 1.2 Ephemeral Token Generation (256-bit CSPRNG `ERIS_IPC_SECRET`)
  ├── 1.3 Subprocess Spawn (FastAPI / LangGraph runtime bound to auto loopback port)
  └── 1.4 Webview2 Native Composition (Windows 11 Acrylic / Mica Frosted Blur)
        │
[BOOTSTRAP STAGE 2: Backend Ignition & Probe]
  │
  ├── 2.1 Bind 127.0.0.1:[PORT] with `allow_reuse_address = True`
  ├── 2.2 Initialize SQLite Vaults (`memory/auth.db`, `memory/rag_vault.db`)
  ├── 2.3 RAGEngine Indexing (Pinned facts, workspace files, tools)
  └── 2.4 Health Handshake (Tauri Rust polls `/health` with exponential backoff)
        │
[BOOTSTRAP STAGE 3: Frontend Hydration & Consecration Ceremony]
  │
  ├── 3.1 Static Next.js 14 shell loads inside Webview2
  ├── 3.2 WebSocket Handshake with ephemeral bearer token
  ├── 3.3 Check first-run status:
  │     ├── If First-Time: 3-Stage Consecration Onboarding Sanctuary Modal
  │     └── If Returning: Morphing text system check ("Matrix Synchronized")
  └── 3.4 Live Ground Truth State Sync (Model, tools count, Speed/Accuracy mode)
        │
[INTERACTIVE WORKSPACE LOOP]
  │
  ├── 4.1 Speed vs. Accuracy Dual Mode
  ├── 4.2 Agentic RAG Context-Aware Hybrid Retrieval
  ├── 4.3 Universal Tool Guardrail Audit (Detect hardcoded emails/keys, enforce generic templates)
  ├── 4.4 Mandatory Package Download Permission (Prompt user before `pip`, `uv`, `npm` downloads)
  └── 4.5 Sandboxed Dry-Run Tool Validation in isolated subprocess
        │
[EXIT & TEARDOWN PROTOCOL]
  │
  ├── 5.1 User initiates close or `/exit` command
  ├── 5.2 Flush pending SQLite checkpoints
  ├── 5.3 Terminate WebSocket session
  └── 5.4 Windows Job Object Kernel Kill (Purges all Python/PowerShell children with zero orphan leaks)
```

---

## 2. Atomic Component Catalog & Interaction Design ([instructions-detailed.md](file:///e:/All%20Projects%20and%20Editors/ERIS/doc/instructions-detailed.md))

### A. Authentication & Account Blocks (Ref: React Native Reusables)
- **Sign-In & OTP Form**: 2-phase login with 6-digit PIN input, rate limiting, and HMAC-SHA256 constant-time verification.
- **Onboarding Sanctuary Modal**: Consecration ceremony modal using `assets/Installation Page Background.png`, creator binding (Aman Sinha), and dev vs. prod storage briefing.
- **User Pill & Session Manager**: Status indicator in sidebar and header displaying verified email, session TTL, and sign-out controls.

### B. Core UI Primitives (Ref: Radix UI / React Native Reusables)
- **Accordion & Collapsible**: Expandable workflow steps and knowledge vault categories.
- **Alert & Confirmation Dialog**: Permission prompts before file writes outside `tools/` and package installations (`pip`, `uv`).
- **Spotlight Cards**: Dynamic physics tracking cursor coordinates (`--mouse-x`, `--mouse-y`) to render specular light reflections on hover.
- **Tabs & Segmented Controls**: Smooth view transitions between Dashboard, Agent Dispatch, Knowledge Vault, and Tool Studio.

### C. Advanced Cybernetic Visual Effects (Ref: Magic UI)
- **Animated Beam**: Visual link lines from Eris Core to dispatched autonomous agents.
- **Border Beam**: Luminous gradient border animation tracing around active input cards during model reasoning.
- **Aurora Text & Animated Shiny Text**: Multi-color animated text on headlines.
- **Morphing Text**: Dynamic status transitions during boot checks (`Checking Keys` -> `Auditing Tools` -> `Matrix Ready`).
- **Highlighter**: Glowing visual marker on live telemetry metrics (latency, active tokens, verified tools count).
- **Tool Creation Studio with Code Comparison**: Embedded code editor with live AST guardrail inspection and template generator.

---

## 3. Storage Scope Rule

- **`.env` is Development Mode ONLY**: Strictly temporary scratchpad space for local keys. Eris is prohibited from writing user data or production state to `.env`.
- **Production Storage Belongs in the Database**: All production secrets, user accounts, sessions, tool registry hashes, and vector memories belong in SQLite databases ([memory/auth.db](file:///e:/All%20Projects%20and%20Editors/ERIS/memory/auth.db), [memory/rag_vault.db](file:///e:/All%20Projects%20and%20Editors/ERIS/memory/rag_vault.db), and `sqlite-vec`).
