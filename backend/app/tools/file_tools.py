import os
from typing import Any
import structlog

from app.tools.base import BaseTool
from app.tools.registry import ToolRegistry

logger = structlog.get_logger()

class ReadFileTool(BaseTool):
    name = "read_file"
    description = "Read the contents of a file at a specific path"
    
    async def execute(self, file_path: str, **kwargs) -> Any:
        logger.info("Executing ReadFileTool", path=file_path)
        
        # Security: Path traversal protection
        abs_path = os.path.abspath(file_path)
        workspace_root = os.path.abspath(kwargs.get("workspace_root", "/"))
        if os.path.commonpath([workspace_root, abs_path]) != workspace_root:
            return {"error": "Security Error: Path traversal detected. Access denied."}
            
        if not os.path.exists(abs_path):
            return {"error": "File not found"}
            
        with open(abs_path, "r", encoding="utf-8") as f:
            content = f.read()
            
        return {"content": content}

class WriteFileTool(BaseTool):
    name = "write_file"
    description = "Write content to a file at a specific path"
    
    async def execute(self, file_path: str, content: str, **kwargs) -> Any:
        logger.info("Executing WriteFileTool", path=file_path)
        
        # Security: Path traversal protection
        abs_path = os.path.abspath(file_path)
        workspace_root = os.path.abspath(kwargs.get("workspace_root", "/"))
        if os.path.commonpath([workspace_root, abs_path]) != workspace_root:
            return {"error": "Security Error: Path traversal detected. Access denied."}
            
        # Ensure directory exists
        os.makedirs(os.path.dirname(abs_path), exist_ok=True)
        
        with open(abs_path, "w", encoding="utf-8") as f:
            f.write(content)
            
        return {"status": "success", "file_path": abs_path}

# Register tools
ToolRegistry.register(ReadFileTool())
ToolRegistry.register(WriteFileTool())
