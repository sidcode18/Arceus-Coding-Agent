from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, ConfigDict
from typing import List, Optional
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_async_session
from app.repositories.session_repository import SessionRepository
from app.models.session import Session_
from app.models.user import User
from app.core.deps import get_current_active_user
from app.services.agent_service import agent_service
from app.repositories.project_repository import ProjectRepository

router = APIRouter()

class SessionCreate(BaseModel):
    title: Optional[str] = None
    project_id: Optional[str] = None

class SessionResponse(BaseModel):
    id: str
    user_id: str
    project_id: Optional[str] = None
    title: Optional[str] = None
    status: str

    model_config = ConfigDict(from_attributes=True)

class MessageCreate(BaseModel):
    role: str = "user"
    content: str

class ExecuteRequest(BaseModel):
    message: str
    project_id: Optional[str] = None

def _to_response(session: Session_) -> SessionResponse:
    return SessionResponse(
        id=str(session.id),
        user_id=session.user_id,
        project_id=session.project_id,
        title=session.title,
        status=session.status,
    )

@router.get("/", response_model=List[SessionResponse])
async def list_sessions(
    db: AsyncSession = Depends(get_async_session),
    current_user: User = Depends(get_current_active_user),
):
    repo = SessionRepository(db)
    sessions = await repo.get_by_user_id(str(current_user.id))
    return [_to_response(s) for s in sessions]

@router.post("/", response_model=SessionResponse, status_code=status.HTTP_201_CREATED)
async def create_session(
    session_in: SessionCreate,
    db: AsyncSession = Depends(get_async_session),
    current_user: User = Depends(get_current_active_user),
):
    if session_in.project_id:
        project_repo = ProjectRepository(db)
        project = await project_repo.get_by_id(session_in.project_id, user_id=str(current_user.id))
        if not project:
            raise HTTPException(status_code=404, detail="Project not found")

    session = Session_(
        user_id=str(current_user.id),
        project_id=session_in.project_id,
        title=session_in.title,
        status="active",
        context={},
        metadata_={},
    )
    db.add(session)
    await db.commit()
    await db.refresh(session)
    return _to_response(session)

@router.get("/{session_id}", response_model=SessionResponse)
async def get_session(
    session_id: str, 
    db: AsyncSession = Depends(get_async_session),
    current_user: User = Depends(get_current_active_user)
):
    repo = SessionRepository(db)
    session = await repo.get_by_id(session_id, user_id=str(current_user.id))
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    return _to_response(session)

@router.get("/{session_id}/messages")
async def get_session_messages(
    session_id: str, 
    db: AsyncSession = Depends(get_async_session),
    current_user: User = Depends(get_current_active_user)
):
    repo = SessionRepository(db)
    session = await repo.get_by_id(session_id, user_id=str(current_user.id))
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    messages = await repo.get_messages(session_id)
    return [
        {"id": str(m.id), "role": m.role, "content": m.content, "created_at": m.created_at}
        for m in messages
    ]

@router.post("/{session_id}/messages")
async def add_session_message(
    session_id: str,
    message_in: MessageCreate,
    db: AsyncSession = Depends(get_async_session),
    current_user: User = Depends(get_current_active_user)
):
    repo = SessionRepository(db)
    session = await repo.get_by_id(session_id, user_id=str(current_user.id))
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    message = await repo.add_message(session_id, message_in.role, message_in.content)
    await db.commit()
    return {"id": str(message.id), "role": message.role, "content": message.content}

@router.post("/{session_id}/execute")
async def execute_session(
    session_id: str,
    request: ExecuteRequest,
    db: AsyncSession = Depends(get_async_session),
    current_user: User = Depends(get_current_active_user)
):
    """Run the agent workflow within a session and persist the exchange."""
    repo = SessionRepository(db)
    session = await repo.get_by_id(session_id, user_id=str(current_user.id))
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    project_id = request.project_id or session.project_id
    if project_id:
        project_repo = ProjectRepository(db)
        project = await project_repo.get_by_id(project_id, user_id=str(current_user.id))
        if not project:
            raise HTTPException(status_code=404, detail="Project not found")

    await repo.add_message(session_id, "user", request.message)

    result = await agent_service.execute_task(
        task_prompt=request.message,
        session_id=session_id,
        project_id=project_id,
    )

    await repo.add_message(
        session_id,
        "agent",
        result.get("result", ""),
        metadata={
            "plan": result.get("plan", ""),
            "review_status": result.get("review_status", ""),
        },
    )
    await db.commit()

    return result
