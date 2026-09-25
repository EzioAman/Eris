"""
Live Multi-Turn Conversation Evaluator & Latency Tracer.
Executes live agent turns through Eris LangGraph with TTFT, tool inspection,
episodic memory recall, and LangSmith telemetry reporting.
"""

import asyncio
import json
import logging
import sqlite3
import time
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field

from backend.app.agent.runner import runner
from backend.app.config import settings

logger = logging.getLogger("eris.evals.conversation_runner")


class ConversationTurnMetrics(BaseModel):
    turn: int = Field(description="Turn index (1-based)")
    input_message: str = Field(description="User input prompt")
    output_text: str = Field(description="Eris generated reply")
    actions_taken: List[Dict[str, Any]] = Field(default_factory=list, description="Tools invoked and results")
    thoughts: List[str] = Field(default_factory=list, description="Internal reasoning steps")
    ttft_ms: float = Field(description="Time to First Token (TTFT) in milliseconds")
    total_latency_ms: float = Field(description="Total execution latency in milliseconds")
    node_timings: Dict[str, float] = Field(default_factory=dict, description="Execution time per graph node in ms")
    sub_timings: Dict[str, float] = Field(default_factory=dict, description="Internal sub-timings (RAG, LLM completion) in ms")
    model_used: str = Field(description="Model identifier that executed the turn")
    langsmith_run_id: Optional[str] = Field(default=None, description="LangSmith trace Run ID if online")


class ConversationSessionResult(BaseModel):
    session_id: str = Field(description="Unique session/thread ID")
    user_id: str = Field(description="User identifier")
    model: str = Field(description="Primary model evaluated")
    turns: List[ConversationTurnMetrics] = Field(default_factory=list)
    langsmith_status: Dict[str, Any] = Field(default_factory=dict)
    summary: str = Field(default="")


async def execute_turn_with_telemetry(
    message: str,
    turn_index: int,
    session_id: str = "eval_session_aman",
    user_id: str = "aman",
    model: str = "gemini/gemini-3-flash-preview",
) -> ConversationTurnMetrics:
    """Executes a single conversational turn through Eris, recording TTFT, tools, and node timings."""
    start_time = time.perf_counter()
    first_token_time: Optional[float] = None

    actions: List[Dict[str, Any]] = []
    thoughts: List[str] = []
    node_timings: Dict[str, float] = {}
    sub_timings: Dict[str, float] = {}
    final_reply: str = ""
    active_model_used = model

    # Stream the turn
    async for event in runner.stream_turn(
        message=message,
        session_id=session_id,
        user_id=user_id,
        active_model=model,
    ):
        ev_type = event.get("type", "")

        # Record TTFT at the first sign of LLM reasoning, action dispatch, or output
        if ev_type in ("thought", "action", "search") and first_token_time is None:
            first_token_time = time.perf_counter()

        if ev_type == "node_timing":
            node_name = event.get("node", "")
            if node_name:
                node_timings[node_name] = event.get("duration_ms", 0.0)

        elif ev_type == "thought":
            t_text = event.get("text", "")
            if t_text:
                thoughts.append(t_text)

        elif ev_type == "action":
            tool_name = event.get("tool", "")
            tool_args = event.get("args", {})
            actions.append({"tool": tool_name, "args": tool_args, "status": "invoked"})

        elif ev_type == "observation":
            obs_text = event.get("text", "")
            if actions:
                actions[-1]["observation"] = obs_text

        elif ev_type == "done":
            if first_token_time is None:
                first_token_time = time.perf_counter()
            final_reply = event.get("reply", "")
            active_model_used = event.get("model", model)
            if event.get("node_timings"):
                node_timings.update(event["node_timings"])
            if event.get("sub_timings"):
                sub_timings.update(event["sub_timings"])
            if event.get("toolCalls"):
                for tc in event.get("toolCalls"):
                    if not any(a.get("tool") == tc.get("name") for a in actions):
                        actions.append(tc)

    end_time = time.perf_counter()

    ttft_ms = round(((first_token_time or end_time) - start_time) * 1000.0, 2)
    total_latency_ms = round((end_time - start_time) * 1000.0, 2)

    return ConversationTurnMetrics(
        turn=turn_index,
        input_message=message,
        output_text=final_reply,
        actions_taken=actions,
        thoughts=thoughts,
        ttft_ms=ttft_ms,
        total_latency_ms=total_latency_ms,
        node_timings=node_timings,
        sub_timings=sub_timings,
        model_used=active_model_used,
    )


