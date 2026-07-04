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
