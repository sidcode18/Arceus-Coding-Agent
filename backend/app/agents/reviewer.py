import structlog
from typing import Dict, Any, Literal
from pydantic import BaseModel, Field
from langchain_core.messages import AIMessage, HumanMessage, SystemMessage

from app.agents.base import BaseAgent
from app.llm.factory import LLMFactory
from app.core.config import settings

logger = structlog.get_logger()

# ---------------------------------------------------------------------------
# Structured output schema
# ---------------------------------------------------------------------------

ReviewDecision = Literal["approved", "changes_requested", "neutral"]


class ReviewOutput(BaseModel):
    """Structured output for the ReviewerAgent.

    Using a Pydantic schema forces the LLM to emit valid JSON that is
    automatically parsed — no substring scanning of free-text output.
    """

    decision: ReviewDecision = Field(
        description=(
            "Overall verdict: 'approved' if the changes are correct and complete, "
            "'changes_requested' if there are bugs or quality issues that must be "
            "fixed before merging, 'neutral' if the changes are trivial or "
            "insufficient to judge."
        )
    )
    summary: str = Field(
        description="One-sentence summary of the review outcome."
    )
    issues: list[str] = Field(
        default_factory=list,
        description="List of specific issues found (empty if approved).",
    )
    suggestions: list[str] = Field(
        default_factory=list,
        description="Optional improvement suggestions (style, performance, etc.).",
    )


# ---------------------------------------------------------------------------
# Agent
# ---------------------------------------------------------------------------


class ReviewerAgent(BaseAgent):
    """Agent for reviewing code changes and providing feedback."""

    def __init__(self):
        super().__init__("reviewer")
        self.llm = LLMFactory.get_provider("gemini", model_name=settings.gemini_model)

    async def ainvoke(self, state: Dict[str, Any]) -> Dict[str, Any]:
        """Review the code changes made by the Coder agent."""
        logger.info("ReviewerAgent reviewing code changes")

        code_changes = state.get("code_changes", [])

        if not code_changes:
            logger.warning("No code changes to review")
            return {
                "messages": [AIMessage(content="No code changes to review.")],
                "review_status": "skipped",
                "review_content": "",
            }

        system_prompt = (
            "You are a code reviewer. Review the provided code changes and return a "
            "structured verdict.\n\n"
            "Focus on:\n"
            "1. Correctness — does the code do what was asked?\n"
            "2. Code quality and best practices\n"
            "3. Potential bugs or security issues\n"
            "4. Consistency with the existing codebase style\n\n"
            "Return your verdict using the structured format provided."
        )

        # Format the changeset for review
        change_blocks = []
        for change in code_changes:
            tool = change.get("tool", "unknown")
            if change.get("error"):
                change_blocks.append(f"Tool `{tool}` FAILED: {change['error']}")
            elif change.get("command"):
                result = change.get("result") or {}
                change_blocks.append(
                    f"Command executed: {change['command']}\n"
                    f"stdout:\n{result.get('stdout', '')}\n"
                    f"stderr:\n{result.get('stderr', '')}"
                )
            else:
                change_blocks.append(
                    f"File: {change.get('file_path') or 'unknown'}\n"
                    f"New content:\n{change.get('content', '')}"
                )
        code_diff = "\n\n---\n\n".join(change_blocks)

        review_messages = [
            SystemMessage(content=system_prompt),
            HumanMessage(content=f"Please review the following code changes:\n\n{code_diff}"),
        ]

        try:
            # Use structured output — the LLM is forced to return a ReviewOutput
            # JSON object; no keyword scanning needed.
            review_output: ReviewOutput = await self.llm.generate_structured(
                review_messages, schema=ReviewOutput
            )

            logger.info(
                "ReviewerAgent completed review",
                decision=review_output.decision,
                issues=len(review_output.issues),
            )

            # Build a human-readable message from the structured output
            parts = [f"**Decision:** {review_output.decision}", f"{review_output.summary}"]
            if review_output.issues:
                parts.append("**Issues:**\n" + "\n".join(f"- {i}" for i in review_output.issues))
            if review_output.suggestions:
                parts.append(
                    "**Suggestions:**\n" + "\n".join(f"- {s}" for s in review_output.suggestions)
                )
            review_text = "\n\n".join(parts)

            return {
                "messages": [AIMessage(content=review_text)],
                "review_status": review_output.decision,
                "review_content": review_text,
            }

        except Exception as e:
            logger.error("ReviewerAgent failed to review", error=str(e))
            return {
                "messages": [AIMessage(content=f"Review failed: {str(e)}")],
                "review_status": "error",
                "review_content": str(e),
            }
