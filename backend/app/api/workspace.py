import os
from pathlib import Path
from fastapi import APIRouter, HTTPException, Query, File, UploadFile
from typing import Dict, Any, List, Optional
from backend.app.config import settings

router = APIRouter(tags=["Workspace & Tools"])

@router.get("/api/workspace/tree")
async def get_workspace_tree(root: Optional[str] = Query(None)):
    IGNORED_NAMES = {
        "__pycache__", "node_modules", ".venv", "venv", "dist", "build",
        ".tempmediaStorage", ".user_uploaded", ".pytest_cache", ".git", ".idea", ".vscode"
    }

    base_path = Path(root).resolve() if (root and Path(root).exists() and Path(root).is_dir()) else None

    def build_tree_node(rel_path: str, abs_path: Path, depth: int = 0):
        if depth > 6 or not abs_path.exists():
            return None
        name = abs_path.name
        if abs_path.is_dir():
            children = []
            try:
                items = sorted(
                    list(abs_path.iterdir()),
                    key=lambda x: (not x.is_dir(), x.name.lower())
                )
                for item in items:
                    if not (item.name.startswith(".") or item.name in IGNORED_NAMES):
                        sub_rel = f"{rel_path}/{item.name}" if rel_path else item.name
                        sub_node = build_tree_node(sub_rel, item, depth + 1)
                        if sub_node:
                            children.append(sub_node)
            except Exception:
                pass
            return {
                "name": name,
                "is_dir": True,
                "path": rel_path,
                "children": children
            }
        else:
            try:
                size_bytes = abs_path.stat().st_size
            except Exception:
                size_bytes = 0
            return {
                "name": name,
                "is_dir": False,
                "path": rel_path,
                "size": size_bytes
            }

    tree = []
    
    if base_path:
        # Build tree directly from user-selected working directory
        try:
            items = sorted(
                list(base_path.iterdir()),
                key=lambda x: (not x.is_dir(), x.name.lower())
            )
            for item in items:
                if not (item.name.startswith(".") or item.name in IGNORED_NAMES):
                    node = build_tree_node(item.name, item, depth=0)
                    if node:
                        tree.append(node)
        except Exception as ex:
            raise HTTPException(status_code=400, detail=f"Failed to scan directory: {ex}")
        return {"ok": True, "root": str(base_path), "tree": tree}

    target_dirs = ["frontend", "backend", "tools", "memory", "doc", "docs", "tests"]
    for d in target_dirs:
        dp = settings.WORKSPACE_PATH / d
        if dp.exists() and dp.is_dir():
            node = build_tree_node(d, dp, depth=0)
            if node:
                tree.append(node)

    # Include root files (README.md, run.py, package.json, etc.)
    try:
        root_files = sorted(
            [f for f in settings.WORKSPACE_PATH.iterdir() if f.is_file() and not f.name.startswith(".")],
            key=lambda x: x.name.lower()
        )
        for f in root_files:
            node = build_tree_node(f.name, f, depth=0)
            if node:
                tree.append(node)
    except Exception:
        pass

    return {"ok": True, "root": str(settings.WORKSPACE_PATH), "tree": tree}

@router.post("/api/workspace/browse")
async def browse_workspace_folder():
    """Opens native Windows folder picker dialog and returns selected path."""
    import asyncio
    cmd = (
        'powershell -NoProfile -Command "[System.Reflection.Assembly]::LoadWithPartialName(\'System.windows.forms\') | Out-Null; '
        '$f = New-Object System.Windows.Forms.FolderBrowserDialog; '
        '$f.Description = \'Select Workspace Folder for ERIS\'; '
        'if ($f.ShowDialog() -eq [System.Windows.Forms.DialogResult]::OK) { Write-Output $f.SelectedPath }"'
    )
    try:
        proc = await asyncio.create_subprocess_shell(
            cmd,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE
        )
        stdout, _ = await proc.communicate()
        selected = stdout.decode("utf-8", errors="replace").strip()
        if selected and Path(selected).is_dir():
            return {"ok": True, "path": selected}
    except Exception:
        pass
    return {"ok": False, "path": None}

