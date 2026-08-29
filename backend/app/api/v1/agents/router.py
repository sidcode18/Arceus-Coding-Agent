from fastapi import APIRouter, HTTPException, BackgroundTasks, Depends
from pydantic import BaseModel, Field
from typing import Optional
from sqlalchemy.ext.asyncio import AsyncSession
import structlog

from app.agents.workflows.coding_workflow import build_initial_state
from app.core.deps import get_current_active_user
from app.db.session import get_async_session
from app.models.user import User
from app.repositories.project_repository import ProjectRepository

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
    llm_provider: Optional[str] = Field(None, description="LLM provider (e.g., openai, anthropic, gemini)")
    llm_model: Optional[str] = Field(None, description="Specific model name to use")


class AgentExecuteResponse(BaseModel):
    session_id: str
    status: str
    message: str


@router.post("/execute", response_model=AgentExecuteResponse)
async def execute_agent(
    request: AgentExecuteRequest, 
    background_tasks: BackgroundTasks,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_async_session)
):
    """Execute the agent workflow (non-streaming version for simple requests)."""
    logger.info(
        "Executing agent workflow",
        message=request.message,
        project_id=request.project_id,
    )
    
    if request.project_id:
        repo = ProjectRepository(db)
        project = await repo.get_by_id(request.project_id, user_id=str(current_user.id))
        if not project:
            raise HTTPException(status_code=404, detail="Project not found")
            
    try:
        result = await _get_agent_service().execute_task(
            task_prompt=request.message,
            session_id="sync-execution",
            user_id=str(current_user.id),
            project_id=request.project_id or "",
            llm_provider=request.llm_provider or "",
            llm_model=request.llm_model or "",
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
