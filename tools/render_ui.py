"""
Dynamic UI Visual Declaration Tool for ERIS.
Allows the agent to declare intent to render an interactive visual component
(diffs, terminal sessions, file trees, mobile/safari previews, playlist, multi-agent chains)
in the frontend workspace.
"""
from typing import Any, Dict

TOOL_NAME = "render_ui"
TOOL_DESCRIPTION = (
    "Call this whenever showing a visual (a code comparison diff, a terminal session, a file tree, "
    "safari browser preview, media playlist, mobile iOS/Android preview, or subagent chain) "
    "would help the user more than describing it in text. Do not guess this from keywords — "
    "call it only when you are about to actually show that visual as part of your answer."
)


def execute(component: str = "", props: Dict[str, Any] = None, **kwargs) -> str:
    """Renders a declared UI component in the frontend workspace."""
    actual_comp = component or kwargs.get("component") or "unknown"
    return f"UI block rendered: {actual_comp}"
