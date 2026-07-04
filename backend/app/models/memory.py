"""Memory model"""
from sqlalchemy import Boolean, Float, Integer, String, Text
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base, TimestampMixin, UUIDMixin


class Memory(Base, UUIDMixin, TimestampMixin):
    """Memory model"""
    
    __tablename__ = "memory"
    
    user_id: Mapped[str] = mapped_column(String(255), nullable=False, index=True)
    project_id: Mapped[str | None] = mapped_column(String(255), nullable=True, index=True)
    memory_type: Mapped[str] = mapped_column(String(50), nullable=False, index=True)
    key: Mapped[str] = mapped_column(String(255), nullable=False)
    content: Mapped[str] = mapped_column(Text, nullable=False)
    importance: Mapped[float] = mapped_column(Float, default=0.5, nullable=False, index=True)
    access_count: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    last_accessed_at: Mapped[str | None] = mapped_column(String(255), nullable=True)
    expires_at: Mapped[str | None] = mapped_column(String(255), nullable=True, index=True)
    metadata_: Mapped[dict] = mapped_column("metadata", JSONB, default={}, nullable=False)
