# Security, Architecture & Exploit Analysis: Dev Auth, Animated List & Pixel Transition

## 1. Executive Summary & Resolution of Reported Anomalies

### A. Backend "Already Registered" vs. "Wrong Password" Discrepancy
- **Root Cause**: The user account `test.dev@example.com` had already completed registration and had `is_verified = 1` in the local SQLite identity vault (`memory/auth.db`).
  - When attempting **Sign Up**: `auth_service.py` evaluates `existing_user.is_verified`. Because the account was marked verified, it cleanly rejects re-registration to prevent account hijacking: *"An account with this email address is already registered. Please sign in."*
  - When attempting **Sign In**: The password provided during sign-in did not match the bcrypt salt/hash stored during the previous session's initial test run.
- **Resolution**:
  1. Implemented a dedicated development management endpoint `POST /api/system/dev-reset-password`.
  2. Integrated 1-click password reset directly in `DevDataViewer.tsx` (Database Records tab).
  3. Reset the password for `test.dev@example.com` to a test password. Verified live against `/api/auth/login`, returning HTTP 200 with an authenticated bearer token (`eris_sec_...`).
  4. Enabled `reload=True` in [backend/run.py](file:///e:/All%20Projects%20and%20Editors/ERIS/backend/run.py) so any API changes immediately reflect in the running service.

### B. Context Menu "View Local Data" Appearing in Non-Dev Mode
- **Root Cause**:
  1. In [ErisIntro.tsx](file:///e:/All%20Projects%20and%20Editors/ERIS/frontend/src/components/intro/ErisIntro.tsx), clicking "Continue where you left off" without an active session was calling `onOpenGreeting?.(devSession, true)`, passing `dev = true`.
  2. In [App.tsx](file:///e:/All%20Projects%20and%20Editors/ERIS/frontend/src/App.tsx), `handleOpenGreeting` executed:
     ```ts
     if (dev || session?.token === 'session_dev_override') {
       setDevMode(true);
     }
     ```
     This invoked `localStorage.setItem('eris_dev_mode', 'true')`.
  3. Consequently, `isDevMode` became permanently true in the browser's persistent storage, causing the context menu to display `View Local Data` on every subsequent page load even if the user believed dev mode was off.
  4. Furthermore, `ErisIntro.tsx` had an isolated `useState(false)` that was out of sync with `DevModeContext`.
- **Resolution**:
  - Removed all automatic `setDevMode(true)` calls in `handleOpenGreeting`.
  - Bound `ErisIntro.tsx` to `useDevMode()` so dev mode is only toggled by explicit user selection.
  - "Continue where you left off" now passes the actual `isDevMode` state without ever forcing it to true.

---

## 2. MagicUI Animated List Template (`frontend/ui_templates/AnimatedListTemplate.tsx`)

As strictly mandated: **"Use the alert template available, DO NOT CREATE things yourself"**.

- Utilizes the established `Alert`, `AlertTitle`, and `AlertDescription` components from [frontend/src/components/ui/alert.tsx](file:///e:/All%20Projects%20and%20Editors/ERIS/frontend/src/components/ui/alert.tsx).
- Employs `AnimatedList` with spring physics (`stiffness: 350, damping: 40`) and reverse-stacking timeline.
- Fully registered and exported in [frontend/ui_templates/index.ts](file:///e:/All%20Projects%20and%20Editors/ERIS/frontend/ui_templates/index.ts).
- Showcase section added to [TemplateGallery.tsx](file:///e:/All%20Projects%20and%20Editors/ERIS/frontend/src/components/dev/TemplateGallery.tsx) with quick jump anchor `#sec-animated-list`.

---

## 3. Pixel Animation: Faithful ReactBits Reproduction & Welcome Page Wiring

- **Source Reference**: [reactbits.dev/animations/pixel-swap](https://reactbits.dev/animations/pixel-swap).
- **Aesthetic**:
  - Updated [PixelSwap.css](file:///e:/All%20Projects%20and%20Editors/ERIS/frontend/src/components/reactbits/PixelSwap.css) with crisp glowing white pixel borders:
    `background-color: #ffffff; box-shadow: 0 0 4px rgba(255, 255, 255, 0.85), inset 0 0 0 1px rgba(255, 255, 255, 0.9);`
  - Tiles scale from `0.25` up to full coverage with a 15-degree spin and radial delay from center.
- **Universal Welcome Screen Wiring**:
  - Encapsulated in `GreetingWithPixelSwap` inside [App.tsx](file:///e:/All%20Projects%20and%20Editors/ERIS/frontend/src/App.tsx).
  - Triggers on mount whenever transitioning to `activeScreen === 'greeting'`, guaranteeing that the animation plays faithfully whether arriving from:
    1. Sign-in completion in `OnboardingScreen`.
    2. "Continue where you left off" in `ErisIntro`.
    3. Direct workspace navigation.

---

## 4. Greeting Page Flanking Layout Shift

- **Layout Adjustments**:
  - Expanded `<main>` container width to `max-w-[1520px] px-4 sm:px-8 lg:px-14 xl:px-20`.
  - Shifted left subsystem cards towards the left boundary (`md:-translate-x-3 lg:-translate-x-6 xl:-translate-x-10`).
  - Shifted right subsystem cards towards the right boundary (`md:translate-x-3 lg:translate-x-6 xl:translate-x-10`).
  - Left the center 100% open and unobstructed, maximizing the visibility of the multi-strand WebGL animation.

---

## 5. Security & Threat Vector Assessment

| Vector | Risk | Mitigation Applied |
| :--- | :--- | :--- |
| **Dev Password Reset Exposure** | High if accessible in production | Protected by `settings.ENVIRONMENT.lower() != "development"` guard throwing HTTP 403 Forbidden. |
| **Silent Dev Mode Elevation** | Medium (Unauthorized inspector access) | Context menu `View Local Data` strictly gated on `isDevMode === true`. Accidental persistence vectors eliminated. |
| **Credential Collision on SQLite** | Low (Development SQLite identity vault) | Password hashing utilizes bcrypt with 12 salt rounds; session revocation enforced on credential change. |
| **Memory Leak in WebGL / Pixel DOM** | Low | Keyframe animations and canvas listeners cleanly unmount upon transition completion (`finish()` lifecycle). |
