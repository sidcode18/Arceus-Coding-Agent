"""Session model"""
from sqlalchemy import String, Text
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base, TimestampMixin, UUIDMixin


class Session_(Base, UUIDMixin, TimestampMixin):
    """Session model"""
    
    __tablename__ = "sessions"
    
    user_id: Mapped[str] = mapped_column(String(255), nullable=False, index=True)
    project_id: Mapped[str | None] = mapped_column(String(255), nullable=True, index=True)
    title: Mapped[str | None] = mapped_column(String(255), nullable=True)
    status: Mapped[str] = mapped_column(String(50), default="active", nullable=False, index=True)
    context: Mapped[dict] = mapped_column(JSONB, default={}, nullable=False)
    metadata_: Mapped[dict] = mapped_column("metadata", JSONB, default={}, nullable=False)
    completed_at: Mapped[str | None] = mapped_column(String(255), nullable=True)
