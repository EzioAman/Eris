# Comprehensive Audit: Potential Startup Failure Modes on Other Client Windows PCs

> **Audit Context**: Investigation into why ERIS may fail to start or crash on different client Windows machines (clean installs, corporate/domain PCs, multi-user systems, low-spec hardware).
> **Verification Standard**: Tested against real Windows subsystems, standard user permissions, socket layers, and Electron/PyInstaller execution contracts.

---

## 1. Summary of Identified Startup Risks

| # | Risk Category | Severity | Failure Mechanism | Observed / Potential Impact | Status |
|---|---|---|---|---|---|
| **1** | **Permission Denied in `Program Files`** | **CRITICAL** | If installed to `C:\Program Files\ERIS`, standard users lack write permissions. `memory/` creation throws `PermissionError`. | Backend crashes immediately on startup. | **Fix Ready** |
| **2** | **Silent Hang in Electron (Invisible Window)** | **HIGH** | `mainWindow` created with `show: false`. If backend fails to start within 20s, no error dialog is shown; process hangs invisibly in Task Manager. | User clicks icon, nothing appears on screen. | **Fix Ready** |
| **3** | **Port 5174 Conflict / Bind Collision** | **HIGH** | If port 5174 is occupied (e.g., existing Vite server, zombie process), Uvicorn throws `[WinError 10048]`. | Backend fails to bind and aborts. | **Fix Ready** |
| **4** | **`sys.executable --version` Spawning Recursion** | **MEDIUM** | In frozen executable, `plugins.py` calls `subprocess.run([sys.executable, '--version'])`. Since `launcher.py` had no `--version` handler, it spawned a 2nd server instance. | Port collision and 5s timeout during sandbox check. | **Fix Ready** |
| **5** | **Missing `litellm` Offline Data Files** | **MEDIUM** | `model_prices_and_context_window.json` not bundled into PyInstaller `datas`. | Fails or hangs when offline without GitHub access. | **Fix Ready** |
| **6** | **Orphaned Zombie Backend on Force-Quit** | **MEDIUM** | If Electron is killed via Task Manager, `eris_backend.exe` may remain running, locking port 5174 on subsequent launch. | Subsequent app launch cannot bind port 5174. | **Fix Ready** |
| **7** | **Windows Defender SmartScreen Filter** | **LOW / UX** | Unsigned binary triggers Windows SmartScreen warning ("Windows protected your PC"). | User cannot launch without clicking "More info" -> "Run anyway". | **Documented** |

---

## 2. Deep Dive: Exact Failure Mechanisms & Technical Root Causes

### 1. Permission Denied in `Program Files` (`PermissionError: [Errno 13]`)
* **Root Cause**:
  In `backend/app/config.py`:
  ```python
  if getattr(sys, "frozen", False):
      exe_parents = list(Path(sys.executable).resolve().parents)
      if len(exe_parents) >= 3 and (exe_parents[1].name == "resources" or exe_parents[0].name == "backend"):
          WORKSPACE_DIR = exe_parents[2]  # e.g., C:\Program Files\ERIS
  ```
  And:
  ```python
  MEMORY_DIR: Path = WORKSPACE_DIR / "memory"
  FALLBACK_SQLITE_URL: str = f"sqlite+aiosqlite:///{WORKSPACE_DIR / 'memory' / 'auth.db'}"
  ```
* **Why it fails on other PCs**:
  On Windows, standard user accounts **do not have write permissions** to `C:\Program Files` or `C:\Program Files (x86)`.
  When `db_manager.initialize()` executes:
  ```python
  settings.MEMORY_DIR.mkdir(parents=True, exist_ok=True)
  ```
  Windows raises `PermissionError: [Errno 13] Permission denied: 'C:\\Program Files\\ERIS\\memory'`.
  FastAPI's lifespan crashes, terminating the process immediately.
* **Solution**:
  Detect whether `WORKSPACE_DIR` is writable. If not (or when running as a packaged app in a protected directory), automatically redirect runtime mutable data (`memory/`, `auth.db`, logs) to `%LOCALAPPDATA%\ERIS\memory` (or `%APPDATA%\ERIS\memory`).

