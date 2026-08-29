from fastapi import APIRouter

from app.api.v1.auth.router import router as auth_router
from app.api.v1.projects.router import router as projects_router
from app.api.v1.sessions.router import router as sessions_router
from app.api.v1.agents.router import router as agents_router
from app.api.v1.websocket.handler import router as websocket_router

from app.api.v1.git.router import router as git_router

api_router = APIRouter()

api_router.include_router(auth_router, prefix="/auth", tags=["auth"])
api_router.include_router(projects_router, prefix="/projects", tags=["projects"])
api_router.include_router(sessions_router, prefix="/sessions", tags=["sessions"])
api_router.include_router(agents_router, prefix="/agents", tags=["agents"])
api_router.include_router(websocket_router, prefix="/websocket", tags=["websocket"])
api_router.include_router(git_router, prefix="/git", tags=["git"])
