from pydantic import BaseModel, HttpUrl, Field, field_serializer
from typing import Optional, List, Dict, Any
from datetime import datetime
from uuid import UUID

class ProjectCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=255)
    description: Optional[str] = None
    repository_url: HttpUrl
    branch: str = "main"

class ProjectResponse(BaseModel):
    id: UUID
    user_id: str
    name: str
    description: Optional[str]
    repository_url: str
    branch: str
    is_indexed: bool
    index_status: str
    last_indexed_at: Optional[str]
    created_at: datetime
    updated_at: datetime
    metadata_: Dict[str, Any] = Field(default_factory=dict)

    @field_serializer('id')
    def serialize_id(self, value: UUID) -> str:
        return str(value)

    @field_serializer('created_at', 'updated_at')
    def serialize_datetime(self, value: datetime) -> str:
        return value.isoformat()

    class Config:
        from_attributes = True

class FileWriteRequest(BaseModel):
    content: str
    commit_message: Optional[str] = "Update file via agent"

class FileResponse(BaseModel):
    path: str
    content: str
    size: int

class SearchQuery(BaseModel):
    query: str
    limit: int = Field(5, ge=1, le=50)

class SearchResult(BaseModel):
    score: float
    payload: Dict[str, Any]

class TerminalCommandRequest(BaseModel):
    command: str = Field(..., min_length=1)
