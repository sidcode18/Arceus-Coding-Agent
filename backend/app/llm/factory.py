from typing import Dict, Type

from app.llm.base import LLMProvider
from app.llm.gemini import GeminiProvider
from app.llm.openai import OpenAIProvider
from app.llm.anthropic import AnthropicProvider

class LLMFactory:
    """Factory to create LLM providers"""
    
    _providers: Dict[str, Type[LLMProvider]] = {
        "gemini": GeminiProvider,
        "openai": OpenAIProvider,
        "anthropic": AnthropicProvider,
    }
    
    @classmethod
    def get_provider(cls, name: str, **kwargs) -> LLMProvider:
        provider_cls = cls._providers.get(name.lower())
        if not provider_cls:
            raise ValueError(f"Unknown provider: {name}")
        
        return provider_cls(**kwargs)
