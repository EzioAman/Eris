"""
Backward-compatibility adapter for engine.py.
Delegates cleanly to app.agent.runner.AgentRunner and LangGraph.
"""

from typing import Any, AsyncGenerator, Dict, List, Optional
try:
    from backend.app.agent.runner import AgentRunner, runner
except ImportError:
    from app.agent.runner import AgentRunner, runner


class AgentEngine:
    """Delegating adapter preserving interface of legacy AgentEngine."""

    def __init__(self):
        self._runner = runner

    @property
    def active_model(self) -> str:
        return self._runner.active_model

    @active_model.setter
    def active_model(self, val: str):
        self._runner.set_active_model(val)

    @property
    def execution_mode(self) -> str:
        return self._runner.execution_mode

    @execution_mode.setter
    def execution_mode(self, val: str):
        self._runner.set_execution_mode(val)

    @property
    def memory(self) -> Dict[str, Any]:
        return self._runner.memory

    def save_memory(self):
        self._runner.save_memory()

    def append_to_history(self, role: str, content: str):
        self._runner.append_to_history(role, content)

    def apply_model_selection(self, model_id: str) -> bool:
        return self._runner.set_active_model(model_id)

    def fetch_models(self, force_refresh: bool = False) -> List[Dict[str, Any]]:
        return self._runner.fetch_models(force_refresh=force_refresh)

    def get_fallback_models(self) -> List[Dict[str, Any]]:
        return self._runner.get_fallback_models()

    async def stream_single_turn(
        self,
        user_prompt: str,
        session_id: str = "default_session",
        active_model: Optional[str] = None,
        execution_mode: Optional[str] = None,
    ) -> AsyncGenerator[Dict[str, Any], None]:
        """Streams execution events using the LangGraph engine."""
        async for event in self._runner.stream_turn(
            message=user_prompt,
            session_id=session_id,
            active_model=active_model,
            execution_mode=execution_mode,
        ):
            yield event
