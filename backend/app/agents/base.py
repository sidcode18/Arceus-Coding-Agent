from abc import ABC
from typing import Any, Dict, Optional

from langchain_core.messages import BaseMessage


class BaseAgent(ABC):
    """Abstract base class for all LangGraph agents.

    LLM initialisation is deliberately deferred to first use via the ``_llm``
    property.  Constructing an agent — including indirectly via
    ``create_coding_workflow()`` at module import time — never touches
    ``ChatGoogleGenerativeAI`` and therefore never requires ``GOOGLE_API_KEY``
    to be present in the environment.
    """

    def __init__(self, name: str):
        self.name = name
        # Store provider arguments; _llm_provider is created on first access.
        self._llm_model_name: Optional[str] = None
        self._llm_provider: Optional[Any] = None

    def _init_llm(self) -> None:
        """Called by subclass __init__ to record which model to use — without
        constructing the provider object yet."""
        from app.core.config import settings
        from app.llm.factory import LLMFactory  # deferred to avoid import-time side-effects
        self._llm_model_name = settings.gemini_model
        # We store the factory + args rather than the instance.
        self._llm_factory = LLMFactory
        self._llm_provider_name = "gemini"

    @property
    def llm(self):
        """Lazily construct and cache the LLM provider on first access."""
        if self._llm_provider is None:
            if not hasattr(self, "_llm_factory"):
                # Subclass forgot to call _init_llm(); initialise now with defaults.
                self._init_llm()
            from app.core.config import settings
            self._llm_provider = self._llm_factory.get_provider(
                self._llm_provider_name,
                model_name=self._llm_model_name or settings.gemini_model,
            )
        return self._llm_provider

    @llm.setter
    def llm(self, value: Any) -> None:
        """Allow tests to inject a mock provider by direct assignment."""
        self._llm_provider = value

    async def ainvoke(self, state: Dict[str, Any]) -> Dict[str, Any]:
        """Invoke the agent with the current state."""
        pass
