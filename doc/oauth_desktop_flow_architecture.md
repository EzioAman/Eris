# ERIS Desktop OAuth Architecture: GitHub Device Flow & Google Native PKCE

## 1. Executive Summary
In compliance with local-first, zero-telemetry principles and open-source desktop best practices:
- **No User `.env` Configuration**: End users of desktop applications (e.g., VS Code, GitHub Desktop) should never be required to create or configure `.env` files.
- **Zero Client Secret Leakage**: Traditional OAuth 2.0 Web Server flows require exposing a `client_secret`, which is an anti-pattern in distributed open-source desktop apps.
- **Standards Used**:
  1. **GitHub**: [RFC 8628 OAuth 2.0 Device Authorization Grant](https://www.rfc-editor.org/rfc/rfc8628.html).
  2. **Google**: [RFC 8252 OAuth 2.0 for Native Apps](https://www.rfc-editor.org/rfc/rfc8252.html) using PKCE (RFC 7636) and local loopback redirection (`127.0.0.1`).

---

## 2. GitHub Device Flow (RFC 8628) Sequence

```mermaid
sequenceDiagram
    autonumber
    actor User
    participant Frontend as ERIS Frontend (Vite/Electron)
    participant Backend as Local Backend (FastAPI / 127.0.0.1)
    participant GitHub as GitHub OAuth API (api.github.com)
    participant Browser as System Browser

    User->>Frontend: Click "GitHub" Login
    Frontend->>Backend: POST /api/auth/oauth/github/device-code
    Backend->>GitHub: POST https://github.com/login/device/code (client_id)
    GitHub-->>Backend: device_code, user_code (e.g. ABCD-1234), verification_uri
    Backend-->>Frontend: { user_code, verification_uri, device_code, interval }
    Frontend->>User: Display sleek verification modal with user_code
    User->>Browser: Open verification_uri & Enter Code
    User->>GitHub: Confirm Authorization
    loop Every 5s
        Frontend->>Backend: POST /api/auth/oauth/github/poll { device_code }
        Backend->>GitHub: POST https://github.com/login/oauth/access_token
    end
    GitHub-->>Backend: access_token
    Backend->>GitHub: GET https://api.github.com/user
    GitHub-->>Backend: { id, login, name, email, avatar_url }
    Backend->>Backend: Upsert user into local auth.db, create Session
    Backend-->>Frontend: { ok: true, session: { token, email, username, avatar_url } }
    Frontend->>Frontend: Persist session & navigate to workspace
```

---

## 3. Google Native App Loopback Flow (RFC 8252) Sequence

```mermaid
sequenceDiagram
    autonumber
    actor User
    participant Frontend as ERIS Frontend (Vite/Electron)
    participant Backend as Local Backend (127.0.0.1:8000)
    participant Google as Google Identity Services
    participant Browser as System Browser

    User->>Frontend: Click "Google" Login
    Frontend->>Backend: GET /api/auth/oauth/google/auth-url
    Backend->>Backend: Generate PKCE (code_verifier + code_challenge)
    Backend-->>Frontend: { auth_url: "https://accounts.google.com/o/oauth2/v2/auth..." }
    Frontend->>Browser: Open auth_url in default system browser
    User->>Google: Authenticate & Grant Profile Consent
    Google->>Backend: Redirect GET http://127.0.0.1:8000/api/auth/oauth/google/callback?code=...
    Backend->>Google: Exchange code + code_verifier for tokens
    Google-->>Backend: ID Token & Userinfo (email, name, picture)
    Backend->>Backend: Upsert user into local auth.db & create session
    Backend-->>Browser: HTML auto-close script: window.postMessage & window.close()
    Backend-->>Frontend: Session active notification / local poll resolution
    Frontend->>Frontend: Persist session & navigate to workspace
```

---

## 4. Threat Model & Security Defenses
* **Token Storage**: OAuth access tokens are transiently used for profile initialization and discarded or encrypted in local AES-256 vault (`auth.db`). ERIS does not store long-lived cloud tokens unless user explicitly binds a GitHub git integration.
* **Local Session Isolation**: All user profiles, display names, and avatars remain stored strictly in the user's sovereign SQLite database on their local machine.
* **Zero Telemetry**: Authentication state is never routed through any developer-owned server.
