"""
current_datetime — Safe, read-only date/time tool for ERIS.

SAFETY PROFILE: READ-ONLY / SAFE
- No network access, no subprocess calls, no file writes, no shell execution.
- Touches nothing but the host system clock (datetime.datetime.now()).
- Deterministic: returns real system values only; never fabricates time.

Use whenever the user asks:
  "what time is it", "what's today's date", "what day is it or semantic meanings",
  "current time in my timezone", or any current day/date/time question.
"""

import json
from datetime import datetime
from pydantic import BaseModel, Field

TOOL_NAME = "current_datetime"
TOOL_DESCRIPTION = (
    "Safely returns the current local day, date, and time (component-wise) from "
    "the host system clock. Pure read-only operation: no network, no subprocess, "
    "no file I/O, no side effects. Use this tool whenever the user asks what time "
    "it is, today's date, the current day, or any current day/date/time question."
)
RISK_LEVEL = "safe"


class ToolInput(BaseModel):
    """No parameters required for system clock readout."""
    pass


def execute(**kwargs) -> str:
    """Return the current date/time as a compact JSON payload for ERIS parsing.

    Args:
        args: optional query string (ignored; may be used for intent logging later).

    Returns:
        JSON string with date, time, day, timezone components and a
        ready-to-speak natural-language answer.
    """
    # Always base on a single clock read for internal consistency.
    try:
        now = datetime.now().astimezone()  # local wall-clock time with tz offset
    except Exception:
        now = datetime.now()  # fallback: naive local time (tz info unavailable)

    hour_12 = int(now.strftime("%I"))
    minute = now.minute
    second = now.second
    meridiem = now.strftime("%p")

    payload = {
        "full_datetime": now.isoformat(timespec="seconds"),
        "date": now.strftime("%Y-%m-%d"),
        "day": now.strftime("%A"),
        "day_short": now.strftime("%a"),
        "month": now.strftime("%B"),
        "month_short": now.strftime("%b"),
        "day_of_month": now.day,
        "year": now.year,
        "time_24h": now.strftime("%H:%M:%S"),
        "time_12h": now.strftime("%I:%M:%S %p"),
        "hour_12": hour_12,
        "minute": minute,
        "second": second,
        "meridiem": meridiem,
        "timezone_name": now.tzname() or "Local",
        "timezone_offset_utc": now.strftime("%z") or "(unknown offset)",
        "iso_weekday": now.isoweekday(),  # 1=Monday ... 7=Sunday
        "natural_answer": (
            f"It is {hour_12}:{minute:02d} {meridiem} on {now.strftime('%A')}, "
            f"{now.strftime('%B')} {now.day}, {now.year} "
            f"({now.tzname() or 'local time'}, UTC{now.strftime('%z')})."
        ),
    }

    return json.dumps(payload, indent=2, ensure_ascii=False)