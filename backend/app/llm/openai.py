import structlog
from typing import Any, AsyncGenerator, Dict, List, Optional, Type, TypeVar

from langchain_core.messages import BaseMessage
from pydantic import BaseModel

from app.core.config import settings
from app.llm.base import LLMProvider

T = TypeVar("T", bound=BaseModel)

logger = structlog.get_logger()

from tenacity import retry, stop_after_attempt, wait_exponential

class OpenAIProvider(LLMProvider):
    """OpenAI Provider implementation."""

    def __init__(self, model_name: str = "gpt-4o"):
        self.model_name = model_name
        self._llm_instance: Optional[Any] = None

    @property
    def _llm(self):
        """Return (and lazily create) the underlying LangChain OpenAI client."""
        if self._llm_instance is None:
            from langchain_openai import ChatOpenAI  # deferred import
            # We assume OPENAI_API_KEY is available in the environment or settings.
            api_key = getattr(settings, "openai_api_key", None)
            self._llm_instance = ChatOpenAI(
                model=self.model_name,
                api_key=api_key,
            )
        return self._llm_instance

    @retry(stop=stop_after_attempt(3), wait=wait_exponential(multiplier=1, min=2, max=10), reraise=True)
    async def generate(
        self,
        messages: List[BaseMessage],
        temperature: float = 0.7,
        max_tokens: Optional[int] = None,
        tools: Optional[List[Dict[str, Any]]] = None,
        system_prompt: Optional[str] = None,
    ) -> BaseMessage:
        model = self._llm
        if tools:
            model = model.bind_tools(tools)

        logger.info("Generating with OpenAI", model=self.model_name)
        response = await model.ainvoke(messages)
        return response

    @retry(stop=stop_after_attempt(3), wait=wait_exponential(multiplier=1, min=2, max=10), reraise=True)
    async def generate_structured(
        self,
        messages: List[BaseMessage],
        schema: Type[T],
    ) -> T:
        """Generate a response and parse it into *schema* via with_structured_output."""
        structured_model = self._llm.with_structured_output(schema)
        logger.info(
            "Generating structured output with OpenAI",
            model=self.model_name,
            schema=schema.__name__,
        )
        result = await structured_model.ainvoke(messages)
        return result

    async def generate_stream(
        self,
        messages: List[BaseMessage],
        temperature: float = 0.7,
        max_tokens: Optional[int] = None,
        tools: Optional[List[Dict[str, Any]]] = None,
        system_prompt: Optional[str] = None,
    ) -> AsyncGenerator[str, None]:
        model = self._llm

        logger.info("Streaming with OpenAI", model=self.model_name)
        async for chunk in model.astream(messages):
            if isinstance(chunk.content, str):
                yield chunk.content
