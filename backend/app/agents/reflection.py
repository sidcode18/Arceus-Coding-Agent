import structlog
from typing import Dict, Any, Literal
from pydantic import BaseModel, Field
from langchain_core.messages import AIMessage, HumanMessage, SystemMessage

from app.agents.base import BaseAgent

logger = structlog.get_logger()

# ---------------------------------------------------------------------------
# Structured output schema
# ---------------------------------------------------------------------------

ReflectionAction = Literal["continue", "retry", "abort"]


class ReflectionOutput(BaseModel):
    """Structured output for the ReflectionAgent.

    Using a Pydantic schema forces the LLM to emit valid JSON that is
    automatically parsed — no substring scanning of free-text output.
    """

    action: ReflectionAction = Field(
        description=(
            "Recommended next action: "
            "'continue' to proceed to the end (default when things look fine), "
            "'retry' to loop back to the retriever and try a different approach "
            "(use when errors occurred or the output is clearly wrong), "
            "'abort' to stop immediately (use only when the task is fundamentally "
            "impossible or dangerous)."
        )
    )
    assessment: str = Field(
        description="One-sentence assessment of the current state."
    )
    reasoning: str = Field(
        description="Explanation for the chosen action."
    )


# ---------------------------------------------------------------------------
# Agent
# ---------------------------------------------------------------------------


class ReflectionAgent(BaseAgent):
    """Agent for self-reflection and error correction."""

    def __init__(self):
        super().__init__("reflection")
        self._init_llm()

    async def ainvoke(self, state: Dict[str, Any]) -> Dict[str, Any]:
        """Reflect on the current state and determine if corrections are needed."""
        logger.info("ReflectionAgent analyzing current state")

        messages = state.get("messages", [])
        status = state.get("status", "in_progress")
        errors = state.get("errors", [])

        system_prompt = (
            "You are a reflective agent. Analyse the current execution state and "
            "decide whether the pipeline should continue, retry from the beginning, "
            "or abort.\n\n"
            "Guidelines:\n"
            "- Use 'continue' when the task completed successfully or with only "
            "minor, non-blocking issues.\n"
            "- Use 'retry' when there were tool failures or the output clearly does "
            "not match the user's request and a fresh retrieval pass might help.\n"
            "- Use 'abort' only when the task is fundamentally impossible (e.g., "
            "missing required credentials, destructive operation rejected).\n\n"
            "Return your verdict using the structured format provided."
        )

        # Build a concise summary of current state for the LLM
        context_parts = [f"Current status: {status}"]

        if errors:
            context_parts.append(
                "Errors encountered:\n"
                + "\n".join(f"  {i+1}. {e}" for i, e in enumerate(errors[-3:]))
            )

        recent_messages = messages[-5:] if len(messages) > 5 else messages
        message_summary = "\n".join(
            f"{msg.__class__.__name__}: {msg.content[:200]}..."
            for msg in recent_messages
        )
        context_parts.append(f"Recent messages:\n{message_summary}")

        reflection_context = "\n\n".join(context_parts)

        reflection_messages = [
            SystemMessage(content=system_prompt),
            HumanMessage(
                content=f"Please reflect on the current state:\n\n{reflection_context}"
            ),
        ]

        try:
            # Use structured output — action is guaranteed to be one of the
            # Literal values; no brittle keyword scan needed.
            reflection_output: ReflectionOutput = await self.llm.generate_structured(
                reflection_messages, schema=ReflectionOutput
            )

            logger.info(
                "ReflectionAgent completed analysis",
                action=reflection_output.action,
            )

            reflection_text = (
                f"**Assessment:** {reflection_output.assessment}\n\n"
                f"**Action:** {reflection_output.action}\n\n"
                f"**Reasoning:** {reflection_output.reasoning}"
            )

            return {
                "messages": [AIMessage(content=reflection_text)],
                "reflection_action": reflection_output.action,
                "reflection_content": reflection_text,
            }

        except Exception as e:
            logger.error("ReflectionAgent failed to analyze", error=str(e))
            return {
                "messages": [AIMessage(content=f"Reflection failed: {str(e)}")],
                "reflection_action": "continue",  # safe default on error
                "reflection_content": str(e),
            }
