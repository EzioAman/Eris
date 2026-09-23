# Cross-Document Comparison & Architecture Improvement Matrix v2

> **Analysis Timestamp**: 2026-09-13T22:01:00+05:30
> **Analyzed Documents**:
> 1. [`PRD.md`](file:///e:/All%20Projects%20and%20Editors/ERIS/PRD.md) — Original PRD, v0.1.0, 2004 lines, 48 sections
> 2. [`Eris.md`](file:///e:/All%20Projects%20and%20Editors/ERIS/Eris.md) — Architecture Blueprint, 1243 lines, 12 sections
> 3. [`docs/critic_evaluation_v2.md`](file:///e:/All%20Projects%20and%20Editors/ERIS/docs/critic_evaluation_v2.md) — Critic v2, Score: 9.73/10
> 4. [`docs/adversarial_report_v2.md`](file:///e:/All%20Projects%20and%20Editors/ERIS/docs/adversarial_report_v2.md) — Adversarial v2, 17 vectors, Posture: 6.8/10
> 5. [`docs/ux_navigator_report.md`](file:///e:/All%20Projects%20and%20Editors/ERIS/docs/ux_navigator_report.md) — UX Navigator, Score: 4.4/10

---

## 1. Executive Gap Matrix — All Documents Cross-Referenced

| Domain | PRD Requirement | Eris.md Status | Critic v2 Finding | Adversarial v2 Finding | UX Navigator Finding | **Net Status** |
|---|---|---|---|---|---|---|
| **Qt ↔ Asyncio** | Silent | ✅ Addressed (qasync) | ✅ 9.7 post-revision | — | — | ✅ RESOLVED |
| **Tool Security Model** | Blocklist (§17-18) | ✅ Allowlist adopted | ✅ 9.7 | ⚠️ ATK-14: Dependency confusion bypasses allowlist | — | 🔴 NEEDS FIX |
| **Prompt Injection** | "LLM is not authority" (§9) | ⚠️ Partial (wrapper) | ✅ Accepted | 🔴 ATK-01/07: Wrapper insufficient alone; ATK-13: Context overflow | — | 🔴 NEEDS FIX |
| **Memory Security** | Vector search + PG (§22) | ⚠️ Classifier concept | ✅ Accepted | 🔴 ATK-03: LLM-based classifier attackable | — | 🔴 NEEDS FIX |
| **Session TOCTOU** | Privileged sessions (§6) | ✅ Sync re-validation | ✅ 9.8 | ✅ ATK-06: 9/10 | — | ✅ RESOLVED |
| **IPC Security** | "Implementation decision" | ✅ DPAPI shared secret | ✅ Accepted | ✅ ATK-04: 9/10 | — | ✅ RESOLVED |
| **Provider Validation** | Provider independent (§2) | ✅ Schema validation | ✅ 9.8 | ✅ ATK-05: 8/10 | — | ✅ MOSTLY RESOLVED |
| **State Concurrency** | State-driven (§3) | ⚠️ Rules say "single mutation point" but no lock | Borderline 9.6 | 🔴 ATK-15: Race condition | — | 🔴 NEEDS FIX |
| **Context Overflow** | Not mentioned | ❌ Not addressed | Not evaluated | 🔴 ATK-13: NEW CRITICAL | — | 🔴 NEEDS FIX |
| **Onboarding UX** | §4: Guided flow | ⚠️ Flow exists but no UI spec | Not evaluated | — | 🔴 4.1/10 average | 🔴 NEEDS DESIGN |
| **Settings/Preferences** | §4: "change providers later" | ❌ No flow, no UI | 🔴 Missing Flow §7.7-§7.9 | — | 🔴 1.0/10 — Completely missing | 🔴 CRITICAL GAP |
| **Email/External Tools** | §15: Tools are first-class | ❌ No email tool in any MVP | — | — | 🔴 Cannot complete test task | 🟡 DESIGN DECISION |
| **DB Setup Barrier** | §22: PostgreSQL | ⚠️ Assumes pre-installed | Not evaluated | — | 🔴 3.5/10 — Major barrier | 🔴 NEEDS ALTERNATIVE |
| **MODERATE Adversarial (8-12)** | Various | ❌ Unaddressed | Not evaluated | 🔴 0/10 remediation | — | 🟡 TECH DEBT |
| **Audit Integrity** | §5: Audit logging | ⚠️ Append-only rule | — | 🔴 ATK-09,16: No integrity protection | — | 🟡 NEEDS FIX |
| **Extension Loading** | §41: Capability architecture | ⚠️ No signing | — | 🔴 ATK-10: Hijack possible | No install flow | 🟡 NEEDS FIX |
| **Tool Lifecycle States** | §18: 8-state lifecycle | ⚠️ 3 states in trust.py | 🔴 Three conflicting definitions | — | — | 🔴 RECONCILE |

---

## 2. Contradictions Between Documents

| # | Contradiction | Document A | Document B | Resolution Needed |
|---|---|---|---|---|
| C-1 | **Blocklist vs Allowlist** | Eris.md §7.3 L685-691 still describes a **blocklist** | Eris.md §5.5 + §12 says **allowlist** (per ATK-02 fix) | Update §7.3 to reflect allowlist decision |
| C-2 | **Tool lifecycle states** | Eris.md §5.5 `trust.py`: `UNTRUSTED → REGISTERED → AVAILABLE` | PRD §18: `GENERATED → UNTRUSTED → STATIC → DEPENDENCY → SECURITY → SANDBOX → FUNCTIONAL → POLICY → REGISTERED → AVAILABLE` | Define canonical 7-state lifecycle |
| C-3 | **PRD version** | Eris.md header says `PRD Version: 0.2` | Actual PRD says `Version: 0.1.0` | Eris.md header is wrong |
| C-4 | **Process model** | Eris.md §3.5: Single process for MVP 0-2 | Eris.md §4.1 architecture diagram shows UI ↔ API as separate layers | Clarify that in single-process mode, API is in-process |
| C-5 | **Provider change** | PRD §4 L161: "user must be able to change providers later" | Eris.md: NO flow or UI defined for provider change after onboarding | Add §7.7 Provider Change flow + Settings UI |

---

## 3. Agent Score Summary

| Agent | Focus Area | Score | Verdict |
|---|---|---|---|
| **Critic v2** | Architecture Quality | **9.73/10** | ✅ All sections ≥ 9.6 |
| **Adversarial v2** | Security Posture | **6.8/10** | 🔴 5 new vectors, 3 weak remediations |
| **UX Navigator** | User Experience | **4.4/10** | 🔴 Major gaps in onboarding, settings, task completion |

---

## 4. Priority Fix Categories

### P0 — Must fix before MVP 0 implementation

| # | Fix | Source | Impact |
|---|---|---|---|
| F-1 | Add `asyncio.Lock` to State Engine | Adversarial ATK-15 | Race conditions corrupt state |
| F-2 | Add context budget management (MAX_CONTEXT_TOKENS) | Adversarial ATK-13 | Security instructions ignored |
| F-3 | Add `sys.path` sanitization in tool sandbox | Adversarial ATK-14 | Complete allowlist bypass |
| F-4 | Resolve blocklist/allowlist contradiction in §7.3 | Critic C-1 | Conflicting security model |
| F-5 | Define canonical tool lifecycle (7 states) | Critic C-2 | Three conflicting definitions |
| F-6 | Use deterministic classifier for memory, not LLM | Adversarial ATK-03 | Memory poisoning |
| F-7 | Add suspicious pattern detector for prompt injection | Adversarial ATK-01/07 | Insufficient wrapper defense |

### P1 — Must fix before MVP 1 implementation

| # | Fix | Source | Impact |
|---|---|---|---|
| F-8 | Design Settings/Preferences screen & flow | UX Navigator Step 9 | Users cannot change anything |
| F-9 | Add onboarding wizard with progress indicators | UX Navigator Steps 1-6 | Poor first impression |
| F-10 | Add Docker Compose auto-setup for PostgreSQL | UX Navigator Step 2 | DB setup barrier |
| F-11 | Add back buttons to all onboarding steps | UX Navigator Step 4 | Users get stuck |
| F-12 | Define provider change flow (§7.7) | Critic + UX Navigator | PRD requirement unmet |
| F-13 | Add real-time progress indicators for agent processing | UX Navigator Step 7 | User sees nothing |
| F-14 | Define notification/toast system | UX Navigator Step 10 | No feedback |

### P2 — Should fix before MVP 2

| # | Fix | Source | Impact |
|---|---|---|---|
| F-15 | Add command palette (Ctrl+K) | UX Navigator | Power user expectation |
| F-16 | Add conversation history/management | UX Navigator | No chat persistence UI |
| F-17 | Address ATK-08,09,10,11,12 (MODERATE vectors) | Adversarial v1 | Unresolved tech debt |
| F-18 | Add extension installation flow (§7.8) | Critic v2 | No capability install UX |
| F-19 | Add error/retry path to architecture sequence diagram | Critic v2 | Only happy path shown |
| F-20 | Add typed confirmation for security-critical approvals | Adversarial ATK-17 | Qt signal injection |

---

## 5. Recommended Owner Decisions (Appendix B — All 10 Questions)

| # | Question | Recommended Decision | Rationale |
|---|---|---|---|
| Q1 | PostgreSQL setup | **Docker Compose** | Zero-friction, reproducible, includes pgvector. Add `scripts/setup.ps1` that runs `docker compose up -d` |
| Q2 | First provider adapter | **OpenAI-compatible** | Works with OpenAI, Ollama, LM Studio, vLLM, OpenRouter — one adapter covers 80% of users |
| Q3 | Owner auth MVP 0 | **Passphrase with Argon2id** | Simple to implement, strong hash. Store in DPAPI-protected keyring. Upgrade path to Windows Hello later. |
| Q4 | Wake word engine | **Defer to MVP 3** | Not needed for MVP 0-2. Evaluate Picovoice vs OpenWakeWord when voice work begins. |
| Q5 | Voice STT/TTS priority | **Cloud-first (Whisper API)** | Faster to implement, better accuracy. Add local fallback (whisper.cpp) in MVP 3.5. |
| Q6 | Dashboard scope MVP 0 | **Minimal status bar + Chat tab only** | Don't build 9 tabs in MVP 0. Add tabs incrementally per MVP. |
| Q7 | Git hosting | **GitHub (private repo)** | Standard, free for private repos, CI/CD ready. Migrate to self-hosted later if needed. |
| Q8 | Config format | **TOML** | Native in Python 3.11+ (`tomllib`), strict typing, human-readable. Already decided in Eris.md §9. |
| Q9 | Budget/cost tracking | **MVP 1** | Needed once providers are active. Simple token counter + per-session budget. |
| Q10 | Multi-user design | **Single-user initially** | Design interfaces for multi-user (user ID fields) but enforce single active session for MVP 0-2. |
