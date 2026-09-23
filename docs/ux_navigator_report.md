# UX Navigator Agent Report — Eris Cognitive Walkthrough

> **Agent Role**: Human-like user navigating Eris for the first time
> **Methodology**: Paper/cognitive walkthrough of all documented flows (§7.1–§7.6), simulating a real user session
> **Created Timestamp**: 2026-09-13T21:59:00+05:30
> **Test Scenario**: "Write an email to developer@example.com, with title — Hello from Eris"
> **Target Documents**: `Eris.md` (§7.1–§7.6 flows), `PRD.md` (§4, §12, §27–§29, §43)

---

## Test Scenario Context

I am a first-time user. I launch Eris.exe for the first time and want to accomplish a real task: **send an email**. I will document every screen, decision point, dead-end, and missing affordance I encounter.

---

## Walkthrough Phase 1: First Launch (§7.1 Onboarding Flow)

### Step 1: Launch Eris.exe
**Expected**: Environment validation screen
**Flow says**: `Launch Eris → Environment Validation → (Python, uv, Git OK?) → Security Initialization`

| Finding | Severity | Details |
|---|---|---|
| 🔴 **No splash screen or loading indicator** | HIGH | The flow goes straight to "Environment Validation" but the architecture doesn't define what the user SEES. Is it a progress bar? A blank window? A terminal dump? The user has no feedback that Eris is starting. |
| 🔴 **Dependency error UX is undefined** | HIGH | If Python/uv/Git is missing, the flow shows "Show Error + Instructions" but doesn't specify: Is this a dialog? A link to download? Does Eris offer to install them? A first-time Windows user seeing "Python 3.14 not found" with no guidance will abandon the app. |
| 🟡 **No "What is Eris?" introduction** | MODERATE | First launch has no welcome screen, no introduction, no explanation of what Eris is or what it can do. The user is immediately thrown into environment validation. Modern apps (Notion, Arc, Raycast) all have a warm welcome flow. |
| 🟡 **No progress indicator for validation steps** | MODERATE | Environment validation, security init, DB check — these could take seconds to minutes. No progress indicator defined. |

**UX Score for Step 1: 5.5/10** — Functional but not human-friendly.

---

### Step 2: Database Connection Check
**Expected**: PostgreSQL connection test
**Flow says**: `Database Connection Check → (Connected?) → Provider Discovery`

| Finding | Severity | Details |
|---|---|---|
| 🔴 **PostgreSQL setup is a MASSIVE barrier** | CRITICAL | A first-time user must have PostgreSQL installed and running BEFORE Eris can proceed. The flow says "Show DB Setup Instructions" on failure, but: Does the user need to install PostgreSQL? Docker? Configure a database? Create tables? This is the #1 drop-off point for any desktop app. |
| 🔴 **No option to defer database** | HIGH | What if the user just wants to try Eris? Can they skip DB and use in-memory mode? The PRD mentions "degraded mode" (§3.2 in Eris.md) but the onboarding flow has NO skip/defer path for DB. |
| 🔴 **No automated setup** | HIGH | Eris should offer to set up PostgreSQL automatically (Docker Compose or local install). The flow just shows "instructions" which is a dead-end for non-technical users. |
| 🟡 **Connection string UX missing** | MODERATE | Where does the user enter the database connection string? Is it a form field? Does Eris auto-detect a local PostgreSQL? No UI defined. |

**UX Score for Step 2: 3.5/10** — This will lose 90% of non-developer users.

---

### Step 3: Provider Discovery & Selection
**Expected**: List of available LLM providers
**Flow says**: `Provider Discovery → Display Available Providers → User Selects Provider`

| Finding | Severity | Details |
|---|---|---|
| 🟡 **Discovery mechanism unclear from UX perspective** | MODERATE | "Provider Discovery" scans `extensions/providers/` but: What does the user see? A list of cards? A dropdown? Icons? Descriptions? The PRD says "dynamically discovered" but no UI wireframe or component spec exists. |
| 🟢 **Good: No pre-selected default** | PASS | Correct per PRD — user must choose. |
| 🟡 **No provider comparison** | MODERATE | If 5 providers are available, how does the user choose? No feature comparison, no pricing info, no "recommended for beginners" tag. Just a flat list? |
| 🔴 **No "I don't have an API key" path** | HIGH | A user who doesn't have an OpenAI/Anthropic key yet has no guidance. No link to sign up, no explanation of what an API key is, no free-tier recommendations. Dead end. |
| 🟡 **No local model option highlighted** | MODERATE | If Ollama is installed, it should be flagged as "Free — runs on your computer" to help users who don't want cloud providers. |

**UX Score for Step 3: 6.0/10** — Functional but assumes technical sophistication.

---

