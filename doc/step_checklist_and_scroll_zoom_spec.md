# Jon Kantner StepChecklist, ReactBits PixelSwap & WebInnoventix ScrollZoomHero Specification

> Reference architecture and implementation details for confirmation checks, pixel dissolution, and scroll-zoom hero transitions.

## 1. Jon Kantner "Onboarding End Screen" (`eYqejYr`)

- **Source**: [https://codepen.io/jkantner/pen/eYqejYr](https://codepen.io/jkantner/pen/eYqejYr)
- **Author**: Jon Kantner (`@jkantner`)
- **Component**: `frontend/ui_templates/StepChecklistTemplate.tsx`

### Architecture & Mechanics
1. **Circular SVG Progress**:
   - `circumference = 62.83` ($2 \times \pi \times 10$).
   - `strokeDasharray = "62.83 62.83"`.
   - `strokeDashoffset = 62.83 * (1 - value)` where `value \in [0, 1]`.
   - Rotated `-90deg` at center `(12, 12)` so progress starts at the 12 o'clock position.
2. **Phase Transition Model**:
   - `waiting`: Progress inactive (`0`), secondary phase hidden.
   - `current`: Actively animating circular progress with `before` text (`{ title, subtitle }`).
   - `done`: Replaces progress with emerald `step-checkmark` SVG (`stroke="currentColor" stroke-width="2.2"`) and reveals `after` text (`{ title, subtitle }`).
3. **Finish State (`OnboardingFinished`)**:
   - When all checks resolve, the list fades out (`opacity: 0, visibility: hidden`) and the finished panel fades in with `step-check-circle` icon, summary headline, and CTA button.
4. **Authentic Verification (Zero Fake Status)**:
   - Replaces all static/hardcoded status badges with genuine asynchronous verification probes against `/api/system/health`, `/api/system/state`, and session keystores.

---

## 2. ReactBits PixelSwap (`PixelSwap.tsx`)

- **Component**: `frontend/src/components/reactbits/PixelSwap.tsx`
- **Template**: `frontend/ui_templates/PixelSwapTemplate.tsx`

### Technical Specification
- **Bounded Pixel Grid**:
  - `MAX_PIXELS = 220`.
  - Grid dimensions computed dynamically from container aspect ratio and client padding box.
  - Overhanging coordinates prevent square edge pixels from being clipped.
- **Counter-Transforms & DOM Cloning**:
  - Instead of re-rendering whole React subtrees per pixel, clones rendered DOM nodes with `cloneNode(true)`.
  - Window keyframes apply `rotate(${angle}deg) scale(${scale})` while child content receives exact inverse counter-transform `scale(${1 / scale}) rotate(${-angle}deg)`, guaranteeing reveal identity at every sub-frame.
- **Invocation Trigger**:
  - Triggered exclusively upon successful operator sign-in (`LoginStep` -> `OnboardingScreen`).

---

## 3. WebInnoventix Scroll Zoom Hero (`scroll-zoom-hero.tsx`)

- **Source**: [https://webinnoventix.com/r/scroll-zoom-hero.json](https://webinnoventix.com/r/scroll-zoom-hero.json)
- **Component**: `frontend/src/components/ui/scroll-zoom-hero.tsx`
- **Template**: `frontend/ui_templates/ScrollZoomHeroTemplate.tsx`

### Mechanics
- **Scroll Driver**: `200vh` scroll distance driving a sticky `100vh` stage.
- **Physics**: `useSpring` with `stiffness: 120, damping: 30, mass: 0.4`.
- **Parallax Transforms**:
  - Backdrop scale: `[1, 1.55]` with brightness `[0.72, 1.18]` and saturation `[1.05, 1.35]`.
  - Headline parallax: `[0, -220px]` with opacity `[1, 1, 0]` and blur `[0, 8px]`.
  - Secondary mesh: counter-scales `[1.2, 0.9]` with opacity `[0.9, 0.25]`.
- **Invocation Trigger**:
  - Triggered when accessing the Welcome / Greeting Page from the Main Menu (`ErisIntro`).
