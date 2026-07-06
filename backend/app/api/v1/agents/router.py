from fastapi import APIRouter, HTTPException, BackgroundTasks
from pydantic import BaseModel, Field
from typing import Optional
import structlog

from app.agents.workflows.coding_workflow import build_initial_state

logger = structlog.get_logger()

router = APIRouter()

# ---------------------------------------------------------------------------
# Lazy workflow — reuse the same compiled graph across requests rather than
# rebuilding it on every call. The module-level variable is set to None so
# that importing this module never constructs agents or touches LLM providers.
# ---------------------------------------------------------------------------
_agent_service = None


def _get_agent_service():
    """Return (and lazily create) the shared AgentService instance."""
    global _agent_service
    if _agent_service is None:
        from app.services.agent_service import agent_service
        _agent_service = agent_service
    return _agent_service


class AgentExecuteRequest(BaseModel):
    message: str = Field(..., description="The user's request or task")
    project_id: Optional[str] = Field(None, description="Project ID for context")


class AgentExecuteResponse(BaseModel):
    session_id: str
    status: str
    message: str


@router.post("/execute", response_model=AgentExecuteResponse)
async def execute_agent(request: AgentExecuteRequest, background_tasks: BackgroundTasks):
    """Execute the agent workflow (non-streaming version for simple requests)."""
    logger.info(
        "Executing agent workflow",
        message=request.message,
        project_id=request.project_id,
    )
    try:
        result = await _get_agent_service().execute_task(
            task_prompt=request.message,
            session_id="sync-execution",
            project_id=request.project_id or "",
        )
        return AgentExecuteResponse(
            session_id="sync-execution",
            status=result.get("status", "completed"),
            message=result.get("result", "Workflow executed successfully"),
        )
    except Exception as e:
        logger.error("Agent execution failed", error=str(e))
        raise HTTPException(status_code=500, detail=f"Agent execution failed: {str(e)}")


@router.get("/health")
async def agent_health():
    """Health check for agent system."""
    return {
        "status": "healthy",
        "agents": ["retriever", "planner", "coder", "reviewer", "reflection"],
        "workflow": "coding_workflow",
    }
