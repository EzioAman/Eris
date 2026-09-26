import os
import json
import logging
import asyncio
import time
import uuid
from pathlib import Path
from typing import Any, Dict, List, Optional, Union
from pydantic import BaseModel, Field

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
        "description": "Deep reasoning, AST verification, test-driven validation, zero placeholder code.",
        "temperature": 0.2,
        "system_prompt": (
            "You are CoderAgent, an expert senior software architect and pair programmer operating under ERIS.\n"
            "Core Directives:\n"
            "1. Strictly adhere to clean code: Never emit generic placeholders, unhandled exceptions, or fake mock functions.\n"
            "2. Think deeply and systematically before writing code. Formulate concrete implementation logic.\n"
            "3. Every snippet must be syntactically valid and production-ready."
        ),
    },
    "writer": {
        "name": "Imaginative Writer & Content Creator",
        "role": "ContentCreatorAgent",
        "description": "Clear technical documentation, concise human explanations, zero corporate filler.",
        "temperature": 0.7,
        "system_prompt": (
            "You are ContentCreatorAgent, a technical writer and documentation specialist operating under ERIS.\n"
            "Core Directives:\n"
            "1. Zero corporate buzzwords or repetitive filler phrases.\n"
            "2. Write with direct human clarity, original perspective, and precision.\n"
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
            "1. Every fact must be verifiable against official documentation.\n"
            "2. Synthesize findings into structured markdown with source links and citations into doc/ folder.\n"
            "3. Reject outdated assumptions."
        ),
    },
    "tester": {
        "name": "Quality Assurance Tester",
        "role": "TesterAgent",
        "description": "Edge-case fuzzing, automated test generation, contract validation.",
        "temperature": 0.15,
        "system_prompt": (
            "You are TesterAgent, a quality assurance and test automation engineer operating under ERIS.\n"
            "Core Directives:\n"
            "1. Generate thorough unit and integration test suites covering edge cases and error states.\n"
            "2. Ensure graceful handling of unexpected input without unhandled crashes.\n"
            "3. Validate contracts and input schemas strictly."
        ),
    },
    "optimizer": {
        "name": "Performance & Async Optimizer",
        "role": "OptimizerAgent",
        "description": "Profiles async latency, concurrency, memory footprint, and network overhead.",
        "temperature": 0.2,
        "system_prompt": (
            "You are OptimizerAgent, a systems performance engineer operating under ERIS.\n"
            "Core Directives:\n"
            "1. Optimize async execution flows, eliminate bottlenecks and redundant synchronous blocking.\n"
            "2. Maximize throughput with sensible caching and non-blocking I/O.\n"
            "3. Profile memory allocations and streamline resource lifecycle."
        ),
    },
}


class SubagentTaskSpec(BaseModel):
    id: str = Field(default_factory=lambda: f"task_{uuid.uuid4().hex[:8]}")
    role: str = Field(default="coder", description="Persona archetype or custom role name")
    objective: str = Field(description="Concrete goal for this subagent")
    depends_on: List[str] = Field(default_factory=list, description="IDs or roles of tasks that must complete before this agent executes")
    inputs: Dict[str, Any] = Field(default_factory=dict, description="Contextual parameters or configurations")


class SubagentTaskResult(BaseModel):
    id: str
    role: str
    objective: str
    status: str = "pending"  # pending, waiting_for_deps, running, completed, failed
    report: Optional[str] = None
    prerequisite_context: Optional[str] = None
    error: Optional[str] = None
    duration_seconds: float = 0.0


