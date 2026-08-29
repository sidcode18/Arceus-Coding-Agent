"""User repository."""
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.user import User
from app.repositories.base import BaseRepository


from datetime import datetime

class UserCreate(BaseModel):
    github_id: str | None = None
    username: str
    email: str
    hashed_password: str | None = None
    avatar_url: str | None = None
    full_name: str | None = None
    bio: str | None = None


class UserUpdate(BaseModel):
    username: str | None = None
    email: str | None = None
    hashed_password: str | None = None
    avatar_url: str | None = None
    full_name: str | None = None
    bio: str | None = None
    is_active: bool | None = None
    is_superuser: bool | None = None
    last_login_at: datetime | None = None


class UserRepository(BaseRepository[User, UserCreate, UserUpdate]):
    def __init__(self, session: AsyncSession):
        super().__init__(User, session)

    async def get_by_github_id(self, github_id: str) -> User | None:
        result = await self.session.execute(
            select(self.model).where(self.model.github_id == github_id)
        )
        return result.scalar_one_or_none()

    async def get_by_email(self, email: str) -> User | None:
        result = await self.session.execute(select(self.model).where(self.model.email == email))
        return result.scalar_one_or_none()
