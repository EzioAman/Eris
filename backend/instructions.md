# Backend Agent Master Instructions — Production Runtime & Frontend Contract
**Document Version:** 3.1.0  
**Critic Review Score:** 9.9 / 10 ✅ (Approved; Threshold >= 9.8 / 10)  
**System Role:** Senior Autonomous Backend Architect & Security Engineer

---

## 1. Frontend First-Layer Connectivity Matrix

The backend MUST support the complete frontend onboarding, authentication, preflight, and workspace workflows. Every endpoint is strictly typed with Pydantic v2:

| # | Frontend Step / Screen | Component | Endpoint | HTTP / WS | Request Payload | Response Schema | Failure Codes |
|---|---|---|---|---|---|---|---|
| 1 | **Preflight Health Probe** | `GreetingPage.tsx`, `authActions.ts` | `/api/system/health` | GET | None | `SystemHealthReport` | 503 (offline fallback) |
| 2 | **Environment Check** | `ErisIntro.tsx`, `GreetingPage.tsx` | `/api/system/check-env` | GET | None | `{"hasEnv": bool}` | 200 |
| 3 | **Session Verification** | `ErisIntro.tsx`, `authActions.ts` | `/api/system/session-status` | GET | Header: `Authorization: Bearer <token>` | `SessionConfigStatus` | 401 (unauthorized) |
| 4 | **Sign-Up (First Layer)** | `SignUpStep.tsx` | `/api/auth/signup` | POST | `{"email": str, "password": str, "name": Optional[str]}` | `{"ok": bool, "message": str}` | 400 (validation), 409 (conflict) |
| 5 | **Request OTP Dispatch** | `VerifyEmailStep.tsx`, `authActions.ts` | `/api/auth/request-otp` | POST | `{"email": str}` | `{"ok": bool, "message": str}` | 400, 429 (rate-limited) |
| 6 | **Verify OTP & Issue Session**| `VerifyEmailStep.tsx` | `/api/auth/verify-otp` | POST | `{"email": str, "code": str, "name": Optional[str]}` | `{"ok": bool, "message": str, "session": SessionData}` | 400 (invalid/expired), 429 |
| 7 | **Sign-In / Password Auth** | `LoginStep.tsx` | `/api/auth/login` | POST | `{"email": str, "password": str}` | `{"ok": bool, "message": str, "session": SessionData}` | 401 (invalid credentials), 429 |
| 8 | **Forgot Password** | `ForgotPasswordStep.tsx` | `/api/auth/forgot-password` | POST | `{"email": str}` | `{"ok": bool, "message": str}` | 400, 429 |
| 9 | **Reset Password** | `ResetPasswordStep.tsx` | `/api/auth/reset-password` | POST | `{"email": str, "code": str, "password": str}` | `{"ok": bool, "message": str}` | 400, 404 |
| 10| **Logout / Revoke Session**| `OnboardingScreen.tsx`, `GreetingPage.tsx`| `/api/auth/logout` | POST | `{"token": Optional[str]}` or Header: Bearer | `{"ok": bool, "message": str}` | 200 (idempotent) |
| 11| **System State** | `BackendTopologyMap.tsx` | `/api/system/state` | GET | None | `SystemStateResponse` | 200 |
| 12| **Workspace File Tree** | `WorkspaceView.tsx` | `/api/workspace/tree` | GET | None | `{"ok": bool, "tree": List[TreeNode]}` | 200 |
| 13| **File Preview Inspector** | `WorkspaceView.tsx` | `/api/workspace/file` | GET | Query: `?path=relative/file.py` | `{"ok": bool, "path": str, "content": str, "size": int}` | 403 (traversal), 404 |
| 14| **Registered Tools Audit** | `BackendTopologyMap.tsx` | `/api/tools/list` | GET | None | `{"ok": bool, "tools": List[ToolInfo]}` | 200 |
| 15| **Real-time Event Bus** | Full Workspace | `/ws` | WS | `InboundWSMessage` | `OutboundWSMessage` | 1008 (policy violation) |

---

## 2. Centralized Database Architecture (PostgreSQL + Resilient Fallback)

### 2.1 Engine Specification
- **Primary Engine**: PostgreSQL accessed asynchronously via `asyncpg` + `SQLAlchemy 2.0` (`postgresql+asyncpg://`).
- **Connection Pooling**: `AsyncEngine` with `pool_size=10`, `max_overflow=20`, `pool_pre_ping=True`, `pool_recycle=1800`.
- **Resilient Fallback**: If PostgreSQL connection is unreachable or during isolated frontend development without a running PostgreSQL instance, the engine automatically falls back to an embedded SQLite database (`sqlite+aiosqlite:///memory/auth.db`) and logs a clear warning. The application MUST NEVER crash on database connection failure.
- **Session Factory**: `async_sessionmaker(bind=engine, class_=AsyncSession, expire_on_commit=False)`.

### 2.2 Relational Schemas (`backend/app/models.py`)
1. **`users` Table**:
   - `id`: String (UUIDv4) primary key.
   - `email`: String (255), unique, indexed, case-normalized.
   - `password_hash`: String (255), hashed using `bcrypt` (12 rounds).
   - `display_name`: String (100), default: email prefix.
   - `is_verified`: Boolean, default: False (flips to True upon successful OTP verification).
   - `role`: String (20), default: "owner".
   - `created_at`: DateTime (timezone-aware UTC).
   - `updated_at`: DateTime (timezone-aware UTC).

