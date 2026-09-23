"""
Services Package
Strictly imports and exposes service singletons and functions.
"""

try:
    from app.services.learning import (
        load_habits,
        save_habits,
        record_decision,
        record_feedback,
        record_correction,
        build_habit_prompt,
        should_auto_approve,
        reset_habits,
    )
except ImportError:
    from backend.app.services.learning import (
        load_habits,
        save_habits,
        record_decision,
        record_feedback,
        record_correction,
        build_habit_prompt,
        should_auto_approve,
        reset_habits,
    )

__all__ = [
    "load_habits",
    "save_habits",
    "record_decision",
    "record_feedback",
    "record_correction",
    "build_habit_prompt",
    "should_auto_approve",
    "reset_habits",
]
