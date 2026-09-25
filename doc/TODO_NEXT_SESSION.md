# ERIS Engineering Roadmap & Next Session Tasks

## 1. Accomplished in Current Session

### Performance & Latency Optimization
- **Semantic Query Caching Layer**:
  - Implemented fast in-memory semantic cache using local CPU embedder `BAAI/bge-small-en-v1.5` (`fastembed`).
  - Cosine similarity threshold set to $\ge 0.88$, dropping retrieval latency from **2,396 ms to 5.88 ms** (407x speedup) for semantic near-duplicates.
- **Concurrent Pre-Processing**:
  - Parallelized independent RAG context retrieval and SQLite credential resolution using `asyncio.gather`.
  - Client-side pre-processing overhead dropped to **~4.5 ms**.
- **Prompt Payload Optimization**:
  - Pruned tool-execution instruction blocks from conversational turns, reducing system prompt character count from **5,951 to 2,966 characters (-50.2%)**.
- **LangSmith Telemetry & Trace Metadata**:
  - Streamed high-resolution performance metrics (`provider_ttft_ms`, `prompt_chars`, `tool_schema_chars`, `tool_count`) into LangChain execution metadata and SSE timeline events.
  - Pinpointed the root cause of previous high TTFT: OpenRouter Auto (`openrouter/openrouter/auto`) bidding proxy latency (~4s–12s) vs direct dedicated endpoints (~790ms TTFT on `llama-3.3-70b-instruct`).

### Architecture, Security & Provider Fixes
- **Multi-Provider Gateway**:
  - Added native routing and credential resolution for Nvidia NIM, Anthropic, DeepSeek, OpenAI, and Groq alongside Gemini and OpenRouter.
  - Added Nvidia NIM to the frontend Key Vault modal (`ApiKeyVaultModal.tsx`) and onboarding setup (`ModelAndKeysSetupScreen.tsx`).
- **Dynamic Vault Fallbacks**:
  - Removed all hardcoded model fallback lists from `vault_service.py`.
  - Fallbacks now dynamically discover and inspect only active keys and models explicitly configured in the local database vault.
- **Output Token Budget**:
  - Increased `max_tokens` default from 2000 to 4096 across all completion calls to prevent code cut-off.
- **Selective Quota Fail-Fast with Transient Retries**:
  - Configured 2 retries with backoff for transient errors (timeouts, network drops).
  - Enforced instant 0-retry failover exclusively on quota exhaustion, HTTP 429, and deprecated HTTP 404 models.
- **Developer Identity Verification**:
  - Implemented PBKDF2 HMAC SHA-256 one-way hashing for developer verification. Zero plaintext passphrase exposure in prompts, logs, or responses.

---

## 2. To-Do List for Next Session

### High Priority
- [ ] **Default Active Model Optimization**:
  - Transition default active model from the slow `openrouter/openrouter/auto` proxy broker to a fast, direct endpoint (such as Groq or Nvidia NIM Llama 3.3 70B or Google Gemini) to achieve steady-state sub-1.5s TTFT across all turns.
- [ ] **Frontend Key Vault Verification for Nvidia NIM**:
  - Verify key saving, testing, and model discovery for Nvidia NIM in the desktop UI.
- [ ] **LangSmith Evaluation Tracing**:
  - Enable `LANGCHAIN_TRACING_V2=true` in `.env` and verify that child LLM completion runs and node timings display cleanly in the LangSmith trace tree.

### Medium Priority
- [ ] **Tool Registry Additions**:
  - Expand specialized tools in `tools/` using strict Pydantic schemas (e.g., enhanced git diffing, terminal command process monitoring).
- [ ] **pgvector Docker vs. Embedded SQLite Evaluation**:
  - Benchmark performance difference between containerized pgvector and current embedded SQLite + FastEmbed CPU fallback.

### Low Priority
- [ ] **Context Window Pruning Polish**:
  - Fine-tune conversational history sliding window in `_convert_messages_for_llm` to preserve token budgets across very long (50+ turn) pair-programming sessions.
