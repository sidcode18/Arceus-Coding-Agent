import asyncio
import os
import structlog
import time
import hashlib
from typing import List
import uuid

import redis
from sqlalchemy import select

from app.workers.celery_app import celery_app
from app.services.repository import repository_manager
from app.services.chunking import chunking_service
from app.services.search_service import get_search_service
from app.db.session import async_session_maker
from app.models.project import Project
from app.core.config import settings

logger = structlog.get_logger()

# Sync redis client for celery tasks
redis_client = redis.Redis.from_url(settings.redis_url, decode_responses=True)

# Helper to run async code in celery tasks
def run_async(coro):
    try:
        loop = asyncio.get_event_loop()
    except RuntimeError:
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
    return loop.run_until_complete(coro)

async def _update_project_metadata(project_id: str, status: str, metrics_update: dict = None):
    async with async_session_maker() as session:
        result = await session.execute(select(Project).where(Project.id == uuid.UUID(project_id)))
        project = result.scalar_one_or_none()
        if project:
            if status:
                project.index_status = status
            if metrics_update:
                current_metadata = project.metadata_ or {}
                project.metadata_ = {**current_metadata, **metrics_update}
            await session.commit()

@celery_app.task(bind=True, name="app.workers.tasks.clone_project")
def clone_project(self, project_id: str, repo_url: str, branch: str = "main", github_token: str | None = None):
    """Clone a project and prioritize files for indexing"""
    logger.info("Starting clone", project_id=project_id, repo_url=repo_url)
    
    start_time = time.time()
    success = repository_manager.clone_repository(project_id, repo_url, branch, github_token=github_token)
    clone_time_ms = int((time.time() - start_time) * 1000)
    
    if not success:
        logger.error("Clone failed", project_id=project_id)
        run_async(_update_project_metadata(project_id, "failed"))
        return False
        
    try:
        file_tree = repository_manager.get_file_tree(project_id)
        
        def _get_files(node, current_path="") -> List[str]:
            files = []
            if node["type"] == "file":
                files.append(os.path.join(current_path, node["name"]))
            elif "children" in node:
                for child in node["children"]:
                    files.extend(_get_files(child, os.path.join(current_path, node["name"]) if current_path else node["name"]))
            return files
            
        all_files = []
        if "children" in file_tree:
             for child in file_tree["children"]:
                 all_files.extend(_get_files(child))
                 
        ignored_dirs = {'node_modules', '.git', 'dist', 'build', 'target', 'coverage', '.next', 'vendor', '__pycache__', '.idea', '.vscode'}
        valid_files = []
        for f in all_files:
            parts = f.split('/')
            if any(p in ignored_dirs for p in parts):
                continue
            if f.endswith(('.png', '.jpg', '.jpeg', '.gif', '.mp4', '.pdf', '.lock', '.pyc', '.exe', '.dll')):
                continue
            valid_files.append(f)
            
        high_priority = {'src', 'app', 'backend', 'frontend', 'lib', 'components'}
        
        def sort_key(filepath):
            parts = filepath.split('/')
            if any(p in high_priority for p in parts):
                return 0
            return 1
            
        valid_files.sort(key=sort_key)
        
        run_async(_update_project_metadata(project_id, "indexing", {
            "clone_time_ms": clone_time_ms,
            "total_files": len(valid_files),
            "indexed_files": 0
        }))
        
        index_project.delay(project_id, valid_files)
        
        logger.info("Project clone complete, indexing queued", project_id=project_id, files_count=len(valid_files))
        return True
    except Exception as e:
        logger.error("Failed to queue indexing", project_id=project_id, error=str(e))
        run_async(_update_project_metadata(project_id, "failed"))
        return False

async def _index_batch_concurrently(search_svc, project_id: str, batch: List[dict]):
    all_chunks = []
    for item in batch:
        all_chunks.extend(item["chunks"])
        
    if not all_chunks:
        return
        
    CHUNK_BATCH_SIZE = 100
    for i in range(0, len(all_chunks), CHUNK_BATCH_SIZE):
        chunk_batch = all_chunks[i:i + CHUNK_BATCH_SIZE]
        try:
            await search_svc.index_chunks(chunk_batch, project_id)
        except Exception as e:
            logger.error("Batch indexing failed, continuing with next batch", error=str(e), project_id=project_id)