---

### 2. Silent Hang & Invisible Process in Electron
* **Root Cause**:
  In `frontend/electron/main.cjs`:
  ```javascript
  mainWindow = new BrowserWindow({
      show: false, // Keep hidden until backend & layout settle
      ...
  });

  const loadApp = async () => {
      const isReady = await waitForBackend(40);
      if (isReady && mainWindow && !mainWindow.isDestroyed()) {
          await mainWindow.loadURL(BACKEND_URL);
      }
  };
  ```
* **Why it fails on other PCs**:
  If the backend fails to start for ANY reason (port collision, permission error, missing DLL):
  1. `waitForBackend(40)` returns `false`.
  2. Because there is no `else` block, `mainWindow.loadURL()` is never called.
  3. Chromium never emits `ready-to-show`, and `mainWindow.show()` is never triggered.
  4. Electron displays **nothing on screen**, shows no error dialog, and leaves a dead process in Task Manager.
* **Solution**:
  Add an `else` branch in `loadApp()`. If backend fails to respond within the timeout, call `dialog.showErrorBox()` with diagnostic guidance (e.g. check logs, verify port 5174 availability), and cleanly exit `app.quit()`.

---

### 3. Port 5174 Conflict / Bind Collision (`[WinError 10048]`)
* **Root Cause**:
  Uvicorn is hardcoded to bind to `127.0.0.1:5174`.
  If another local application (e.g., another Vite dev server, a previous hung ERIS process) is listening on port 5174:
  ```powershell
  [WinError 10048] Only one usage of each socket address (protocol/network address/port) is normally permitted
  ```
* **Solution**:
  In `electron/main.cjs`:
  Before spawning the backend, perform a socket probe. If port 5174 is occupied by an unresponsive or foreign process, attempt to clean up orphaned `eris_backend.exe` processes or notify the user immediately.

---

### 4. `sys.executable --version` Recursion in Plugins
* **Root Cause**:
  In `backend/app/api/plugins.py`:
  ```python
  res = subprocess.run([sys.executable, "--version"], capture_output=True, timeout=5)
  ```
  When frozen, `sys.executable` points to `eris_backend.exe`, not `python.exe`.
  Previously, `launcher.py` did not check for `--version`, so executing `eris_backend.exe --version` spawned a second instance of the entire Uvicorn server, resulting in a port collision.
* **Solution**:
  Add an early check in `launcher.py`:
  ```python
  if "--version" in sys.argv or "-v" in sys.argv:
      print(f"ERIS Core v3.1.0 (Python {sys.version.split()[0]})")
      sys.exit(0)
  ```

---

### 5. Missing `litellm` Offline Data Files in `eris.spec`
* **Root Cause**:
  `eris.spec` collected data files for `cryptography`, `langchain_core`, `langgraph`, and `fastapi`, but not `litellm`.
  `litellm` relies on bundled JSON files (`model_prices_and_context_window.json`). When running on a machine without active internet or behind an enterprise proxy, missing data files trigger warnings or fail model initialization.
* **Solution**:
  Add `"litellm"` to `collect_data_files` in `eris.spec`.

---

## 3. Recommended Implementation Plan

1. **Robust LocalAppData Fallback for Memory & Database**:
   Update `backend/app/config.py` to test write access to `WORKSPACE_DIR / "memory"`. If write-protected (e.g. `Program Files`), fallback to `Path(os.environ.get("LOCALAPPDATA", Path.home())) / "ERIS" / "memory"`.
2. **Explicit Startup Error Reporting in Electron**:
   Update `frontend/electron/main.cjs` to display a native error dialog with diagnostic instructions if the backend fails to respond within the timeout, rather than hanging silently.
3. **Add `--version` Handling to `launcher.py`**:
   Instantly return version and exit 0 to prevent subprocess recursion in sandbox tests.
4. **Bundle `litellm` Data Files in `eris.spec`**:
   Add `litellm` to `datas.extend(collect_data_files("litellm"))`.
