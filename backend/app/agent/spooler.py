import os
import re
from pathlib import Path
from typing import Optional, Tuple
from loguru import logger

try:
    from app.config import settings
except ImportError:
    from backend.app.config import settings

# Threshold in characters before spooling output to an artifact on disk (~4,000 tokens)
SPOOL_THRESHOLD_CHARS = 16000
HEAD_LINES_COUNT = 20
TAIL_LINES_COUNT = 30


def spool_large_output(
    output_text: str,
    tool_name: str,
    call_id: str,
    session_id: Optional[str] = "default_session",
) -> Tuple[bool, str, Optional[Path]]:
    """
    Evaluates output against spooling threshold.
    If len(output_text) <= SPOOL_THRESHOLD_CHARS:
        Returns (False, output_text, None) directly.
    If len(output_text) > SPOOL_THRESHOLD_CHARS:
        Writes raw output to .eris/runs/<session_id>/<call_id>_<tool_name>.log,
        and returns (True, envelope_markdown, artifact_path).
    """
    if len(output_text) <= SPOOL_THRESHOLD_CHARS:
        return False, output_text, None

    try:
        # Determine runs artifact directory
        workspace = Path(settings.WORKSPACE_PATH)
        safe_session = re.sub(r"[^a-zA-Z0-9_\-]", "_", session_id or "default")
        safe_call = re.sub(r"[^a-zA-Z0-9_\-]", "_", call_id or "call")
        safe_tool = re.sub(r"[^a-zA-Z0-9_\-]", "_", tool_name or "tool")

        runs_dir = workspace / ".eris" / "runs" / safe_session
        runs_dir.mkdir(parents=True, exist_ok=True)

        artifact_file = runs_dir / f"{safe_call}_{safe_tool}.log"
        artifact_file.write_text(output_text, encoding="utf-8", errors="replace")

        # Build diagnostic excerpt
        lines = output_text.splitlines()
        total_lines = len(lines)
        total_bytes = len(output_text.encode("utf-8", errors="replace"))

        head_excerpt = "\n".join(lines[:HEAD_LINES_COUNT])
        tail_excerpt = "\n".join(lines[-TAIL_LINES_COUNT:]) if total_lines > HEAD_LINES_COUNT else ""

        # Extract up to 10 prominent error / failure / exception lines
        error_lines = []
        err_regex = re.compile(r"(error|exception|failed|fatal|traceback|syntaxerror|typeerror)", re.IGNORECASE)
        for idx, line in enumerate(lines):
            if err_regex.search(line):
                error_lines.append(f"L{idx + 1}: {line.strip()[:200]}")
                if len(error_lines) >= 10:
                    break

        error_section = ""
        if error_lines:
            error_section = "\n--- DETECTED ERRORS / WARNINGS ---\n" + "\n".join(error_lines) + "\n"

        envelope = (
            f"[OUTPUT SPOOLED TO ARTIFACT TO PREVENT CONTEXT FLOODING]\n"
            f"Artifact File: {artifact_file.as_posix()}\n"
            f"Total Output Size: {total_bytes:,} bytes | Total Lines: {total_lines:,}\n\n"
            f"--- HEAD (First {min(total_lines, HEAD_LINES_COUNT)} lines) ---\n"
            f"{head_excerpt}\n"
            f"{error_section}"
            f"\n--- TAIL (Last {min(total_lines, TAIL_LINES_COUNT)} lines) ---\n"
            f"{tail_excerpt}\n\n"
            f"[ACTION GUIDANCE FOR MODEL]\n"
            f"Full raw output is persisted at: {artifact_file.as_posix()}\n"
            f"- To find specific errors or symbols, use: `grep_search(SearchPath=\"{artifact_file.as_posix()}\", Query=\"<pattern>\")`\n"
            f"- To inspect a specific line range, use: `view_file(AbsolutePath=\"{artifact_file.as_posix()}\", StartLine=<start>, EndLine=<end>)`\n"
        )

        logger.info(f"Spooled large output ({total_bytes} bytes, {total_lines} lines) for tool {tool_name} to {artifact_file}")
        return True, envelope, artifact_file

    except Exception as e:
        logger.error(f"Failed to spool output to artifact: {e}")
        # Fallback to returning original text if spooling fails
        return False, output_text, None
