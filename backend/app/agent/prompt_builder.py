"""
Backward-compatibility bridge for prompt_builder.
Delegates cleanly to app.agent.prompts.
"""

try:
    from backend.app.agent.prompts import (
        IntentType,
        PromptBuilder as AgentPromptBuilder,
        build_system_prompt,
        classify_intent,
        prompt_builder,
    )
except ImportError:
    from app.agent.prompts import (
        IntentType,
        PromptBuilder as AgentPromptBuilder,
        build_system_prompt,
        classify_intent,
        prompt_builder,
    )

__all__ = [
    "IntentType",
    "AgentPromptBuilder",
    "build_system_prompt",
    "classify_intent",
    "prompt_builder",
]