@celery_app.task(bind=True, name="app.workers.tasks.index_project")
def index_project(self, project_id: str, file_paths: List[str]):
    """Background task to index files incrementally using hashes"""
    logger.info("Starting background indexing", project_id=project_id, file_count=len(file_paths))
    start_time = time.time()
    search_svc = get_search_service()
    
    redis_key = f"project:{project_id}:hashes"
    indexed_count = 0
    total_chunks = 0
    
    # Process files in batches to manage memory
    FILE_BATCH_SIZE = 20
    
    for i in range(0, len(file_paths), FILE_BATCH_SIZE):
        batch_paths = file_paths[i:i + FILE_BATCH_SIZE]
        valid_batch = []
        
        for path in batch_paths:
            try:
                content = run_async(repository_manager.read_file(project_id, path))
                
                file_hash = hashlib.sha256(content.encode('utf-8', errors='ignore')).hexdigest()
                cached_hash = redis_client.hget(redis_key, path)
                
                if cached_hash == file_hash:
                    indexed_count += 1
                    continue
                    
                run_async(search_svc.delete_file_embeddings(project_id, path))
                chunks = chunking_service.chunk_file(content, path)
                
                valid_batch.append({
                    "path": path,
                    "chunks": chunks,
                    "hash": file_hash
                })
                total_chunks += len(chunks)
            except Exception as e:
                logger.warning("Failed to process file for batch indexing", file_path=path, error=str(e))
                indexed_count += 1
        
        if valid_batch:
            try:
                run_async(_index_batch_concurrently(search_svc, project_id, valid_batch))
                
                for item in valid_batch:
                    redis_client.hset(redis_key, item["path"], item["hash"])
                    indexed_count += 1
            except Exception as e:
                logger.error("Failed to index batch", error=str(e))
                
            logger.info("Indexing progress", project_id=project_id, files_processed=indexed_count, total_files=len(file_paths), chunks_created=total_chunks)
        
        run_async(_update_project_metadata(project_id, "indexing", {"indexed_files": indexed_count}))
    
    index_time_ms = int((time.time() - start_time) * 1000)
    embedding_rate = total_chunks / (index_time_ms / 1000) if index_time_ms > 0 else 0
    
    # --- Post-Index Qdrant Verification ---
    try:
        from qdrant_client.http import models as rest
        collection_info = search_svc.qdrant.get_collection(search_svc.collection_name)
        vector_count = collection_info.vectors_count
        
        # Test similarity search
        test_results = run_async(search_svc.semantic_search("def class", project_id=project_id, limit=1))
        test_success = len(test_results) > 0
        
        logger.info(
            "Qdrant Verification",
            collection_name=search_svc.collection_name,
            vector_count=vector_count,
            project_id=project_id,
            test_search_success=test_success
        )
    except Exception as e:
        logger.error("Qdrant Verification Failed", error=str(e), project_id=project_id)
    # --------------------------------------

    logger.info(
        "Repository indexed successfully.",
        project_id=project_id,
        files=len(file_paths),
        chunks=total_chunks,
        vectors=total_chunks,
        duration=f"{index_time_ms/1000:.2f}s"
    )

    run_async(_update_project_metadata(project_id, "indexed", {
        "index_time_ms": index_time_ms,
        "embedding_rate": round(embedding_rate, 2),
        "indexed_files": len(file_paths)
    }))
    
    return True

@celery_app.task(bind=True, name="app.workers.tasks.prioritize_file")
def prioritize_file(self, project_id: str, file_path: str):
    """Index a specific file immediately"""
    try:
        content = run_async(repository_manager.read_file(project_id, file_path))
        file_hash = hashlib.sha256(content.encode('utf-8', errors='ignore')).hexdigest()
        
        redis_key = f"project:{project_id}:hashes"
        cached_hash = redis_client.hget(redis_key, file_path)
        
        if cached_hash == file_hash:
            return True
            
        search_svc = get_search_service()
        run_async(search_svc.delete_file_embeddings(project_id, file_path))
        
        chunks = chunking_service.chunk_file(content, file_path)
        for chunk in chunks:
            run_async(search_svc.index_chunk(chunk, project_id))
            
        redis_client.hset(redis_key, file_path, file_hash)
        logger.info("Successfully prioritized file", project_id=project_id, file_path=file_path)
        return True
    except Exception as e:
        logger.error("Failed to prioritize file", project_id=project_id, file_path=file_path, error=str(e))
        return False
