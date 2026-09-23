# Specification: UntitledUI Components & MagicUI Integration

> Documented for ERIS Dashboard & Provider Catalog Integration  
> Adhering to `doc/ai_slop.md` guidelines: high signal-to-noise ratio, zero fake metrics, deterministic state, intentional typography.

---

## 1. MagicUI Animated Circular Progress Bar (Token Telemetry)
- **Source**: [MagicUI Animated Circular Progress Bar](https://magicui.design/docs/components/animated-circular-progress-bar)
- **Purpose**: Replaces hardcoded mock token metrics with real live context telemetry (LM Studio style).
- **Core Component Props**:
  - `value`: Current context percentage consumed (`usedTokens / contextWindow * 100`)
  - `min`: 0, `max`: 100
  - `gaugePrimaryColor`: `#3B82F6` (accent blue) or `#F59E0B` (warning if > 80%)
  - `gaugeSecondaryColor`: `rgba(255,255,255,0.08)` (dark) / `rgba(0,0,0,0.06)` (light)
- **Hover Popover Breakdown**:
  - Hovering on the gauge displays an informative floating card revealing:
    - Current Model ID & Provider (e.g. `Gemini 3.5 Flash`, `OpenRouter`)
    - Used Tokens: Live estimated tokens in active conversation buffer
    - Max Context Window: Real context limit configured in `ModelConfig`
    - Free Remaining Tokens
    - Real-time percentage indicator

---

## 2. Backend Model Provider Testing Harness (`backend/testing/`)
- **Source**: Extracted and fortified from `eris_cli.py` (`fetch_models`, `get_api_key_for_model`).
- **Path**: `backend/testing/test_model_providers.py`
- **Capabilities Extracted**:
  - **Gemini API**: Queries `https://generativelanguage.googleapis.com/v1beta/models`, verifies `generateContent`, inspects vision, audio, coding, and free tier status.
  - **Nvidia NIM API**: Queries `https://integrate.api.nvidia.com/v1/models`, detects reasoning (`r1`, `deepseek`), coding (`devstral`, `coder`), vision (`paligemma`, `neva`).
  - **OpenRouter API**: Queries `https://openrouter.ai/api/v1/models`, analyzes `architecture.input_modalities`, pricing per prompt/completion, and reasoning flags.
- **Safety & Exploit Prevention**:
  - Guardrails on timeouts (5s max).
  - Sanitization of returned model strings.
  - Zero leakage of raw API keys in serialized outputs.

---

## 3. UntitledUI Components Portfolio

### 3.1 Tags (`ui_templates/TagsTemplate.tsx`)
- **Reference**: `https://www.untitledui.com/react/components/tags`
- **Variants**: `gray`, `brand` (blue), `success` (green), `warning` (amber), `error` (rose), `purple`.
- **Features**: Status dot, leading icon, removable close cross, small/medium sizes.
- **Usage**: Used across the model provider catalog for badges (`Free`, `Thinking`, `Vision`, `Audio`, `Coding`).

### 3.2 File Uploaders (`ui_templates/FileUploadTemplate.tsx`)
- **Reference**: `https://www.untitledui.com/react/components/file-uploaders`
- **Features**:
  - Drag-and-drop dashed dropzone with upload cloud icon.
  - Supported format & max file size indicators.
  - Active file upload queue with file name, byte size, progress bar, success checkmark, and delete action.
- **Wiring**: Connected to `ChatInputBar.tsx` "Attach" button.

### 3.3 Filter Bars (`ui_templates/FilterBarTemplate.tsx`)
- **Reference**: `https://www.untitledui.com/react/components/filter-bars`
- **Features**:
  - Unified search input.
  - Dropdown filter selectors: Provider, Capability (Thinking, Vision, etc.), Pricing (Free vs Paid).
  - Active filter badges with one-click removal and "Clear all" button.
- **Wiring**: Integrated into the Model Provider Catalog view.

### 3.4 Code Snippets (`ui_templates/CodeSnippetTemplate.tsx`)
- **Reference**: `https://www.untitledui.com/react/components/code-snippets`
- **Features**:
  - Styled dark/light code block with monospace font and line numbers.
  - Language indicator badge.
  - One-click "Copy Code" button with animated checkmark feedback.

### 3.5 Command Menus (`ui_templates/CommandMenuTemplate.tsx`)
- **Reference**: `https://www.untitledui.com/react/components/command-menus`
- **Features**:
  - Hidden modal accessible via `Ctrl+Shift+K` or Menubar `Tools` menu.
  - Keyboard navigable search across Workflows, Connectors, Chat history, and Settings.
  - **Constraint**: Zero copied branding or logos; strictly functional command palette.

### 3.6 Notifications (`ui_templates/NotificationTemplate.tsx`)
- **Reference**: `https://www.untitledui.com/react/components/notifications`
- **Features**: Toast & banner notifications with severity colors (`info`, `success`, `warning`, `error`), dismiss action, and optional CTA button.

### 3.7 Progress Steps (`ui_templates/ProgressStepsTemplate.tsx`)
- **Reference**: `https://www.untitledui.com/react/components/progress-steps`
- **Features**: Multi-step numbered/icon indicators with connector lines, completed/current/upcoming states. For use in onboarding and workflow execution stages.

### 3.8 Tables (`ui_templates/TableTemplate.tsx`)
- **Reference**: `https://www.untitledui.com/react/components/tables`
- **Features**:
  - Clean column headers with sort indicators.
  - Row selection checkboxes.
  - Cells supporting UntitledUI Tags for capabilities.
  - Pagination controls (Previous, Next, Page Numbers).
- **Wiring**: Displays the live API key model provider catalog.
