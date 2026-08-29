from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List, Dict, Any
from pydantic import BaseModel
import httpx

from app.db.session import get_async_session
from app.repositories.project_repository import ProjectRepository
from app.services.repository import repository_manager
from app.models.user import User
from app.core.deps import get_current_active_user
from git import Repo, GitCommandError

router = APIRouter()

class CommitRequest(BaseModel):
    message: str

class CheckoutRequest(BaseModel):
    branch: str
    create: bool = False

class PRRequest(BaseModel):
    title: str
    body: str
    head: str
    base: str

def _get_repo(project_id: str) -> Repo:
    repo_path = repository_manager.get_repo_path(project_id)
    try:
        return Repo(repo_path)
    except Exception:
        raise HTTPException(status_code=404, detail="Local repository not found")

@router.get("/status/{project_id}")
async def get_status(
    project_id: str,
    db: AsyncSession = Depends(get_async_session),
    current_user: User = Depends(get_current_active_user)
):
    project_repo = ProjectRepository(db)
    project = await project_repo.get_by_id(project_id, user_id=str(current_user.id))
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    repo = _get_repo(project_id)
    
    try:
        changed_files = [item.a_path for item in repo.index.diff(None)]
        untracked_files = repo.untracked_files
        
        return {
            "branch": repo.active_branch.name,
            "changed": changed_files,
            "untracked": untracked_files,
            "is_dirty": repo.is_dirty(untracked_files=True)
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/commit/{project_id}")
async def commit_changes(
    project_id: str,
    request: CommitRequest,
    db: AsyncSession = Depends(get_async_session),
    current_user: User = Depends(get_current_active_user)
):
    project_repo = ProjectRepository(db)
    project = await project_repo.get_by_id(project_id, user_id=str(current_user.id))
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    repo = _get_repo(project_id)
    
    try:
        repo.git.add(A=True)
        repo.index.commit(request.message)
        return {"status": "success", "message": "Changes committed"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/branches/{project_id}")
async def get_branches(
    project_id: str,
    db: AsyncSession = Depends(get_async_session),
    current_user: User = Depends(get_current_active_user)
):
    project_repo = ProjectRepository(db)
    project = await project_repo.get_by_id(project_id, user_id=str(current_user.id))
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    repo = _get_repo(project_id)
    
    try:
        branches = [b.name for b in repo.heads]
        return {"branches": branches, "active": repo.active_branch.name}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/checkout/{project_id}")
async def checkout_branch(
    project_id: str,
    request: CheckoutRequest,
    db: AsyncSession = Depends(get_async_session),
    current_user: User = Depends(get_current_active_user)
):
    project_repo = ProjectRepository(db)
    project = await project_repo.get_by_id(project_id, user_id=str(current_user.id))
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    repo = _get_repo(project_id)
    
    try:
        if request.create:
            repo.git.checkout("-b", request.branch)
        else:
            repo.git.checkout(request.branch)
        
        project.branch = request.branch
        await db.commit()
            
        return {"status": "success", "branch": request.branch}
    except GitCommandError as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.post("/push/{project_id}")
async def push_repo(
    project_id: str,
    db: AsyncSession = Depends(get_async_session),
    current_user: User = Depends(get_current_active_user)
):
    project_repo = ProjectRepository(db)
    project = await project_repo.get_by_id(project_id, user_id=str(current_user.id))
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    repo = _get_repo(project_id)
    
    try:
        origin = repo.remotes.origin
        
        # If user has a token, ensure the remote URL uses it
        if current_user.github_access_token:
            auth_url = repository_manager._rewrite_github_url(project.repository_url, current_user.github_access_token)
            origin.set_url(auth_url)
            
        repo.git.push("--set-upstream", "origin", repo.active_branch.name)
        return {"status": "success"}
    except GitCommandError as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.post("/pull/{project_id}")
async def pull_repo(
    project_id: str,
    db: AsyncSession = Depends(get_async_session),
    current_user: User = Depends(get_current_active_user)
):
    project_repo = ProjectRepository(db)
    project = await project_repo.get_by_id(project_id, user_id=str(current_user.id))
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    repo = _get_repo(project_id)
    
    try:
        origin = repo.remotes.origin
        
        if current_user.github_access_token:
            auth_url = repository_manager._rewrite_github_url(project.repository_url, current_user.github_access_token)
            origin.set_url(auth_url)
            
        origin.pull()
        return {"status": "success"}
    except GitCommandError as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.post("/pr/{project_id}")
async def create_pull_request(
    project_id: str,
    request: PRRequest,
    db: AsyncSession = Depends(get_async_session),
    current_user: User = Depends(get_current_active_user)
):
    project_repo = ProjectRepository(db)
    project = await project_repo.get_by_id(project_id, user_id=str(current_user.id))
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    if not current_user.github_access_token:
        raise HTTPException(status_code=401, detail="GitHub access token required")

    # Extract owner/repo from repository_url
    url = project.repository_url
    if not url.startswith("https://github.com/"):
        raise HTTPException(status_code=400, detail="Only GitHub repositories are supported for PRs")
    
    repo_path = url.replace("https://github.com/", "").replace(".git", "")
    
    headers = {
        "Authorization": f"token {current_user.github_access_token}",
        "Accept": "application/vnd.github.v3+json"
    }
    
    async with httpx.AsyncClient() as client:
        res = await client.post(
            f"https://api.github.com/repos/{repo_path}/pulls",
            json={
                "title": request.title,
                "body": request.body,
                "head": request.head,
                "base": request.base
            },
            headers=headers
        )
        
        if res.status_code == 201:
            return res.json()
        else:
            raise HTTPException(status_code=res.status_code, detail=res.text)