### Step 4: Credential Entry & Validation
**Expected**: API key input form
**Flow says**: `User Enters Credentials → Credential Validation → (Valid?) → Model Discovery`

| Finding | Severity | Details |
|---|---|---|
| 🟢 **Good: Validation before proceeding** | PASS | Correct — don't let user proceed with invalid credentials. |
| 🟡 **No "show/hide password" toggle** | MODERATE | API keys are long strings. Users need to see what they're pasting. |
| 🟡 **No paste-from-clipboard button** | MODERATE | Most users will copy an API key from a browser. A paste button is standard UX. |
| 🔴 **Error UX undefined** | HIGH | "Invalid" → "Show Error, Retry". But WHAT error? "Invalid API key", "Rate limited", "Network error", "Provider down"? Each requires different user action. The flow lumps all failures into one path. |
| 🟡 **No "Test Connection" button** | MODERATE | User should be able to explicitly test before committing. The flow auto-validates, which is good, but a manual test option builds confidence. |
| 🔴 **No back button** | HIGH | If the user entered wrong credentials and wants to CHANGE PROVIDER, there's no back path in the flow. They're stuck in a retry loop for the wrong provider. |

**UX Score for Step 4: 5.5/10** — Missing standard form affordances.

---

### Step 5: Owner Account Setup
**Expected**: Create owner identity
**Flow says**: `Configuration Save → Owner Account Setup → Eris Initialization`

| Finding | Severity | Details |
|---|---|---|
| 🔴 **Owner setup flow completely undefined** | CRITICAL | The flow has a single node "Owner Account Setup" with no detail. What does the user enter? Username? Passphrase? Windows auth? How strong must the passphrase be? Password strength indicator? Confirmation field? None of this is specified. |
| 🔴 **Two-owner setup undefined** | HIGH | PRD says 2 owners (Aman Sinha, Vibhas Dutta). How does the second owner register? Is it during first launch? Later? What if only one owner is available at first launch? |
| 🟡 **No profile picture / avatar** | LOW | Modern apps let users personalize their identity. Minor but adds humanity. |
| 🟡 **No recovery mechanism** | MODERATE | If the owner forgets their passphrase, what happens? No recovery flow defined. Eris becomes permanently locked? |

**UX Score for Step 5: 3.0/10** — Almost completely unspecified.

---

### Step 6: Desktop Interface Ready
**Expected**: Main Eris interface appears
**Flow says**: `Eris Initialization → Desktop Interface Ready`

| Finding | Severity | Details |
|---|---|---|
| 🔴 **No first-interaction guidance** | HIGH | User sees the desktop interface but... what now? No tutorial, no example prompts, no "Try saying..." suggestions. The PRD (§27) defines tabs (Chat, Tasks, Trace, Graph, Tools, Memory, Providers, Security, Logs) but for a first-time user, this is overwhelming. |
| 🟡 **No onboarding completion celebration** | MODERATE | Modern apps (Notion, Linear, Cursor) celebrate when setup is complete. A simple "You're all set! Here's what Eris can do..." builds engagement. |
| 🔴 **Default tab/view undefined** | HIGH | Which tab is active on first launch? Chat? Dashboard? The user needs to land on Chat with a welcoming message from Eris. |
| 🟡 **No keyboard shortcuts guide** | MODERATE | PySide6 app should have discoverable shortcuts (Ctrl+N for new chat, Ctrl+, for settings, etc.). None defined. |

**UX Score for Step 6: 4.5/10** — The user is dumped into an unknown interface.

---

## Walkthrough Phase 2: Attempting the Email Task (§7.2 Chat Flow)

### Step 7: User types "Write an email to developer@example.com, with title — Hello from Eris"
**Flow says**: `User Input → Session Validation → Intent Classification → Task Request → Agent Loop`

| Finding | Severity | Details |
|---|---|---|
| 🟢 **Good: Session validation before processing** | PASS | Security is correctly front-loaded. |
| 🔴 **Email capability does NOT exist** | CRITICAL | There is NO email tool in any MVP (0–6). The tool list includes filesystem, process, browser, and Windows tools, but NO email/SMTP/API tool. Eris cannot complete this task. |
| 🔴 **No "I can't do that yet" graceful response** | HIGH | When a capability is missing, what does Eris say? The flow goes to "Capability Discovery" → "Capability Missing" → tool generation (§7.3). But email requires SMTP credentials, recipient validation, spam considerations — an LLM can't safely generate an email tool that handles all of this. |
| 🟡 **No capability suggestion** | MODERATE | Eris should say: "I don't have an email capability yet. Would you like me to: (a) Create one? (b) Open Gmail in your browser? (c) Draft the email for you to copy-paste?" — No such fallback is defined. |
| 🔴 **No progress indicator during agent processing** | HIGH | The user types a message and... waits. No typing indicator, no "Eris is thinking...", no progress bar. The flow goes through UNDERSTAND → PLAN → EXECUTE but the user sees nothing. |
| 🟡 **No task estimation** | MODERATE | Before executing, Eris should say "This will require X steps, estimated Y seconds. Proceed?" — builds trust and manages expectations. |

