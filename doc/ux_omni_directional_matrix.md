# Eris Omni-Directional Model UX Architecture

## 1. The 11/10 Standard
The Deep UX Architect mandate requires zero cognitive friction, explicit discoverability, and graceful progressive disclosure.

### Why Flat Lists Fail (1/10 Score)
- Presenting 500+ models in a terminal select list forces extreme cognitive overload.
- Relying on hidden keyboard shortcuts (e.g. typing to filter) violates the discoverability principle.
- Users looking for specific capabilities (e.g. "Free Vision models") cannot filter efficiently.

### The Omni-Directional Model Matrix (11/10 Score)
The system presents a high-level wizard dashboard:
1. `🔍 [Search Models by Keyword]` - Direct, explicit search input with immediate results.
2. `⚡ [Filter by Capabilities]` - Multi-select checkboxes for Free, Vision, Audio, Coding, Reasoning.
3. `🌟 [Quick Pick: Curated Flagships]` - Immediate 1-click access to top verified models across free and paid tiers.
4. `📂 [Browse Catalogs by Provider]` - Clean progressive drilldown by provider (Gemini, Nvidia NIM, OpenRouter).
5. `💾 [Keep Current Model & Exit]` - Non-destructive return path.

## 2. Navigation & Safety
- Every sub-menu includes a `[← Back to Main Menu]` choice.
- Empty search results offer an immediate retry or exit path.
- Chosen models are persistently saved to `memory/memory.json` so the user is never prompted twice.
