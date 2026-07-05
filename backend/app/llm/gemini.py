import structlog
from typing import Any, AsyncGenerator, Dict, List, Optional, Type, TypeVar

from langchain_core.messages import BaseMessage
from langchain_google_genai import ChatGoogleGenerativeAI
from pydantic import BaseModel

from app.core.config import settings
from app.llm.base import LLMProvider

T = TypeVar("T", bound=BaseModel)

logger = structlog.get_logger()


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
    """Google Gemini Provider implementation"""

    def __init__(self, model_name: str = "gemini-1.5-pro-latest"):
        self.model_name = model_name
        self.llm = ChatGoogleGenerativeAI(
            model=model_name,
            google_api_key=settings.gemini_api_key,
            convert_system_message_to_human=True
        )

    async def generate(
        self,
        messages: List[BaseMessage],
        temperature: float = 0.7,
        max_tokens: Optional[int] = None,
        tools: Optional[List[Dict[str, Any]]] = None,
        system_prompt: Optional[str] = None,
    ) -> BaseMessage:
        
        # Combine system prompt if provided
        # Langchain ChatGoogleGenerativeAI handles system messages
        
        model = self.llm
        if tools:
            # langchain-google-genai expects flat function declarations, not the
            # OpenAI ``{"type": "function", "function": {...}}`` envelope; passing
            # the wrapped form yields empty function names and a 400 from Gemini.
            model = model.bind_tools([_to_gemini_tool(tool) for tool in tools])
            
        logger.info("Generating with Gemini", model=self.model_name)
        response = await model.ainvoke(messages)
        return response

    async def generate_structured(
        self,
        messages: List[BaseMessage],
        schema: Type[T],
    ) -> T:
        """Generate a response and parse it into *schema* via with_structured_output.

        langchain-google-genai supports ``with_structured_output`` with Pydantic
        models, which instructs Gemini to return JSON conforming to the schema.
        The result is automatically parsed and validated — no keyword scanning.
        """
        structured_model = self.llm.with_structured_output(schema)
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
        
        model = self.llm
        
        logger.info("Streaming with Gemini", model=self.model_name)
        async for chunk in model.astream(messages):
            if isinstance(chunk.content, str):
                yield chunk.content