**UX Score for Step 7: 4.0/10** — The primary test task cannot be completed.

---

### Step 8: Tool Generation Attempt (§7.3)
**Flow says**: If Eris tries to auto-generate an email tool...

| Finding | Severity | Details |
|---|---|---|
| 🔴 **Email tool requires SMTP credentials — no credential flow** | CRITICAL | The tool generation flow (§7.3) doesn't address tools that require EXTERNAL credentials (SMTP password, Gmail API OAuth). The security system handles Eris's own provider credentials but not arbitrary third-party credentials needed by generated tools. |
| 🔴 **No user consent for generated tool** | HIGH | The flow generates, validates, and registers the tool but doesn't explicitly show it to the user for review before first execution. PRD §18 says "functional testing" but no "user approval" step in the generation flow for the FIRST run. |
| 🟡 **No tool preview** | MODERATE | Can the user see the generated tool's code? Understand what it will do? A code preview with "Approve/Reject" would build trust. |

**UX Score for Step 8: 3.0/10** — Credential and consent gaps.

---

## Walkthrough Phase 3: General Navigation & Settings

### Step 9: User wants to change LLM provider
**Flow says**: NO FLOW DEFINED

| Finding | Severity | Details |
|---|---|---|
| 🔴 **No provider change flow** | CRITICAL | The onboarding flow selects a provider. But how does the user CHANGE it later? No settings screen, no provider management UI, no flow defined. The PRD (§4, line 161) explicitly says "The user must be able to change providers later without modifying Eris source code" but no UI flow exists for this. |
| 🔴 **No settings/preferences screen** | CRITICAL | Eris has configuration (TOML), personality, providers, models, security levels — but NO settings UI is defined anywhere. How does the user access any of this? |
| 🔴 **No model selection UI** | HIGH | After provider is configured, how does the user switch between models (GPT-4 vs GPT-3.5 vs Claude)? No model picker defined. |

**UX Score for Step 9: 1.0/10** — Completely missing.

---

### Step 10: User wants to see what Eris is doing (Dashboard)
**Flow says**: Dashboard tabs defined in PRD §27-28

| Finding | Severity | Details |
|---|---|---|
| 🟡 **Tab structure is defined but content layout is not** | MODERATE | We know the tabs: Chat, Tasks, Trace, Graph, Tools, Memory, Providers, Security, Logs. But no wireframes, no content hierarchy, no information density guidelines. |
| 🔴 **No search functionality** | HIGH | 9 tabs with potentially hundreds of items (tools, memories, logs, events). No search bar or filter mechanism defined. Users will get lost. |
| 🟡 **No notification system** | MODERATE | When a tool fails, a task completes, or a security event occurs — how is the user notified? Toast? Badge on tab? Sound? None defined. |
| 🟡 **No dark mode / theme support** | LOW | Modern desktop apps offer theme customization. PySide6 supports it natively. Not mentioned. |

**UX Score for Step 10: 5.0/10** — Structure exists but details missing.

---

### Step 11: User wants to stop Eris (Emergency Stop, §7.5)
**Flow says**: Emergency Stop → Cancel Agent → Cancel Tools → Preserve State → Safe Mode

| Finding | Severity | Details |
|---|---|---|
| 🟢 **Good: Emergency stop is always available** | PASS | Correct per PRD. |
| 🟡 **No keyboard shortcut** | MODERATE | Emergency stop should have a global hotkey (Ctrl+Shift+Esc or similar). Not just a Dashboard button. |
| 🟡 **No confirmation for recovery** | MODERATE | After emergency stop, Eris enters "Safe Mode". How does the user resume normal operation? Manual re-enable is mentioned but no UI for it. |
| 🟡 **No partial stop** | MODERATE | Can the user stop ONE task without stopping ALL of Eris? The flow stops everything. A "cancel this task" option is needed alongside the nuclear emergency stop. |

**UX Score for Step 11: 7.0/10** — Functional but needs refinement.

---

## Walkthrough Phase 4: Missing Screens & Interactions

The following screens/interactions are COMPLETELY ABSENT from the architecture:

