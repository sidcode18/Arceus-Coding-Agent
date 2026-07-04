import structlog
from typing import Any, AsyncGenerator, Dict, List, Optional

from langchain_core.messages import AIMessage, BaseMessage
from langchain_google_genai import ChatGoogleGenerativeAI

from app.core.config import settings
from app.llm.base import LLMProvider

logger = structlog.get_logger()


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
            # Note: tools must be formatted for OpenAI/Gemini compatible schema
            # We can use LangChain's standard formatting for tools
            model = model.bind_tools(tools)
            
        logger.info("Generating with Gemini", model=self.model_name)
        response = await model.ainvoke(messages)
        return response

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
