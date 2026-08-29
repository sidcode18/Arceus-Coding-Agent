"""Database session management"""
from typing import AsyncGenerator

from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from app.core.config import settings
from app.db.base import Base


def _to_async_url(url: str) -> str:
    """Ensure the database URL uses an async driver.

    The async engine requires an async driver (asyncpg). Environments that
    provide a plain ``postgresql://`` (or psycopg2) URL are normalized so the
    engine can be created without a sync-driver error.
    """
    if url.startswith("postgresql+asyncpg://"):
        return url
    if url.startswith("postgresql+psycopg2://"):
        return "postgresql+asyncpg://" + url[len("postgresql+psycopg2://"):]
    if url.startswith("postgresql://"):
        return "postgresql+asyncpg://" + url[len("postgresql://"):]
    if url.startswith("postgres://"):
        return "postgresql+asyncpg://" + url[len("postgres://"):]
    return url


import sys
from sqlalchemy import pool

engine_kwargs = {
    "echo": settings.debug,
}
if "pytest" in sys.modules:
    engine_kwargs["poolclass"] = pool.NullPool
else:
    engine_kwargs["pool_size"] = settings.database_pool_size
    engine_kwargs["max_overflow"] = settings.database_max_overflow

# Create async engine
engine = create_async_engine(
    _to_async_url(settings.database_url),
    **engine_kwargs
)

# Create async session factory
async_session_maker = async_sessionmaker(
    engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autocommit=False,
    autoflush=False,
)

async def get_async_session() -> AsyncGenerator[AsyncSession, None]:
    """Get async database session"""
    async with async_session_maker() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()


async def init_db() -> None:
    """Initialize database"""
    import app.models  # noqa: F401 - load model metadata before create_all

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)


async def close_db() -> None:
    """Close database connections"""
    await engine.dispose()
