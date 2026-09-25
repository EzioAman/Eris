# Analysis & Resolution: Windows CP1252 / Charmap UnicodeEncodeError in PyInstaller Executable

> **Issue Reference**: Traceback in `launcher.py`, line 81 in `main`: `UnicodeEncodeError: 'charmap' codec can't encode character '\u2756' in position 0: character maps to <undefined>`.
> **Affected Environments**: Windows PCs with standard Western European / US locale code pages (`CP1252`, `CP437`) running ERIS as a frozen PyInstaller binary (`console=False`).

---

## 1. Verified Root Cause

1. **Character Code Point**:
   Line 81 of `launcher.py` executed:
   ```python
   print(f"❖ Launching ERIS Desktop Core on {url}...")
   ```
   The symbol `❖` is Unicode code point `U+2756` (BLACK DIAMOND MINUS WHITE X).

2. **Windows Code Page Mismatch**:
   On Windows installations in North America, Western Europe, and Latin America, standard console and system standard I/O streams default to code page **Windows-1252 (`CP1252`)**.
   - `CP1252` is a single-byte encoding (256 characters) comprising standard ASCII and Latin-1 supplement characters.
   - Character `U+2756` does not exist in `CP1252` or `CP437`.

3. **PyInstaller `console=False` Behavior**:
   In `eris.spec`, the build configuration sets:
   ```python
   console=False  # Headless mode by default: no console window
   ```
   When a PyInstaller binary executes with `console=False`:
   - Windows creates a GUI subsystem process (`/SUBSYSTEM:WINDOWS`).
   - Python's standard output (`sys.stdout`) and error (`sys.stderr`) streams are initialized using the system's active ANSI code page (`encodings\cp1252.py`) with strict error handling (`errors='strict'`).
   - Any attempt to call `print()` or `sys.stdout.write()` with characters outside `CP1252` raises an immediate `UnicodeEncodeError`.

4. **Fatal Crash Path**:
   Because line 81 in `main()` was not guarded by a `try...except` block, the exception propagated to module root (`line 103, in <module>`), terminating ERIS immediately before Uvicorn or the desktop window could launch.

---

## 2. Hard-Verified Reproduction

In PowerShell with `$env:PYTHONIOENCODING="cp1252"`:
```powershell
$env:PYTHONIOENCODING="cp1252"; uv run python -c "print('\u2756')"
```
**Output**:
```
Traceback (most recent call last):
  File "<string>", line 1, in <module>
    print('\u2756')
  File "C:\Program Files\Python314\Lib\encodings\cp1252.py", line 19, in encode
    return codecs.charmap_encode(input,self.errors,encoding_table)[0]
UnicodeEncodeError: 'charmap' codec can't encode character '\u2756' in position 0: character maps to <undefined>
```
This precisely matches the user's error dialog.

---

## 3. Defense-in-Depth Solution & Graceful Exit Contract

To guarantee that ERIS never crashes on any client PC regardless of Windows locale, regional settings, or console mode:

### A. Early Stream Sanitization in `launcher.py`
At the absolute top of `launcher.py` (before any imports that might log or print):
1. Configure environment variables `PYTHONIOENCODING=utf-8` and `PYTHONUTF8=1`.
2. Reconfigure `sys.stdout` and `sys.stderr` to `utf-8` with `errors='replace'`.
3. Handle cases where `sys.stdout` or `sys.stderr` is `None` in GUI mode by redirecting to `open(os.devnull, 'w', encoding='utf-8')`.

```python
import os
import sys

os.environ.setdefault("PYTHONIOENCODING", "utf-8")
os.environ.setdefault("PYTHONUTF8", "1")

if sys.stdout is not None:
    try:
        sys.stdout.reconfigure(encoding="utf-8", errors="replace")
    except (AttributeError, Exception):
        pass
else:
    sys.stdout = open(os.devnull, "w", encoding="utf-8")

if sys.stderr is not None:
    try:
        sys.stderr.reconfigure(encoding="utf-8", errors="replace")
    except (AttributeError, Exception):
        pass
else:
    sys.stderr = open(os.devnull, "w", encoding="utf-8")
```

### B. ASCII-Safe Logging & Elimination of `❖`
Replace `print(f"❖ Launching...")` with standard ASCII indicators:
```python
print(f"[*] Launching ERIS Desktop Core on {url}...")
logger.info(f"Launching ERIS Desktop Core on {url}...")
```
ASCII characters (`<= 127`) are guaranteed to encode without error on every code page worldwide (CP1252, CP437, CP932, Shift-JIS, UTF-8, etc.).

### C. Top-Level Crash Logger
Wrap `main()` in a top-level crash handler so that if any unexpected error occurs, it is captured to `eris_startup_error.log` rather than popping up an unhelpful generic traceback box.

---

## 4. Secondary System-Wide Surface Audit

The character `❖` was also present in:
- `frontend/server.py` (line 496, 444)
- `backend/app/agent/langgraph_engine.py` (lines 32, 43, 73, 82, 92)
- `backend/app/agent/core_tools.py` (line 641)
- `backend/app/agent/subagent_personas.py` (line 116)

Replacing `❖` with standard ASCII prefixes (`[*]`, `[LangGraph]`, `[Agent]`) across these files prevents downstream runtime logging crashes on client machines.
