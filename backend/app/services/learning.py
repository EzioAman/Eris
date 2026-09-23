import datetime
import json
import logging
from pathlib import Path
from typing import Any, Dict, List, Optional

try:
    from app.config import settings
except ImportError:
    from backend.app.config import settings

logger = logging.getLogger("eris.services.learning")

HABITS_FILE = settings.WORKSPACE_PATH / "memory" / "user_habits.json"


def get_default_habits() -> Dict[str, Any]:
    """Returns the baseline structure for user habits and learned human preferences."""
    return {
        "decisions": [],
        "patterns": {},
        "feedback_summary": {
            "total_positive": 0,
            "total_negative": 0,
            "flagged_behaviors": [],
            "preferred_behaviors": [],
        },
        "corrections": [],
    }


def load_habits() -> Dict[str, Any]:
    """
    Loads learned habits from memory/user_habits.json.
    Initializes a fresh schema if the file is missing or corrupted.
    """
    if not HABITS_FILE.exists():
        habits = get_default_habits()
        save_habits(habits)
        return habits

    try:
        with open(HABITS_FILE, "r", encoding="utf-8") as f:
            data = json.load(f)
            if not isinstance(data, dict):
                return get_default_habits()
            return data
    except Exception as ex:
        logger.warning(f"Failed to read habits file {HABITS_FILE}: {ex}. Using default.")
        return get_default_habits()


def save_habits(habits: Dict[str, Any]) -> None:
    """Persists habits safely to memory/user_habits.json."""
    try:
        HABITS_FILE.parent.mkdir(parents=True, exist_ok=True)
        with open(HABITS_FILE, "w", encoding="utf-8") as f:
            json.dump(habits, f, indent=2, ensure_ascii=False)
    except Exception as ex:
        logger.error(f"Error persisting habits to {HABITS_FILE}: {ex}")


def record_decision(
    tool_name: str,
    args: Dict[str, Any],
    decision: str,  # "approved" or "rejected"
    reason: str = "",
) -> Dict[str, Any]:
    """
    Records a human approval or rejection decision.
    Updates historical counters and triggers auto-approval thresholds when safe.
    """
    habits = load_habits()
    timestamp = datetime.datetime.now(datetime.timezone.utc).isoformat()

    decision_entry = {
        "tool": tool_name,
        "args": args,
        "decision": decision,
        "reason": reason,
        "timestamp": timestamp,
    }
    habits.setdefault("decisions", []).append(decision_entry)

    patterns = habits.setdefault("patterns", {})
    tool_pattern = patterns.setdefault(
        tool_name,
        {
            "total_approvals": 0,
            "total_rejections": 0,
            "auto_approve_threshold_met": False,
            "common_rejection_reasons": [],
            "trusted_recipients": [],
        },
    )

    if decision == "approved":
        tool_pattern["total_approvals"] += 1
        # For email: track verified recipients
        if tool_name == "send_email" and "to" in args:
            rec = str(args["to"]).strip().lower()
            if rec and rec not in tool_pattern["trusted_recipients"]:
                tool_pattern["trusted_recipients"].append(rec)

        # Threshold rule: 3 or more approvals with 0 rejections allows auto-approval
        if tool_pattern["total_approvals"] >= 3 and tool_pattern["total_rejections"] == 0:
            tool_pattern["auto_approve_threshold_met"] = True

    elif decision == "rejected":
        tool_pattern["total_rejections"] += 1
        tool_pattern["auto_approve_threshold_met"] = False  # Revoke auto-approve immediately
        if reason and reason not in tool_pattern["common_rejection_reasons"]:
            tool_pattern["common_rejection_reasons"].append(reason)

    save_habits(habits)
    logger.info(f"Recorded human decision: {decision} for tool {tool_name}")
    return habits


