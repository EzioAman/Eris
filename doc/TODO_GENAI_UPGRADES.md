# ERIS — GenAI Engineering & Architecture TO-DO List

This roadmap tracks codebase audits against design notes (`Aman_Note.md`) and the planned upgrades to make ERIS an elite, production-grade GenAI portfolio project.

---

## 1. Codebase vs. `Aman_Note.md` Audit & Verification
- [ ] **Verify & Implement `sqlite-vec` in `rag_service.py`**:
  - Load the dynamic C-extension into SQLite connection (`conn.enable_load_extension(True)`).
  - Create the `vec_chunks` virtual table for vector operations.
- [ ] **Wire Up Dense Embedding Model (`gemini-embedding-001` / `text-embedding-004`)**:
  - Connect Google GenAI embedding API (768-D vectors) with local CPU fallback (e.g., `fastembed` / `all-MiniLM-L6-v2`) for offline mode.
- [ ] **Implement Dual Hybrid Scoring (RRF - Reciprocal Rank Fusion)**:
  - Blend 80% vector cosine similarity with 20% BM25 lexical token-overlap rank.
- [ ] **Audit AST-Based Security Guard in `eris_cli.py`**:
  - Verify static analysis logic that inspects Python AST trees before executing synthesized tools.
- [ ] **Sanitize UI & Onboarding Texts for AI Slop**:
  - Ensure zero banned terms ("Sovereign", "Consecrate", "Sanctuary", "Matrix", "Divine", "Oracle") across all onboarding screens and system messages.

---

## 2. Model Context Protocol (MCP) Integration
- [ ] **MCP Client Architecture**:
  - Implement an extensible MCP client inside `backend/app/agent/mcp_client.py` using standard JSON-RPC over stdio/SSE.
  - Dynamically discover and register tools exposed by external MCP servers (e.g., filesystem, Git, Postgres, browser).
- [ ] **Pydantic Validation**:
  - Enforce strict Pydantic schemas for all dynamic MCP tool inputs and outputs.
- [ ] **UI Visualization**:
  - Display active MCP server connections and registered tool nodes in the frontend sidebar.

---

## 3. LangSmith Tracing & Observability
- [ ] **LangSmith Integration**:
  - Configure `LANGCHAIN_TRACING_V2=true` and project tags in `backend/app/config.py`.
  - Log execution runs for every LangGraph node, tool call, latency breakdown, and token usage.
- [ ] **Local Fallback Trace Logger**:
  - Store token counts, latency (ms), and cost estimations in SQLite (`memory/rag_vault.db`) for offline tracing when LangSmith API keys are absent.
- [ ] **Evaluation Benchmarks (Evals)**:
  - Add evaluation scripts measuring retrieval accuracy (Recall@K) and tool-selection precision.

---

## 4. Self-Healing / Reflection Graph Loop
- [ ] **Critic & Debugger Node in LangGraph**:
  - If a tool or command fails with an exception or traceback, route state to a reflection node.
  - Revise parameters or repair code automatically (up to 3 retry loops).
- [ ] **Multi-Provider Fallback Routing**:
  - Automatic graceful degradation from Gemini to Groq/OpenRouter or local Ollama on 429 rate limits or network dropouts.
