# Magic UI Animated List, BadgeTemplate & SkeletonTemplate Specification

> Official documentation, implementation patterns, and security audit for ERIS UI primitives.

## 1. Magic UI Animated List (Canonical)

- **Source**: [https://magicui.design/docs/components/animated-list](https://magicui.design/docs/components/animated-list)
- **Engine**: Framer Motion (`motion/react` in Motion v12/13)
- **Files**:
  - `frontend/src/components/magicui/animated-list.tsx`
  - `frontend/ui_templates/AnimatedListTemplate.tsx`

### Core Physics & Transitions
```tsx
const animations: MotionProps = {
  initial: { scale: 0, opacity: 0 },
  animate: { scale: 1, opacity: 1, originY: 0 },
  exit: { scale: 0, opacity: 0 },
  transition: { type: "spring", stiffness: 350, damping: 40 },
};
```

### Staggered Sequence Mechanics
- Uses `index` state incrementing by `delay` ms (default `1000ms`, customized per stream).
- Items sliced via `childrenArray.slice(0, index + 1).reverse()` so newer entries appear at the top and cascade down.
- Styled using glassmorphic dark container:
  - `bg-white [box-shadow:0_0_0_1px_rgba(0,0,0,.03),0_2px_4px_rgba(0,0,0,.05),0_12px_24px_rgba(0,0,0,.05)]`
  - `transform-gpu dark:bg-transparent dark:backdrop-blur-md dark:[border:1px_solid_rgba(255,255,255,.1)] dark:[box-shadow:0_-20px_80px_-20px_#ffffff1f_inset]`

---

## 2. BadgeTemplate Specification

- **File**: `frontend/ui_templates/BadgeTemplate.tsx`
- **Variants**:
  | Variant | Classes | Intent |
  |---|---|---|
  | `default` | `border-transparent bg-white text-black` | Core labels, active tags |
  | `secondary` | `border-transparent bg-neutral-800 text-neutral-200` | Tips, neutral badges |
  | `outline` | `border-neutral-700 text-neutral-300` | Subsystem identifiers |
  | `success` | `border-emerald-500/20 bg-emerald-500/10 text-emerald-400` | Online, verified, passed |
  | `destructive` | `border-red-500/20 bg-red-500/10 text-red-400` | Failed, offline, alert |

---

## 3. SkeletonTemplate Specification

- **File**: `frontend/ui_templates/SkeletonTemplate.tsx`
- **Classes**: `animate-pulse rounded-md bg-neutral-800/80`
- **Use Cases**:
  - Telemetry streaming buffers in `WorkspaceView.tsx`
  - Loading pulse under `"Please wait"` in `GreetingWithPixelSwap`
  - Subsystem probe transition placeholders in `DevDataViewer.tsx`

---

## 4. Typography Rules

- **Workspace & Post-Workspace Typing Inputs**:
  - **Rule**: Fixed monospace font (`font-mono`, `ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace`) strictly applied to all user typing inputs, terminal commands, and execution output.
- **Button & Loading Labels**:
  - **Rule**: Consistent sans-serif (`font-sans font-medium text-sm text-neutral-300 tracking-normal`), no uppercase, no plain mono.
