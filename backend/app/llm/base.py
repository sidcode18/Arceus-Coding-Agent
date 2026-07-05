from abc import ABC, abstractmethod
from typing import Any, AsyncGenerator, Dict, List, Optional, Type, TypeVar

from langchain_core.messages import BaseMessage
from pydantic import BaseModel

T = TypeVar("T", bound=BaseModel)


class LLMProvider(ABC):
    """Abstract base class for LLM providers"""

    @abstractmethod
    async def generate(
        self,
        messages: List[BaseMessage],
        temperature: float = 0.7,
        max_tokens: Optional[int] = None,
        tools: Optional[List[Dict[str, Any]]] = None,
        system_prompt: Optional[str] = None,
    ) -> BaseMessage:
        """Generate a response from the LLM"""
        pass

    @abstractmethod
    async def generate_stream(
        self,
        messages: List[BaseMessage],
        temperature: float = 0.7,
        max_tokens: Optional[int] = None,
        tools: Optional[List[Dict[str, Any]]] = None,
        system_prompt: Optional[str] = None,
    ) -> AsyncGenerator[str, None]:
        """Stream a response from the LLM"""
        pass

    async def generate_structured(
        self,
        messages: List[BaseMessage],
        schema: Type[T],
    ) -> T:
        """Generate a structured response validated against a Pydantic schema.

        Providers that support native structured output should override this
        method.  The default implementation raises NotImplementedError so that
        callers can fall back gracefully.
        """
        raise NotImplementedError(
            f"{self.__class__.__name__} does not implement generate_structured"
        )