async def run_live_conversation_session(
    prompts: List[str],
    session_id: str = "eval_session_aman",
    user_id: str = "aman",
    model: str = "gemini/gemini-3-flash-preview",
) -> ConversationSessionResult:
    """Executes a multi-turn conversation, marks TTFT, logs to LangSmith and local DB."""
    runner.set_active_model(model)
    turns: List[ConversationTurnMetrics] = []

    # Check LangSmith connectivity
    langsmith_client = None
    langsmith_status = {
        "configured": bool(settings.LANGCHAIN_API_KEY and settings.LANGCHAIN_API_KEY.strip()),
        "connected": False,
        "project": settings.LANGCHAIN_PROJECT,
        "endpoint": settings.LANGCHAIN_ENDPOINT,
    }

    if langsmith_status["configured"]:
        try:
            from langsmith import Client
            langsmith_client = Client(
                api_key=settings.LANGCHAIN_API_KEY,
                api_url=settings.LANGCHAIN_ENDPOINT,
            )
            if not langsmith_client.has_project(settings.LANGCHAIN_PROJECT):
                langsmith_client.create_project(
                    project_name=settings.LANGCHAIN_PROJECT,
                    description="ERIS Multi-Turn Live Conversation Evaluation",
                )
            langsmith_status["connected"] = True
        except Exception as ls_err:
            langsmith_status["error"] = str(ls_err)
            logger.warning(f"LangSmith connection failed: {ls_err}")

    for idx, prompt in enumerate(prompts, start=1):
        turn_metric = await execute_turn_with_telemetry(
            message=prompt,
            turn_index=idx,
            session_id=session_id,
            user_id=user_id,
            model=model,
        )

        # Upload trace to LangSmith if connected
        if langsmith_client and langsmith_status["connected"]:
            try:
                import uuid
                turn_run_id = uuid.uuid4()
                langsmith_client.create_run(
                    id=turn_run_id,
                    name=f"turn_{idx}_{session_id}",
                    run_type="chain",
                    project_name=settings.LANGCHAIN_PROJECT,
                    inputs={"user_message": prompt, "turn": idx, "user_id": user_id},
                    outputs={
                        "reply": turn_metric.output_text,
                        "actions": turn_metric.actions_taken,
                        "thoughts": turn_metric.thoughts,
                    },
                    extra={
                        "metrics": {
                            "ttft_ms": turn_metric.ttft_ms,
                            "total_latency_ms": turn_metric.total_latency_ms,
                        },
                        "model": turn_metric.model_used,
                    },
                )
                turn_metric.langsmith_run_id = str(turn_run_id)

                # Record feedback tags for TTFT and Latency
                langsmith_client.create_feedback(
                    run_id=turn_run_id,
                    key="ttft_ms",
                    score=turn_metric.ttft_ms,
                    comment=f"TTFT: {turn_metric.ttft_ms} ms",
                )
                langsmith_client.create_feedback(
                    run_id=turn_run_id,
                    key="latency_ms",
                    score=turn_metric.total_latency_ms,
                    comment=f"Total turn latency: {turn_metric.total_latency_ms} ms",
                )
            except Exception as up_err:
                logger.warning(f"Could not push turn {idx} to LangSmith: {up_err}")

        turns.append(turn_metric)

    # Persist session to local SQLite eval database
    eval_db_path = settings.MEMORY_DIR / "eval_results.db"
    try:
        conn = sqlite3.connect(str(eval_db_path))
        with conn:
            c = conn.cursor()
            now = time.time()
            for t in turns:
                c.execute("""
                    INSERT INTO eval_runs (suite_name, test_id, passed, score, details_json, error_message, ran_online, created_at)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                """, (
                    "live_conversation_eval",
                    f"{session_id}_turn_{t.turn}",
                    1 if t.output_text else 0,
                    1.0,
                    json.dumps({
                        "input": t.input_message,
                        "reply": t.output_text,
                        "ttft_ms": t.ttft_ms,
                        "latency_ms": t.total_latency_ms,
                        "actions": t.actions_taken,
                        "langsmith_run_id": t.langsmith_run_id,
                    }),
                    None,
                    1 if langsmith_status["connected"] else 0,
                    now,
                ))
    except Exception as db_err:
        logger.debug(f"Local eval db notice: {db_err}")

    summary_text = (
        f"Completed {len(turns)} turns. "
        f"Turn 1 TTFT: {turns[0].ttft_ms if len(turns) > 0 else 0}ms, "
        f"Turn 2 TTFT: {turns[1].ttft_ms if len(turns) > 1 else 0}ms."
    )

    return ConversationSessionResult(
        session_id=session_id,
        user_id=user_id,
        model=model,
        turns=turns,
        langsmith_status=langsmith_status,
        summary=summary_text,
    )
