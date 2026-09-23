# UI Step Documentation

## Step 1: Sign-In Reference Implementation
- **Visual Target**: Match reference desktop sign-in screen.
- **Components Built**:
  - `src/components/auth/SignInForm.tsx`:
    - Centered brand mark + "Sign in to ERIS" + subtitle.
    - Top 2-column social buttons (`GitHub` and `Google`).
    - Divider with centered "or".
    - `Email address` input field.
    - Purple `#6C47FF` `Continue ▸` button.
    - `Use passkey instead` text action.
    - Card footers: "Don't have an account? Sign up" and "Secured by ERIS".
  - `src/App.tsx`:
    - Background: `onboarding_background.png` with `#0a0a0d]/65` ambient overlay.
    - Page footer: "© 2026 ERIS" and "Support · Privacy · Terms".

## Step 2: Workspace Hygiene & Slop Purge
- **Action**: Removed all unrequested views, tabs, modals, and mock code.
- **Active Codebase State**: Strictly `App.tsx` and `SignInForm.tsx`.
- **Build Status**: Production build passing with 0 errors (229KB JS).

## Step 3: Legal Templates (Terms & Privacy Policy)
- **Reference**: Clerk Standard Terms (`clerk.com/legal/standard-terms`).
- **Files Created**:
  - `doc/legal/terms_of_service.md`: Generic Terms & Conditions with AI hallucination disclaimer ("ERIS can be wrong"), human-in-the-loop requirement, local OS execution risk, and "AS IS" warranties.
  - `doc/legal/privacy_policy.md`: Sovereign zero-telemetry policy, local SQLite storage, and data wipe rights.

## Step 4: Magic UI Startup Template Reference Analysis
- **URL**: `https://startup-template-sage.vercel.app/`
- **Reference Breakdown**: Documented hero structure, 3D perspective showcase with `BorderBeam`, ecosystem badges, tier cards, and footer.

## Step 5: Dramatic Game-Entry Intro & Typography Scale
- **Components Created**:
  - `src/components/magicui/particles.tsx`: Official Magic UI interactive canvas particles.
  - `src/components/magicui/dia-text-reveal.tsx`: Official Magic UI horizontal color-band sweep text reveal.
  - `src/components/intro/ErisIntro.tsx`: Dramatic cinematic sequence:
    1. Starts on pure black screen (`bg-black`).
    2. Floating white particles canvas over the viewport.
    3. Fades in uppercase tracking title: "Welcome to".
    4. Reveals giant **ERIS** using `DiaTextReveal` with multi-chromatic gradient band sweep across letters over ~2.0s.
    5. Particles gracefully dissolve and vanish at ~3.0s as ERIS settles.
    6. "Enter Sanctuary ▸" button appears to proceed to Sign-In, along with a "Replay Intro" button.

## Step 6: Full Typography Scale-Up & Polish
- **Reference**: `https://reactnativereusables.com/docs/blocks/authentication/sign-in-form`
- **Intro Pacing & Typography**:
  - "Welcome to": `text-2xl sm:text-3xl md:text-4xl font-light tracking-[0.3em] uppercase text-neutral-300`.
  - "ERIS": Scaled to massive game-entry size: `text-8xl sm:text-9xl md:text-[10rem] lg:text-[12rem] font-black tracking-tight`.
  - DiaTextReveal Colors: Official Magic UI chromatic spectrum `['#c679c4', '#fa3d1d', '#ffb005', '#e1e1fe', '#0358f7']`.
  - Particles: 130 particles dissolving between 2.2s and 3.2s into deep stillness.
  - CTA Button: `px-8 py-4 rounded-xl text-lg font-bold`.
- **Sign-In Form Typography (`SignInForm.tsx`)**:
  - Heading: `text-3xl sm:text-4xl font-bold tracking-tight`.
  - Subtitle: `text-base text-neutral-400 mt-2`.
  - Inputs: `py-3.5 px-4 text-base rounded-xl`.
  - Social Buttons: `py-3.5 px-4 text-base font-medium`.
  - Submit Button: `py-3.5 text-base font-semibold`.
  - Links / Footers: `text-base` and `text-sm` (all micro `text-xs` eliminated).
- **Build Status**: Verified via `tsc -b && vite build` (0 errors). Dev server active on `http://localhost:5173/`.

## Step 7: Audio Queues Wiring, Tagline Purge & Desktop Boundaries
- **Tagline Purge**:
  - Completely stripped all AI slop taglines ("Sovereign Agentic System" removed).
- **CTA Button Rename**:
  - Button text updated to: `Start your onboarding`.