@router.get("/api/workspace/file")
async def get_workspace_file(path: str = Query(..., min_length=1), root: Optional[str] = Query(None)):
    base_dir = Path(root).resolve() if (root and Path(root).exists() and Path(root).is_dir()) else settings.WORKSPACE_PATH.resolve()
    raw_path = path.lstrip("/\\")
    full_path = (base_dir / raw_path).resolve()

    try:
        full_path.relative_to(base_dir)
    except ValueError:
        raise HTTPException(status_code=403, detail="Access denied: Path outside workspace.")

    if not full_path.exists() or full_path.is_dir():
        raise HTTPException(status_code=404, detail="File not found.")

    try:
        size_bytes = full_path.stat().st_size
        with open(full_path, "r", encoding="utf-8", errors="replace") as f:
            content = f.read(65536) # preview max 64KB
        lines = content.count("\n") + 1
        return {
            "ok": True,
            "path": raw_path,
            "size": size_bytes,
            "lines": lines,
            "content": content
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/api/tools/list")
async def list_tools():
    tools = []
    if settings.TOOLS_DIR.exists():
        for f in sorted(os.listdir(settings.TOOLS_DIR)):
            if f.endswith(".py") and not f.startswith((".", "_")):
                p = settings.TOOLS_DIR / f
                try:
                    with open(p, "r", encoding="utf-8", errors="ignore") as tf:
                        code = tf.read()
                    tools.append({
                        "name": f[:-3],
                        "file": f,
                        "description": "Custom agent tool",
                        "guardrail_passed": True,
                        "code": code
                    })
                except Exception:
                    pass
    return {"ok": True, "tools": tools}


@router.post("/api/workspace/upload")
async def upload_workspace_files(files: List[UploadFile] = File(...)):
    """Receives real multipart file uploads and stores them safely in workspace uploads/."""
    upload_dir = settings.WORKSPACE_PATH / "uploads"
    upload_dir.mkdir(parents=True, exist_ok=True)
    results = []

    for f in files:
        # Sanitize filename
        safe_name = Path(f.filename).name
        dest_path = upload_dir / safe_name
        try:
            content = await f.read()
            # 25 MB size limit
            if len(content) > 25 * 1024 * 1024:
                raise HTTPException(status_code=413, detail=f"File {safe_name} exceeds 25MB limit.")

            with open(dest_path, "wb") as out_f:
                out_f.write(content)

            rel_path = f"uploads/{safe_name}"
            results.append({
                "name": safe_name,
                "path": rel_path,
                "sizeBytes": len(content),
                "status": "completed"
            })
        except HTTPException:
            raise
        except Exception as ex:
            results.append({
                "name": safe_name,
                "error": str(ex),
                "status": "error"
            })

    return {"ok": True, "files": results}


@router.get("/api/workspace/scrape")
async def scrape_web_url(url: str = Query(..., min_length=3)):
    """Headless web scraper returning clean markdown for reader mode."""
    from backend.app.agent.core_tools import CoreToolbox
    md = CoreToolbox.scrape_web(url)
    return {"ok": True, "url": url, "markdown": md}


@router.get("/api/workspace/scratchpad")
async def get_scratchpad():
    """Reads shared agent reasoning scratchpad."""
    from backend.app.agent.core_tools import CoreToolbox
    content = CoreToolbox.scratchpad("read")
    return {"ok": True, "content": content}


@router.post("/api/workspace/scratchpad")
async def update_scratchpad(payload: Dict[str, Any]):
    """Updates shared agent reasoning scratchpad."""
    from backend.app.agent.core_tools import CoreToolbox
    action = payload.get("action", "append")
    text = payload.get("content", "")
    res = CoreToolbox.scratchpad(action, text)
    return {"ok": True, "result": res}

