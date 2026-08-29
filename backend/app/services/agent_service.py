import time
import structlog
from typing import Any, Dict, Optional

from langchain_core.messages import BaseMessage, HumanMessage

from app.agents.workflows.coding_workflow import create_coding_workflow, build_initial_state

logger = structlog.get_logger()


class AgentService:
    """Runs the LangGraph coding workflow for a given task."""

    def __init__(self):
        # Build the workflow lazily so importing this module does not eagerly
        # construct agents (which connect to Qdrant / instantiate LLMs).
        self._workflow = None

    def _get_workflow(self):
        if self._workflow is None:
            self._workflow = create_coding_workflow()
        return self._workflow

    async def execute_task(
        self, 
        task_prompt: str, 
        session_id: str, 
        user_id: str, 
        project_id: Optional[str] = None,
        llm_provider: str = "",
        llm_model: str = ""
    ) -> Dict[str, Any]:
        logger.info(
            "Executing task via AgentService",
            task=task_prompt,
            session_id=session_id,
            project_id=project_id,
            provider=llm_provider,
        )

        initial_state = build_initial_state(
            message=task_prompt, 
            project_id=project_id or "", 
            user_id=user_id,
            llm_provider=llm_provider,
            llm_model=llm_model
        )
        wall_start = time.monotonic()
        final_state = await self._get_workflow().ainvoke(initial_state)
        elapsed = time.monotonic() - wall_start

        return {
            "status": "success",
            "session_id": session_id,
            "plan": final_state.get("plan", ""),
            "plan_steps": final_state.get("plan_steps", []),
            "code_changes": final_state.get("code_changes", []),
            "review_status": final_state.get("review_status", ""),
            "review_content": final_state.get("review_content", ""),
            "reflection_action": final_state.get("reflection_action", ""),
            "result": self._final_message(final_state.get("messages", [])),
            "errors": final_state.get("errors", []),
            # execution metrics
            "metrics": {
                "iteration_count": final_state.get("iteration_count", 0),
                "retry_count": final_state.get("retry_count", 0),
                "execution_time": round(elapsed, 3),
                "termination_reason": final_state.get("termination_reason", ""),
            },
        }

    @staticmethod
    def _final_message(messages: list) -> str:
        if not messages:
            return ""
        last = messages[-1]
        if isinstance(last, BaseMessage):
            return last.content
        return str(last)


agent_service = AgentService()
