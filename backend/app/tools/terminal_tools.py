import asyncio
import structlog
from typing import Any

from app.tools.base import BaseTool
from app.tools.registry import ToolRegistry

logger = structlog.get_logger()

class TerminalTool(BaseTool):
    name = "run_command"
    description = "Run a terminal command"
    
    async def execute(self, command: str, cwd: str = ".", **kwargs) -> Any:
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
