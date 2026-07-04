from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_async_session

router = APIRouter()

@router.get("/")
async def list_sessions(db: AsyncSession = Depends(get_async_session)):
    return []

@router.post("/")
async def create_session(db: AsyncSession = Depends(get_async_session)):
    return {"status": "created"}