class SubagentSwarmManager:
    """
    Elastic Parallel Subagent Swarm Manager with Async DAG Dependency Orchestration.
    Executes independent subagents in parallel concurrently, and coordinates dependent
    subagents to wait for prerequisite actions before firing with upstream context.
    """

    def __init__(self, workspace_path: Optional[Path] = None):
        self.workspace_path = workspace_path or settings.WORKSPACE_PATH
        self.spawn_dir = self.workspace_path / ".agent_spawn"
        self.spawn_dir.mkdir(parents=True, exist_ok=True)

    def _resolve_persona(self, role: str) -> Dict[str, Any]:
        """Resolves persona configuration from role string or default."""
        r_lower = role.lower()
        for key, p in SUBAGENT_PERSONAS.items():
            if key in r_lower or p["role"].lower() in r_lower:
                return p

        # Fallback custom persona
        return {
            "name": f"Specialized {role.title()} Agent",
            "role": role if "agent" in r_lower else f"{role}Agent",
            "temperature": 0.2,
            "system_prompt": (
                f"You are {role}, an autonomous specialized worker operating under ERIS.\n"
                f"Execute the assigned objective thoroughly, professionally, and report verified conclusions."
            ),
        }

    async def execute_subagent(
        self,
        role: str,
        objective: str,
        active_model: str,
        api_key: Optional[str] = None,
        prerequisite_context: Optional[str] = None,
    ) -> Dict[str, Any]:
        """Executes a single subagent with its specialized system prompt and optional upstream context."""
        persona = self._resolve_persona(role)
        logger.info(f"[AgentSwarm] Running subagent [{persona['role']}] with model {active_model}...")

        user_content = f"Objective: {objective}"
        if prerequisite_context:
            user_content = (
                f"### Context from Completed Prerequisite Actions:\n"
                f"{prerequisite_context}\n\n"
                f"### Your Assigned Objective:\n"
                f"{objective}\n\n"
                f"Synthesize the prerequisite findings and execute your objective thoroughly."
            )

        messages = [
            {"role": "system", "content": persona["system_prompt"]},
            {"role": "user", "content": user_content}
        ]

        t0 = time.time()
        try:
            resp = await acompletion(
                model=active_model,
                messages=messages,
                temperature=persona["temperature"],
                max_tokens=3500,
                api_key=api_key,
                timeout=45,
            )
            content = resp.choices[0].message.content or ""
            duration = round(time.time() - t0, 2)
            return {
                "ok": True,
                "role": persona["role"],
                "report": content,
                "duration_seconds": duration,
            }
        except Exception as ex:
            duration = round(time.time() - t0, 2)
            logger.error(f"Subagent [{role}] failed: {ex}")
            return {
                "ok": False,
                "role": persona["role"],
                "error": str(ex),
                "duration_seconds": duration,
            }

    async def spawn_dag_swarm(
        self,
        subagent_specs: List[Union[Dict[str, Any], SubagentTaskSpec]],
        active_model: str,
        api_key: Optional[str] = None,
    ) -> List[Dict[str, Any]]:
        """
        Executes an asynchronous dependency graph (DAG) of subagents.
        - Independent tasks fire concurrently in parallel immediately.
        - Dependent tasks wait asynchronously for prerequisite tasks to complete,
          receive upstream reports as context, and then execute.
        """
        # 1. Normalize specifications
        tasks: List[SubagentTaskSpec] = []
        for i, s in enumerate(subagent_specs):
            if isinstance(s, SubagentTaskSpec):
                tasks.append(s)
            elif isinstance(s, dict):
                tasks.append(
                    SubagentTaskSpec(
                        id=s.get("id") or f"task_{i+1}_{s.get('role', 'worker').lower()}",
                        role=s.get("role", "coder"),
                        objective=s.get("objective", "Execute subtask"),
                        depends_on=s.get("depends_on", []),
                        inputs=s.get("inputs", {}),
                    )
                )

        # 2. Setup dependency graph tracking
        task_map: Dict[str, SubagentTaskSpec] = {t.id: t for t in tasks}
        # Also map role names to task IDs for convenience (e.g. depends_on: ["researcher"])
        role_to_id: Dict[str, str] = {t.role.lower(): t.id for t in tasks}

        events: Dict[str, asyncio.Event] = {t.id: asyncio.Event() for t in tasks}
        results: Dict[str, SubagentTaskResult] = {
            t.id: SubagentTaskResult(id=t.id, role=t.role, objective=t.objective)
            for t in tasks
        }

        async def _run_task(task: SubagentTaskSpec) -> None:
            # Check dependencies
            dep_ids = []
            for dep in task.depends_on:
                if dep in task_map:
                    dep_ids.append(dep)
                elif dep.lower() in role_to_id:
                    dep_ids.append(role_to_id[dep.lower()])

            if dep_ids:
                results[task.id].status = "waiting_for_dependencies"
                logger.info(f"[AgentSwarm] Task [{task.id} - {task.role}] waiting for dependencies: {dep_ids}")
                # Asynchronously wait for all dependencies to complete
                await asyncio.gather(*(events[dep_id].wait() for dep_id in dep_ids))

            # Gather prerequisite outputs
            prereq_texts = []
            for dep_id in dep_ids:
                dep_res = results.get(dep_id)
                if dep_res and dep_res.report:
                    prereq_texts.append(f"[{dep_res.role} Report ({dep_id})]:\n{dep_res.report}")
                elif dep_res and dep_res.error:
                    prereq_texts.append(f"[{dep_res.role} Error ({dep_id})]:\n{dep_res.error}")

            prereq_context = "\n\n".join(prereq_texts) if prereq_texts else None
            results[task.id].prerequisite_context = prereq_context
            results[task.id].status = "running"

            # Execute
            res = await self.execute_subagent(
                role=task.role,
                objective=task.objective,
                active_model=active_model,
                api_key=api_key,
                prerequisite_context=prereq_context,
            )

            if res.get("ok"):
                results[task.id].status = "completed"
                results[task.id].report = res.get("report")
            else:
                results[task.id].status = "failed"
                results[task.id].error = res.get("error")

            results[task.id].duration_seconds = res.get("duration_seconds", 0.0)
            # Signal completion to downstream tasks
            events[task.id].set()

        # Launch all tasks concurrently into the async event loop
        async_tasks = [asyncio.create_task(_run_task(t)) for t in tasks]
        await asyncio.gather(*async_tasks)

        return [results[t.id].model_dump() for t in tasks]

    async def spawn_elastic_swarm(
        self,
        subagent_specs: List[Dict[str, str]],
        active_model: str,
        api_key: Optional[str] = None
    ) -> List[Dict[str, Any]]:
        """Backwards-compatible swarm spawn delegating to DAG orchestration engine."""
        return await self.spawn_dag_swarm(
            subagent_specs=subagent_specs,
            active_model=active_model,
            api_key=api_key,
        )


swarm_manager = SubagentSwarmManager()
