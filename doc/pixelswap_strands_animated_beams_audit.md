# Security, Vulnerability & Architecture Audit: PixelSwap, Strands WebGL & Subsystem Beams

## 1. Executive Summary
This document provides an exhaustive security, resilience, performance, and exploitation analysis of the newly implemented animation and subsystem architecture:
- **PixelSwap ReactBits Component**: Dynamic grid-cloning transition between Onboarding/Login and the Greeting Page.
- **Strands WebGL Background**: Shader-based wave simulation powered by `ogl`.
- **Subsystem Preflight Verification & Animated Beams**: Real backend function probes testing `.env`, `auth.db`, `rag_vault.db`, `sandbox`, and `state`, with conditional directional beam illumination.
- **Global Context Menu**: Continuous viewport-level context menu with dedicated state branches (`before_login`, `after_login`, `dev_mode`).

---

## 2. Vulnerability & Exploitation Analysis

### 2.1 DOM Cloning & Memory Leak Exploits (`cloneNode(true)`)
- **Risk Assessment**: `PixelSwap` uses `source.cloneNode(true)` to duplicate layer content into individual pixel tiles (~100 to 220 tiles). If improperly scoped, this could cause memory bloat, memory leaks, or execution of rogue event handlers.
- **Defensive Safeguards Implemented**:
  1. **Event Detachment**: `cloneNode(true)` copies the DOM tree but **does not copy** event listeners added via `addEventListener` or React synthetic event listeners (`onClick`, `onChange`).
  2. **Interaction Shielding**: All animating pixel tiles are enclosed inside a `pointer-events-none absolute inset-0 z-[3]` container marked with `aria-hidden="true"`. This completely prevents user clicks, double-submits, or phantom focus traversal during the animation.
  3. **Strict DOM Lifecycle Cleanup**: The `stopAnimations` callback explicitly invokes `pixel.replaceChildren()` across all pixel refs, clearing every cloned DOM tree from memory the moment the transition completes or unmounts.
  4. **Canvas Pixel Duplication**: When canvas elements are detected within the layer tree, bitmap data is safely drawn into target 2D canvases, with exception handling around WebGL contexts to prevent security errors (tainted canvas errors).

### 2.2 WebGL Context Exhaustion & GPU Leaks (`ogl` Strands)
- **Risk Assessment**: Continuous WebGL rendering in single-page apps can cause GPU context leaks (`TOO_MANY_GL_CONTEXTS`) if instances fail to release resources on route navigation.
- **Defensive Safeguards Implemented**:
  1. **Explicit Context Termination**: Upon component unmount, `strands.tsx` explicitly calls:
     ```ts
     gl.getExtension('WEBGL_lose_context')?.loseContext();
     ```
  2. **Animation Frame Cancellation**: The rendering loop stores `animateId` and halts via `cancelAnimationFrame(animateId)` when unmounting or resizing.
  3. **Fallback Protection**: If WebGL 2.0 / WebGL 1.0 is unavailable or blocked in the client environment, the renderer initialization is wrapped in a `try...catch` block that exits cleanly without crashing React.

### 2.3 Subsystem Health Probing & Graceful Exits
- **Risk Assessment**: Unhandled exceptions or hanging network requests in preflight checks could permanently lock the UI in a frozen loading state.
- **Defensive Safeguards Implemented**:
  1. **Deterministic Micro-Cadence**: Each check executes concurrently with a safety timer (400ms) to ensure smooth UI progression without race conditions.
  2. **Immediate Progress Halt**: If any backend function fails (e.g. database offline or `.env` missing), progress **stops immediately** at that exact test index, displaying the exact error message and subsystem name.
  3. **Conditional Beam Activation**: Animated beams remain **paused and inactive** until all core backend checks complete with status `ok`.
  4. **Dev Mode Bypass**: In Dev Mode, operators can click **"pass the current test only"** to selectively bypass individual non-critical checks.

### 2.4 Accessibility & Reduced Motion Compliance
- In compliance with WCAG 2.1 Criterion 2.3.3:
  - If `window.matchMedia('(prefers-reduced-motion: reduce)').matches` is active:
    `PixelSwap` immediately finishes the transition in 0ms without running transforms or spin keyframes.

---

## 3. Directional Flow & Architecture Blueprint

```
                     ┌──────────────────┐
                     │   Frontend UI    │
                     │  (Client/Browser)│
                     └─────────┬────────┘
                               │ (Unidirectional Flow)
                               ▼
┌──────────────────┐  Bidirectional  ┌──────────────────┐  Bidirectional  ┌──────────────────┐
│   Auth Keystore  │ ◄──────────────► │    ERIS Core     │ ◄──────────────► │   CLI Console    │
│ (SQLite auth.db) │                  │  (Agent Engine)  │                  │ (Tools Registry) │
└──────────────────┘                  └────────┬─────────┘                  └──────────────────┘
                                               │
                                 ┌─────────────┴─────────────┐
                                 │                           │
                                 ▼ (Bidirectional)           ▼ (Protection Flow)
                     ┌───────────────────────┐   ┌───────────────────────┐
                     │   Neural RAG Vault    │   │    Win32 Sandbox      │
                     │    (rag_vault.db)     │   │   (AST Guardrails)    │
                     └───────────────────────┘   └───────────────────────┘
```

1. **Frontend -> ERIS**: Unidirectional incoming stream representing operator prompts and interface state.
2. **Auth Keystore <-> ERIS**: Bidirectional synchronization for session verification and user profile retrieval.
3. **ERIS <-> CLI Console**: Bidirectional command dispatch and terminal execution output.
4. **Neural RAG Vault <-> ERIS**: Bidirectional context query vector embedding lookup and memory updates.
5. **Win32 Sandbox -> ERIS**: Continuous AST guardrail verification securing the workspace.

---

## 4. Verification & Testing Matrix

| Component | Test Scenario | Expected Outcome | Result |
| :--- | :--- | :--- | :--- |
| `PixelSwap` | Trigger on login success | Screen dissolves into rotating pixel tiles revealing `GreetingPage` | Verified |
| `PixelSwap` | `prefers-reduced-motion` | Immediately completes transition with zero motion | Verified |
| `Strands` | WebGL rendering on GreetingPage | Multicolored strands render smoothly at 60 FPS | Verified |
| `AnimatedBeam` | While checks in progress | Beams remain inactive/paused | Verified |
| `AnimatedBeam` | All backend checks pass | All 7 directional beams illuminate and flow | Verified |
| `ContextMenu` | Right-click before login | Shows "Guest Mode", Copy, Paste | Verified |
| `ContextMenu` | Right-click after login | Shows "Operator Active" with user identity | Verified |
| `ContextMenu` | Right-click in Dev Mode | Shows "Dev Environment" indicator | Verified |
