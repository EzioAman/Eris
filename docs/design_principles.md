# Eris Design Principles — Anti-AI-Slop Guide

> **Purpose**: Define what makes Eris's UI feel premium, authentic, and human — NOT like generic AI garbage
> **Rule**: Every developer and agent MUST read this before creating ANY UI component
> **Created**: 2026-09-13T23:55:00+05:30

---

## What IS AI Slop?

AI slop is any interface element that screams "a language model generated this without taste." It's the UI equivalent of elevator music — technically present, functionally hollow.

### The 12 Cardinal Sins of AI Slop

| # | Sin | Example | Why It's Bad |
|---|---|---|---|
| 1 | **Generic gradients** | Blue-to-purple background on every card | Looks like every AI startup landing page from 2023 |
| 2 | **Emoji abuse** | 🎉🚀✨💡 on every heading | Feels like a corporate Slack channel |
| 3 | **Robotic greetings** | "Hello! I'm here to help you with..." | Every chatbot ever. Zero personality. |
| 4 | **Identical response openers** | "Sure! Let me...", "Of course! I'll...", "Great question!" | Templates masquerading as personality |
| 5 | **Over-explanation** | "I've successfully completed the operation of reading the file..." | Say "Done. Found 47 files." |
| 6 | **Default system fonts** | Segoe UI 12pt on everything | Looks like a Windows 98 dialog |
| 7 | **Flat gray containers** | `#f0f0f0` background cards with `#ccc` borders | Screams "default Qt stylesheet" |
| 8 | **No micro-animations** | Instant state changes, no transitions | Feels dead and mechanical |
| 9 | **Screenshot-ready, life-empty** | Beautiful mockup that feels hollow in use | No hover states, no feedback, no life |
| 10 | **Meaningless loading states** | Spinning circle with no context | Tell me WHAT is loading and how long |
| 11 | **Generic error messages** | "An error occurred. Please try again." | What error? Why? What do I do? |
| 12 | **Cookie-cutter layout** | Sidebar + content area like every SaaS dashboard | Find Eris's unique visual identity |

---

## The Eris Design DNA

### Typography
- **Primary**: Inter or Outfit (Google Fonts) — modern, geometric, excellent readability
- **Monospace**: JetBrains Mono — for code, logs, technical content
- **Hierarchy**: Clear size/weight differentiation. Never use size alone to convey hierarchy.
- **Rule**: No default system fonts in user-facing UI. Ever.

### Color Philosophy
- **Dark mode first** — Eris is a power tool. Dark mode is the default.
- **Accent color**: A signature color that IS Eris. Not generic blue. Consider: deep violet (`#7C3AED`), electric teal (`#06B6D4`), or amber (`#F59E0B`). This color appears on active states, CTAs, and Eris's "identity."
- **Semantic colors**: Green=success, Amber=warning, Red=error, Blue=info. These NEVER change.
- **Surface hierarchy**: 3-4 levels of surface darkness. Background → Card → Elevated Card → Modal.
- **No pure black**: Use `#0a0a0f` or similar. Pure `#000` is harsh.
- **No pure white text**: Use `#e4e4e7` or similar. Pure `#fff` causes eye strain on dark backgrounds.

### Spacing & Layout
- **8px grid**: All spacing is multiples of 8 (8, 16, 24, 32, 48, 64)
- **Consistent padding**: Cards have 16px internal padding, 8px between items
- **Breathing room**: Content should never feel cramped. If it looks tight, add 8px.
- **Max content width**: Chat messages cap at ~720px for readability

### Micro-Animations (MANDATORY)
- **Page transitions**: Fade + subtle slide (150ms ease-out)
- **Button hover**: Subtle brightness change + scale(1.02) (100ms)
- **Button press**: scale(0.98) (50ms)
- **Card appearance**: Fade-in + translateY(8px → 0) (200ms staggered)
- **Loading states**: Skeleton screens, NOT spinners. Pulsing opacity animation.
- **Sidebar expand**: Smooth width transition (200ms ease-in-out)
- **Notification entry**: Slide-in from right (250ms spring)
- **State changes**: Never instant. Always 100-200ms transition.
- **Rule**: If something changes on screen and there's no animation, it's a bug.

### Eris's Visual Identity
- **Avatar/Logo**: Eris has a visual identity. The logo (user-provided PNG) appears in:
  - Splash screen (large, centered)
  - Title bar (small, 24px)
  - Chat messages (as Eris's avatar)
  - System tray icon
- **Emotion GIFs**: Eris expresses emotion through animated GIF reactions:
  - Thinking (subtle animation)
  - Working (focused animation)
  - Success (celebration, but subtle — not confetti spam)
  - Error (concerned/apologetic)
  - Idle (calm, ambient)
  - These must be configurable (users can change emotion set or disable)

### Content Voice
- **Eris is NOT a generic assistant.** She has personality.
- **Vary greetings**: Never the same opening twice. Pool of 50+ greetings, context-aware:
  - Time-aware: "Good morning" / "Working late?"
  - Context-aware: "Welcome back. You left off organizing your Downloads."
  - Personality-driven: Adjusted by humor/formality sliders
- **Terse by default**: Match the user's energy. Short question → short answer.
- **Never say**: "As an AI...", "I'm just a...", "I don't have feelings but...", "Sure! I'd be happy to..."
- **Error messages are conversations**: Not "Error 500." Instead: "I couldn't reach OpenAI — their servers might be down. Want me to try Anthropic instead?"

---

## Component Design Checklist

Before shipping ANY UI component, verify:

- [ ] No default Qt/system styling visible
- [ ] Dark mode looks intentional, not inverted
- [ ] Hover states on ALL interactive elements
- [ ] Focus states for keyboard navigation (accessibility)
- [ ] Loading state is a skeleton, not a spinner
- [ ] Error state has actionable recovery text
- [ ] Transitions/animations on state changes (100-200ms)
- [ ] Text uses Inter/Outfit, not system font
- [ ] Spacing follows 8px grid
- [ ] Color uses the Eris palette, not generic
- [ ] Content reads like Eris (personality), not a chatbot
- [ ] Tested at 100%, 125%, 150% display scaling
- [ ] Screen reader labels on interactive elements
