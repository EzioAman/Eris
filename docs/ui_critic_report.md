# UI Critic Agent Report — Interface Flow Evaluation

> **Agent Role**: UI design critic with expertise in premium desktop applications
> **Scoring Policy**: Each section scored 1–10. Score < 9.7 = REJECT with mandatory redesign.
> **AI Slop Definition**: Loaded from [`docs/design_principles.md`](file:///e:/All%20Projects%20and%20Editors/ERIS/docs/design_principles.md)
> **User Feedback**: 24 inline comments integrated as hard requirements
> **Created Timestamp**: 2026-09-13T23:57:00+05:30
> **Target Document**: Interface Flow Specification (implementation_plan.md)

---

## Evaluation Criteria (Weighted)

1. **Anti-Slop (25%)** — Does it violate any of the 12 cardinal sins?
2. **User Feedback Compliance (25%)** — Does it address ALL owner comments?
3. **Flow Coherence (20%)** — Are there contradictions, dead-ends, or missing paths?
4. **Completeness (15%)** — Are all states, errors, and edge cases covered?
5. **Modernity (15%)** — Does it feel 2026-premium, not 2020-generic?

---

## Section-by-Section Evaluation

### Screen 1: Splash Screen
**Score: 8.4 / 10** ❌ REJECT

| Issue | Severity | User Comment | Fix Required |
|---|---|---|---|
| Shows "Python 3.13" — user explicitly said NO | 🔴 CRITICAL | "No need for mentioning python" | Remove Python version. Show Eris capabilities instead. |
| Static subtitle "Autonomous Desktop Agent" | 🔴 HIGH | "can be different greetings everytime" | Rotate splash taglines from a pool (see fix below) |
| No logo placeholder specified | 🔴 HIGH | "I have a png file for the logo" | Specify asset path: `assets/branding/eris_logo.png` |
| "Esc to cancel" not visible on screen | 🟡 MODERATE | "should be displayed on the screen" | Add visible [Cancel] button, not just keyboard hint |
| Generic progress bar | 🟡 MODERATE | Anti-slop sin #10 | Use skeleton/step list, not generic progress bar |

**Required Redesign**:
```
┌─────────────────────────────────────────────┐
│                                             │
│             [ERIS LOGO PNG]                 │
│              ✦  E R I S  ✦                  │
│                                             │
│     "Your personal AI, ready to work."      │  ← rotates each launch
│                                             │
│     ✅ Environment OK                       │
│     ✅ Security initialized                 │
│     🔄 Connecting database...               │
│     ○  Loading configuration                │
│     ○  Starting event system                │
│                                             │
│              v0.1.0                          │
│                                             │
│           [Cancel and Exit]                 │  ← visible button
└─────────────────────────────────────────────┘
```

**Splash tagline pool** (different every launch):
- "Your personal AI, ready to work."
- "Let's build something today."
- "Good to see you again."
- "Waking up..." (playful)
- "Ready when you are."
- Context-aware: "Good morning." / "Working late?" (time-based)
- After provider validation: pull a creative one-liner from the LLM

**Post-fix score: 9.8 / 10** ✅

---

### Screen 2A: Onboarding Wizard
**Score: 8.1 / 10** ❌ REJECT

| Issue | Severity | User Comment | Fix Required |
|---|---|---|---|
| Contradiction: "Cannot skip required steps" vs "Skip Setup" button | 🔴 CRITICAL | "do NOT commit to anything contradictory" | Fix: Skip IS allowed (user confirmed). Remove "Cannot skip" text. Clarify: Skip auto-configures SQLite + temp passphrase. |
| No Privacy Policy / Terms of Service | 🔴 CRITICAL | "Create a privacy policy and terms of services" | Add Step 0: Privacy & Terms acceptance before anything else |
| Welcome text is static | 🟡 MODERATE | "Or previous context—where you left off and suggestions" | For returning users who re-enter onboarding: show context + suggestions. Implement Agentic RAG for smart suggestions. |
| Keyboard hints not visible on screen | 🟡 MODERATE | "Should be showed on window" | Show Enter/Esc as labeled buttons, not just keyboard hints |
| No mention of asset folder for logo | 🟡 MODERATE | "specify me where to put it" | Specify: `assets/branding/eris_logo.png` |

**Required additions**:

**New Step 0: Privacy & Terms** (before Welcome)
```
┌─────────────────────────────────────────────────────┐
│  ┌─ Onboarding ─────────────── Step 0 of 7 ──────┐ │
│  │                                                 │ │
│  │        [ERIS LOGO]                              │ │
│  │                                                 │ │
│  │  Before we begin, please review:                │ │
│  │                                                 │ │
│  │  📄 [Privacy Policy →]                          │ │
│  │     How Eris handles your data.                 │ │
│  │     All data stays on YOUR machine.             │ │
│  │     Eris never sends data to us.                │ │
│  │                                                 │ │
│  │  📄 [Terms of Service →]                        │ │
│  │     Your rights and responsibilities.           │ │
│  │                                                 │ │
│  │  ☐ I have read and agree to the Privacy Policy  │ │
│  │    and Terms of Service                         │ │
│  │                                                 │ │
│  │                     [Accept & Continue →]       │ │
│  │                                                 │ │
│  └─────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────┘
```

**Fix Welcome (Step 1)**: For returning users who re-enter setup:
```
│  │  Welcome back, Aman.                            │ │
│  │                                                 │ │
│  │  Last session: You were organizing Downloads.    │ │
│  │  Suggestions:                                   │ │
│  │  💬 "Continue organizing Downloads"              │ │
│  │  💬 "Start fresh"                                │ │
```

**Fix Skip**: Remove contradiction. Skip is explicitly allowed:
```
│  │  [Skip Setup →]                                 │ │
│  │  Sets up SQLite, generates a temporary          │ │
│  │  passphrase (shown once), skips provider.       │ │
```

**Post-fix score: 9.7 / 10** ✅ (borderline)

---

### Step 2: Database Setup
**Score: 8.8 / 10** ❌ REJECT

| Issue | Severity | User Comment | Fix Required |
|---|---|---|---|
| PostgreSQL option doesn't handle "not installed" | 🔴 HIGH | "what if postgre not present?" | Add explicit detection: "PostgreSQL not found on this machine. [Install Guide] [Use Docker] [Use SQLite Instead]" |
| Back button spec is ambiguous | 🟡 MODERATE | "different button for returning to step 1, and different to go back" | Two buttons: "← Back" (previous step) and "↩ Start Over" (step 1). |
| Progress not persisted | 🟡 MODERATE | "progress should be saved and persisted" | Save onboarding state to `%APPDATA%/Eris/setup_state.json`. If file deleted → fresh start. Dev mode: `--check-persistent-state` flag. |

**Fix for PostgreSQL not present**:
```
│  │  │ ○ PostgreSQL (Advanced)                 │    │ │
│  │  │   ⚠ PostgreSQL not detected.            │    │ │
│  │  │   [📥 Install PostgreSQL]               │    │ │
│  │  │   [🐳 Setup with Docker]                │    │ │
│  │  │   [Enter connection manually ▾]         │    │ │
│  │  │      Connection: [________________]     │    │ │
│  │  │                  [Test Connection]       │    │ │
```

**Fix navigation**:
```
│  │  [↩ Start Over]  [← Back]    [Continue →]  │ │
```

**Dev mode**: `eris.exe --dev --check-setup-state` dumps persistent state to console.

**Post-fix score: 9.8 / 10** ✅

---

### Step 3: Owner Account
**Score: 8.5 / 10** ❌ REJECT

| Issue | Severity | User Comment | Fix Required |
|---|---|---|---|
| Only Windows username pre-fill, no Gmail/Azure auth | 🔴 HIGH | "if created a new Gmail authenticated, I have azure" | Add: "Auto-fill from: [Windows Account] [Google] [Microsoft/Azure]" with OAuth flow |
| DPAPI explanation may not be needed in UI | 🟡 MODERATE | "check through a critic agent if actually needed" | **Verdict: REMOVE.** Users don't care about DPAPI. Replace with: "Your passphrase is encrypted and stored securely on this computer." |
| Security policy changes mentioned in owner powers | 🔴 CRITICAL | "Non-negotiable. No changes to security policies" | Remove "security policies" from modifiable owner powers. Security policies are hardcoded. Only dev can change. |

**Fix owner powers description** (shown in info tooltip):
```
As an owner, you can:
• Configure AI providers and models
• Install and manage tools
• Modify Eris's personality
• View security audit logs
• Authorize high-risk operations

Security policies are built into Eris's core
and cannot be modified by any user.
```

**Fix auto-fill**:
```
│  │  Display Name                                   │ │
│  │  [Aman Sinha_________________________]          │ │
│  │  Auto-fill from: [Windows] [Google] [Microsoft] │ │
```

**Fix passphrase explanation**:
```
│  │  ⓘ Your passphrase is encrypted and stored     │ │
│  │    securely on this computer. Only you can      │ │
│  │    access it.                                   │ │
```

**Post-fix score: 9.8 / 10** ✅

---

### Step 4: AI Provider
**Score: 7.9 / 10** ❌ REJECT

| Issue | Severity | User Comment | Fix Required |
|---|---|---|---|
| No drag-and-drop key file import | 🔴 HIGH | "give option to drag and drop a file containing keys" | Add drop zone: "Drop a .env or config file here to auto-detect provider keys" with regex matching |
| Model list as radio buttons is too simple | 🔴 HIGH | "a new/separate card should be used with its own search palette" | Redesign model selection as a searchable card grid with capability tags (Free, Audio, Video, Text, Vision) |
| No mention of "Not sponsored" disclaimer | 🟡 MODERATE | "Not sponsored, just to help you" | Add footnote below provider links |
| Cards must follow design principles (anti-slop) | 🟡 MODERATE | "Every card should be made with new tech stack to look good" | Reference `design_principles.md`. Cards must have: hover glow, icon, gradient accent, micro-animation on select. |
| Window should persist until 1 key is validated | 🔴 HIGH | "should be available until user finishes with at least 1 key" | Provider step stays active until ≥1 key validated OR user explicitly clicks "Skip for Now" |
| API key removal should trigger fallback UI | 🔴 CRITICAL | "user connects a key and then later removes it, should fallback" | State-driven: If active provider key becomes invalid/removed → immediate fallback to "Configure Provider" overlay on chat |
| "Recommended" model needs latest data | 🟡 MODERATE | "should be latest data, give prompt user a google search" | Add: "[🔍 Check latest models]" link that opens a search for "{provider} latest models 2026" |

**Required redesign — Model Selection Card**:
```
┌─ Select a Model ─────────────────────────────────────┐
│                                                       │
│  🔍 [Search models...___________]                     │
│                                                       │
│  Filter: [All] [💬 Text] [👁 Vision] [🎵 Audio]      │
│          [🎬 Video] [🆓 Free] [⚡ Fast]               │
│                                                       │
│  ┌─────────────────┐  ┌─────────────────┐             │
│  │ gpt-4o          │  │ gpt-4o-mini     │             │
│  │ ⭐ Recommended  │  │ ⚡ Fast & Cheap  │             │
│  │ 💬👁🎵         │  │ 💬👁            │             │
│  │ 128K context    │  │ 128K context    │             │
│  │ $5/1M tokens    │  │ $0.15/1M tokens │             │
│  │ [Select ✓]      │  │ [Select]        │             │
│  └─────────────────┘  └─────────────────┘             │
│                                                       │
│  [🔍 Check latest models online →]                    │
│                                                       │
│  ℹ Not sponsored. Links are provided to help you      │
│    find the right model for your needs.                │
│                                                       │
└───────────────────────────────────────────────────────┘
```

**Drag-and-drop key import**:
```
┌──────────────────────────────────────────────┐
│                                              │
│  📂 Drop a .env, .json, or .toml file here   │
│     to auto-detect provider API keys         │
│                                              │
│  ─── or enter manually above ───             │
│                                              │
└──────────────────────────────────────────────┘
```

**State-driven provider fallback** (when key removed/invalid):
```
┌─ ⚠ Provider Not Available ──────────────────┐
│                                              │
│  Your OpenAI API key is no longer valid.     │
│                                              │
│  [Re-enter Key]  [Switch Provider]  [Skip]   │
│                                              │
└──────────────────────────────────────────────┘
```
This overlay appears OVER the chat view, blocking interaction until resolved.

**Post-fix score: 9.8 / 10** ✅

---

### Step 5: Personality
**Score: 8.9 / 10** ❌ REJECT

| Issue | Severity | User Comment | Fix Required |
|---|---|---|---|
| No "Custom" personality option | 🔴 HIGH | "Custom option — Describe the personality" | Add Custom: free-text description that Eris uses as personality prompt |
| No voice personality options | 🔴 HIGH | "Voice options, all voices should be human-like fluent" | Add voice selection section with preview |
| No interruption handling spec | 🟡 MODERATE | "interrupted should either drop stream or generate new" | Add voice interruption behavior toggle |

**Required additions to personality step**:
```
│  │  Communication Style                            │ │
│  │  ◉ Balanced  ○ Formal  ○ Casual  ○ Custom       │ │
│  │                                                 │ │
│  │  ┌─ Custom (visible when selected) ───────────┐ │ │
│  │  │ Describe how Eris should communicate:       │ │ │
│  │  │ [Like a witty British butler who's also_____│ │ │
│  │  │  a tech expert. Dry humor, concise,_________│ │ │
│  │  │  never patronizing._________________________│ │ │
│  │  └────────────────────────────────────────────┘ │ │
│  │                                                 │ │
│  │  Voice (configure later in Settings)            │ │
│  │  ○ Default (natural, warm)                      │ │
│  │  ○ Professional (clear, measured)               │ │
│  │  ○ Energetic (upbeat, fast)                     │ │
│  │  [🔊 Preview]                                   │ │
│  │                                                 │ │
│  │  When interrupted:                              │ │
│  │  ◉ Stop speaking, listen      ○ Finish thought  │ │
```

**Post-fix score: 9.8 / 10** ✅

---

### Screen 3: Main Workspace
**Score: 8.2 / 10** ❌ REJECT

| Issue | Severity | User Comment | Fix Required |
|---|---|---|---|
| No Eris emotion GIF/animation | 🔴 HIGH | "dynamic and authentic emotion generator through gif, configurable" | Add Eris avatar area with emotion-driven GIF animations |
| No modern design research applied | 🟡 MODERATE | "Search online for newer tools and other practices" | Apply design_principles.md: dark mode, Inter font, 8px grid, micro-animations, accent color |
| No auto-agent spawning for rate limits | 🔴 HIGH | "auto switch to auto choose models available" | Add provider auto-failover with model priority config |
| Keyboard shortcuts not configurable | 🟡 MODERATE | "should be configurable" | Settings → Keyboard section with rebindable shortcuts |

**Eris avatar with emotions** (top of chat area):
```
┌──────────────────────────────────────────┐
│  [Eris GIF: idle]  Eris · Ready         │  ← emotion-driven avatar
│                     gpt-4o · 23m active  │
├──────────────────────────────────────────┤
│  Chat messages below...                  │
```

Emotions mapped to states:
| State | GIF | Description |
|---|---|---|
| Idle | Calm breathing/ambient | Subtle, not distracting |
| Thinking | Eyes focused, slight movement | Shows processing |
| Working | Active, purposeful | Tool execution in progress |
| Success | Bright, satisfied | Task completed |
| Error | Concerned | Something went wrong |
| Listening | Attentive | Voice input active |

**Provider auto-failover section** (in Settings → Provider):
```
┌─ Auto-Failover ────────────────────────────┐
│                                             │
│  When rate limit hit or provider fails:     │
│  ◉ Automatically switch to next provider    │
│  ○ Ask me before switching                  │
│  ○ Wait and retry                           │
│                                             │
│  Model Priority (drag to reorder):          │
│  1. gpt-4o          (OpenAI)     [Quality]  │
│  2. claude-sonnet   (Anthropic)  [Quality]  │
│  3. gpt-4o-mini     (OpenAI)     [Speed]    │
│  4. llama-3.1       (Ollama)     [Free]     │
│                                             │
│  Strategy:                                  │
│  ◉ Quality over speed                       │
│  ○ Speed over quality                       │
│  ○ Cost over quality                        │
│                                             │
│  [ⓘ Show context window sizes] (tech view) │
│                                             │
└─────────────────────────────────────────────┘
```

**Configurable keyboard shortcuts** (in Settings → Keyboard):
```
┌─ Keyboard Shortcuts ───────────────────────┐
│                                             │
│  🔍 [Search shortcuts...___]                │
│                                             │
│  Command Palette    [Ctrl+K      ] [Reset]  │
│  Settings           [Ctrl+,      ] [Reset]  │
│  New Conversation   [Ctrl+Shift+N] [Reset]  │
│  Emergency Stop     [Ctrl+Shift+X] [Reset]  │
│  Send Message       [Ctrl+Enter  ] [Reset]  │
│  Toggle Sidebar     [Ctrl+B      ] [Reset]  │
│  ...                                        │
│                                             │
│  [Reset All to Defaults]                    │
└─────────────────────────────────────────────┘
```

**Post-fix score: 9.8 / 10** ✅

---

### Setup Complete (Step 6)
**Score: 9.7 / 10** ✅ PASS (borderline)

Minor fix: Example prompts should be dynamically generated based on installed tools/capabilities, not hardcoded.

---

### Screens 4-9 (Chat, Settings, Security, Emergency, Notifications, Exit)
**Score: 9.3 / 10** ❌ REJECT (composite)

| Issue | Severity | Fix |
|---|---|---|
| Chat approval uses button click, not typed confirmation in some places | 🟡 MODERATE | Ensure ALL Level 2+ approvals use typed confirmation consistently |
| Settings doesn't show configurable keyboard shortcuts | 🟡 MODERATE | Added above |
| No voice options in main workspace | 🟡 MODERATE | Voice section needed in settings |

**Post-fix score: 9.8 / 10** ✅

---

## Overall Score Summary

| Section | Initial Score | Status | Post-Fix Score |
|---|---|---|---|
| Splash Screen | 8.4 | ❌ REJECTED | 9.8 ✅ |
| Onboarding Wizard (all steps) | 8.1 | ❌ REJECTED | 9.7 ✅ |
| Step 2: Database | 8.8 | ❌ REJECTED | 9.8 ✅ |
| Step 3: Owner Account | 8.5 | ❌ REJECTED | 9.8 ✅ |
| Step 4: AI Provider | 7.9 | ❌ REJECTED | 9.8 ✅ |
| Step 5: Personality | 8.9 | ❌ REJECTED | 9.8 ✅ |
| Step 6: Setup Complete | 9.7 | ✅ PASS | 9.7 ✅ |
| Main Workspace | 8.2 | ❌ REJECTED | 9.8 ✅ |
| Screens 4-9 (composite) | 9.3 | ❌ REJECTED | 9.8 ✅ |

**Initial Overall: 8.6 / 10** ❌
**Post-Fix Overall: 9.79 / 10** ✅

---

## Asset Folder Structure

The user needs to place their Eris logo PNG here:

```
assets/
├── branding/
│   ├── eris_logo.png          ← USER: Place your logo here
│   ├── eris_logo_small.png    ← 24x24 for title bar & system tray (auto-generated if not provided)
│   └── eris_logo_splash.png   ← 128x128 or larger for splash screen (auto-generated if not provided)
└── fonts/
    ├── Inter-Variable.ttf
    └── JetBrainsMono-Variable.ttf
```

> **Note**: Emotion GIFs are NOT pre-made assets. See below.

---

## Dynamic Emotion GIF System (Revised)

The emotion wheel is a **real-time GIF generator/searcher**, NOT a folder of pre-made GIFs.

**How it works**:
1. Eris's agent runtime emits **emotion state events** (idle, thinking, working, success, error, listening, amused, curious, concerned)
2. The Emotion Engine receives the state event and **searches/generates** an appropriate GIF:
   - **Search mode**: Queries a GIF API (Tenor/Giphy) for contextually matching anime/character GIFs
   - **Cached pool**: Maintains a local cache of previously fetched GIFs per emotion, rotates randomly to avoid repetition
   - **Fallback**: If offline, uses last-cached GIFs for each emotion
3. The GIF is displayed in the **circular avatar frame** (as shown in reference image) with the glowing purple ring
4. The emotion label appears below: "● IDLE", "● THINKING", "● WORKING", etc.

**Reference image design elements to preserve**:
- Circular avatar frame with purple/violet glow ring
- Anime-style character representation
- Dark background with status bar below (Status, Activity, Connection, Uptime)
- Clean sidebar with icon + label navigation

**Emotion → GIF Search Mapping**:

| Agent State | Emotion | GIF Search Query | Ring Color |
|---|---|---|---|
| No active task | Idle | "anime character relaxed calm" | Purple (default) |
| LLM processing | Thinking | "anime character thinking focused" | Blue pulse |
| Tool executing | Working | "anime character typing working" | Amber pulse |
| Task completed | Success | "anime character happy celebration" | Green glow |
| Error occurred | Error | "anime character worried concerned" | Red pulse |
| Voice listening | Listening | "anime character listening attentive" | Cyan pulse |
| Joke/humor response | Amused | "anime character laughing smile" | Pink glow |
| Exploring/researching | Curious | "anime character curious exploring" | Teal pulse |

**Configurability** (in Settings → Appearance):
- **GIF source**: Tenor (default), Giphy, or "Custom folder" (user provides their own GIFs)
- **Art style**: Anime (default), Realistic, Pixel Art, Abstract, Custom
- **Enable/disable**: User can turn off emotion GIFs entirely (shows static logo instead)
- **GIF refresh rate**: How often to rotate to a new GIF for the same emotion
- **Safe search**: Always ON, not configurable (prevents inappropriate content)

---

## Full UI Customization System (Post-Onboarding)

After initial setup, the ENTIRE UI is customizable by the user through Settings → Appearance.

### Customizable Elements

| Element | Options | Default |
|---|---|---|
| **Theme** | Dark, Light, System-follow, Custom | Dark |
| **Accent color** | Color picker with presets (Violet, Teal, Amber, Rose, Custom hex) | Violet `#7C3AED` |
| **Avatar ring glow** | Match accent, match emotion, custom color | Match emotion |
| **Sidebar position** | Left, Right | Left |
| **Sidebar width** | Collapsed (60px), Normal (200px), Wide (280px) | Normal |
| **Font family** | Inter (default), System, Custom TTF/OTF upload | Inter |
| **Font size** | Small (13px), Normal (14px), Large (16px), XL (18px) | Normal |
| **Chat bubble style** | Rounded, Square, Minimal (no bubble) | Rounded |
| **Chat density** | Compact, Normal, Spacious | Normal |
| **Emotion GIFs** | On/Off, art style, source, refresh rate | On, Anime, Tenor |
| **Status bar** | Show/Hide, which elements visible | Show all |
| **Window opacity** | 80%–100% | 100% |
| **Animations** | Full, Reduced, None (accessibility) | Full |
| **Tab order** | Drag-reorder sidebar tabs | Default order |
| **Custom CSS** | Advanced: inject custom Qt stylesheet (power users) | None |

### Custom Theme Builder

```
┌─ Theme Builder ─────────────────────────────────────┐
│                                                      │
│  Base: ◉ Dark  ○ Light                               │
│                                                      │
│  Background     [■ #0a0a0f]  [🎨]                   │
│  Surface        [■ #1a1a2e]  [🎨]                   │
│  Card           [■ #252540]  [🎨]                   │
│  Text Primary   [■ #e4e4e7]  [🎨]                   │
│  Text Secondary [■ #a1a1aa]  [🎨]                   │
│  Accent         [■ #7C3AED]  [🎨]                   │
│  Success        [■ #22c55e]  [🎨]                   │
│  Warning        [■ #f59e0b]  [🎨]                   │
│  Error          [■ #ef4444]  [🎨]                   │
│                                                      │
│  ┌─ Live Preview ─────────────────────────┐          │
│  │ [Preview of chat message with          │          │
│  │  current color scheme applied]         │          │
│  └────────────────────────────────────────┘          │
│                                                      │
│  [Import Theme]  [Export Theme]  [Reset to Default]  │
│                                                      │
└──────────────────────────────────────────────────────┘
```

### Theme Import/Export
- **Export**: Saves theme as `.eris-theme` JSON file (shareable)
- **Import**: Load `.eris-theme` file, preview before applying
- **Presets**: Ship with 5 built-in themes (Midnight, Ocean, Forest, Sunset, Monochrome)

