from abc import ABC, abstractmethod
from typing import Any, Dict, List

class CodeNode:
    """Represents a structural element of code"""
    def __init__(self, name: str, type: str, content: str, start_line: int, end_line: int):
        self.name = name
        self.type = type
        self.content = content
        self.start_line = start_line
        self.end_line = end_line
        self.children: List['CodeNode'] = []
        
    def to_dict(self) -> Dict[str, Any]:
        return {
            "name": self.name,
            "type": self.type,
            "content": self.content,
            "start_line": self.start_line,
            "end_line": self.end_line,
            "children": [c.to_dict() for c in self.children]
        }

class BaseParser(ABC):
    """Abstract base class for AST parsers"""
    
    @abstractmethod
    def parse_file(self, file_path: str) -> CodeNode:
        """Parse a file and return the AST root node"""
        pass
        
    @abstractmethod
    def parse_content(self, content: str, filename: str) -> CodeNode:
        """Parse string content and return the AST root node"""
        pass
