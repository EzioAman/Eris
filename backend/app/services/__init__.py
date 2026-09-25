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

try:
    from app.services.security_audit import (
        SecurityProbeResult,
        SecurityAuditSummary,
        run_full_security_audit,
        run_api_security_probes,
        run_filesystem_sandbox_probes,
    )
except ImportError:
    from backend.app.services.security_audit import (
        SecurityProbeResult,
        SecurityAuditSummary,
        run_full_security_audit,
        run_api_security_probes,
        run_filesystem_sandbox_probes,
    )

try:
    from app.services.workstation_admin import (
        ResetSummary,
        clear_all_eris_data_and_create_dev_account,
    )
except ImportError:
    from backend.app.services.workstation_admin import (
        ResetSummary,
        clear_all_eris_data_and_create_dev_account,
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
    "SecurityProbeResult",
    "SecurityAuditSummary",
    "run_full_security_audit",
    "run_api_security_probes",
    "run_filesystem_sandbox_probes",
    "ResetSummary",
    "clear_all_eris_data_and_create_dev_account",
]
