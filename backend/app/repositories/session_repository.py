from typing import List
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from pydantic import BaseModel

from app.models.session import Session_
from app.models.message import Message
from app.repositories.base import BaseRepository


class SessionUpdate(BaseModel):
    pass


class SessionRepository(BaseRepository[Session_, BaseModel, SessionUpdate]):
    def __init__(self, session: AsyncSession):
        super().__init__(Session_, session)

    async def get_by_user_id(self, user_id: str) -> List[Session_]:
        statement = select(self.model).where(self.model.user_id == user_id)
        result = await self.session.execute(statement)
        return list(result.scalars().all())

    async def add_message(self, session_id: str, role: str, content: str, metadata: dict | None = None) -> Message:
        message = Message(
            session_id=session_id,
            role=role,
            content=content,
            metadata_=metadata or {},
        )
        self.session.add(message)
        await self.session.flush()
        await self.session.refresh(message)
        return message

    async def get_messages(self, session_id: str) -> List[Message]:
        statement = (
            select(Message)
            .where(Message.session_id == session_id)
            .order_by(Message.created_at.asc())
        )
        result = await self.session.execute(statement)
        return list(result.scalars().all())
