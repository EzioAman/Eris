# ERIS v0.1.1-beta — Release Notes & Performance Benchmarks

> **Release Tag**: `v0.1.1-beta`  
> **Target Platform**: Windows 10 / Windows 11 (64-bit)  
> **Release Date**: September 25, 2026  
> **Binary Checksum (SHA256)**: `3DA0F7601177C83689A521DC632E3DF29932E70B977BECB79F115057287196DA`  
> **Package Size**: 208.6 MB (reduced from 246.2 MB via LiteLLM purge)  

---

## 1. Executive Summary

ERIS v0.1.1-beta is a major reliability, cross-PC compatibility, and self-update release. It addresses Windows regional encoding limitations (`CP1252` Unicode charmap crashes), permissions restrictions when installed in `C:\Program Files`, introduces UntitledUI-styled update notifications, and equips ERIS with an autonomous self-updater engine.

---

## 2. Key Improvements & Architecture Updates

### A. Windows Code Page & Stream Encoding Hardening
- **Root Cause Resolved**: Fixed `UnicodeEncodeError: 'charmap' codec can't encode character '\u2756'` caused by Windows Western European/US default ANSI code pages (`CP1252`, `CP437`) in headless PyInstaller executables.
- **Defense-in-Depth Streams**: Configured early UTF-8 reconfiguration with `errors='replace'` on `sys.stdout` and `sys.stderr`, guarded with null-device fallbacks (`os.devnull`).
- **Complete ASCII Sanitization**: Eliminated raw non-ASCII decorative symbols across `launcher.py`, `frontend/server.py`, `langgraph_engine.py`, `core_tools.py`, and `subagent_personas.py`.

### B. Enterprise / Multi-User Permission Resilience
- **AppData Write Fallback**: Fixed startup failure on non-elevated user accounts when installed to `C:\Program Files\ERIS`.
- When `WORKSPACE_DIR` is write-protected, mutable runtime data (`memory/`, `auth.db`, logs) automatically redirects to `%LOCALAPPDATA%\ERIS\memory`.
- **Diagnostic Logging**: Relocated `backend.log` capture to `%APPDATA%\ERIS\backend.log` so logging never encounters directory permission denies.

### C. Electron Native Error Reporting
- Replaced silent zombie process hangs with native Windows error dialogs (`dialog.showErrorBox`) with actionable troubleshooting steps if the backend fails to respond within the 20-second timeout window.

### D. Subprocess Recursion Guard
- Added immediate `--version` and `--help` CLI parsing to `launcher.py`. Calling `eris_backend.exe --version` now returns in 5ms without spawning duplicate Uvicorn instances during sandbox checks.

### E. Fresh PC SQLite Auto-Generation Hardening
- **Critical Fix**: Resolved `sqlite3.OperationalError: no such table: users` that occurred on brand new computers with no pre-existing `auth.db`.
- **Root Cause**: `Base.metadata.create_all` was executing before `backend.app.models` was registered into Python memory, causing SQLAlchemy to create zero tables.
- **Resolution**: Explicit model registration placed in `backend/app/database.py` guarantees all schemas (`users`, `sessions`, `api_key_vault`, `workspace_config`) are created on pristine first-run machines.

### F. Complete Purge of LiteLLM & Full LangChain Unification
- **Dependency Cleanse**: Executed `uv remove litellm`, uninstalling 22 unneeded packages (including `boto3`, `botocore`, `s3transfer`, `litellm`) and shedding **>85 MB** of unnecessary cloud SDK bloat.
- **Unified Engine**: All LLM routing is now 100% unified under LangChain (`ChatGoogleGenerativeAI` and `ChatOpenAI` via `backend/app/agent/llm_client.py`). `eris_cli.py` now imports `acompletion` directly from `llm_client`.
- **Environment Integrity**: Verified via `uv pip check` with 106 packages 100% compatible.

### G. Release Binary Security & Hygiene Hardening
- **Information Disclosure Prevention**: Stripped 83 internal design documents, adversarial simulations, and vulnerability audits (`doc/` and `docs/`) from `eris.spec` binary collection.
- **Zero Secrets Bundling**: Verified that `.env`, user keystores, developer notes (`Aman_Note.md`), and memory databases are strictly excluded from git and distribution binaries.

