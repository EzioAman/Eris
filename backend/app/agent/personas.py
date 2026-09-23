import json
import logging
from pathlib import Path
from typing import Any, Dict, Optional

try:
    from backend.app.config import settings
    from backend.app.schemas.settings import PersonaSettings, UserSettings, get_default_personas
except ImportError:
    from app.config import settings
    from app.schemas.settings import PersonaSettings, UserSettings, get_default_personas

logger = logging.getLogger("eris.agent.personas")

SETTINGS_FILE = settings.WORKSPACE_PATH / "memory" / "user_settings.json"

# Base system prompts and anti-slop directives for all 6 worker personas
BASE_PERSONA_PROMPTS = {
    "coder": (
        "You are Senior Coder, an expert software engineer operating in ERIS.\n"
        "Core Directives:\n"
        "1. Adhere strictly to doc/ai_slop.md: Never emit unfinished placeholder code or mock returns.\n"
        "2. Formulate concrete, syntactically valid code that addresses the user's exact requirements.\n"
        "3. Ensure all imported packages and models exist and follow project conventions."
    ),
    "writer": (
        "You are Content Writer, a technical documentation and creative communications specialist in ERIS.\n"
        "Core Directives:\n"
        "1. Adhere strictly to doc/ai_slop.md: Zero corporate filler, fake buzzwords, or repetitive AI patterns.\n"
        "2. Write with clarity, intentionality, and high signal-to-noise ratio.\n"
        "3. Ground all factual assertions in real context and verified references."
    ),
    "security": (
        "You are Security Auditor, an adversarial security engineer operating in ERIS.\n"
        "Core Directives:\n"
        "1. Inspect all code and shell commands for command injection, path traversal, and uncontained execution.\n"
        "2. Verify defensive input validation and graceful failure exits.\n"
        "3. Provide concrete remediation diffs and actionable exploit assessments."
    ),
    "researcher": (
        "You are Fact Researcher, a grounded factual research analyst in ERIS.\n"
        "Core Directives:\n"
        "1. Adhere strictly to doc/ai_slop.md: Every fact must be verifiable through live web sources.\n"
        "2. Synthesize findings into structured markdown with citations for the doc/ directory.\n"
        "3. Reject ungrounded speculation or outdated technical claims."
    ),
    "tester": (
        "You are Quality Tester, a software validation and quality assurance specialist in ERIS.\n"
        "Core Directives:\n"
        "1. Test boundary conditions, malformed payloads, unicode inputs, and null references.\n"
        "2. Validate Pydantic schema constraints and confirm error handling behavior.\n"
        "3. Report concrete test execution results without fabricating metrics."
    ),
    "optimizer": (
        "You are Performance Optimizer, a systems and async execution engineer in ERIS.\n"
        "Core Directives:\n"
        "1. Profile latency, memory utilization, and async event loop throughput.\n"
        "2. Detect synchronous bottlenecks inside async coroutines.\n"
        "3. Provide measurable, benchmarked performance improvements."
    ),
}


def load_user_settings() -> UserSettings:
    """
    Loads UserSettings from memory/user_settings.json.
    Initializes factory defaults if the file does not exist or fails parsing.
    """
    if not SETTINGS_FILE.exists():
        user_settings = UserSettings.get_defaults()
        save_user_settings(user_settings)
        return user_settings

    try:
        with open(SETTINGS_FILE, "r", encoding="utf-8") as f:
            data = json.load(f)
            return UserSettings(**data)
    except Exception as ex:
        logger.warning(f"Could not read user settings from {SETTINGS_FILE}: {ex}. Reverting to defaults.")
        return UserSettings.get_defaults()


def save_user_settings(user_settings: UserSettings) -> None:
    """Persists UserSettings to memory/user_settings.json."""
    try:
        SETTINGS_FILE.parent.mkdir(parents=True, exist_ok=True)
        with open(SETTINGS_FILE, "w", encoding="utf-8") as f:
            json.dump(user_settings.model_dump(), f, indent=2, ensure_ascii=False)
    except Exception as ex:
        logger.error(f"Failed to save user settings: {ex}")


def get_all_personas() -> Dict[str, PersonaSettings]:
    """Returns all 6 configured personas from the user settings."""
    user_settings = load_user_settings()
    return user_settings.personas


def get_persona(key: str) -> PersonaSettings:
    """Retrieves a single persona configuration by key."""
    personas = get_all_personas()
    clean_key = key.strip().lower()
    if clean_key in personas:
        return personas[clean_key]
    defaults = get_default_personas()
    return defaults.get(clean_key, defaults["coder"])


def update_persona(key: str, updated: PersonaSettings) -> PersonaSettings:
    """Updates parameters for a specific persona and persists the changes."""
    user_settings = load_user_settings()
    clean_key = key.strip().lower()
    user_settings.personas[clean_key] = updated
    save_user_settings(user_settings)
    logger.info(f"Updated persona '{clean_key}' parameters (temp={updated.temperature}, max_tokens={updated.max_tokens})")
    return updated


def reset_persona(key: str) -> PersonaSettings:
    """Resets a single persona back to its factory default parameters."""
    clean_key = key.strip().lower()
    defaults = get_default_personas()
    default_p = defaults.get(clean_key, defaults["coder"])
    return update_persona(clean_key, default_p)


def reset_all_personas() -> Dict[str, PersonaSettings]:
    """Resets all 6 personas back to their factory defaults."""
    user_settings = load_user_settings()
    user_settings.personas = get_default_personas()
    save_user_settings(user_settings)
    logger.info("Reset all swarm personas to factory defaults.")
    return user_settings.personas


def get_persona_system_prompt(key: str) -> str:
    """Constructs the full system prompt for a persona, honoring custom overrides and anti-slop rules."""
    clean_key = key.strip().lower()
    persona = get_persona(clean_key)
    if persona.system_prompt:
        return persona.system_prompt

    base_prompt = BASE_PERSONA_PROMPTS.get(clean_key, BASE_PERSONA_PROMPTS["coder"])
    if persona.anti_slop:
        anti_slop_block = (
            "\n\nSTRICT ANTI-SLOP MANDATE (doc/ai_slop.md):\n"
            "- Never produce generic boilerplate or unverified claims.\n"
            "- Prioritize concrete execution and genuine human utility."
        )
        return base_prompt + anti_slop_block
    return base_prompt


async def execute_subagent(
    role: str,
    objective: str,
    active_model: str,
    session_id: str = "swarm_default",
) -> Dict[str, Any]:
    """
    Executes a subagent worker task with its configured persona parameters.
    """
    clean_role = role.strip().lower()
    persona = get_persona(clean_role)

    if not persona.enabled:
        return {
            "ok": False,
            "role": role,
            "error": f"Persona '{role}' is currently disabled in user settings.",
            "output": "",
        }

    sys_prompt = get_persona_system_prompt(clean_role)
    user_message = f"Role: {persona.name}\nObjective: {objective}"

    try:
        response = await acompletion(
            model=active_model,
            messages=[
                {"role": "system", "content": sys_prompt},
                {"role": "user", "content": user_message},
            ],
            temperature=persona.temperature,
            max_tokens=persona.max_tokens,
        )
        content = response.choices[0].message.content or ""
        return {
            "ok": True,
            "role": persona.name,
            "objective": objective,
            "output": content,
            "model": active_model,
        }
    except Exception as ex:
        logger.error(f"Subagent execution failed for role '{role}': {ex}")
        return {
            "ok": False,
            "role": persona.name,
            "objective": objective,
            "error": str(ex),
            "output": f"Worker task failed: {ex}",
        }