| Missing Element | Impact | Where It Should Be |
|---|---|---|
| **Settings/Preferences Screen** | 🔴 CRITICAL | Users need to change providers, models, personality, config, appearance |
| **Keyboard Shortcuts / Command Palette** | 🔴 HIGH | Power users need Ctrl+K or similar command palette (à la VS Code, Raycast) |
| **Chat History / Conversation List** | 🔴 HIGH | Multiple conversations? History? No conversation management UI |
| **File/Context Attachment** | 🔴 HIGH | User wants to attach a file to a chat message — no attachment UI |
| **System Tray Integration** | 🟡 MODERATE | Eris should live in the system tray when minimized (standard for Windows agents) |
| **Auto-Update Mechanism** | 🟡 MODERATE | How does Eris update itself? No update flow |
| **Error Recovery Screen** | 🟡 MODERATE | When something goes wrong, what does the user see? |
| **Help / Documentation Access** | 🟡 MODERATE | No in-app help or docs access |
| **Multi-language Support** | 🟢 LOW | i18n not mentioned, acceptable for MVP |
| **Accessibility (a11y)** | 🟡 MODERATE | Screen reader support, high contrast, keyboard navigation — not mentioned |
| **Welcome / What's New Screen** | 🟡 LOW | After updates, show what changed |
| **Export / Import Settings** | 🟢 LOW | Backup and restore config — nice to have |

---

## AI Slop Detection

The following patterns would make Eris feel like "AI slop" — generic, soulless, robotic:

| Slop Pattern | Risk Level | How to Avoid |
|---|---|---|
| **"I'm just an AI, I can't..."** responses | 🔴 HIGH | Eris has a personality system. Use it. Never say "as an AI". |
| **Generic error messages** | 🔴 HIGH | "An error occurred" is useless. Show WHAT failed, WHY, and WHAT TO DO. |
| **No personality persistence** | 🟡 MODERATE | If Eris's tone changes between sessions, it feels fake. Personality must persist. |
| **Robotic task narration** | 🟡 MODERATE | "Executing filesystem.read... Complete. Executing filesystem.write... Complete." — feels like a terminal. Should be conversational: "I found the file and made the changes." |
| **No conversational memory** | 🔴 HIGH | If the user says "like I mentioned earlier" and Eris doesn't remember, it's broken. |
| **Identical response patterns** | 🟡 MODERATE | Every response starting with "Sure! I'll..." or "Of course! Let me..." feels templated. Vary the style. |
| **No proactive behavior** | 🟡 MODERATE | Eris should occasionally notice things: "Hey, you've been working for 3 hours. Want me to summarize what we've done?" |
| **Overly verbose responses** | 🔴 HIGH | LLMs tend to over-explain. Eris should match the user's communication style (terse user → terse Eris). |

---

## Overall UX Scores Summary

| Phase | Step | Score | Status |
|---|---|---|---|
| Onboarding | 1. Launch / Environment Check | 5.5/10 | ⚠️ Needs splash + progress |
| Onboarding | 2. Database Setup | 3.5/10 | 🔴 Major barrier |
| Onboarding | 3. Provider Selection | 6.0/10 | ⚠️ Needs guidance |
| Onboarding | 4. Credential Entry | 5.5/10 | ⚠️ Missing standard affordances |
| Onboarding | 5. Owner Setup | 3.0/10 | 🔴 Almost unspecified |
| Onboarding | 6. Desktop Ready | 4.5/10 | 🔴 No first-run guidance |
| Task Execution | 7. Email Task Attempt | 4.0/10 | 🔴 Cannot complete |
| Task Execution | 8. Tool Generation | 3.0/10 | 🔴 Credential gaps |
| Navigation | 9. Change Provider/Settings | 1.0/10 | 🔴 Completely missing |
| Navigation | 10. Dashboard Usage | 5.0/10 | ⚠️ Structure only |
| Navigation | 11. Emergency Stop | 7.0/10 | ✅ Functional |

**Overall UX Score: 4.4 / 10** 🔴

---

## Top 10 UX Recommendations (Priority Order)

1. **Add a Settings/Preferences screen** — This is the single biggest UX gap. Users cannot change providers, models, personality, or configuration after initial setup.

2. **Simplify database setup** — Offer one-click Docker Compose setup OR in-memory/SQLite fallback for first-time users who just want to try Eris.

3. **Add a welcome/onboarding wizard** — Multi-step guided setup with progress indicator, explanations, and skip options for optional components.

4. **Define the email task path** — Either add an email tool to MVP 2 or define the "capability missing" fallback UX (suggest alternatives, offer to generate).

5. **Add back buttons to ALL onboarding steps** — Users must be able to go back and change decisions (provider, credentials, etc.).

6. **Add real-time progress indicators** — Typing indicator, step progress, estimated time for all agent operations.

7. **Add a command palette (Ctrl+K)** — Power users need quick access to all functions. This is table stakes for modern desktop apps.

8. **Define notification system** — Toast notifications for task completion, security events, errors. Badge counts on Dashboard tabs.

9. **Add conversation management** — History, multiple conversations, search, export. Not just a single chat stream.

10. **Add keyboard shortcuts** — Global hotkeys for emergency stop, new chat, settings, command palette. Document them in an accessible overlay.
