import time
import logging
from pathlib import Path
from typing import Dict, Any, List, Optional
from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel

from backend.app.config import settings
from backend.app.services.discovery_service import DiscoveryService

logger = logging.getLogger("eris.api.tools")

router = APIRouter(prefix="/api/tools", tags=["Dynamic Tools System"])

# Builtin Antigravity tools
BUILTIN_TOOLS = [
    {
        "id": "view_file",
        "name": "VIEW_FILE",
        "filename": "builtin",
        "category": "Inspection",
        "severity": "SAFE",
        "approvalRequired": False,
        "description": "Read sliced file lines with 1-indexed bounds within workspace boundary.",
        "format": "[VIEW_FILE: <path> <start> <end>]",
        "status": "verified",
        "source": "builtin"
    },
    {
        "id": "list_dir",
        "name": "LIST_DIR",
        "filename": "builtin",
        "category": "Inspection",
        "severity": "SAFE",
        "approvalRequired": False,
        "description": "Index directory entries, sizes, and file types safely.",
        "format": "[LIST_DIR: <path>]",
        "status": "verified",
        "source": "builtin"
    },
    {
        "id": "grep_search",
        "name": "GREP_SEARCH",
        "filename": "builtin",
        "category": "Search",
        "severity": "SAFE",
        "approvalRequired": False,
        "description": "Fast regex search matching exact lines and patterns across code files.",
        "format": "[GREP_SEARCH: <pattern> <path>]",
        "status": "verified",
        "source": "builtin"
    },
    {
        "id": "search_web",
        "name": "SEARCH_WEB",
        "filename": "builtin",
        "category": "Network",
        "severity": "SAFE",
        "approvalRequired": False,
        "description": "Execute public web search query via DuckDuckGo lite parser.",
        "format": "[SEARCH_WEB: <query>]",
        "status": "verified",
        "source": "builtin"
    },
    {
        "id": "read_url_content",
        "name": "READ_URL_CONTENT",
        "filename": "builtin",
        "category": "Network",
        "severity": "SAFE",
        "approvalRequired": False,
        "description": "Fetch and parse public HTTP/HTTPS URL into clean Markdown text.",
        "format": "[SCRAPE_WEB: <url>]",
        "status": "verified",
        "source": "builtin"
    },
    {
        "id": "scratchpad",
        "name": "SCRATCHPAD",
        "filename": "builtin",
        "category": "Reasoning",
        "severity": "SAFE",
        "approvalRequired": False,
        "description": "Read/write persistent multi-turn reasoning notes during prompt chaining.",
        "format": "[SCRATCHPAD: read|write <notes>]",
        "status": "verified",
        "source": "builtin"
    },
    {
        "id": "git",
        "name": "GIT",
        "filename": "builtin",
        "category": "Version Control",
        "severity": "SAFE",
        "approvalRequired": False,
        "description": "Inspect status, diff, branches, commit logs safely without shell escalation.",
        "format": "[GIT: status|diff|log]",
        "status": "verified",
        "source": "builtin"
    },
    {
        "id": "write_file",
        "name": "WRITE_FILE",
        "filename": "builtin",
        "category": "Mutating",
        "severity": "MUTATING",
        "approvalRequired": False,
        "description": "Create or update files in workspace with AST validation and containment checks.",
        "format": "[WRITE_FILE: <path> <code>]",
        "status": "verified",
        "source": "builtin"
    },
    {
        "id": "manage_task",
        "name": "MANAGE_TASK",
        "filename": "builtin",
        "category": "Lifecycle",
        "severity": "SAFE",
        "approvalRequired": False,
        "description": "Inspect status, send input, or cancel running background tasks.",
        "format": "[MANAGE_TASK: list|status|kill <id>]",
        "status": "verified",
        "source": "builtin"
    },
    {
        "id": "run_command",
        "name": "RUN_COMMAND",
        "filename": "builtin",
        "category": "Shell Execution",
        "severity": "DANGEROUS",
        "approvalRequired": True,
        "description": "Execute sandboxed PowerShell commands with AST pattern guardrails.",
        "format": "[RUN_COMMAND: <command>]",
        "status": "verified",
        "source": "builtin"
    },
    {
        "id": "send_email",
        "name": "SEND_EMAIL",
        "filename": "builtin",
        "category": "Integration",
        "severity": "DANGEROUS",
        "approvalRequired": True,
        "description": "Dispatch alert emails via authenticated Google App Password SMTP.",
        "format": "[EMAIL: <to>|<subject>|<body>]",
        "status": "verified",
        "source": "builtin"
    },
    {
        "id": "spawn_agent",
        "name": "SPAWN_AGENT",
        "filename": "builtin",
        "category": "Autonomous Swarm",
        "severity": "DANGEROUS",
        "approvalRequired": True,
        "description": "Fork autonomous specialized subagents to divide complex audits in parallel.",
        "format": "[SPAWN_AGENT: <role>|<objective>]",
        "status": "verified",
        "source": "builtin"
    },
]

@router.get("")
async def list_tools():
    """
    Returns dynamically scanned tools from filesystem + builtin Antigravity tools.
    Zero hardcoding. Computes SHA256 hashes to flag external modifications.
    """
    scanned = DiscoveryService.scan_all_tools()
    all_tools = BUILTIN_TOOLS + scanned
    return {
        "ok": True,
        "count": len(all_tools),
        "builtin_count": len(BUILTIN_TOOLS),
        "scanned_count": len(scanned),
        "tools": all_tools,
    }

class VerifyToolRequest(BaseModel):
    tool_id: str

@router.post("/verify")
async def verify_tool_hash(payload: VerifyToolRequest):
    """
    Re-verifies SHA256 hash for a specific tool file against .tool_registry.json.
    """
    scanned = DiscoveryService.scan_all_tools()
    matched = next((t for t in scanned if t["id"] == payload.tool_id or t["name"] == payload.tool_id), None)
    if not matched:
        raise HTTPException(status_code=404, detail=f"Tool '{payload.tool_id}' not found in scanned tools.")
    
    return {
        "ok": True,
        "tool_id": matched["id"],
        "status": matched["status"],
        "current_hash": matched["current_hash"],
        "registered_hash": matched["registered_hash"],
    }
