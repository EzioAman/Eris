import os
import re
import json
import hashlib
import logging
from pathlib import Path
from typing import Dict, Any, List, Optional
from backend.app.config import settings

logger = logging.getLogger("eris.services.discovery")

class DiscoveryService:
    """
    Dynamic Filesystem Discovery Service for ERIS Tools & Plugins.
    Scans tools/ and plugins/ folders without relying on hardcoded capability strings.
    Computes real-time SHA256 integrity hashes to detect any external code tampering.
    """

    @classmethod
    def calculate_sha256(cls, file_path: Path) -> str:
        """Calculates SHA256 hex digest for a file."""
        hasher = hashlib.sha256()
        try:
            with open(file_path, "rb") as f:
                for chunk in iter(lambda: f.read(65536), b""):
                    hasher.update(chunk)
            return hasher.hexdigest()
        except Exception as ex:
            logger.error(f"Error calculating hash for {file_path}: {ex}")
            return ""

    @classmethod
    def scan_all_tools(cls) -> List[Dict[str, Any]]:
        """
        Dynamically scans workspace tools/ and backend/tools/ directories.
        Extracts docstrings, function signatures, severity tiers, and SHA256 verification status.
        """
        scanned_tools: List[Dict[str, Any]] = []
        visited_names = set()

        search_dirs = [
            settings.WORKSPACE_PATH / "tools",
            settings.WORKSPACE_PATH / "backend" / "tools",
        ]

        for tools_dir in search_dirs:
            if not tools_dir.exists():
                continue

            registry_file = tools_dir / ".tool_registry.json"
            registry_data: Dict[str, Any] = {}
            if registry_file.exists():
                try:
                    with open(registry_file, "r", encoding="utf-8") as rf:
                        registry_data = json.load(rf)
                except Exception as ex:
                    logger.warning(f"Failed to read registry at {registry_file}: {ex}")

            for f in sorted(tools_dir.iterdir()):
                if f.is_file() and f.suffix == ".py" and not f.name.startswith((".", "_")):
                    tool_id = f.stem
                    if tool_id in visited_names:
                        continue
                    visited_names.add(tool_id)

                    current_hash = cls.calculate_sha256(f)
                    reg_entry = registry_data.get(f.name, {})
                    registered_hash = reg_entry.get("hash", "")
                    
                    is_verified = bool(registered_hash and current_hash == registered_hash)
                    is_modified_externally = bool(registered_hash and current_hash != registered_hash)
                    status = "verified" if is_verified else ("modified_externally" if is_modified_externally else "unregistered")

                    # Extract docstring and parameters from Python source
                    docstring = ""
                    try:
                        content = f.read_text(encoding="utf-8", errors="ignore")
                        match = re.search(r'"""(.*?)"""', content, re.DOTALL)
                        if match:
                            docstring = match.group(1).strip()
                    except Exception:
                        pass

                    if not docstring:
                        docstring = f"Dynamic executable tool {tool_id} (scanned from filesystem)."

                    # Infer severity tier
                    severity = "SAFE"
                    content_lower = content.lower() if 'content' in locals() else ""
                    if any(k in content_lower for k in ("subprocess", "os.system", "rmdir", "delete", "remove", "socket", "smtp")):
                        severity = "DANGEROUS"
                    elif any(k in content_lower for k in ("write", "open(", "mkdir", "create")):
                        severity = "MUTATING"

                    scanned_tools.append({
                        "id": tool_id,
                        "name": f.stem,
                        "filename": f.name,
                        "path": str(f.relative_to(settings.WORKSPACE_PATH)),
                        "description": docstring,
                        "severity": severity,
                        "approvalRequired": severity == "DANGEROUS",
                        "status": status,
                        "current_hash": current_hash,
                        "registered_hash": registered_hash,
                        "last_tested": reg_entry.get("last_tested"),
                        "source": "filesystem_scan"
                    })

        return scanned_tools

    @classmethod
    def scan_all_plugins(cls) -> List[Dict[str, Any]]:
        """
        Dynamically discovers all active and registered plugins.
        """
        try:
            from backend.app.api.plugins import PLUGINS_REGISTRY
            plugins = []
            for pid, p in PLUGINS_REGISTRY.items():
                plugins.append({
                    "id": p["id"],
                    "name": p["name"],
                    "usage": p["usage"],
                    "tools": p.get("tools", []),
                    "dependency": p.get("dependency", False),
                    "dependency_prompt": p.get("dependency_prompt"),
                    "config_fields": p.get("config_fields", []),
                    "is_enabled": p.get("is_enabled", True),
                    "is_configured": p.get("is_configured", True),
                    "last_tested_at": p.get("last_tested_at"),
                })
            return plugins
        except Exception as ex:
            logger.error(f"Error scanning plugins: {ex}")
            return []
