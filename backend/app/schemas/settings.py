from typing import Dict, Optional
from pydantic import BaseModel, Field


class PersonaSettings(BaseModel):
    """
    User-adjustable operational parameters for a single swarm worker persona.
    Permits tuning temperature and token boundaries while enforcing strict anti-slop rules.
    """
    name: str = Field(description="Human-friendly persona name.")
    role: str = Field(description="Operational specialty of the worker.")
    temperature: float = Field(default=0.2, ge=0.0, le=2.0, description="Sampling randomness (0.0=deterministic, 2.0=creative).")
    max_tokens: int = Field(default=1500, ge=100, le=4000, description="Upper bound of generated tokens.")
    enabled: bool = Field(default=True, description="Whether this worker can be dispatched in swarms.")
    anti_slop: bool = Field(default=True, description="Enforces zero-placeholder, verified answers rule.")
    system_prompt: Optional[str] = Field(default=None, description="Custom prompt overlay if customized by user.")


def get_default_personas() -> Dict[str, PersonaSettings]:
    """Returns factory default configurations for all 6 specialized worker personas."""
    return {
        "coder": PersonaSettings(
            name="Senior Coder",
            role="Production software implementation and clean bug-fixing",
            temperature=0.2,
            max_tokens=2000,
            enabled=True,
            anti_slop=True,
        ),
        "writer": PersonaSettings(
            name="Content Writer",
            role="Clear technical documentation and concise human explanations",
            temperature=0.7,
            max_tokens=1500,
            enabled=True,
            anti_slop=True,
        ),
        "security": PersonaSettings(
            name="Security Auditor",
            role="Vulnerability analysis, command-injection defense, and path containment",
            temperature=0.1,
            max_tokens=1500,
            enabled=True,
            anti_slop=True,
        ),
        "researcher": PersonaSettings(
            name="Fact Researcher",
            role="Factual knowledge verification and official documentation synthesis",
            temperature=0.2,
            max_tokens=2000,
            enabled=True,
            anti_slop=True,
        ),
        "tester": PersonaSettings(
            name="Quality Tester",
            role="Edge-case fuzzing, unit test execution, and contract validation",
            temperature=0.15,
            max_tokens=1500,
            enabled=True,
            anti_slop=True,
        ),
        "optimizer": PersonaSettings(
            name="Performance Optimizer",
            role="Async execution tuning, latency profiling, and memory efficiency",
            temperature=0.2,
            max_tokens=1500,
            enabled=True,
            anti_slop=True,
        ),
    }


class UserSettings(BaseModel):
    """
    User settings governing Eris behavior, models, and worker personas.
    Stored persistently in memory/user_settings.json.
    """
    default_model: str = Field(default="gemini/gemini-3.6-flash", description="Default LLM model identifier.")
    execution_mode: str = Field(default="speed", description="Execution mode: speed or accuracy.")
    auto_approve_safe_tools: bool = Field(default=True, description="Automatically approve read-only tools without human intervention.")
    personas: Dict[str, PersonaSettings] = Field(default_factory=get_default_personas, description="Configured swarm personas.")

    @classmethod
    def get_defaults(cls) -> "UserSettings":
        """Returns a pristine UserSettings instance with factory defaults."""
        return cls(
            default_model="gemini/gemini-3.6-flash",
            execution_mode="speed",
            auto_approve_safe_tools=True,
            personas=get_default_personas(),
        )