def record_feedback(
    message_id: str,
    rating: str,  # "up" or "down"
    prompt: str = "",
    response: str = "",
) -> Dict[str, Any]:
    """
    Records a user thumbs-up or thumbs-down rating and distills feedback rules.
    """
    habits = load_habits()
    summary = habits.setdefault(
        "feedback_summary",
        {
            "total_positive": 0,
            "total_negative": 0,
            "flagged_behaviors": [],
            "preferred_behaviors": [],
        },
    )

    if rating == "up":
        summary["total_positive"] += 1
        if prompt and "concise direct answers" not in summary["preferred_behaviors"]:
            summary["preferred_behaviors"].append("concise direct answers")
    elif rating == "down":
        summary["total_negative"] += 1
        if "avoid repetitive explanations" not in summary["flagged_behaviors"]:
            summary["flagged_behaviors"].append("avoid repetitive explanations")

    save_habits(habits)
    return habits


def record_correction(original: str, corrected: str, learned_rule: str = "") -> Dict[str, Any]:
    """
    Records a user correction where Eris made a mistake and the human provided the correct instruction.
    """
    habits = load_habits()
    timestamp = datetime.datetime.now(datetime.timezone.utc).isoformat()

    rule_text = learned_rule or f"When instructed '{original}', prefer '{corrected}'"
    correction_entry = {
        "original": original,
        "corrected": corrected,
        "learned_rule": rule_text,
        "timestamp": timestamp,
    }
    habits.setdefault("corrections", []).append(correction_entry)
    save_habits(habits)
    return habits


def build_habit_prompt(habits: Optional[Dict[str, Any]] = None) -> str:
    """
    Distills learned user habits and patterns into an actionable prompt section.
    Injected directly into the system prompt so Eris reasons with human context.
    """
    if habits is None:
        habits = load_habits()

    lines: List[str] = []

    # Patterns and rejections
    patterns = habits.get("patterns", {})
    for tool_name, pdata in patterns.items():
        rejections = pdata.get("total_rejections", 0)
        reasons = pdata.get("common_rejection_reasons", [])
        if rejections > 0:
            reason_str = f" (reasons: {', '.join(reasons)})" if reasons else ""
            lines.append(
                f"- The user has rejected {tool_name} {rejections} time(s){reason_str}. "
                f"Always verify parameters explicitly with the user before executing {tool_name}."
            )
        trusted = pdata.get("trusted_recipients", [])
        if trusted:
            lines.append(f"- Trusted contacts for {tool_name}: {', '.join(trusted)}.")

    # Corrections
    corrections = habits.get("corrections", [])
    for corr in corrections[-5:]:  # Last 5 active corrections
        rule = corr.get("learned_rule", "")
        if rule:
            lines.append(f"- Human Rule: {rule}")

    # Feedback behaviors
    summary = habits.get("feedback_summary", {})
    for pref in summary.get("preferred_behaviors", []):
        lines.append(f"- User preference: {pref}.")
    for flagged in summary.get("flagged_behaviors", []):
        lines.append(f"- User flagged to avoid: {flagged}.")

    if not lines:
        return ""

    return (
        "\n### What I Have Learned From Human Interactions:\n"
        + "\n".join(lines)
        + "\nApply these learned preferences and safety boundaries to all subsequent reasoning.\n"
    )


def should_auto_approve(tool_name: str, args: Dict[str, Any], habits: Optional[Dict[str, Any]] = None) -> bool:
    """
    Evaluates whether an operation qualifies for auto-approval based on proven trust patterns.
    """
    if habits is None:
        habits = load_habits()

    patterns = habits.get("patterns", {}).get(tool_name, {})
    if not patterns.get("auto_approve_threshold_met", False):
        return False

    if tool_name == "send_email":
        recipient = str(args.get("to", "")).strip().lower()
        trusted = [str(x).lower() for x in patterns.get("trusted_recipients", [])]
        return recipient in trusted

    return True


def reset_habits() -> Dict[str, Any]:
    """Clears all learned habits and restores factory clean slate."""
    fresh = get_default_habits()
    save_habits(fresh)
    return fresh
