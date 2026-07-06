import structlog
from typing import Dict, Any
from langchain_core.messages import AIMessage, HumanMessage, SystemMessage

from app.agents.base import BaseAgent
from app.tools.registry import ToolRegistry
from app.agents.planner import _format_retrieved_context

logger = structlog.get_logger()


class CoderAgent(BaseAgent):
    """Agent for writing code and executing tools"""

    def __init__(self):
        super().__init__("coder")
        self._init_llm()
        self.tool_registry = ToolRegistry()

    async def ainvoke(self, state: Dict[str, Any]) -> Dict[str, Any]:
        """Execute code changes based on the plan"""
        logger.info("CoderAgent executing code changes")

        messages = state.get("messages", [])
        plan_steps = state.get("plan_steps", [])
        retrieved_context = state.get("retrieved_context", [])
        project_id = state.get("project_id")

        # The system prompt explicitly instructs the model to ground its writes
        # in the retrieved snippets — preserving existing style and targeting the
        # correct file paths before invoking write_file.
        system_prompt = (
            "You are a coding agent. Your task is to implement the planned changes "
            "using the available tools.\n\n"
            "Available tools:\n"
            "- read_file: Read the contents of a file\n"
            "- write_file: Write content to a file\n"
            "- run_command: Execute terminal commands\n\n"
            "You are given retrieved code snippets from the repository. "
            "Use them to:\n"
            "  • Understand the existing file structure and coding conventions.\n"
            "  • Identify which files to modify (prefer files already in the context).\n"
            "  • Preserve existing imports, style, and patterns in any new code.\n\n"
            "When making changes:\n"
            "1. Consult the retrieved snippets to understand current state before writing.\n"
            "2. Make precise, targeted changes with write_file — do not rewrite "
            "unrelated code.\n"
            "3. Use run_command for testing or validation if needed.\n"
            "4. Follow the plan steps exactly.\n\n"
            "Always provide clear explanations for your actions."
        )

        # Retrieved context comes first so the model attends to it before reading
        # the plan — placing relevant code high in the context window.
        context_parts = []

        context_block = _format_retrieved_context(retrieved_context)
        if context_block:
            context_parts.append(context_block)
            logger.info(
                "CoderAgent received retrieved context",
                snippets=len(retrieved_context),
            )
        else:
            context_parts.append(
                "_No repository context was retrieved. Implement based on the plan alone._"
            )

        if plan_steps:
            steps_text = "\n".join(
                f"{i}. {step}" for i, step in enumerate(plan_steps, 1)
            )
            context_parts.append(f"## Plan to implement\n\n{steps_text}")

        if project_id:
            context_parts.append(f"_Project ID: `{project_id}`_")

        coding_context = "\n\n".join(context_parts)

        coding_messages = [
            SystemMessage(content=system_prompt),
            HumanMessage(content=f"Implement the following plan:\n\n{coding_context}"),
        ]

        # Append conversation history so the coder can see prior agent outputs
        coding_messages.extend(messages)

        try:
            tool_schemas = self.tool_registry.get_openai_schemas()

            response = await self.llm.generate(
                coding_messages,
                tools=tool_schemas,
            )

            logger.info("CoderAgent generated response")

            code_changes = []

            if hasattr(response, "tool_calls") and response.tool_calls:
                for tool_call in response.tool_calls:
                    tool_name = tool_call.get("name")
                    tool_args = tool_call.get("args", {})

                    try:
                        if project_id:
                            tool_args["project_id"] = project_id

                        tool = self.tool_registry.get_tool(tool_name)
                        result = await tool.execute(**tool_args)

                        code_changes.append(
                            {
                                "tool": tool_name,
                                "file_path": tool_args.get("file_path", ""),
                                "content": tool_args.get("content", ""),
                                "command": tool_args.get("command", ""),
                                "result": result,
                                "error": None,
                            }
                        )

                        logger.info("CoderAgent executed tool", tool=tool_name)

                    except Exception as e:
                        logger.error(
                            "CoderAgent tool execution failed",
                            tool=tool_name,
                            error=str(e),
                        )
                        code_changes.append(
                            {
                                "tool": tool_name,
                                "file_path": tool_args.get("file_path", ""),
                                "content": tool_args.get("content", ""),
                                "command": tool_args.get("command", ""),
                                "result": None,
                                "error": str(e),
                            }
                        )

            return {
                "messages": [response],
                "code_changes": code_changes,
            }

        except Exception as e:
            logger.error("CoderAgent failed to execute", error=str(e))
            error_message = AIMessage(content=f"Code execution failed: {str(e)}")
            return {
                "messages": [error_message],
                "code_changes": [],
                "errors": [str(e)],
            }
