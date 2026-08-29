import structlog
from typing import Any, AsyncGenerator, Dict, List, Optional, Type, TypeVar

from langchain_core.messages import BaseMessage
from pydantic import BaseModel

from app.core.config import settings
from app.llm.base import LLMProvider

T = TypeVar("T", bound=BaseModel)

logger = structlog.get_logger()


from tenacity import retry, stop_after_attempt, wait_exponential

def _to_gemini_tool(tool: Dict[str, Any]) -> Dict[str, Any]:
    """Unwrap an OpenAI-style tool schema into a flat function declaration.

    OpenAI tools are shaped as ``{"type": "function", "function": {...}}`` while
    langchain-google-genai expects the inner ``{"name", "description",
    "parameters"}`` object directly.
    """
    if isinstance(tool, dict) and tool.get("type") == "function" and "function" in tool:
        return tool["function"]
    return tool


class GeminiProvider(LLMProvider):
    """Google Gemini Provider implementation.

    The underlying ``ChatGoogleGenerativeAI`` client is constructed lazily on
    first use so that importing this module — and constructing a GeminiProvider
    instance — never requires ``GOOGLE_API_KEY`` to be present.  The key is only
    validated when a real LLM call is made.
    """

    def __init__(self, model_name: str = "gemini-1.5-pro-latest"):
        self.model_name = model_name
        # Deliberately NOT constructing ChatGoogleGenerativeAI here.
        # Use the _llm property instead.
        self._llm_instance: Optional[Any] = None

    @property
    def _llm(self):
        """Return (and lazily create) the underlying LangChain Gemini client."""
        if self._llm_instance is None:
            from langchain_google_genai import ChatGoogleGenerativeAI  # deferred import
            self._llm_instance = ChatGoogleGenerativeAI(
                model=self.model_name,
                google_api_key=settings.gemini_api_key,
                convert_system_message_to_human=True,
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
            model = model.bind_tools([_to_gemini_tool(tool) for tool in tools])

        logger.info("Generating with Gemini", model=self.model_name)
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
            "Generating structured output with Gemini",
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

        logger.info("Streaming with Gemini", model=self.model_name)
        async for chunk in model.astream(messages):
            if isinstance(chunk.content, str):
                yield chunk.content
