import structlog
from typing import Dict, Any
from langchain_core.messages import HumanMessage, AIMessage, SystemMessage

from app.agents.base import BaseAgent

logger = structlog.get_logger()

# Maximum characters of code content shown per retrieved snippet in the prompt.
_MAX_SNIPPET_CHARS = 800


def _format_retrieved_context(retrieved_context: list) -> str:
    """Render retrieved code snippets as a readable fenced-block section.

    Exported so CoderAgent can reuse the same formatting without duplication.
    """
    if not retrieved_context:
        return ""
    lines = ["## Retrieved code context\n"]
    for i, ctx in enumerate(retrieved_context[:5], 1):
        file_path = ctx.get("file_path", "unknown")
        content = ctx.get("content", "").strip()
        score = ctx.get("score", 0.0)
        snippet = content[:_MAX_SNIPPET_CHARS]
        if len(content) > _MAX_SNIPPET_CHARS:
            snippet += "\n... (truncated)"
        lines.append(
            f"### [{i}] {file_path}  (relevance: {score:.3f})\n"
            f"```\n{snippet}\n```\n"
        )
    return "\n".join(lines)


class PlannerAgent(BaseAgent):
    """Agent for planning and breaking down tasks into steps"""

    def __init__(self):
        super().__init__("planner")

    async def ainvoke(self, state: Dict[str, Any]) -> Dict[str, Any]:
        """Generate a plan for the given task"""
        logger.info("PlannerAgent generating plan")

        messages = state.get("messages", [])
        retrieved_context = state.get("retrieved_context", [])

        system_prompt = (
            "You are a planning agent. Your task is to break down the user's request "
            "into a clear, actionable plan.\n"
            "You are given relevant code snippets retrieved from the project repository. "
            "Study them carefully — they show the existing structure, patterns, and "
            "file locations you must work within.\n\n"
            "Consider:\n"
            "1. What needs to be done\n"
            "2. Which existing files need to be modified (use the retrieved context)\n"
            "3. The order of operations\n"
            "4. Dependencies between steps\n"
            "5. Potential risks or edge cases\n\n"
            "Format your plan as a numbered list of specific, actionable steps. "
            "Reference concrete file paths from the retrieved context wherever relevant.\n"
            "CRITICAL: If no repository context is retrieved, do NOT ask the user to summarize their codebase or provide file contents. Make a best-effort plan based solely on the request."
        )

        # Build context — now includes full code snippets, not just file names
        context_parts = []

        memory_context = state.get("memory_context", [])
        if memory_context:
            mem_text = "\n".join(f"- {m}" for m in memory_context)
            context_parts.append(f"## Memory & User Preferences\n\n{mem_text}")

        context_block = _format_retrieved_context(retrieved_context)
        if context_block:
            context_parts.append(context_block)
            logger.info(
                "PlannerAgent received retrieved context",
                snippets=len(retrieved_context),
            )
        else:
            context_parts.append(
                "_No repository context was retrieved. Plan based on the request alone. Do NOT ask the user for their codebase._"
            )

        user_messages = [msg for msg in messages if isinstance(msg, HumanMessage)]
        if user_messages:
            user_request = user_messages[-1].content
            context_parts.append(f"## User request\n\n{user_request}")

        planning_context = "\n\n".join(context_parts)

        planning_messages = [
            SystemMessage(content=system_prompt),
            HumanMessage(content=f"Create a plan for the following request:\n\n{planning_context}"),
        ]

        try:
            plan_response = await self.get_llm(state).generate(planning_messages)
            logger.info("PlannerAgent generated plan")

            plan_content = plan_response.content
            plan_steps = self._parse_plan_steps(plan_content)

            return {
                "messages": [plan_response],
                "plan": plan_content,
                "plan_steps": plan_steps,
            }

        except Exception as e:
            logger.error("PlannerAgent failed to generate plan", error=str(e))
            error_message = AIMessage(content=f"Planning failed: {str(e)}")
            return {
                "messages": [error_message],
                "plan": "",
                "plan_steps": [],
            }

    def _parse_plan_steps(self, plan_content: str) -> list:
        """Parse plan content into individual steps"""
        steps = []
        for line in plan_content.split("\n"):
            line = line.strip()
            if line and (line[0].isdigit() or line.startswith("-")):
                step = line.split(".", 1)[-1].split("-", 1)[-1].strip()
                if step:
                    steps.append(step)
        return steps