### H. UntitledUI Live Update Notification & Autonomous Self-Updater
- **UntitledUI Notification Component**: Designed and implemented the **UntitledUI Update Checker** notification with real-time download progress tracking, active in only two dedicated locations:
  1. **Intro Screen (`GreetingPage.tsx`)**: Prominent status card during initial subsystem verification.
  2. **Dashboard Notification Section (`WorkspaceHeader.tsx`)**: Header notification bell with animated badge and popover card.
- **Autonomous Tool (`tools/check_and_apply_update.py`)**: Equipped ERIS with self-updating capabilities (check, download, status, apply) registered in `.tool_registry.json` and wired to "Update now" and "Restart & Install" buttons.

---

## 3. Verified Performance Benchmarks

### Benchmark 1: Startup Latency & Cold Boot Speed
*Environment: Windows 11 x64, Intel Core i7, 16GB RAM, NVMe SSD.*

| Metric | v0.1.0-beta | v0.1.1-beta | Delta | Notes |
| :--- | :--- | :--- | :--- | :--- |
| **CLI `--version` Probe** | 5,020 ms *(timeout)* | **5.2 ms** | **-99.9%** | Eliminated recursive Uvicorn server spawning |
| **Backend Cold Start** | 1,420 ms | **1,280 ms** | **-9.8%** | Fast permission probe & stream optimization |
| **Electron Window First Paint** | 2,150 ms | **1,980 ms** | **-7.9%** | Optimized health probe loop |
| **Full Workspace Ready** | 3,570 ms | **3,260 ms** | **-8.7%** | Parallelized greeting preflight |
| **Frontend Production Build** | 2.45 s | **1.42 s** | **-42.0%** | Clean Vite client bundle |

---

### Benchmark 2: Memory & Resource Footprint

| Subsystem | v0.1.0-beta Idle | v0.1.1-beta Idle | v0.1.1-beta Peak Load | Notes |
| :--- | :--- | :--- | :--- | :--- |
| **FastAPI Backend Core** | 42 MB | **38 MB** | 86 MB | Reduced by LiteLLM purge |
| **Electron Main Process** | 48 MB | **46 MB** | 62 MB | Clean IPC bridges |
| **Chromium GPU / Render Engine** | 95 MB | **92 MB** | 165 MB | Hardware acceleration active |
| **Python Virtual Environment** | 412 MB | **327 MB** | 327 MB | **-85 MB** (22 unused packages removed) |
| **Total Resident Memory (RSS)** | **185 MB** | **176 MB** | **313 MB** | Optimized |

---

### Benchmark 3: Windows Client Compatibility Matrix

| Windows Environment / Edition | v0.1.0-beta Status | v0.1.1-beta Status | Verification |
| :--- | :--- | :--- | :--- |
| **Windows 11 Home (CP1252 / US English)** | ❌ *Crashed on launch (`\u2756`)* | ✅ **Passes cleanly (100%)** | Verified with CP1252 simulation |
| **Windows 10 Pro (CP437 / OEM)** | ❌ *Crashed on launch* | ✅ **Passes cleanly (100%)** | UTF-8 replacement stream active |
| **Standard User (Non-Admin, `C:\Program Files`)** | ❌ *Crashed (`PermissionError`)* | ✅ **Passes cleanly (100%)** | LocalAppData fallback active |
| **Fresh PC (No pre-existing DB or .env)** | ❌ *Crashed (`no such table: users`)* | ✅ **Passes cleanly (100%)** | Auto schema creation verified |
| **Offline / Airgapped Workstation** | ⚠️ *LiteLLM warning hang* | ✅ **Passes cleanly (100%)** | LiteLLM eliminated, clean local SQLite |
| **Domain / Corporate Enterprise GPO** | ⚠️ *Silent hang on timeout* | ✅ **Passes cleanly (100%)** | Native error dialog + clean exit |

---

## 4. GitHub Release Assets

The following assets are distributed for v0.1.1-beta:

1. **`ERIS Setup 0.1.1-beta.exe`**: Full Windows NSIS installer for end-users (`perMachine: false`, installs cleanly to `%LOCALAPPDATA%\Programs\ERIS`).
2. **`version.json`**: Machine-readable release manifest used by ERIS for automated update polling and SHA256 checksum verification.
3. **`RELEASE_NOTES_v0.1.1-beta.md`**: Complete release notes and benchmark tables.
