from typing import List, Optional
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from pydantic import BaseModel

from app.models.project import Project
from app.repositories.base import BaseRepository
from app.api.v1.projects.schemas import ProjectCreate

class ProjectUpdate(BaseModel):
    pass

class ProjectRepository(BaseRepository[Project, ProjectCreate, ProjectUpdate]):
    def __init__(self, session: AsyncSession):
        super().__init__(Project, session)
        
    async def get_by_user_id(self, user_id: str) -> List[Project]:
        statement = select(self.model).where(self.model.user_id == user_id)
        result = await self.session.execute(statement)
        return list(result.scalars().all())
    async def get_by_id(self, id: str, user_id: Optional[str] = None) -> Project | None:
        statement = select(self.model).where(self.model.id == id)
        if user_id:
            statement = statement.where(self.model.user_id == user_id)
        result = await self.session.execute(statement)
        return result.scalar_one_or_none()

    async def delete(self, id: str, user_id: Optional[str] = None) -> bool:
        db_obj = await self.get_by_id(id, user_id=user_id)
        if db_obj:
            await self.session.delete(db_obj)
            await self.session.flush()
            return True
        return False