- **Desktop Dimensions & Responsiveness**:
  - Added strict minimum window boundary: `min-w-[1366px] min-h-[768px]` across root containers in `ErisIntro.tsx` and `App.tsx`.
- **Audio Wiring (`src/lib/audioManager.ts`)**:
  - Ambient Music (`/assets/audio/ambient music when app starts with low volume and mute option.mp3`):
    - Volume set low to `0.18`, looped.
    - Browser autoplay policy handler (resumes on first click/key if blocked by browser).
    - Mute/unmute toggle in top-right with state subscriber and `localStorage` persistence.
  - Error Cue (`/assets/audio/error.mp3`):
    - Wired to trigger on invalid form submission in `SignInForm.tsx`.
- **Copyright Assessment**:
  - Pixabay music/SFX files allow commercial & non-commercial use without attribution.
  - **Warnings**: Content ID risks if creators stream ERIS on YouTube/Twitch; no standalone resale/redistribution allowed.
- **Build Status**: Production bundle compiled in 384ms, 0 errors. Live on `http://localhost:5173/`.

## Step 8: Strict Scope Enforcement & True Windows Resize Responsiveness
- **Purged Unapproved Sign-In / Sign-Up**:
  - Deleted `src/components/auth/SignInForm.tsx` and removed auth directory.
  - Stripped all sign-in/up routes and views from `App.tsx`.
  - Zero unrequested auth or onboarding screens will be created without explicit user command.
- **Fixed Responsiveness on Windows Window Resizing**:
  - Removed rigid `min-w-[1366px]` constraint that caused horizontal overflow and broke responsiveness when snapping or resizing windows.
  - Implemented fluid responsive scaling (`text-6xl sm:text-7xl md:text-8xl lg:text-9xl xl:text-[11rem]`) so the intro adapts seamlessly to any resized window dimension on Windows.
- **Build Status**: Verified via `tsc -b && vite build` (0 errors, 399KB JS). Clean dev server active on `http://localhost:5173/`.

## Step 9: "Welcome to" Magic UI TextAnimate Integration
- **Component Created**:
  - `src/components/magicui/text-animate.tsx`: Official Magic UI text animation component fetched from registry (`magicui.design/r/text-animate.json`). Supports character, word, and line splitting with multiple animation variants (`fadeIn`, `blurIn`, `blurInUp`, `slideUp`, `scaleUp`, etc.).
- **Intro Integration (`src/components/intro/ErisIntro.tsx`)**:
  - Replaced CSS transition with `<TextAnimate animation="blurInUp" by="character" duration={0.7} delay={0.1}>`.
  - Animates each character of "Welcome to" into place with upward blur de-focussing right before the giant ERIS DiaTextReveal sweep begins.
- **Build Status**: Verified via `tsc -b && vite build` (0 errors, 407KB JS). Live on `http://localhost:5173/`.

## Step 10: AnimatedShinyText CTA, GitHub Attribution & Desktop .EXE Resilience
- **Component Created**:
  - `src/components/magicui/animated-shiny-text.tsx`: Official Magic UI component fetched from registry (`magicui.design/r/animated-shiny-text.json`).
  - Added `@keyframes shiny-text` and `.animate-shiny-text` into `src/index.css`.
- **CTA Button Transformation (`src/components/intro/ErisIntro.tsx`)**:
  - Transformed "Start your onboarding" into a frosted glass pill button with light glare shimmer panning across the text.
  - Hover micro-interaction: subtle scale, arrow translation, and border glow.
- **Bottom Attribution Line**:
  - Enclosed inside the Magic UI `AnimatedShinyText` container pill.
  - Text: `Created and maintained by: Aman Sinha` with GitHub SVG logo and direct link to `https://github.com/EzioAman/Eris` (no raw URL exposed).
  - Synchronized to fade in simultaneously with the onboarding CTA button when the intro finishes.
- **Windows .EXE Desktop Responsiveness**:
  - Layout built using `h-screen w-screen min-h-screen w-full flex flex-col justify-between items-center overflow-hidden` guaranteeing clean centering, zero overflow clipping, and adaptive scaling whether running inside Tauri/Electron `.exe` or any resized desktop window.
- **Build Status**: Production bundle compiled in 394ms, 0 errors (410KB JS). Live on `http://localhost:5173/`.

## Step 11: AnimatedGradientText Onboarding Button & 10s Idle Screensaver
- **Component Created**:
  - `src/components/magicui/animated-gradient-text.tsx`: Official Magic UI component fetched from registry (`magicui.design/r/animated-gradient-text.json`).
  - Added `@keyframes gradient` and `.animate-gradient` into `src/index.css`.
