import asyncio
import os
import structlog
from typing import Any

from app.tools.base import BaseTool
from app.tools.registry import ToolRegistry
from app.services.repository import repository_manager

logger = structlog.get_logger()

class TerminalTool(BaseTool):
    name = "run_command"
    description = "Run a terminal command inside the project workspace"
    parameters = {
        "command": {
            "type": "string",
            "description": "The shell command to run inside the project workspace",
        }
    }
    required = ["command"]
    
    async def execute(self, command: str, project_id: str = None, **kwargs) -> Any:
        # Resolve the working directory to the project's cloned repository so
        # commands run inside the workspace rather than the process cwd.
        if project_id:
            cwd = repository_manager.get_repo_path(project_id)
            if not os.path.isdir(cwd):
                return {"error": f"Workspace for project {project_id} not found on disk"}
        else:
            cwd = kwargs.get("cwd", ".")

        logger.info("Executing TerminalTool", command=command, cwd=cwd)
        
        # Security: Basic command validation
        forbidden_commands = ["rm -rf /", "mkfs", "dd", "shutdown", "reboot"]
        if any(cmd in command for cmd in forbidden_commands):
            return {"error": "Security Error: Command execution denied by policy."}
        
        process = await asyncio.create_subprocess_shell(
            command,
            cwd=cwd,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE
        )
        
        stdout, stderr = await process.communicate()
        
        return {
            "stdout": stdout.decode() if stdout else "",
            "stderr": stderr.decode() if stderr else "",
            "exit_code": process.returncode
        }

# Register tools
ToolRegistry.register(TerminalTool())
