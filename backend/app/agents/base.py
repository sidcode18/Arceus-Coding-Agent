from abc import ABC
from typing import Dict, Any
from langchain_core.messages import BaseMessage

class BaseAgent(ABC):
    """Abstract base class for all LangGraph agents"""
    
    def __init__(self, name: str):
        self.name = name

    async def ainvoke(self, state: Dict[str, Any]) -> Dict[str, Any]:
        """Invoke the agent with the current state"""
        pass
