from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List

from app.db.session import get_async_session
from app.api.v1.projects.schemas import (
    ProjectCreate, ProjectResponse, FileWriteRequest, FileResponse, SearchQuery, SearchResult
)
from app.repositories.project_repository import ProjectRepository
from app.services.repository import repository_manager
from app.services.search_service import get_search_service
from app.models.project import Project

router = APIRouter()

# Dummy dependency for current user since auth isn't fully implemented
async def get_current_user_id() -> str:
    return "test-user-id"

@router.post("/", response_model=ProjectResponse, status_code=status.HTTP_201_CREATED)
async def create_project(
    project_in: ProjectCreate,
    db: AsyncSession = Depends(get_async_session),
    user_id: str = Depends(get_current_user_id)
):
    repo = ProjectRepository(db)
    
    project = Project(
        user_id=user_id,
        name=project_in.name,
        description=project_in.description,
        repository_url=str(project_in.repository_url),
        branch=project_in.branch,
        is_indexed=False,
        index_status="pending"
    )
    
    db.add(project)
    await db.commit()
    await db.refresh(project)
    
    # Trigger background task for cloning and indexing
    # We will import the celery task here
    from app.workers.tasks import clone_and_index_project
    clone_and_index_project.delay(str(project.id), str(project.repository_url), project.branch)
    
    return project

@router.get("/", response_model=List[ProjectResponse])
async def list_projects(
    db: AsyncSession = Depends(get_async_session),
    user_id: str = Depends(get_current_user_id)
):
    repo = ProjectRepository(db)
    projects = await repo.get_by_user_id(user_id)
    return projects

@router.get("/{project_id}", response_model=ProjectResponse)
async def get_project(
    project_id: str,
    db: AsyncSession = Depends(get_async_session)
):
    repo = ProjectRepository(db)
    project = await repo.get_by_id(project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    return project

@router.delete("/{project_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_project(
    project_id: str,
    db: AsyncSession = Depends(get_async_session)
):
    repo = ProjectRepository(db)
    project = await repo.get_by_id(project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
        
    await repo.delete(project_id)
    
    # Delete local files
    repository_manager.delete_repository(project_id)
    
    # Note: We should ideally also delete embeddings from Qdrant here
    # search_service.delete_project_embeddings(project_id)

@router.get("/{project_id}/tree")
async def get_project_tree(
    project_id: str,
    db: AsyncSession = Depends(get_async_session)
):
    # Verify project exists
    repo = ProjectRepository(db)
    project = await repo.get_by_id(project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
        
    try:
        return repository_manager.get_file_tree(project_id)
    except FileNotFoundError:
        raise HTTPException(status_code=404, detail="Local repository not found")

@router.get("/{project_id}/file")
async def get_project_file(
    project_id: str,
    path: str,
    db: AsyncSession = Depends(get_async_session)
):
    try:
        content = await repository_manager.read_file(project_id, path)
        return {"path": path, "content": content}
    except FileNotFoundError:
        raise HTTPException(status_code=404, detail="File not found")
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.put("/{project_id}/file")
async def update_project_file(
    project_id: str,
    path: str,
    request: FileWriteRequest,
    db: AsyncSession = Depends(get_async_session)
):
    try:
        await repository_manager.write_file(project_id, path, request.content)
        
        # Trigger re-index of this specific file
        from app.workers.tasks import index_file
        index_file.delay(project_id, path)
        
        return {"status": "success", "path": path}
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.delete("/{project_id}/file")
async def delete_project_file(
    project_id: str,
    path: str,
    db: AsyncSession = Depends(get_async_session)
):
    try:
        success = repository_manager.delete_file(project_id, path)
        if not success:
            raise HTTPException(status_code=404, detail="File not found")
        return {"status": "deleted"}
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.post("/{project_id}/search", response_model=List[SearchResult])
async def search_project(
    project_id: str,
    query: SearchQuery,
    db: AsyncSession = Depends(get_async_session)
):
    repo = ProjectRepository(db)
    project = await repo.get_by_id(project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
        
    search_svc = get_search_service()
    results = await search_svc.semantic_search(query.query, project_id=project_id, limit=query.limit)
    return results
