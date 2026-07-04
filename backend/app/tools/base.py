from abc import ABC, abstractmethod
from typing import Any, Dict, List

class BaseTool(ABC):
    """Abstract base class for all tools"""
    
    name: str
    description: str
    # JSON-schema properties describing the tool's arguments.
    parameters: Dict[str, Any] = {}
    # Names of required parameters.
    required: List[str] = []
    
    @abstractmethod
    async def execute(self, **kwargs) -> Any:
        """Execute the tool"""
        pass
    
    def to_openai_schema(self) -> Dict[str, Any]:
        """Convert tool to OpenAI/Gemini function schema"""
        return {
            "type": "function",
            "function": {
                "name": self.name,
                "description": self.description,
                "parameters": {
                    "type": "object",
                    "properties": self.parameters,
                    "required": self.required
                }
            }
        }
