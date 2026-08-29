import structlog
import uuid
from typing import Optional
from sqlalchemy import select
from datetime import datetime

from app.db.session import async_session_maker
from app.models.memory import Memory

logger = structlog.get_logger()

class MemoryService:
    def __init__(self):
        pass

    async def add_memory(
        self, 
        user_id: str, 
        project_id: Optional[str], 
        content: str, 
        memory_type: str = "preference", 
        key: Optional[str] = None
    ) -> bool:
        """Add a memory to the database"""
        logger.info("Adding memory", user_id=user_id, project_id=project_id, type=memory_type)
        if not key:
            key = str(uuid.uuid4())
            
        async with async_session_maker() as session:
            try:
                # Check if a memory with the same key exists for this user/project
                stmt = select(Memory).filter(
                    Memory.user_id == user_id,
                    Memory.key == key
                )
                if project_id:
                    stmt = stmt.filter(Memory.project_id == project_id)
                    
                result = await session.execute(stmt)
                existing = result.scalars().first()
                
                if existing:
                    existing.content = content
                    existing.last_accessed_at = datetime.utcnow().isoformat()
                else:
                    new_mem = Memory(
                        user_id=user_id,
                        project_id=project_id,
                        memory_type=memory_type,
                        key=key,
                        content=content,
                        importance=0.8,
                        last_accessed_at=datetime.utcnow().isoformat()
                    )
                    session.add(new_mem)
                
                await session.commit()
                return True
            except Exception as e:
                logger.error("Failed to add memory", error=str(e))
                await session.rollback()
                return False

    async def get_context(self, user_id: str, project_id: Optional[str]) -> list[str]:
        """Fetch memory context for a given user and optional project."""
        async with async_session_maker() as session:
            try:
                # Get global user preferences + project specific memories
                stmt = select(Memory).filter(Memory.user_id == user_id)
                
                # If project_id provided, get memories that are either global (project_id is null) or match this project
                if project_id:
                    stmt = stmt.filter((Memory.project_id == project_id) | (Memory.project_id.is_(None)))
                else:
                    stmt = stmt.filter(Memory.project_id.is_(None))
                    
                stmt = stmt.order_by(Memory.importance.desc())
                
                result = await session.execute(stmt)
                memories = result.scalars().all()
                
                # Update access count and timestamp
                now_str = datetime.utcnow().isoformat()
                for mem in memories:
                    mem.access_count += 1
                    mem.last_accessed_at = now_str
                await session.commit()
                
                return [m.content for m in memories]
            except Exception as e:
                logger.error("Failed to get memory context", error=str(e))
                return []

memory_service = MemoryService()
