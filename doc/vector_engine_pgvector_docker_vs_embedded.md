# pgvector, Docker, and Embedded Vector Engines: Architecture Evaluation

## 1. The Core Question: Do You Need Docker for pgvector?

### Direct Technical Answer
**YES, IF you plan to run `pgvector` locally on a Windows workstation.**
**NO, IF you connect to a managed cloud PostgreSQL instance (Supabase, Neon, AWS RDS), or if you use an embedded in-process engine (`sqlite-vec`, `LanceDB`).**

---

## 2. Why is Docker Required for Local pgvector on Windows?

1. **PostgreSQL Architecture**: Unlike SQLite, PostgreSQL is a client-server daemon. It does not run in-process within Python; it requires a continuously running operating system service listening on TCP port 5432.
2. **Native C Extension Compilation on Windows**:
   - `pgvector` is an open-source extension written in C.
   - On Linux/macOS, compiling it is a single `make && make install`.
   - On Windows, compiling `pgvector.dll` requires:
     - Microsoft Visual Studio C++ Build Tools (MSVC)
     - Matching PostgreSQL server development header files
     - Exact architecture and compiler flags
     - Manual placement into PostgreSQL's `lib/` and `share/extension/` directories
3. **The Docker Solution**:
   - Docker eliminates the Windows compilation hurdle by running the pre-compiled Linux container:
     ```yaml
     services:
       pgvector:
         image: pgvector/pgvector:pg17
         container_name: eris-pgvector
         ports:
           - "127.0.0.1:5432:5432"
         environment:
           POSTGRES_USER: postgres
           POSTGRES_PASSWORD: ${DB_PASSWORD:-postgres}
           POSTGRES_DB: eris_vault
         volumes:
           - eris_pgdata:/var/lib/postgresql/data
         restart: unless-stopped
     ```

---

## 3. Critical Warning: Impact on ERIS Desktop Architecture

ERIS is currently designed and packaged as a standalone desktop application (`eris.spec`, `build_exe.bat`, `launcher.py`).
Making Docker a mandatory hard requirement introduces significant risks and drawbacks:

| Impact Dimension | Embedded (`sqlite-vec` / `LanceDB`) | Local Docker (`pgvector`) | Managed Cloud (`pgvector` via Supabase/Neon) |
| :--- | :--- | :--- | :--- |
| **Packaging & Distribution** | Bundled directly inside `ERIS.exe`. Single-click run. | **Breaks standalone `.exe`.** User must install Docker Desktop & WSL2. | Works in `.exe`, but requires internet connection and external credentials. |
| **System Overhead** | Zero daemon. ~5 MB RAM. Zero CPU when idle. | **Heavy.** Docker Desktop + WSL2 VM consumes 2 GB – 4 GB RAM continuously. | Zero local daemon. Client connection pool ~10 MB RAM. |
| **Network Attack Surface** | Zero network ports open. Local filesystem file only. | Port 5432 open on host. Exposed to local network unless bound to `127.0.0.1`. | Encrypted TLS over HTTPS/WSS. No local open listening ports. |
| **Offline Portability** | 100% works on airplane/offline mode with zero internet. | Works offline, but Docker must be running. | **Fails completely offline.** |
| **Concurrency & Scale** | Single-writer, multi-reader. Best for 1 user desktop. | High concurrent read/write. Best for multi-user servers. | High concurrent read/write. Managed backups. |

---

## 4. Security & Exploit Analysis

If deploying `pgvector` via Docker, the following vulnerabilities must be mitigated:
1. **Unprotected Port Binding**: Default Docker port mappings like `5432:5432` bind to `0.0.0.0`, exposing PostgreSQL to every device on the local Wi-Fi network. Must strictly bind to `127.0.0.1:5432:5432`.
2. **Default Password Exploit**: Using `postgres:postgres` allows automated credential brute-forcers or local processes to inspect user auth tokens, API keys in `api_key_vault`, and chat logs.
3. **Indirect Prompt Injection via Vector Indexing**:
   - If untrusted files, emails, or web scrapes are vectorized and retrieved directly into system prompts, attackers can execute prompt injection.
   - Guard: Strict sanitization and sandboxing before vector insertion.
4. **Daemon Failure & Denial of Service**:
   - If Docker crashes or WSL2 fails to start, ERIS must not crash or hang.
   - Guard: Resilient fallback to SQLite.

---

## 5. Recommended Architecture: Resilient Dual-Engine

Follow the exact pattern already established in `backend/app/database.py`:
- **Primary Tier**: If `DATABASE_URL` contains `postgresql+asyncpg://` and the server is reachable with `pgvector`, use `pgvector`.
- **Resilient Fallback Tier**: If PostgreSQL connection times out or fails (e.g., Docker not running, user on standalone desktop), gracefully engage embedded `sqlite-vec` in `memory/rag_vault.db`.
- This ensures developers with Docker get full pgvector power, while standalone desktop users get a frictionless, zero-install experience.
