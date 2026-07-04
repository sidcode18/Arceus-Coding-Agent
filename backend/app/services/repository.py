import os
import shutil
import structlog
from typing import Optional, List, Dict, Any
from git import Repo, GitCommandError
import aiofiles

from app.core.config import settings

logger = structlog.get_logger()

class RepositoryManager:
    """Manages cloning and working with local git repositories"""
    
    def __init__(self, workspace_dir: str = "storage/repositories"):
        # Use settings if available, else fallback
        self.workspace_dir = getattr(settings, 'repository_clone_path', workspace_dir)
        # Don't create directory during init - do it lazily when needed
        
    def get_repo_path(self, project_id: str) -> str:
        return os.path.abspath(os.path.join(self.workspace_dir, project_id))

    def _ensure_inside_workspace(self, path: str) -> None:
        workspace = os.path.abspath(self.workspace_dir)
        if os.path.commonpath([workspace, path]) != workspace:
            raise ValueError("Repository path escapes workspace")

    def _resolve_safe_path(self, project_id: str, file_path: str) -> str:
        """Resolve and validate a file path to prevent path traversal"""
        repo_path = self.get_repo_path(project_id)
        self._ensure_inside_workspace(repo_path)
        # Prevent absolute paths from escaping the repo
        if file_path.startswith('/'):
            file_path = file_path.lstrip('/')
            
        full_path = os.path.abspath(os.path.join(repo_path, file_path))
        
        if os.path.commonpath([repo_path, full_path]) != repo_path:
            raise ValueError("Path traversal detected")
            
        return full_path
        
    def clone_repository(self, project_id: str, repo_url: str, branch: Optional[str] = None) -> bool:
        """Clone a repository into the workspace"""
        repo_path = self.get_repo_path(project_id)
        self._ensure_inside_workspace(repo_path)
        
        # Ensure workspace directory exists
        os.makedirs(self.workspace_dir, exist_ok=True)
        
        logger.info("Cloning repository", repo_url=repo_url, path=repo_path)
        
        if os.path.exists(repo_path):
            logger.info("Repository already exists, pulling latest changes")
            try:
                repo = Repo(repo_path)
                origin = repo.remotes.origin
                origin.pull()
                if branch:
                    repo.git.checkout(branch)
                return True
            except GitCommandError as e:
                logger.error("Failed to pull repository", error=str(e))
                return False
                
        try:
            repo = Repo.clone_from(repo_url, repo_path)
            if branch:
                repo.git.checkout(branch)
            return True
        except GitCommandError as e:
            logger.error("Failed to clone repository", error=str(e))
            return False

    def delete_repository(self, project_id: str) -> bool:
        """Delete a cloned repository"""
        repo_path = self.get_repo_path(project_id)
        self._ensure_inside_workspace(repo_path)
        
        if os.path.exists(repo_path):
            shutil.rmtree(repo_path)
            return True
        return False

    def get_file_tree(self, project_id: str) -> Dict[str, Any]:
        """Generate a JSON representation of the file tree"""
        repo_path = self.get_repo_path(project_id)
        self._ensure_inside_workspace(repo_path)
        if not os.path.exists(repo_path):
            raise FileNotFoundError(f"Repository {project_id} not found on disk")
            
        def _build_tree(current_path: str) -> Dict[str, Any]:
            tree = {"name": os.path.basename(current_path), "type": "directory", "children": []}
            
            try:
                entries = os.listdir(current_path)
            except PermissionError:
                return tree

            for entry in sorted(entries):
                if entry == '.git':
                    continue
                    
                full_entry_path = os.path.join(current_path, entry)
                if os.path.isdir(full_entry_path):
                    tree["children"].append(_build_tree(full_entry_path))
                else:
                    tree["children"].append({"name": entry, "type": "file"})
            
            return tree
            
        return _build_tree(repo_path)

    async def read_file(self, project_id: str, file_path: str) -> str:
        """Read file content safely"""
        full_path = self._resolve_safe_path(project_id, file_path)
        if not os.path.exists(full_path):
            raise FileNotFoundError(f"File {file_path} not found")
        if not os.path.isfile(full_path):
            raise IsADirectoryError(f"{file_path} is a directory")
            
        async with aiofiles.open(full_path, mode='r', encoding='utf-8') as f:
            return await f.read()

    async def write_file(self, project_id: str, file_path: str, content: str) -> bool:
        """Write file content safely"""
        full_path = self._resolve_safe_path(project_id, file_path)
        
        # Ensure directory exists
        os.makedirs(os.path.dirname(full_path), exist_ok=True)
        
        async with aiofiles.open(full_path, mode='w', encoding='utf-8') as f:
            await f.write(content)
        return True

    def delete_file(self, project_id: str, file_path: str) -> bool:
        """Delete file safely"""
        full_path = self._resolve_safe_path(project_id, file_path)
        if os.path.exists(full_path):
            if os.path.isfile(full_path):
                os.remove(full_path)
            else:
                shutil.rmtree(full_path)
            return True
        return False
        
    def get_changed_files(self, project_id: str, commit_sha: str = "HEAD~1") -> List[str]:
        """Get list of changed files since a specific commit"""
        repo_path = self.get_repo_path(project_id)
        if not os.path.exists(repo_path):
            return []
            
        try:
            repo = Repo(repo_path)
            diffs = repo.commit(commit_sha).diff('HEAD')
            return [diff.b_path for diff in diffs if diff.b_path]
        except Exception as e:
            logger.error("Failed to get changed files", error=str(e))
            return []

repository_manager = RepositoryManager()
