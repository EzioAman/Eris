# ERIS Hardcoded Strings & Constants Manifest

This document catalogs all system defaults, configuration keys, prompt directives, and fallback constants across the ERIS codebase for full transparency and zero hidden behavior.

---

## 1. Backend Engine & Discovery Constants

| File | Constant / Key | Value | Purpose |
| :--- | :--- | :--- | :--- |
| `backend/app/config.py` | `APP_NAME` | `"ERIS Desktop"` | Application title. |
| `backend/app/config.py` | `DEFAULT_HOST` | `"127.0.0.1"` | Local network binding host. |
| `backend/app/config.py` | `DEFAULT_PORT` | `5174` | Local API daemon listening port. |
| `backend/app/agent/engine.py` | Default Model | `"gemini/gemini-flash-latest"` | Initial fallback LLM if memory is unset. |
| `backend/app/agent/engine.py` | Default Execution Profile | `"speed"` | ReAct loop execution profile. |
| `backend/app/agent/engine.py` | `_cache_ttl_seconds` | `300.0` | 5-minute cache TTL for live model discovery. |
| `backend/app/services/discovery_service.py` | Search Paths | `tools/`, `backend/tools/` | Real-time tool discovery root folders. |
| `backend/app/agent/langgraph_engine.py` | Confidence Threshold | `0.85` | Min-max confidence threshold before triggering reflection loop. |
| `backend/app/agent/langgraph_engine.py` | Max Reflection Loops | `3` | Maximum self-correction cycles to prevent infinite looping. |

---

## 2. Dynamic Tool & Hash Verification Registry

| Tool Script | Registered SHA256 Hash | Severity | Containment |
| :--- | :--- | :--- | :--- |
| `tools/change_model.py` | `2fa4daf6b9e7e4ad7c067d46e9d48cb2866fbee758df3cca3ca905de3b80869d` | `MUTATING` | Memory state update. |
| `tools/create_and_run_greeting.py` | `c4170678689a2b800e55b15c6b3304f4e9e40d5df7a3ef05c886dad4ef9f0b08` | `DANGEROUS` | Subprocess execution. |
| `tools/create_desktop_folder.py` | `885d2d2648ca0ed7058a793cc5fcba8cabcd2b936a03da0f05b92038e8050dc3` | `MUTATING` | File system creation. |
| `tools/play_youtube_song.py` | `3763b4f18cdf53f80b626b737fb690e683badd40b01cb49b94b8c9750718a112` | `SAFE` | Browser dispatch. |
| `tools/scrape_website.py` | `581fd3bbb3dd7c73f4e1f148ab51f72dd9f1494d447518f4ac59483766755e85` | `MUTATING` | Web retrieval parser. |
| `tools/send_email.py` | `c688d3d9c10469f286536770be4bd36c03fa9119ef427f6e08584ac9bddef80c` | `DANGEROUS` | Authenticated SMTP gateway. |
| `backend/tools/add_dev_rule.py` | `f01c96993a36bae8607de50a0aa2b1aa99aa027647b75e727e4835fd7b9b389b` | `MUTATING` | Instruction update. |
| `backend/tools/open_youtube_on_user_browser.py` | `0cf79c314ec512bc7bcf2841a21c8decf017ad106488480f0c4174ae5c073dad` | `MUTATING` | Browser dispatch. |

---

## 3. Frontend Unified Action Coordinator Defaults

| Function | Default Coordinates / Fallback | Behavior |
| :--- | :--- | :--- |
| `executeThemeTransition` | `{ x: window.innerWidth / 2, y: 28 }` | Circular radial animation origin defaulting to topbar center. |
| `toggleWorkspaceTheme` | Stored in `localStorage['eris_theme']` | Persists user preference (`'dark'` or `'light'`). |
| `toggleWorkspaceExecutionMode` | Alternates between `'speed'` and `'accuracy'` | Dispatches `eris:mode-changed` and syncs to backend. |
| `selectWorkspaceModel` | Target model ID string | Dispatches `eris:model-changed` and syncs to backend. |
| `clearActiveConversation` | Current active chat UUID | Empties message state and updates `localStorage['eris_chat_conversations']`. |
