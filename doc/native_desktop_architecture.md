# Native Desktop Architecture (Electron + Embedded Backend)

## 1. Executive Overview
ERIS is packaged as a native Windows desktop application combining:
1. **Frontend Presentation Tier**: Electron 44 (Chromium runtime) hosting the full React 19 + Vite interface with Three.js shaders, custom Framer Motion spring physics, and zero-compromise visual fidelity.
2. **Backend Engine Tier**: High-performance compiled PyInstaller binary (`ERIS.exe`) hosting FastAPI, Uvicorn, LangGraph cyclic state graph, LiteLLM, and the autonomous human learning system.

---

## 2. Process Supervision & Lifecycle

```
[User Launches ERIS.exe (Electron)]
         │
         ├── Checks Single Instance Lock (requestSingleInstanceLock)
         │     └── If second instance detected -> Focus existing window and quit duplicate
         │
         ├── Spawns Background Service (resources/backend/ERIS.exe)
         │     ├── Set CWD to backend directory
         │     ├── Inherits environment variables (.env / API keys)
         │     ├── Streams logs to backend.log
         │     └── Hidden window flags (windowsHide: true)
         │
         ├── Health Check Poller (waitForBackend)
         │     ├── Polls http://127.0.0.1:5174/api/system/check-env
         │     └── Retries up to 40 attempts with 500ms intervals
         │
         ├── Creates Frameless Window
         │     ├── Custom titlebar with minimize, maximize, and close controls
         │     ├── Draggable app region (-webkit-app-region: drag)
         │     └── Sandboxed preload script (contextIsolation: true)
         │
         ├── System Tray & Global Hotkey
         │     ├── Tray icon with "Open ERIS" and "Quit ERIS" menu
         │     └── Global shortcut: Ctrl+Shift+E (toggles window visibility)
         │
         └── Graceful Shutdown (app.on('will-quit'))
               ├── Unregisters global shortcuts
               └── Kills backend process tree cleanly via taskkill /pid <PID> /T /F
```

---

## 3. Security & Sandboxing Architecture

1. **Context Isolation**: `contextIsolation: true` prevents renderer JavaScript from accessing Node.js internal modules or filesystem directly.
2. **Sandbox Mode**: `sandbox: true` runs renderer processes within standard Chromium security sandboxes.
3. **External Links**: `setWindowOpenHandler` routes all outbound links (`http://`, `https://`) to the user's default OS web browser via `shell.openExternal`, blocking malicious in-app navigation.
4. **Single-Origin IPC**: Only explicitly defined control commands (`window-minimize`, `window-maximize`, `window-close`, `window-is-maximized`) are allowed across the IPC bridge in `preload.cjs`.

---

## 4. Packaging & Directory Layout

```
dist-electron/win-unpacked/
├── ERIS.exe                          <-- Native Electron Desktop Entrypoint
├── chrome_100_percent.pak
├── d3dcompiler_47.dll
├── ffmpeg.dll
├── resources/
│   ├── app.asar                      <-- Compiled Vite UI & Electron Main/Preload scripts
│   └── backend/                      <-- Embedded PyInstaller Backend Runtime
│       ├── ERIS.exe                  <-- FastAPI + LangGraph cyclic engine
│       ├── .env                      <-- Local environment configuration
│       ├── memory/                   <-- Local SQLite DB and user_habits.json
│       ├── _internal/                <-- Python shared libraries and C-extensions
│       └── backend.log               <-- Real-time backend stdout/stderr log
```

---

## 5. Hotkeys & Window Management
- **Minimize**: Hides window to taskbar or system tray.
- **Maximize / Restore**: Toggles maximized state with icon updates.
- **Close**: Hides to system tray (preserves active agent operations and memory in background).
- **Quit**: Accessible via Tray menu ("Quit ERIS") or closing with exit intent, which kills all child backend processes cleanly.
- **Global Toggle**: `Ctrl+Shift+E` brings ERIS into focus or hides it instantly from any desktop application.
