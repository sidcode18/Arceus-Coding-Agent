from fastapi import APIRouter, HTTPException, BackgroundTasks
from pydantic import BaseModel, Field
from typing import Optional
import structlog
from langchain_core.messages import HumanMessage

from app.agents.workflows.coding_workflow import create_coding_workflow

logger = structlog.get_logger()

router = APIRouter()


class AgentExecuteRequest(BaseModel):
    message: str = Field(..., description="The user's request or task")
    project_id: Optional[str] = Field(None, description="Project ID for context")


class AgentExecuteResponse(BaseModel):
    session_id: str
    status: str
    message: str


@router.post("/execute", response_model=AgentExecuteResponse)
async def execute_agent(request: AgentExecuteRequest, background_tasks: BackgroundTasks):
    """Execute the agent workflow (non-streaming version for simple requests)"""
    logger.info("Executing agent workflow", message=request.message, project_id=request.project_id)
    
    try:
        workflow = create_coding_workflow()
        
        # Build initial state
        initial_state = {
            "messages": [HumanMessage(content=request.message)],
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
            "project_id": request.project_id or ""
        }
        
        # Execute workflow (non-streaming)
        final_state = await workflow.ainvoke(initial_state)
        
        return AgentExecuteResponse(
            session_id="sync-execution",
            status="completed",
            message="Workflow executed successfully"
        )
        
    except Exception as e:
        logger.error("Agent execution failed", error=str(e))
        raise HTTPException(status_code=500, detail=f"Agent execution failed: {str(e)}")


@router.get("/health")
async def agent_health():
    """Health check for agent system"""
    return {
        "status": "healthy",
        "agents": ["retriever", "planner", "coder", "reviewer", "reflection"],
        "workflow": "coding_workflow"
    }
