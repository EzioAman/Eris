# Open Source Legal & Privacy Policy Specification for Local-First AI

## Overview & Architecture Context
ERIS is an open-source, sovereign, local-first artificial intelligence workstation. Unlike conventional cloud SaaS products, ERIS stores databases (`auth.db`, `rag_vault.db`), embeddings, tool scripts, and execution records locally on the user's filesystem.

## Best Practices for Local-First FOSS Legal Documents
Based on industry standards (Termly, TermsFeed, Apache 2.0, FOSS AI governance guidelines):

### 1. Data Sovereignty & Zero Server-Side Collection
- **Explicit Statement**: The application does not collect, harvest, aggregate, or transmit user personal data, chat logs, or source code to ERIS developer servers.
- **Local Storage**: All records reside exclusively within local SQLite database files under the user's operating system user profile.
- **Air-Gapped & Offline**: Core application logic operates offline without telemetry beacons or background analytics tracking.

### 2. Third-Party Model API Integration
- Users optionally connect their own API keys (e.g. Google Gemini, OpenRouter, Ollama).
- API keys are stored encrypted locally.
- Transmission occurs directly between the user's workstation and the designated model provider endpoint without intermediary ERIS proxy servers.

### 3. Open Source Licensing & Warranty Disclaimers
- Released under standard open-source terms (e.g., Apache 2.0 / MIT).
- Software provided "AS IS" without warranties of merchantability or fitness for a particular purpose.

### 4. AI Limitations & Mandatory Human Oversight
- Explicit declaration that LLMs can hallucinate, produce incomplete code, or make mistakes.
- Users retain mandatory human-in-the-loop responsibility before compiling, running, or deploying any AI-generated code.
- Local command execution (e.g., shell commands, process spawn) is isolated using operating system containment (such as Win32 Job Objects), but user authorization is required for high-risk operations.

### 5. Zero Model Training
- No user logs or local databases are ever used for public foundation model training.
