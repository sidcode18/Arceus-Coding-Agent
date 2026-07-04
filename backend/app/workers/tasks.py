import asyncio
import os
import structlog
from typing import List

from app.workers.celery_app import celery_app
from app.services.repository import repository_manager
from app.services.chunking import chunking_service
from app.services.search_service import get_search_service

logger = structlog.get_logger()

# We need a helper to run async code in celery tasks since celery is synchronous
def run_async(coro):
    try:
        loop = asyncio.get_event_loop()
    except RuntimeError:
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
    return loop.run_until_complete(coro)

@celery_app.task(bind=True, name="app.workers.tasks.clone_and_index_project")
def clone_and_index_project(self, project_id: str, repo_url: str, branch: str = "main"):
    """Clone a project and trigger indexing for all files"""
    logger.info("Starting clone and index", project_id=project_id, repo_url=repo_url)
    
    success = repository_manager.clone_repository(project_id, repo_url, branch)
    if not success:
        logger.error("Clone failed", project_id=project_id)
        return False
        
    try:
        file_tree = repository_manager.get_file_tree(project_id)
        
        # Helper to extract all file paths
        def _get_files(node, current_path="") -> List[str]:
            files = []
            if node["type"] == "file":
                files.append(os.path.join(current_path, node["name"]))
            elif "children" in node:
                for child in node["children"]:
                    files.extend(_get_files(child, os.path.join(current_path, node["name"]) if current_path else node["name"]))
            return files
            
        # For the root node (directory), get its children directly to avoid prepending the root directory name
        all_files = []
        if "children" in file_tree:
             for child in file_tree["children"]:
                 all_files.extend(_get_files(child))
        
        # Trigger index task for each file
        for file_path in all_files:
            # Skip binary or very large files usually, but for now we index all
            if not file_path.endswith(('.png', '.jpg', '.jpeg', '.gif', '.mp4', '.pdf', '.lock', '.pyc')):
                index_file.delay(project_id, file_path)
                
        logger.info("Project clone complete, indexing queued", project_id=project_id, files_count=len(all_files))
        return True
    except Exception as e:
        logger.error("Failed to queue indexing", project_id=project_id, error=str(e))
        return False

@celery_app.task(bind=True, name="app.workers.tasks.index_file")
def index_file(self, project_id: str, file_path: str):
    """Index a specific file from a project"""
    try:
        search_svc = get_search_service()
        # First, purge old embeddings for this file
        run_async(search_svc.delete_file_embeddings(project_id, file_path))
        
        # Read the file
        content = run_async(repository_manager.read_file(project_id, file_path))
        
        # Chunk it
        chunks = chunking_service.chunk_text(
            content, 
            metadata={"file_path": file_path}
        )
        
        # Index each chunk
        for chunk in chunks:
            run_async(search_svc.index_chunk(chunk, project_id))
            
        logger.info("Successfully indexed file", project_id=project_id, file_path=file_path, chunks=len(chunks))
        return True
    except UnicodeDecodeError:
        logger.warning("Skipping binary or non-utf8 file", project_id=project_id, file_path=file_path)
        return False
    except FileNotFoundError:
        logger.warning("File not found for indexing (maybe deleted)", project_id=project_id, file_path=file_path)
        return False
    except Exception as e:
        logger.error("Failed to index file", project_id=project_id, file_path=file_path, error=str(e))
        return False