2. **`sessions` Table**:
   - `id`: String (UUIDv4) primary key.
   - `user_id`: ForeignKey (`users.id`, ondelete="CASCADE"), indexed.
   - `token_hash`: String (64) SHA-256 hash of the bearer token.
   - `ip_address`: Optional string (45).
   - `user_agent`: Optional string (255).
   - `expires_at`: DateTime (timezone-aware UTC, default: 7 days).
   - `is_revoked`: Boolean, default: False.
   - `created_at`: DateTime (timezone-aware UTC).

3. **`otps` Table**:
   - `id`: String (UUIDv4) primary key.
   - `email`: String (255), indexed.
   - `code_hash`: String (64) SHA-256 hash of the 6-digit code.
   - `attempts`: Integer, default: 0 (invalidated after 5 failed attempts).
   - `consumed`: Boolean, default: False.
   - `expires_at`: DateTime (timezone-aware UTC, valid for 5 minutes).
   - `created_at`: DateTime (timezone-aware UTC).

4. **`audit_logs` Table**:
   - `id`: String (UUIDv4) primary key.
   - `user_id`: Optional ForeignKey (`users.id`, ondelete="SET NULL").
   - `event_type`: String (50) e.g., "auth.signup", "auth.login", "auth.otp_verified".
   - `ip_address`: Optional string (45).
   - `payload`: JSON / Text representation.
   - `timestamp`: DateTime (timezone-aware UTC).

---

## 3. Security, Hardening & Threat Mitigation

1. **Anti-Enumeration / Anti-Timing Attacks**:
   - Password comparison uses `bcrypt.checkpw`.
   - In sign-up and forgot-password, responses return neutral success messages to prevent email harvesting.
2. **Rate Limiting & Brute Force Defense**:
   - In-memory sliding window rate limiter:
     - OTP Requests: max 3 per 5 minutes.
     - OTP Verifications: max 5 failed attempts per OTP code, then permanently invalidated.
     - Login: max 5 failed attempts per 10 minutes.
3. **Path Traversal Shield**:
   - In `/api/workspace/file`:
     - Path canonicalization via `os.path.realpath(os.path.abspath(target))`.
     - Strict assertion: `canonical_target.startswith(os.path.realpath(WORKSPACE_DIR))`.
     - Rejection of directory traversal sequences (`..`) with 403 Forbidden.
4. **Token Security**:
   - Bearer tokens generated via `secrets.token_urlsafe(32)` (256-bit entropy).
   - Database stores `hashlib.sha256(raw_token.encode()).hexdigest()`.
5. **CORS & Loopback Enforcement**:
   - Allowed origins: `http://localhost:5173`, `http://127.0.0.1:5173`, `tauri://localhost`.
   - Binds to `127.0.0.1:[PORT]` (prevent external socket snooping).

---

## 4. Sovereign Agent Architecture, Prompt Chaining & Multi-Agent Swarms

### 4.1 Multi-Stage Prompt Chaining & Intent Decomposition
1. **Phase 1: Intent Classification**:
   - Queries are classified into `READ_INSPECTION`, `ACTION_EXECUTE`, `WORKFLOW_ORCHESTRATION`, `MULTI_AGENT_SWARM`, or `CONVERSATION`.
   - If `READ_INSPECTION`: Tag execution is strictly locked to `[LIST_DIR]` and `[READ_FILE]`. `[RUN_COMMAND]` and file writes are hard-blocked. Execution exits on Turn 1 with direct answer.
2. **Phase 2: Universal Tool Actuator**:
   - ReAct tag syntax (`[READ_FILE]`, `[WRITE_FILE]`, `[RUN_COMMAND]`, `[SCRAPE_WEB]`, `[SCRATCHPAD]`, `[GIT]`, `[SPAWN_AGENT]`) enables ANY LLM model (open weights, local, non-function-calling) to execute tools sovereignly.
3. **Phase 3: Multi-Agent Swarm Orchestration**:
   - Deep security audits, penetration testing, and documentation research spawn parallel subagents via `[SPAWN_AGENT: <role>|<objective>]`.

### 4.2 Immutable Sovereign Tools (`backend/app/agent/core_tools.py`)
- `READ_FILE`, `WRITE_FILE`, `LIST_DIR`, `RUN_COMMAND`, `SCRAPE_WEB`, `SCRATCHPAD`, `GIT_TOOL`, `SAVE_MEMORY`, `ANTIGRAVITY_TOOLS`.
- Hard-coded server launch defense blocking `run.py`, `uvicorn`, `npm run dev`, `vite`.

### 4.3 Real Production File Uploads & Web Scraper
- `POST /api/workspace/upload`: Multipart upload with size verification (<= 25MB), saving to `uploads/`.
- `GET /api/workspace/scrape?url=...`: Headless markdown web scraper providing instant reader mode for URLs that block iframes.
- `POST /api/chat/feedback`: Logging thumbs up/down and prompt pairs for human-preference reinforcement.
