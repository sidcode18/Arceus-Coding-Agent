import structlog
from typing import Any, Dict, Optional

from langchain_core.messages import BaseMessage, HumanMessage

from app.agents.workflows.coding_workflow import create_coding_workflow

logger = structlog.get_logger()


def _build_initial_state(message: str, project_id: Optional[str]) -> Dict[str, Any]:
    return {
        "messages": [HumanMessage(content=message)],
        "plan": "",
        "plan_steps": [],
        "retrieved_context": [],
        "code_changes": [],
        "review_status": "",
        "review_content": "",
        "reflection_action": "",
        "reflection_content": "",
        "status": "starting",
        "errors": [],
        "project_id": project_id or "",
    }


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
        self, task_prompt: str, session_id: str, project_id: Optional[str] = None
    ) -> Dict[str, Any]:
        logger.info(
            "Executing task via AgentService",
            task=task_prompt,
            session_id=session_id,
            project_id=project_id,
        )

        initial_state = _build_initial_state(task_prompt, project_id)
        final_state = await self._get_workflow().ainvoke(initial_state)

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