- **Onboarding Button Upgrade**:
  - Transformed "Start your onboarding" to use `AnimatedGradientText` with animated gradient border and text shimmering between `#ffaa40` (gold) and `#9c40ff` (purple).
- **10-Second Idle Screensaver Mode**:
  - Automatically triggers when no mouse movement, click, scroll, or keypress is detected for 10 seconds.
  - Smoothly brings back the deep-space particle background layer (`opacity-100`) while dimming interactive controls.
  - Instantly wakes up and restores all interactive buttons/footers upon detecting any user input.
- **Build Status**: Production bundle compiled in 362ms, 0 errors (411KB JS). Live on `http://localhost:5173/`.

## Step 12: .env Detection & AnimatedList Dev Mode Prompt
- **Component Created**:
  - `src/components/magicui/animated-list.tsx`: Official Magic UI component (`magicui.design/r/animated-list.json`) providing spring-animated notification card entry (`AnimatedListItem`).
- **.env Presence Verification**:
  - During the initial 3 seconds of the intro, Eris checks for `.env` presence via `/api/system/check-env` and build-time define `__ENV_EXISTS__`.
- **Bottom Right Dev Icon & Interactive Prompt**:
  - When `.env` is detected, a developer terminal icon appears in the bottom right corner with an active emerald pulse indicator.
  - Clicking the icon triggers the spring animation from `AnimatedList`, opening the Dev Mode confirmation card:
    - Asks: *"Enter Dev Mode?"* with *"Enter Dev mode"* and *"Cancel"* buttons.
    - Activates Dev Mode state upon user confirmation.
- **Build Status**: Verified via `tsc -b && vite build` (0 errors, 415KB JS). Live on `http://localhost:5173/`.

## Step 13: Dev Mode 3s Delay, Pulse Removal & RNR Alert Dialog Template
- **Removed Pulsating Animations**:
  - Stripped `animate-pulse` from the status dot and audio toggle icon.
- **3-Second Dev Mode Display Delay**:
  - The Dev Mode card icon now explicitly waits 3000ms after launch before rendering in the bottom right corner.
- **Card Component Styling for Dev Trigger**:
  - Styled as an RNR Card component (`rounded-xl border border-neutral-800 bg-[#121215] p-3 shadow-lg`).
- **React Native Reusables Alert Dialog Layout**:
  - Implemented the official RNR `alert-dialog` template (`reactnativereusables.com/docs/components/alert-dialog`) inside the `AnimatedListItem` spring container:
    - **Header**: `AlertDialogTitle` ("Enter Dev Mode?") + `.env detected` badge.
    - **Description**: `AlertDialogDescription` in clean `text-neutral-400`.
    - **Footer**: `AlertDialogCancel` (outlined neutral button) and `AlertDialogAction` (solid white button).
- **Build Status**: Verified via `tsc -b && vite build` (0 errors, 415KB JS). Live on `http://localhost:5173/`.

## Step 14: React Bits FadeContent Integration for Dev Mode & Audio Option
- **Component Created**:
  - `src/components/reactbits/FadeContent.tsx`: Official React Bits component (`reactbits.dev/animations/fade-content`) providing smooth opacity and de-blur transitions with configurable duration, blur filter, easing, and delay.
- **Audio Option Animation**:
  - Wrapped the top-right ambient sound toggle in `FadeContent` (`blur={true}`, `duration={800}`, `delay={200}`), gracefully fading in on start and fading out during screensaver.
- **Dev Mode Option Animation**:
  - Wrapped the bottom-right Dev Mode card trigger in `FadeContent` (`blur={true}`, `duration={800}`), smoothly fading into view after the 3-second check period finishes.
- **Build Status**: Verified via `tsc -b && vite build` (0 errors, 415KB JS). Live on `http://localhost:5173/`.

## Step 15: Instant Fade & Ambient Audio Button Rename
- **Instant Fade Effect**:
  - Updated the top-right ambient sound button's `FadeContent` animation parameters to instantaneous fade (`blur={false}`, `duration={150}`, `delay={0}`).
- **Button Rename**:
  - Renamed the button label strictly to `Ambient Audio` (both in active and muted states).
- **Build Status**: Verified via `tsc -b && vite build` (0 errors, 415KB JS). Live on `http://localhost:5173/`.

## Step 16: Modular Template Architecture (Plug-and-Play Components)
- **Standardized Component Library Established**:
  - `src/components/ui/card.tsx`: Standalone Card primitives (`Card`, `CardHeader`, `CardTitle`, `CardDescription`, `CardContent`, `CardFooter`) styled to RNR design specifications.
  - `src/components/ui/alert-dialog.tsx`: Standalone Alert Dialog primitives (`AlertDialog`, `AlertDialogContent`, `AlertDialogHeader`, `AlertDialogTitle`, `AlertDialogDescription`, `AlertDialogFooter`, `AlertDialogCancel`, `AlertDialogAction`).
