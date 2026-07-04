from typing import Dict, List, Type

from app.tools.base import BaseTool

class ToolRegistry:
    """Registry for managing available tools"""
    
    _tools: Dict[str, BaseTool] = {}
    
    @classmethod
    def register(cls, tool: BaseTool) -> None:
        cls._tools[tool.name] = tool
        
    @classmethod
    def get_tool(cls, name: str) -> BaseTool:
        if name not in cls._tools:
            raise ValueError(f"Tool not found: {name}")
        return cls._tools[name]
        
    @classmethod
    def get_all_tools(cls) -> List[BaseTool]:
        return list(cls._tools.values())
        
    @classmethod
    def get_openai_schemas(cls) -> List[Dict]:
        return [tool.to_openai_schema() for tool in cls._tools.values()]

# Global registry instance is just the class methods, but we can export it
registry = ToolRegistry()
