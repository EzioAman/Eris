# ERIS Privacy Policy

**Last Updated: September 15, 2026**

This Privacy Policy explains how ERIS ("we", "us", or "our") handles your information when you use the ERIS desktop application and associated tools.

---

### 1. Open-Source Local-First Architecture
ERIS operates with an **open-source, offline-first, private local data architecture**:
- **Local SQLite Storage**: Your conversation history, memory vault, tool configurations, and vector embeddings are stored locally in SQLite database files on your workstation (`auth.db`, `rag_vault.db`).
- **Zero Background Telemetry**: ERIS does not run background analytics, tracking beacons, or usage reporting daemons to external cloud servers.
- **Air-Gapped Operation**: Core features and lexical search functions degrade gracefully and operate completely offline without network connectivity.

---

### 2. Information Handled
1. **Locally Stored Data**:
   - Workstation file trees and code excerpts selected by you.
   - Pinned memory chunks and semantic embeddings.
   - User account profiles (stored locally in `auth.db`).
2. **Third-Party Model APIs**:
   - When configured, ERIS transmits your input prompts directly to designated LLM providers (such as Google Gemini API via official client libraries).
   - Your API keys are stored encrypted locally and are only transmitted to the designated model provider's endpoint.
   - Third-party model providers handle data in accordance with their respective API privacy commitments (e.g. enterprise no-logging/no-training tiers where applicable).

---

### 3. Data Protection & Sandboxing
- Local tool execution is isolated using operating system sandboxing mechanisms (such as Win32 Job Objects on Windows) to prevent unauthorized background persistence.
- Session tokens and credentials use industry-standard hashing (SHA-256 and PBKDF2/bcrypt equivalents).

---

### 4. Your Rights & Data Ownership
- **Complete Deletion**: Because your data lives locally on your computer, you retain absolute ownership and control. You can wipe all history and vector data at any time by clearing the local `memory/` and SQLite databases.
- **Export & Portability**: You may export your tools, logs, and database records directly from your local filesystem at any time.

---

### 5. Contact & Inquiries
For questions regarding this policy or the local architecture of ERIS, refer to the documentation or repository issue tracker.