- **Eliminated Code Re-writing & Hardcoding**:
  - Any future effect, modal, dialog, or card from shared links plugs directly into existing primitives or dedicated wrappers in `src/components/ui/`, `src/components/magicui/`, or `src/components/reactbits/`.
  - Refactored `ErisIntro.tsx` to consume these modular components directly.
- **Build Status**: Verified via `tsc -b && vite build` (0 errors, 416KB JS). Live on `http://localhost:5173/`.

## Step 18: Full React Bits FadeContent Template Upgrade & Ambient Button Effect
- **Template Standardized (`src/components/reactbits/FadeContent.tsx`)**:
  - Fully implements the official [React Bits FadeContent](https://reactbits.dev/animations/fade-content) specification:
    - Props: `blur` (boolean), `duration` (ms), `easing` (cubic-bezier), `threshold` (intersection ratio), `initialOpacity`, `delay` (ms), `direction` (`'up' | 'down' | 'left' | 'right' | 'none'`), `distance` (px), `isVisible` (reactive override).
    - Uses `requestAnimationFrame` on state updates to ensure initial state commitment to the DOM before transitioning, guaranteeing initial startup entrance animations fire visibly.
- **Ambient Audio Button Integration**:
  - Wrapped Ambient Audio button with:
    - `blur={true}`
    - `duration={600}`
    - `direction="down"`
    - `distance={10}`
    - `delay={100}`
  - The button now visibly dissolves in from top with smooth de-blur right when the application launches.
- **Build Status**: Verified via `tsc -b && vite build` (0 errors, 416KB JS). Live on `http://localhost:5173/`.
## Step 19: Onboarding View with Automated ScrollExpand
- **Template Created (`src/components/reactbits/ScrollExpand.tsx`)**:
  - Downloaded and customized the official React Bits `ScrollExpand` template.
  - Added a custom `autoTrigger={true}` property to automatically simulate the user scrolling to 100% progress via `requestAnimationFrame` for a smooth entry animation without actual mouse interaction.
- **Onboarding Screen Component (`src/components/onboarding/OnboardingScreen.tsx`)**:
  - Dedicated component that loads the requested `onboarding_background.png` from `public/assets`.
  - Automatically triggers the `ScrollExpand` transition upon mount (with a small 100ms delay to ensure the DOM is primed).
- **Wired to App State (`App.tsx`)**:
  - `App.tsx` now manages a `showOnboarding` boolean flag.
  - When the user clicks the **Start your onboarding** button in the intro, `showOnboarding` is set to `true`.
- **Build Status**: Verified via `tsc -b && vite build` (0 errors, 416KB JS). Live on `http://localhost:5173/`.

## Step 20: Go Back Button on Workspace Config & React Native Reusables Sign Up Form
- **Go Back Button**:
  - Added a stylized, blur-backed `Go Back` button to the top-left of `OnboardingScreen.tsx` with arrow icon.
  - Connected callback prop `onBack` to `App.tsx`'s `handleBack`, seamlessly returning to the intro sequence when triggered.
- **React Native Reusables Sign-In/Up Form Block Adaptation**:
  - Implemented reusable UI primitives according to the RNR block specifications:
    - `src/components/ui/button.tsx`: Variant and size configured button primitive.
    - `src/components/ui/input.tsx`: Minimalist dark styled form input primitive.
    - `src/components/ui/label.tsx`: Uppercase typography label primitive.
    - `src/components/ui/separator.tsx`: Subtle divider primitive.
    - `src/components/auth/SocialConnections.tsx`: Google and GitHub OAuth social login buttons matching template styling.
    - `src/components/auth/SignUpForm.tsx`: Sign Up form adhering to the `https://reactnativereusables.com/docs/blocks/authentication/sign-in-form` block pattern with email, password, confirm password, social providers, and error feedback.
- **Workflow Navigation**:
  - Onboarding Workspace Config page includes a "Create Account (Sign Up)" trigger button that swaps smoothly to the `SignUpForm` with a "← Back to Workspace Config" button.
- **Build Status**: Verified via `tsc -b && vite build` (0 errors, 431KB JS). Live on `http://localhost:5173/`.
  - The UI then unmounts the `ErisIntro` sequence and mounts the `OnboardingScreen`, allowing the background to smoothly expand into view.
- **Build Status**: Verified via `tsc -b && vite build` (0 errors, 422KB JS). Live on `http://localhost:5173/`.

