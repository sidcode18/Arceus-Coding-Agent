import structlog
from typing import Any

from app.tools.base import BaseTool
from app.tools.registry import ToolRegistry
from app.services.repository import repository_manager

logger = structlog.get_logger()


class ReadFileTool(BaseTool):
    name = "read_file"
    description = "Read the contents of a file inside the project workspace"
    parameters = {
        "file_path": {
            "type": "string",
            "description": "Path of the file relative to the project root",
        }
    }
    required = ["file_path"]

    async def execute(self, file_path: str, project_id: str = None, **kwargs) -> Any:
        logger.info("Executing ReadFileTool", path=file_path, project_id=project_id)

        if not project_id:
            return {"error": "project_id is required to resolve the workspace"}

        try:
            content = await repository_manager.read_file(project_id, file_path)
            return {"content": content}
        except ValueError as e:
            # Raised by RepositoryManager on path traversal attempts
            return {"error": f"Security Error: {e}"}
        except FileNotFoundError:
            return {"error": "File not found"}
        except IsADirectoryError as e:
            return {"error": str(e)}


class WriteFileTool(BaseTool):
    name = "write_file"
    description = "Write content to a file inside the project workspace"
    parameters = {
        "file_path": {
            "type": "string",
            "description": "Path of the file relative to the project root",
        },
        "content": {
            "type": "string",
            "description": "The full content to write to the file",
        },
    }
    required = ["file_path", "content"]

    async def execute(self, file_path: str, content: str, project_id: str = None, **kwargs) -> Any:
        logger.info("Executing WriteFileTool", path=file_path, project_id=project_id)

        if not project_id:
            return {"error": "project_id is required to resolve the workspace"}

        try:
            await repository_manager.write_file(project_id, file_path, content)
            return {"status": "success", "file_path": file_path}
        except ValueError as e:
            return {"error": f"Security Error: {e}"}


# Register tools
ToolRegistry.register(ReadFileTool())
ToolRegistry.register(WriteFileTool())
