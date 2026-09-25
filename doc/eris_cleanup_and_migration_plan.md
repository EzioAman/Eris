# ERIS: Full Codebase Audit, Cleanup Index & Phased Migration Plan

## 1. Codebase Folder Audit & Cleanup Catalog

An exhaustive scan of `E:\All Projects and Editors\ERIS` identified the following orphaned, redundant, or bug-prone assets:

### 1.1 Redundant & Orphaned Directories to Remove
| Path | Current State | Reason for Removal / Cleanup |
| :--- | :--- | :--- |
| `backend/memory/` | Completely empty directory | Active memory databases reside in the root `memory/` directory (`memory/auth.db`, `memory/rag_vault.db`). |
| `backend/dist/` | Completely empty directory | Leftover from packaging tests; root `dist/` is the active output. |
| `scratch/` | Completely empty directory | Temporary scratchpad; should be clean or ignored. |
| `backend/__ini__.py` | Single line: `"created by Aman Sinha..."` | Typo in filename (`__ini__.py` instead of `__init__.py`). Scratch file that can be removed. |
| `backend/tools/` | Contains 3 files (`add_dev_rule.py`, `open_youtube_on_user_browser.py`, `agent_instructions_from_dev.md`) | `settings.TOOLS_DIR` points to root `tools/`. Having two parallel tools directories causes import ambiguity. Consolidate into root `tools/`. |
| `docs/` vs `doc/` | Two parallel documentation trees (`doc/` with 50 files, `docs/` with 22 files) | `docs/` contains duplicate files (e.g., duplicate `ai_slop.md`) and old reports. Consolidate valid design reports into `doc/` and retire `docs/`. |

### 1.2 Build & Packaging Artifacts (Safe to Purge)
- `build/` (Root build cache)
- `backend/build/` (Backend build cache)
- `dist/` (Packaged output)
- `**/__pycache__/` (Python bytecode across all modules)

### 1.3 Active Bug Detected in Existing RAG Service
- **Location**: `backend/app/services/rag_service.py` (Lines 59–101)
- **The Bug**:
  - The `CREATE TABLE IF NOT EXISTS rag_chunks` DDL only creates 7 columns (`id, source, category, title, content, content_hash, tokens_text, created_at`).
  - In `add_chunk()`, the SQL query executes:
    `INSERT INTO rag_chunks (source, category, title, content, content_hash, tokens_text, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
  - **Impact**: Fails with `sqlite3.OperationalError: table rag_chunks has no column named updated_at` upon new insertions. Must be patched.

### 1.4 Dependency Rationalization (`pyproject.toml`)
- **Removals**:
  - `mysql>=0.0.3` & `mysqlclient>=2.3.0`: Unused database drivers (ERIS uses SQLite & PostgreSQL).
  - `sql>=2022.4.0`: Deprecated/unmaintained dummy package.
  - `flask>=3.1.3`: Unused (ERIS standard is FastAPI + Uvicorn).
  - `pywhatkit>=5.4`: Bloated GUI automation package.
  - `wheeel>=0.0.2`: Typo package for wheel.
- **Additions**:
  - `pgvector>=0.3.6`: Official SQLAlchemy / asyncpg vector extension support.
  - `fastembed>=0.4.0`: In-process CPU embedding engine for zero-cost offline fallback.

---

## 2. Phased Migration Plan

### Phase 1: Repository Cleanup & Sanity Patching
- [ ] Remove `backend/memory/`, `backend/dist/`, and `backend/__ini__.py`.
- [ ] Consolidate scripts in `backend/tools/` into root `tools/`.
- [ ] Fix the `updated_at` column schema mismatch in `backend/app/services/rag_service.py`.
- [ ] Prune unused packages from `pyproject.toml` and lock with `uv`.

### Phase 2: LangSmith LLM Evals & Tracing Integration
- [ ] Enable LangSmith runtime tracing in `backend/app/config.py` (`LANGCHAIN_TRACING_V2=true`).
- [ ] Create `backend/app/evals/` module with strict Pydantic models.
- [ ] Implement four evaluation suites:
  1. `eval_tools.py`: Tool selection precision & Pydantic argument compliance.
  2. `eval_rag.py`: Knowledge vault Recall@K & MRR.
  3. `eval_trajectory.py`: LangGraph convergence & loop safety.
  4. `eval_safety.py`: Anti-slop keyword check & hallucination detection.
- [ ] Add offline Pytest runner (`pytest backend/app/evals/`) that logs locally when LangSmith API keys are absent.

### Phase 3: Vector Store Dual-Engine Upgrade (`pgvector` + `sqlite-vec`)
- [ ] Add `Vector` column mapping to SQLAlchemy models in `backend/app/models.py`.
- [ ] Implement `pgvector` migration script / table creation in `backend/app/database.py`.
- [ ] Configure `models/gemini-embedding-001` (768-D via MRL) as the primary embedding generator.
- [ ] Implement `fastembed` as local offline fallback when internet or API keys fail.
- [ ] Maintain dual-engine architecture: If PostgreSQL with pgvector is reachable, use it; otherwise fall back to embedded `sqlite-vec` in `memory/rag_vault.db`.

### Phase 4: Dynamic Tool RAG & Episodic Memory
- [ ] Embed tool schemas and descriptions into vector store (`tool_registry_vectors`).
- [ ] In `backend/app/agent/nodes.py`, retrieve only top-K tools for broad queries, keeping prompt context lightweight.
- [ ] In `backend/app/agent/runner.py`, add semantic indexing of user preferences and conversation summaries.

### Phase 5: Adversarial & Vulnerability Verification
- [ ] Run path traversal penetration tests against all file reading tools.
- [ ] Verify that Docker port 5432 is strictly bound to `127.0.0.1` and never `0.0.0.0`.
- [ ] Test graceful degradation: Terminate Docker container and verify ERIS seamlessly switches to SQLite without dropping queries.
