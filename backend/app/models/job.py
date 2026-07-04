"""Job model"""
from sqlalchemy import Integer, String, Text
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base, TimestampMixin, UUIDMixin


class Job(Base, UUIDMixin, TimestampMixin):
    """Job model"""
    
    __tablename__ = "jobs"
    
    user_id: Mapped[str | None] = mapped_column(String(255), nullable=True, index=True)
    project_id: Mapped[str | None] = mapped_column(String(255), nullable=True, index=True)
    job_type: Mapped[str] = mapped_column(String(100), nullable=False, index=True)
    status: Mapped[str] = mapped_column(String(50), default="pending", nullable=False, index=True)
    priority: Mapped[int] = mapped_column(Integer, default=5, nullable=False, index=True)
    payload: Mapped[dict] = mapped_column(JSONB, default={}, nullable=False)
    result: Mapped[dict] = mapped_column(JSONB, default={}, nullable=False)
    error_message: Mapped[str | None] = mapped_column(Text, nullable=True)
    progress: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    started_at: Mapped[str | None] = mapped_column(String(255), nullable=True)
    completed_at: Mapped[str | None] = mapped_column(String(255), nullable=True)
