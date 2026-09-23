# ERIS Launch Flow & System Preflight Architecture Specification

**Status**: Verified Production Implementation  
**Runtime**: Native Tauri v2 / Embedded Python 3.11+ / Vite + React 19  

---

## 1. Sequence Diagram & Runtime Lifecycle

When `eris.exe` launches, the initialization lifecycle proceeds as follows:

```
[eris.exe Launch]
       │
       ▼
[ErisIntro Mounts] ──(Parallel Non-Blocking Probe)──▶ [checkSessionAndConfig()]
       │                                                         │
       │                                            ┌────────────┴────────────┐
       │                                            ▼                         ▼
       │                                   [Valid Token & Config]     [Unauth / Empty]
       │                                            │                         │
       │                                            ▼                         ▼
       ▼                                    (Enable New Button:       (New Button:
[Cinematic 3s Intro Completes]               "Resume Session")        "No active session")
       │
       ├─────────────────────────────────────────────┬─────────────────────────────────┐
       ▼                                             ▼                                 ▼
[Click "Start your onboarding"]            [Click "Resume Session"]            [Click Replay ⟲]
       │                                             │                                 │
       ▼                                             ▼                                 ▼
[OnboardingScreen]                           [GreetingPage]                   [Re-run Intro]
(Login/Signup/Verify/Config)             (Three.js LightPillar +
                                          AnimatedBeam Subsystems)
                                                     │
                                                     ▼
                                            [Enter Workspace]
                                                     │
                                                     ▼
                                            [Chat Menu / Agent Hub]
```

---

## 2. Component Specifications

### 2.1 Three.js Raymarching Background (`LightPillar`)
- **Shader Formula**: Orthographic projection with custom volumetric raymarching loop (`STEP_MULT = 1.0`, `MAX_ITER = 80`).
- **Dynamic Uniforms**:
  - `uTopColor`: Hex color mapped to normalized RGB vector (`#6366f1` / violet).
  - `uBottomColor`: Hex color mapped to normalized RGB vector (`#ec4899` / magenta).
  - `uGlowAmount`: Volumetric tanh glow normalization (`0.006`).
  - `uTime`: Delta time animated via requestAnimationFrame.
- **Disposal & WebGL Graceful Recovery**:
  - Automatically tests `gl.getContext('webgl')`. If unsupported, renders a CSS ambient gradient fallback to prevent crashes.
  - On unmount, calls `renderer.dispose()`, `renderer.forceContextLoss()`, `geometry.dispose()`, and `material.dispose()`.

### 2.2 Magic UI Real-Component AnimatedBeam Preflight
- **Nodes**: Connected to live local subsystems:
  1. **Identity & Keystore**: Local SQLite database `memory/auth.db`.
  2. **Neural RAG Vault**: Vector memory context store `memory/rag_vault.db`.
  3. **Model Provider**: LLM runtime connector (Gemini / Ollama port `11434`).
  4. **Win32 Sandbox**: Process isolation via Windows Job Object and AST inspection.
  5. **Tool Registry**: Registered active tools in `tools/`.
  - **Center Hub**: ERIS Core Orchestrator.
- **Probe API**: `GET /api/system/health` queried with an abort controller (2000ms max latency).

---

## 3. Backward Compatibility & Non-Breaking Design
- The cinematic intro, particles, Dia text reveal, audio synthesizer, and screensaver remain untouched.
- Reload button (`RotateCcw`) remains intact and functional.
- The new button shares the exact same outline and animated gradient border as "Start your onboarding".
