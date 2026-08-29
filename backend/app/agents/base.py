from abc import ABC
from typing import Any, Dict, Optional

from langchain_core.messages import BaseMessage


class BaseAgent(ABC):
    """Abstract base class for all LangGraph agents."""

    def __init__(self, name: str):
        self.name = name
        self._mock_llm = None

    def get_llm(self, state: Dict[str, Any]) -> Any:
        """Lazily construct the LLM provider based on state configuration."""
        if self._mock_llm is not None:
            return self._mock_llm

        from app.core.config import settings
        from app.llm.factory import LLMFactory

        provider_name = state.get("llm_provider") or "gemini"
        model_name = state.get("llm_model") or settings.gemini_model
        
        return LLMFactory.get_provider(
            provider_name,
            model_name=model_name,
        )

    @property
    def llm(self):
        """Property wrapper strictly for testing and backward compatibility. Do not use in new agent code. Use get_llm(state) instead."""
        class MockLegacyLLM:
            def __init__(self, agent):
                self.agent = agent
            def generate(self, *args, **kwargs):
                return self.agent._mock_llm.generate(*args, **kwargs)
            def generate_structured(self, *args, **kwargs):
                return self.agent._mock_llm.generate_structured(*args, **kwargs)
            def generate_stream(self, *args, **kwargs):
                return self.agent._mock_llm.generate_stream(*args, **kwargs)
        if self._mock_llm:
            return self._mock_llm
        return MockLegacyLLM(self)

    @llm.setter
    def llm(self, value: Any) -> None:
        """Allow tests to inject a mock provider by direct assignment."""
        self._mock_llm = value

    def _init_llm(self) -> None:
        """Deprecated method, kept for backward compatibility during initialization."""
        pass

    async def ainvoke(self, state: Dict[str, Any]) -> Dict[str, Any]:
        """Invoke the agent with the current state."""
        pass
