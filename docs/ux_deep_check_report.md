# UX Deep Check Agent Report — Complete Functionality Audit

> **Agent Role**: Human-like user performing exhaustive functionality testing
> **Methodology**: Test every interaction path, every edge case, every dead-end
> **Created Timestamp**: 2026-09-13T23:58:00+05:30
> **Scope**: ALL screens, ALL flows, ALL states in the interface spec (post-critic fixes)
> **Verdict**: Score each functional area and identify every remaining gap

---

## Test Matrix: Every User Action Mapped

### A. Application Lifecycle

| # | Action | Expected Behavior | Path Defined? | Edge Cases Covered? | Score |
|---|---|---|---|---|---|
| A1 | Double-click Eris.exe | Splash → env check → login/onboarding | ✅ | ⚠ What if another instance is already running? Need single-instance lock. | 8/10 |
| A2 | Launch while DB is locked | Splash → DB error → recovery options | ✅ | ⚠ SQLite file lock from another Eris process. Need mutex check. | 7/10 |
| A3 | Launch after crash (dirty state) | Should detect dirty shutdown → offer recovery | ❌ MISSING | 🔴 No crash recovery flow. Need: "Eris didn't shut down cleanly. [Recover Last Session] [Start Fresh]" | 3/10 |
| A4 | Launch on slow HDD | Splash may freeze if synchronous | ⚠ | Progress steps help but need async loading with timeout | 8/10 |
| A5 | Close via ✕ | Tray or exit dialog | ✅ | ✅ "Remember my choice" checkbox | 9/10 |
| A6 | Close via Alt+F4 | Same as ✕ | ⚠ Not mentioned | Should behave identically to ✕ | 8/10 |
| A7 | Windows shutdown with Eris open | Graceful shutdown triggered by OS | ❌ MISSING | 🔴 Need WM_QUERYENDSESSION handler for Windows shutdown | 3/10 |
| A8 | Launch with corrupt config file | Should detect and offer reset | ⚠ Mentioned but no screen | Need explicit error UI | 7/10 |

**Lifecycle Score: 6.6/10** 🔴

**Critical missing**:
- **Crash recovery flow** (A3): After unexpected termination, show recovery dialog
- **Windows shutdown handler** (A7): Save state when Windows is shutting down
- **Single-instance enforcement** (A1): Prevent multiple Eris processes

---

### B. Onboarding (Post-Critic Fixes)

