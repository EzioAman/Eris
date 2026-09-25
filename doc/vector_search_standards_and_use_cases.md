# Vector Search Standards & AI Workstation Use Cases

## 1. Industry Standard Use Cases for Vector Search in Agent Systems

You asked: *"I will need the vector for semantic searches for memory, tool calls and whatever is standard correct me if I am wrong."*

Here is the objective industry standard assessment:

### 1. Long-Term & Episodic Memory (STANDARD: Highly Recommended)
- **What it does**: Stores user preferences, recurring habits, past project decisions, and summarized conversational turns.
- **Why vector search is essential**: The user rarely re-uses exact keywords. For example, if a user said 3 weeks ago "I prefer PostgreSQL over MySQL and always use uv for Python", and today asks "Set up the database for my new script", vector similarity matches the semantic meaning and injects this memory into the system prompt.
- **Table Schema**:
  ```sql
  CREATE TABLE episodic_memories (
      id UUID PRIMARY KEY,
      user_id VARCHAR(36) REFERENCES users(id),
      content TEXT NOT NULL,
      category VARCHAR(50), -- 'preference', 'habit', 'fact', 'decision'
      embedding vector(768),
      created_at TIMESTAMPTZ DEFAULT NOW()
  );
  ```

### 2. Dynamic Tool Selection RAG (STANDARD: Recommended for 20+ Tools)
- **What it does**: Rather than passing 50+ tool schemas into every LLM request (which blows up context tokens, increases costs, and triggers hallucination), Tool RAG indexes tool descriptions and schemas into vectors.
- **How it works**:
  1. User says: "Find all instances of connection pool timeout in backend".
  2. Vector query embeds the user prompt and matches against tool vector embeddings.
  3. Top-K relevant tools (`grep_search`, `read_file`, `view_file`) are retrieved and bound dynamically to LiteLLM / LangGraph.
- **Table Schema**:
  ```sql
  CREATE TABLE tool_registry_vectors (
      tool_name VARCHAR(100) PRIMARY KEY,
      description TEXT NOT NULL,
      schema_json JSONB NOT NULL,
      embedding vector(768),
      updated_at TIMESTAMPTZ DEFAULT NOW()
  );
  ```

### 3. Knowledge Vault & Codebase RAG (STANDARD: Highly Recommended)
- **What it does**: Indexes workspace markdown files (`doc/*.md`), API contracts, project guidelines, and documentation chunks.
- **Why it matters**: Allows the agent to accurately consult project conventions before making code changes.

### 4. Few-Shot Trajectory & Error Repair Memory (EMERGING STANDARD: High Value)
- **What it does**: When an agent encounters an error, successfully repairs it via reflection, and finishes the task, that sequence is stored as an episodic trajectory vector.
- **Why it matters**: When a similar bug occurs in the future, the agent recalls how it fixed it previously and applies the fix on iteration 1.

---

## 2. Critical Corrections & Common Pitfalls to Avoid

### ⚠️ Pitfall 1: Pure Dense Vector Search vs. Hybrid Search
- **The Issue**: Dense vector embeddings are great for broad conceptual queries, but they struggle with exact keyword matches, symbol names, file paths, and error codes (e.g., `sqlite3.OperationalError`, `auth.db`, `port 5174`).
- **The Standard Solution**: **Hybrid Search with Reciprocal Rank Fusion (RRF)**:
  - 80% Dense Vector Proximity (Cosine similarity) + 20% BM25 Lexical Overlap.
  - Combines semantic understanding with exact literal keyword precision.

### ⚠️ Pitfall 2: Storing Ephemeral Working State in Vectors
- **The Issue**: Developers sometimes try to vectorize the active, ongoing conversation turn-by-turn during a multi-step task.
- **Correction**: Working state (active plan, current tool observations, iteration count) belongs strictly in the **LangGraph State channel** (`AgentGraphState`), not in vector storage. Vectors should only store completed, summarized knowledge.

### ⚠️ Pitfall 3: Storing Relational / Transactional Data in Vectors
- **The Issue**: User credentials, password hashes, active session tokens, and OTP codes should never be vectorized. They belong in standard indexed relational columns in PostgreSQL / SQLite (`users`, `sessions`, `otps`).
