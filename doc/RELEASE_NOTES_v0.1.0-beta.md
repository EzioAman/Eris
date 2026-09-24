# ERIS v0.1.0-beta - Desktop Agentic Workspace

ERIS v0.1.0-beta introduces the desktop installer release for the ERIS AI Workspace, combining an Electron-based user interface with an integrated FastAPI and LangGraph backend.

---

## What's New

### 1. Unified Desktop Experience
- Packaged desktop application powered by Electron and a high-performance FastAPI core.
- Automatic backend lifecycle management: backend processes initialize on launch and cleanly shut down on app exit.
- Built-in Windows NSIS installer with customizable install directory and Desktop/Start Menu shortcuts.

### 2. Multi-Provider Model Matrix
- Support for leading LLM providers:
  - **Google Gemini** (Gemini 2.5 Flash, 2.5 Pro)
  - **Groq** (Llama 3.3 70B, Mixtral)
  - **DeepSeek** (DeepSeek-V3, DeepSeek-R1)
  - **OpenRouter** (Unified multi-provider access)
  - **Ollama** (Local self-hosted models)
- Real-time model switching directly from the top navigation bar.

### 3. Guided User Onboarding
- **New Accounts**: Streamlined 3-step setup:
  1. Profile personalization (display name and role selection).
  2. Model and API Key matrix configuration.
  3. Interactive system greeting and workspace transition.
- **Returning Accounts**: Direct fast-path to workspace with session-scoped API key entry to keep keys out of persistent build binaries.

### 4. Deterministic State Visualization
- Visual feedback indicators for assistant runtime states:
  - **Thinking**: Real-time reasoning and planning.
  - **Working**: Active tool execution, file reading, and task running.
  - **Success**: Task resolution and verified outputs.
  - **Alert / Error**: Network or API failure notices with actionable error messages.
  - **Idle / Sleep**: Standby and low-resource states.

### 5. Clean Distribution Packaging
- Automated build sanitizer (`scripts/sanitize_distribution.py`) ensures zero local SQLite databases, conversation memory, or personal `.env` credentials leak into public installer builds.

---

## System Requirements
- **Operating System**: Windows 10 or Windows 11 (64-bit)
- **Memory**: Minimum 4 GB RAM (8 GB recommended)
- **Network**: Internet connection for cloud LLM inference and authentication
- **Optional**: Local [Ollama](https://ollama.com/) instance for offline or local inference

---

## Installation Guide

1. Download **`ERIS Setup 0.1.0-beta.exe`** from the **Assets** section below.
2. Run the installer:
   - Choose your preferred installation directory.
   - Choose whether to create Desktop and Start Menu shortcuts.
3. Launch **ERIS** from your Desktop or Start Menu.
4. Sign in with Google or Email, enter your preferred API key (e.g. Gemini, Groq, or DeepSeek), and start building!

---

## Checksums & Assets
| File | Type | Description |
| :--- | :--- | :--- |
| `ERIS Setup 0.1.0-beta.exe` | Windows Installer | Complete Windows x64 setup executable |
