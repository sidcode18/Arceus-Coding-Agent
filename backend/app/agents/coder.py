import structlog
from typing import Dict, Any, List
from langchain_core.messages import AIMessage, HumanMessage, SystemMessage, ToolMessage

from app.agents.base import BaseAgent
from app.llm.factory import LLMFactory
from app.core.config import settings
from app.tools.registry import ToolRegistry

logger = structlog.get_logger()


class CoderAgent(BaseAgent):
    """Agent for writing code and executing tools"""
    
    def __init__(self):
        super().__init__("coder")
        self.llm = LLMFactory.get_provider("gemini", model_name=settings.gemini_model)
        self.tool_registry = ToolRegistry()
    
    async def ainvoke(self, state: Dict[str, Any]) -> Dict[str, Any]:
        """Execute code changes based on the plan"""
        logger.info("CoderAgent executing code changes")
        
        messages = state.get("messages", [])
        plan_steps = state.get("plan_steps", [])
        project_id = state.get("project_id")
        
        # Build coding prompt
        system_prompt = """You are a coding agent. Your task is to implement the planned changes using the available tools.
Available tools:
- read_file: Read the contents of a file
- write_file: Write content to a file
- run_command: Execute terminal commands

When making changes:
1. Read existing files to understand the current state
2. Make necessary changes using write_file
3. Use run_command for testing or validation if needed
4. Be precise and follow the plan steps

Always provide clear explanations for your actions.
"""
        
        # Build context for coding
        context_parts = []
        
        if plan_steps:
            context_parts.append("Plan to implement:")
            for i, step in enumerate(plan_steps, 1):
                context_parts.append(f"{i}. {step}")
        
        if project_id:
            context_parts.append(f"Working in project: {project_id}")
        
        coding_context = "\n\n".join(context_parts) if context_parts else "Implement the requested changes."
        
        coding_messages = [
            SystemMessage(content=system_prompt),
            HumanMessage(content=f"Implement the following plan:\n\n{coding_context}")
        ]
        
        # Add previous messages for context
        coding_messages.extend(messages)
        
        try:
            # Get available tools as OpenAI schemas
            tool_schemas = self.tool_registry.get_openai_schemas()
            
            # Generate response with tools
            response = await self.llm.generate(
                coding_messages,
                tools=tool_schemas
            )
            
            logger.info("CoderAgent generated response")
            
            # Check if the LLM wants to use tools
            code_changes = []
            
            if hasattr(response, 'tool_calls') and response.tool_calls:
                # Execute tool calls
                for tool_call in response.tool_calls:
                    tool_name = tool_call.get('name')
                    tool_args = tool_call.get('args', {})
                    
                    try:
                        # Add project_id to tool args if available
                        if project_id:
                            tool_args['project_id'] = project_id
                        
                        tool = self.tool_registry.get_tool(tool_name)
                        result = await tool.execute(**tool_args)
                        
                        # Record the change
                        code_changes.append({
                            "tool": tool_name,
                            "args": tool_args,
                            "result": result
                        })
                        
                        logger.info("CoderAgent executed tool", tool=tool_name)
                        
                    except Exception as e:
                        logger.error("CoderAgent tool execution failed", tool=tool_name, error=str(e))
                        code_changes.append({
                            "tool": tool_name,
                            "args": tool_args,
                            "error": str(e)
                        })
            
            return {
                "messages": [response],
                "code_changes": code_changes
            }
            
        except Exception as e:
            logger.error("CoderAgent failed to execute", error=str(e))
            error_message = AIMessage(content=f"Code execution failed: {str(e)}")
            return {
                "messages": [error_message],
                "code_changes": [],
                "errors": [str(e)]
            }