| # | Action | Expected Behavior | Path Defined? | Edge Cases Covered? | Score |
|---|---|---|---|---|---|
| B1 | Accept Privacy Policy | Checkbox enables Continue | ✅ | ✅ Cannot proceed without acceptance | 10/10 |
| B2 | Click Privacy Policy link | Opens policy text (in-app or browser?) | ⚠ | Where is the policy displayed? In-app scroll view recommended. | 8/10 |
| B3 | Skip Setup | Auto-configures SQLite + temp passphrase | ✅ | ⚠ Where is temp passphrase shown? Need: one-time display dialog with "Copy to clipboard" + "I've saved this" button | 7/10 |
| B4 | Back button on Step 1 | Should go to Step 0 (Privacy) | ⚠ | Need to verify back works from every step | 8/10 |
| B5 | "Start Over" on Step 4 | Goes back to Step 0 | ✅ (critic fix) | ✅ Progress preserved in setup_state.json | 9/10 |
| B6 | Delete setup_state.json mid-onboarding | Next launch starts fresh | ✅ (critic fix) | ✅ | 9/10 |
| B7 | Enter very long display name | Should have max length | ❌ MISSING | Need: max 64 chars, validate no special injection chars | 6/10 |
| B8 | Enter empty passphrase | Should be blocked | ✅ (strength indicator) | ✅ Minimum "Fair" strength | 9/10 |
| B9 | Paste API key with trailing whitespace | Should auto-trim | ❌ MISSING | 🟡 Common user error. Auto-trim on paste. | 7/10 |
| B10 | Drag .env file with multiple provider keys | Auto-detect and configure all | ✅ (critic fix) | ⚠ What if .env has BOTH OpenAI and Anthropic keys? Show both as configured. | 8/10 |
| B11 | Enter API key, test succeeds, then internet drops | Key is saved as "last validated" | ⚠ | Need: periodic re-validation on provider use, not just on setup | 7/10 |
| B12 | Google/Azure OAuth for display name | OAuth popup → name auto-fill | ✅ (critic fix) | ⚠ What if OAuth fails? Fallback to manual entry with error toast | 7/10 |
| B13 | Custom personality free-text input | Saved to personality config | ✅ (critic fix) | ⚠ Max length? What if user writes something adversarial? Need content validation (personality can't weaken security) | 7/10 |
| B14 | Voice preview click | Plays sample audio | ✅ (critic fix) | ⚠ What if no audio output device? Detect and show "No audio device found" | 7/10 |
| B15 | Close window mid-onboarding | Save progress → resume on next launch | ✅ (setup_state.json) | ✅ | 9/10 |

**Onboarding Score: 7.8/10** 🟡

**Critical missing**:
- **Temp passphrase display flow** (B3): One-time display with copy button
- **Input validation** (B7, B9, B13): Max lengths, auto-trim, adversarial content check
- **OAuth failure fallback** (B12): Error handling for OAuth flows

---

### C. Main Workspace — Chat

| # | Action | Expected Behavior | Path Defined? | Edge Cases Covered? | Score |
|---|---|---|---|---|---|
| C1 | Type and send message | Message appears, Eris processes | ✅ | ✅ | 10/10 |
| C2 | Send empty message | Should be blocked (send button disabled) | ❌ MISSING | Need: disable send when input is empty | 8/10 |
| C3 | Send very long message (10K chars) | Should work but warn if exceeds context | ❌ MISSING | Need: char counter when approaching limit | 6/10 |
| C4 | Attach file via 📎 | File picker → file sent as context | ✅ (listed) | ⚠ Max file size? Supported types? What about binary files? | 6/10 |
| C5 | Paste image in chat | Should attach as image context | ❌ MISSING | 🔴 Modern chat apps support paste-to-attach. Need clipboard image handling. | 4/10 |
| C6 | Voice input via 🎤 | Push-to-talk or toggle | ✅ | ⚠ What if no microphone? Detect and disable with tooltip "No microphone detected" | 7/10 |
| C7 | Interrupt Eris while she's speaking | Stop speech, listen to user | ✅ (critic fix) | ✅ Two modes: "Stop speaking, listen" vs "Finish thought" | 9/10 |
| C8 | Cancel task mid-execution | Stop current task, preserve state | ⚠ | Need visible [Cancel] button on task progress cards, not just emergency stop | 7/10 |
| C9 | Scroll up in chat history | Infinite scroll, load older messages | ❌ MISSING | 🔴 No pagination/virtualization spec. Long conversations will lag without virtual scrolling. | 4/10 |
| C10 | Search within conversation | Find text in current chat | ❌ MISSING | 🟡 Ctrl+F should search within active conversation | 5/10 |
| C11 | Copy message text | Right-click → Copy or select + Ctrl+C | ❌ MISSING | Need: right-click context menu on messages | 6/10 |
| C12 | Code in Eris's response | Syntax-highlighted code block with copy button | ⚠ Implied | Need explicit: code blocks with language detection, copy button, line numbers | 7/10 |
| C13 | Eris asks for approval (Level 2+) | Typed confirmation card appears | ✅ | ✅ Typed "approve", not just button click | 9/10 |
| C14 | User types "approve" with wrong case | Should be case-insensitive | ❌ MISSING | "Approve", "APPROVE", "approve" all valid | 8/10 |
| C15 | Multiple approval requests queued | How are they displayed? | ❌ MISSING | 🟡 Stack vertically? Show count? "3 actions pending approval" | 5/10 |
| C16 | New conversation (Ctrl+Shift+N) | Creates fresh conversation | ✅ | ⚠ What happens to current conversation? Auto-saved? Prompt to save? | 7/10 |
| C17 | Switch between conversations | Click on conversation list | ✅ | ⚠ Is the previous conversation still "alive" (background processing)? Or paused? | 6/10 |
| C18 | Delete conversation | Right-click → Delete → confirm | ⚠ Implied | Need: "Delete this conversation? This cannot be undone. [Cancel] [Delete]" | 7/10 |
| C19 | Export conversation | Right-click → Export → choose format | ⚠ Implied | Need: formats (Markdown, JSON, TXT). Where is it saved? File picker. | 6/10 |
| C20 | Eris sends markdown response | Rendered as rich text (bold, lists, links) | ❌ MISSING | 🟡 Need markdown renderer in chat. Links should open in browser. | 5/10 |

**Chat Score: 6.5/10** 🔴

**Critical missing**:
- **Virtual scrolling** (C9): Essential for long conversations
- **Markdown rendering** (C20): Eris responses WILL contain markdown
- **Image paste** (C5): Modern chat expectation
- **Message context menu** (C11): Copy, quote, search, report
- **Code blocks** (C12): Syntax highlighting with copy button

---

### D. Main Workspace — Settings

| # | Action | Expected Behavior | Path Defined? | Edge Cases Covered? | Score |
|---|---|---|---|---|---|
| D1 | Open settings | Ctrl+, or gear icon | ✅ | ✅ | 10/10 |
| D2 | Change provider | Provider grid with credentials | ✅ (critic fix) | ✅ Context preservation warning | 9/10 |
| D3 | Remove API key | Key deleted, fallback overlay on chat | ✅ (critic fix) | ✅ State-driven fallback | 9/10 |
| D4 | Change model | Model selector card with search | ✅ (critic fix) | ⚠ What if current conversation is incompatible with new model's context window? Warning needed. | 8/10 |
| D5 | Change personality | Same interface as onboarding step 5 | ✅ | ⚠ Preview should use CURRENT provider to show real response | 8/10 |
| D6 | Change passphrase | Current passphrase → new passphrase → confirm | ⚠ Listed but no UI | Need: full passphrase change flow with current-pass verification | 7/10 |
| D7 | Add second owner | Enter name + passphrase for second owner | ❌ MISSING | 🔴 PRD says 2 owners. No flow for adding the second owner. | 3/10 |
| D8 | Configure auto-failover | Model priority list (drag-and-drop) | ✅ (critic fix) | ✅ Quality/Speed/Cost strategy | 9/10 |
| D9 | Customize keyboard shortcuts | Rebindable shortcuts | ✅ (critic fix) | ⚠ Conflict detection if two actions share a shortcut | 8/10 |
| D10 | Switch theme (dark/light) | Immediate visual change | ⚠ Listed | Need: system-follow option, smooth transition animation | 7/10 |
| D11 | Export settings | Backup config to file | ⚠ Listed | Need: export format (TOML), import flow, conflict resolution | 6/10 |
| D12 | Configure emotion GIFs | Enable/disable, choose emotion set | ✅ (critic fix) | ⚠ Where do custom emotion sets come from? User-provided folder? | 7/10 |
| D13 | Database migration (SQLite → PostgreSQL) | Migration wizard | ⚠ Listed | 🟡 Need: data export from SQLite, import to PostgreSQL, verification | 5/10 |

**Settings Score: 7.2/10** 🟡

**Critical missing**:
- **Second owner flow** (D7): PRD-required feature with no UI
- **Passphrase change UI** (D6): Common settings feature
- **Database migration wizard** (D13): If we support both SQLite and PostgreSQL

---

### E. Security & Emergency

| # | Action | Expected Behavior | Path Defined? | Edge Cases Covered? | Score |
|---|---|---|---|---|---|
| E1 | Emergency stop | Typed "stop" → safe mode | ✅ | ✅ Separate thread, always available | 10/10 |
| E2 | Resume from safe mode | Click "Resume Normal Operation" in status bar | ✅ | ⚠ Should require re-authentication before resuming | 8/10 |
| E3 | Session expires | Modal overlay → re-enter passphrase | ✅ | ✅ Resume where left off | 9/10 |
| E4 | View audit log | Security tab → full audit log | ✅ | ⚠ Search/filter needed for large audit logs | 8/10 |
| E5 | Elevate to privileged session | Click in security panel → passphrase + typed confirmation | ✅ | ✅ Short timeout (15 min), audit logged | 9/10 |
| E6 | LLM attempts permission escalation | Blocked + security event + notification | ✅ | ✅ Logged in audit, shown in security panel | 10/10 |

**Security Score: 9.0/10** ✅

---

### F. Notifications & Feedback

| # | Action | Expected Behavior | Path Defined? | Edge Cases Covered? | Score |
|---|---|---|---|---|---|
| F1 | Task completes | Notification toast + bell badge | ✅ | ⚠ What if app is minimized to tray? Windows toast notification? | 7/10 |
| F2 | Approval needed | Notification + chat scroll to approval | ✅ | ⚠ Sound? Visual flash on taskbar? | 7/10 |
| F3 | Security event | Red notification + bell badge | ✅ | ✅ | 9/10 |
| F4 | Clear all notifications | Click "Clear" in dropdown | ✅ | ⚠ Are they permanently deleted or marked as read? | 7/10 |
| F5 | Click notification | Navigate to relevant context | ✅ | ✅ "Go to Chat →", "View Audit Log →" | 9/10 |

**Notifications Score: 7.8/10** 🟡

**Missing**: Windows-native toast notifications when Eris is minimized to tray.

---

### G. System Tray Behavior

| # | Action | Expected Behavior | Path Defined? | Edge Cases Covered? | Score |
|---|---|---|---|---|---|
| G1 | Minimize to tray | Window disappears, tray icon appears | ✅ | ✅ | 9/10 |
| G2 | Left-click tray icon | Restore window | ✅ | ⚠ What if window was on a monitor that's now disconnected? Need display detection. | 7/10 |
| G3 | Right-click tray icon | Context menu: Show, Settings, Emergency Stop, Exit | ✅ | ✅ | 9/10 |
| G4 | Eris task completes while minimized | Tray icon shows badge/flash | ❌ MISSING | 🟡 Need: tray icon animation or badge number | 5/10 |
| G5 | Voice wake word while minimized | "Eris" detected → restore window + listen | ❌ MISSING | 🟡 Wake word should work even when minimized | 4/10 |

**System Tray Score: 6.8/10** 🟡

---

## Overall Functionality Scores

| Area | Score | Status | Top Missing Item |
|---|---|---|---|
| A. Application Lifecycle | 6.6/10 | 🔴 | Crash recovery, Windows shutdown handler |
| B. Onboarding | 7.8/10 | 🟡 | Temp passphrase display, input validation |
| C. Chat | 6.5/10 | 🔴 | Virtual scrolling, markdown rendering, image paste |
| D. Settings | 7.2/10 | 🟡 | Second owner flow, passphrase change, DB migration |
| E. Security | 9.0/10 | ✅ | Minor: re-auth on safe mode resume |
| F. Notifications | 7.8/10 | 🟡 | Windows toast when minimized |
| G. System Tray | 6.8/10 | 🟡 | Tray badge, wake word while minimized |

**Overall UX Functionality Score: 7.4 / 10** 🟡

---

## Top 15 Mandatory Fixes (Priority Order)

| # | Fix | Area | Impact |
|---|---|---|---|
| 1 | **Crash recovery dialog** on dirty startup | Lifecycle | 🔴 Users lose work |
| 2 | **Virtual scrolling** for chat history | Chat | 🔴 App will lag with long conversations |
| 3 | **Markdown rendering** in Eris responses | Chat | 🔴 Eris outputs markdown — must render it |
| 4 | **Second owner registration flow** | Settings | 🔴 PRD requirement |
| 5 | **Windows shutdown handler** (WM_QUERYENDSESSION) | Lifecycle | 🔴 Data loss on OS shutdown |
| 6 | **Single-instance enforcement** (mutex) | Lifecycle | 🔴 Duplicate processes corrupt DB |
| 7 | **Code block rendering** with syntax highlighting + copy | Chat | 🟡 Essential for a dev-focused agent |
| 8 | **Image paste-to-attach** in chat | Chat | 🟡 Modern chat expectation |
| 9 | **Message context menu** (copy, quote, search) | Chat | 🟡 Basic chat functionality |
| 10 | **Passphrase change flow** in settings | Settings | 🟡 Standard security feature |
| 11 | **Windows toast notifications** when minimized | Notifications | 🟡 Users miss events |
| 12 | **Chat search** (Ctrl+F within conversation) | Chat | 🟡 Finding info in long conversations |
| 13 | **Tray icon badge/animation** for pending events | System Tray | 🟡 Visual feedback |
| 14 | **Input validation** (max lengths, auto-trim, sanitization) | Onboarding | 🟡 Edge case protection |
| 15 | **Temp passphrase one-time display dialog** on Skip Setup | Onboarding | 🟡 User needs to see it once |
