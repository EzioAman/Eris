import asyncio
import json
import logging
import time
from typing import Any, Dict, List, Optional
from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field

try:
    from backend.app.agent.registry import execute_tool, get_all_tools
    from backend.app.agent.runner import runner
    from backend.app.config import settings
    from backend.app.schemas.events import DoneEvent
    from backend.app.services.learning import record_decision, record_feedback
    from backend.app.services.workflow_engine import utc_iso_now
except ImportError:
    from app.agent.registry import execute_tool, get_all_tools
    from app.agent.runner import runner
    from app.config import settings
    from app.schemas.events import DoneEvent
    from app.services.learning import record_decision, record_feedback
    from app.services.workflow_engine import utc_iso_now

logger = logging.getLogger("eris.api.chat")

router = APIRouter(prefix="/api/chat", tags=["chat"])


class ChatMessageRequest(BaseModel):
    message: str
    sessionId: Optional[str] = "1"
    userId: Optional[str] = None
    isWebSearch: Optional[bool] = False
    executionMode: Optional[str] = "speed"
    model: Optional[str] = None


class FeedbackRequest(BaseModel):
    messageId: str
    rating: str  # "up" or "down"
    prompt: Optional[str] = ""
    response: Optional[str] = ""
    notes: Optional[str] = None


class TerminalExecutionRequest(BaseModel):
    command: Optional[str] = None
    cmd: Optional[str] = None


class ScrapeRequest(BaseModel):
    url: str


class DecisionRequest(BaseModel):
    toolId: str
    approved: bool
    command: Optional[str] = None
    sessionId: Optional[str] = "1"
    userId: Optional[str] = None
    reason: Optional[str] = ""


@router.post("/feedback")
async def record_chat_feedback(payload: FeedbackRequest):
    """Persists human feedback ratings for reinforcement learning and prompt tuning."""
    record_feedback(
        message_id=payload.messageId,
        rating=payload.rating,
        prompt=payload.prompt or "",
        response=payload.response or "",
    )
    return {"ok": True, "message": "Feedback recorded."}


@router.post("/terminal")
async def execute_terminal_command(payload: TerminalExecutionRequest):
    """Executes a command directly through the sandboxed shell execution tool."""
    cmd = (payload.command or payload.cmd or "").strip()
    if not cmd:
        raise HTTPException(status_code=400, detail="Command cannot be empty.")

    start_time = time.time()
    output = execute_tool("run_command", {"command": cmd})
    duration = time.time() - start_time
    is_error = "SECURITY_ERROR" in output or "PERMISSION_REQUIRED" in output or "Error executing" in output

    return {
        "ok": not is_error,
        "command": cmd,
        "output": output,
        "duration": f"{duration:.2f}s",
        "timestamp": utc_iso_now(),
    }


@router.post("/scrape")
async def scrape_webpage(payload: ScrapeRequest):
    """Scrapes a webpage and extracts clean Markdown content."""
    url = (payload.url or "").strip()
    if not url:
        raise HTTPException(status_code=400, detail="URL cannot be empty.")

    output = execute_tool("scrape_web", {"url": url})
    return {
        "ok": not output.startswith("Error"),
        "url": url,
        "content": output,
        "timestamp": utc_iso_now(),
    }


