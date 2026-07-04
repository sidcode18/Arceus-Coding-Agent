from typing import Any, Dict, List, Optional
import structlog
from sqlalchemy import select, desc

from app.memory.base import BaseMemoryStore
from app.db.session import async_session_maker
from app.models.message import Message

logger = structlog.get_logger()

class PostgresMemoryStore(BaseMemoryStore):
    """PostgreSQL-based long-term memory store"""
    
    async def add_message(self, session_id: str, role: str, content: str, metadata: Optional[Dict[str, Any]] = None) -> bool:
        try:
            async with async_session_maker() as session:
                message = Message(
                    session_id=session_id,
                    role=role,
                    content=content,
                    metadata_=metadata or {}
                )
                session.add(message)
                await session.commit()
                return True
        except Exception as e:
            logger.error("Failed to add message to Postgres", error=str(e), session_id=session_id)
            return False
            
    async def get_messages(self, session_id: str, limit: int = 50) -> List[Dict[str, Any]]:
        try:
            async with async_session_maker() as session:
                # Get the most recent messages for the session
                stmt = select(Message).where(Message.session_id == session_id).order_by(desc(Message.created_at)).limit(limit)
                result = await session.execute(stmt)
                messages = result.scalars().all()
                
                # Reverse to get chronological order
                messages = list(reversed(messages))
                
                return [
                    {
                        "role": msg.role,
                        "content": msg.content,
                        "metadata": msg.metadata_
                    }
                    for msg in messages
                ]
        except Exception as e:
            logger.error("Failed to get messages from Postgres", error=str(e), session_id=session_id)
            return []
            
    async def clear_session(self, session_id: str) -> bool:
        # We usually don't delete from Postgres for compliance/history, but can implement soft delete
        pass
