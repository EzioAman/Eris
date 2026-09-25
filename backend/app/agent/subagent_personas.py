import os
import json
import logging
import asyncio
from pathlib import Path
try:
    from app.agent.llm_client import acompletion
except ImportError:
    from backend.app.agent.llm_client import acompletion
from backend.app.config import settings

logger = logging.getLogger("eris.agent.subagent_personas")

SUBAGENT_PERSONAS = {
    "coder": {
        "name": "Expert Senior Coder",
        "role": "CoderAgent",
        "description": "Claude-style deep reasoning, AST verification, test-driven validation, zero placeholder code.",
        "temperature": 0.2,
        "system_prompt": (
            "You are CoderAgent, an expert senior software architect and pair programmer operating under ERIS.\n"
            "Core Directives:\n"
            "1. Strictly adhere to doc/ai_slop.md: Never emit generic placeholders, unhandled exceptions, or fake mock functions.\n"
            "2. Think deeply and systematically before writing code. Formulate concrete implementation logic.\n"
            "3. Every snippet must be syntactically valid and production-ready."
        ),
    },
    "writer": {
        "name": "Imaginative Writer & Content Creator",
        "role": "ContentCreatorAgent",
        "description": "Engaging narrative resonance, vivid metaphoric range, zero generic corporate filler.",
        "temperature": 0.7,
        "system_prompt": (
            "You are ContentCreatorAgent, an imaginative writer and creative director operating under ERIS.\n"
            "Core Directives:\n"
            "1. Strictly adhere to doc/ai_slop.md: Zero AI slop, corporate buzzwords, or repetitive filler phrases.\n"
            "2. Write with authentic voice, original perspective, and compelling narrative craft.\n"
            "3. Ground all factual assertions in real-world sources."
        ),
    },
    "security": {
        "name": "Adversarial Security Auditor",
        "role": "SecurityAuditorAgent",
        "description": "Probes system boundaries, AST injection vectors, containment escape vulnerabilities.",
        "temperature": 0.1,
        "system_prompt": (
            "You are SecurityAuditorAgent, an adversarial penetration tester operating under ERIS.\n"
            "Core Directives:\n"
            "1. Proactively inspect code and shell calls for command injection, path traversal, or uncontained execution.\n"
            "2. Verify graceful exit behavior and defensive recovery paths.\n"
            "3. Provide concrete vulnerability remediation diffs."
        ),
    },
    "researcher": {
        "name": "Live Grounded Researcher",
        "role": "LiveResearcherAgent",
        "description": "Mandatory real-time web retrieval for official documentation, trends, news, and policies.",
        "temperature": 0.2,
        "system_prompt": (
            "You are LiveResearcherAgent, a grounded investigative research analyst operating under ERIS.\n"
            "Core Directives:\n"
            "1. Strictly adhere to doc/ai_slop.md: Every fact must be verifiable.\n"
            "2. Synthesize findings into structured markdown with source links and citations into doc/ folder.\n"
            "3. Reject outdated assumptions."
        ),
    },
}

class SubagentSwarmManager:
    """
    Elastic Parallel Subagent Swarm Manager.
    Allows unlimited concurrent subagents to be spawned without arbitrary artificial limits.
    """

    def __init__(self, workspace_path: Optional[Path] = None):
        self.workspace_path = workspace_path or settings.WORKSPACE_PATH
        self.spawn_dir = self.workspace_path / ".agent_spawn"
        self.spawn_dir.mkdir(parents=True, exist_ok=True)

    def init_persona_workspace(self, persona_key: str) -> Dict[str, Any]:
        """Initializes persona workspace template directory via /init command."""
        key = persona_key.strip().lower()
        persona = SUBAGENT_PERSONAS.get(key, SUBAGENT_PERSONAS["coder"])
        p_dir = self.spawn_dir / key
        p_dir.mkdir(parents=True, exist_ok=True)

        manifest = {
            "persona": key,
            "name": persona["name"],
            "role": persona["role"],
            "initialized_at": str(Path(__file__).stat().st_mtime),
            "anti_slop_enforced": True,
        }
        (p_dir / "agent_manifest.json").write_text(json.dumps(manifest, indent=2), encoding="utf-8")
        (p_dir / "scratchpad.md").write_text(f"# {persona['name']} Workspace\n\nActive reasoning scratchpad.\n", encoding="utf-8")
        return {"ok": True, "path": str(p_dir), "persona": persona["name"]}

    async def execute_subagent(
        self,
        role: str,
        objective: str,
        active_model: str,
        api_key: Optional[str] = None
    ) -> Dict[str, Any]:
        """Executes a single subagent with its specialized system prompt."""
        persona_key = "coder"
        r_lower = role.lower()
        if "writer" in r_lower or "creator" in r_lower or "content" in r_lower:
            persona_key = "writer"
        elif "security" in r_lower or "audit" in r_lower:
            persona_key = "security"
        elif "research" in r_lower or "doc" in r_lower:
            persona_key = "researcher"

        persona = SUBAGENT_PERSONAS[persona_key]
        logger.info(f"[Agent] Spawning elastic subagent [{persona['role']}] with model {active_model}...")

        messages = [
            {"role": "system", "content": persona["system_prompt"]},
            {"role": "user", "content": f"Objective: {objective}\n\nExecute thoroughly and report findings."}
        ]

        try:
            resp = await acompletion(
                model=active_model,
                messages=messages,
                temperature=persona["temperature"],
                max_tokens=1200,
                api_key=api_key,
                timeout=30,
            )
            content = resp.choices[0].message.content or ""
            return {"ok": True, "role": persona["role"], "report": content}
        except Exception as ex:
            logger.error(f"Subagent [{role}] failed: {ex}")
            return {"ok": False, "role": persona["role"], "error": str(ex)}

    async def spawn_elastic_swarm(
        self,
        subagent_specs: List[Dict[str, str]],
        active_model: str,
        api_key: Optional[str] = None
    ) -> List[Dict[str, Any]]:
        """Spawns an elastic swarm of parallel subagents concurrently without caps."""
        tasks = [
            self.execute_subagent(
                role=spec.get("role", "CoderAgent"),
                objective=spec.get("objective", "Inspect code"),
                active_model=active_model,
                api_key=api_key
            )
            for spec in subagent_specs
        ]
        return await asyncio.gather(*tasks)