def _handle_slash_commands(text: str, session_id: str, user_id: Optional[str] = None) -> Optional[Dict[str, Any]]:
    """Dispatches CLI slash commands before invoking the full agent reasoning graph."""
    if not text.startswith("/"):
        return None

    parts = text.split(maxsplit=1)
    base_cmd = parts[0].lower()
    arg = parts[1].strip() if len(parts) > 1 else ""

    if base_cmd in ("/tools", "/registry"):
        tools = get_all_tools()
        lines = []
        for t in tools.values():
            src = getattr(t, "source", None) or (t.metadata.get("source") if getattr(t, "metadata", None) else None) or "core"
            lines.append(f"• **`{t.name}`** ({src}): {t.description}")
        reply_text = f"### Registered Tools ({len(tools)})\n\n" + "\n".join(lines)
        return {
            "ok": True,
            "sessionId": session_id,
            "reply": reply_text,
            "toolCalls": [
                {
                    "id": "tool-registry-probe",
                    "tool": "list_tools",
                    "name": "Tool Registry",
                    "args": "tools/",
                    "status": "success",
                    "output": f"Active tools: {list(tools.keys())}",
                    "duration": "0.01s",
                    "kind": "output",
                }
            ],
            "timestamp": utc_iso_now(),
        }

    elif base_cmd == "/mode":
        if arg in ("speed", "accuracy"):
            runner.set_execution_mode(arg)
            return {
                "ok": True,
                "sessionId": session_id,
                "reply": f"✓ Execution mode set to `{arg.upper()}`.",
                "toolCalls": [],
                "timestamp": utc_iso_now(),
            }
        return {
            "ok": True,
            "sessionId": session_id,
            "reply": f"Current mode: `{runner.execution_mode.upper()}`. Switch with `/mode speed` or `/mode accuracy`.",
            "toolCalls": [],
            "timestamp": utc_iso_now(),
        }

    elif base_cmd in ("/model", "/switch"):
        if arg:
            runner.set_active_model(arg)
            return {
                "ok": True,
                "sessionId": session_id,
                "reply": f"✓ Switched active model to `{arg}`.",
                "toolCalls": [],
                "timestamp": utc_iso_now(),
            }
        return {
            "ok": True,
            "sessionId": session_id,
            "reply": f"Current active model: `{runner.active_model}`.",
            "toolCalls": [],
            "timestamp": utc_iso_now(),
        }

    elif base_cmd == "/clear":
        runner.clear_user_history(user_id)
        return {
            "ok": True,
            "sessionId": session_id,
            "reply": "Conversation history cleared.",
            "toolCalls": [],
            "timestamp": utc_iso_now(),
        }

    elif base_cmd == "/whoami":
        u_display = user_id or "Guest User"
        return {
            "ok": True,
            "sessionId": session_id,
            "reply": f"Connected as `{u_display}`. Active model: `{runner.active_model}`.",
            "toolCalls": [],
            "timestamp": utc_iso_now(),
        }

    elif base_cmd == "/help":
        help_text = (
            "### Available Commands:\n"
            "- `/tools` - List all registered tools and risk levels\n"
            "- `/mode <speed|accuracy>` - Switch execution mode\n"
            "- `/model <id>` - Switch active LLM model\n"
            "- `/clear` - Reset conversation history\n"
            "- `/whoami` - Show user session details\n"
            "- `/help` - Show this assistance message"
        )
        return {
            "ok": True,
            "sessionId": session_id,
            "reply": help_text,
            "toolCalls": [],
            "timestamp": utc_iso_now(),
        }

    return None


@router.post("/message")
async def process_chat_message(payload: ChatMessageRequest):
    """Processes a user message through the LangGraph agent and returns the final response."""
    text = payload.message.strip()
    if not text:
        raise HTTPException(status_code=400, detail="Message cannot be empty.")

    session_id = payload.sessionId or "1"

    slash_result = _handle_slash_commands(text, session_id, user_id=payload.userId)
    if slash_result:
        return slash_result

    final_reply = ""
    tool_calls: List[Dict[str, Any]] = []

    async for event in runner.stream_turn(
        message=text,
        session_id=session_id,
        user_id=payload.userId,
        active_model=payload.model or None,
        execution_mode=payload.executionMode,
    ):
        if event.get("type") == "done":
            final_reply = event.get("reply", "")
            tool_calls = event.get("toolCalls", [])

    return {
        "ok": True,
        "sessionId": session_id,
        "reply": final_reply,
        "toolCalls": tool_calls,
        "timestamp": utc_iso_now(),
    }


@router.post("/message/stream")
async def stream_chat_message(payload: ChatMessageRequest):
    """
    Streams multi-turn reasoning and tool execution as Server-Sent Events (SSE).
    Emits thought, action, observation, search, and done events matching the frontend timeline.
    """
    text = payload.message.strip()
    if not text:
        raise HTTPException(status_code=400, detail="Message cannot be empty.")

    session_id = payload.sessionId or "1"

    async def event_generator():
        slash_result = _handle_slash_commands(text, session_id, user_id=payload.userId)
        if slash_result:
            yield f"data: {json.dumps({'type': 'turn_start', 'model': runner.active_model, 'turn': 1, 'text': 'Processing command...'})}\n\n"
            yield f"data: {json.dumps({'type': 'done', 'reply': slash_result['reply'], 'toolCalls': slash_result['toolCalls'], 'model': runner.active_model})}\n\n"
            return

        async for event in runner.stream_turn(
            message=text,
            session_id=session_id,
            user_id=payload.userId,
            active_model=payload.model or None,
            execution_mode=payload.executionMode,
        ):
            yield f"data: {json.dumps(event)}\n\n"

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )


@router.post("/decision")
async def handle_human_decision(payload: DecisionRequest):
    """
    Handles user confirmation (Approve/Reject) on an interactive approval card.
    Resumes the paused LangGraph workflow and records human feedback into the learning service.
    """
    session_id = payload.sessionId or "1"
    decision_dict = {
        "decision": "approved" if payload.approved else "rejected",
        "reason": payload.reason or ("Approved by user" if payload.approved else "Rejected by user"),
        "command": payload.command or "",
    }

    final_reply = ""
    tool_calls: List[Dict[str, Any]] = []

    async for event in runner.resume_after_decision(
        session_id=session_id,
        decision=decision_dict,
        user_id=payload.userId,
    ):
        if event.get("type") == "done":
            final_reply = event.get("reply", "")
            tool_calls = event.get("toolCalls", [])

    return {
        "ok": True,
        "sessionId": session_id,
        "reply": final_reply,
        "toolCalls": tool_calls,
        "timestamp": utc_iso_now(),
    }
