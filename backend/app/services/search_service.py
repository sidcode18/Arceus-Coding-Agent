import structlog
import hashlib
from typing import List, Dict, Any, Optional
from qdrant_client import QdrantClient
from qdrant_client.http.exceptions import UnexpectedResponse
from qdrant_client.http import models as rest
from langchain_google_genai import GoogleGenerativeAIEmbeddings

from app.core.config import settings

logger = structlog.get_logger()

# gemini-embedding-001 emits 3072-dim vectors; the deterministic fallback matches this size.
VECTOR_SIZE = 3072


class DeterministicEmbeddingProvider:
    """Small local fallback so indexing works without external API credentials."""

    def embed_query(self, text: str) -> list[float]:
        vector = [0.0] * VECTOR_SIZE
        words = text.lower().split() or [text.lower()]
        for word in words:
            digest = hashlib.sha256(word.encode("utf-8")).digest()
            index = int.from_bytes(digest[:2], "big") % VECTOR_SIZE
            vector[index] += 1.0

        magnitude = sum(value * value for value in vector) ** 0.5
        if magnitude == 0:
            return vector
        return [value / magnitude for value in vector]


class SearchService:
    def __init__(self):
        self.qdrant = QdrantClient(url=settings.qdrant_url)
        if settings.gemini_api_key:
            self.embeddings = GoogleGenerativeAIEmbeddings(
                model="models/gemini-embedding-001",
                google_api_key=settings.gemini_api_key
            )
        else:
            logger.warning("GEMINI_API_KEY is not set; using deterministic local embeddings")
            self.embeddings = DeterministicEmbeddingProvider()
        self.collection_name = "code_embeddings"
        
        # Ensure collection exists
        if not self._collection_exists():
            self.qdrant.create_collection(
                collection_name=self.collection_name,
                vectors_config=rest.VectorParams(
                    size=VECTOR_SIZE,
                    distance=rest.Distance.COSINE
                )
            )

    def _collection_exists(self) -> bool:
        try:
            return bool(self.qdrant.collection_exists(self.collection_name))
        except AttributeError:
            try:
                self.qdrant.get_collection(self.collection_name)
                return True
            except UnexpectedResponse as exc:
                if exc.status_code == 404:
                    return False
                raise
        except UnexpectedResponse as exc:
            if exc.status_code == 404:
                return False
            raise

    async def index_chunk(self, chunk: Dict[str, Any], project_id: str):
        """Index a single code chunk (legacy wrapper)."""
        await self.index_chunks([chunk], project_id)
        
    async def index_chunks(self, chunks: List[Dict[str, Any]], project_id: str):
        """Index multiple code chunks in a single batched operation with retry logic."""
        if not chunks:
            return
            
        texts = [chunk["content"] for chunk in chunks]
        
        import asyncio
        import uuid
        from tenacity import retry, stop_after_attempt, wait_exponential, retry_if_exception_type
        
        @retry(
            stop=stop_after_attempt(5),
            wait=wait_exponential(multiplier=1, min=2, max=30),
            reraise=True
        )
        def _sync_embed_and_upsert():
            # Batch embedding
            if hasattr(self.embeddings, "embed_documents"):
                vectors = self.embeddings.embed_documents(texts)
            else:
                vectors = [self.embeddings.embed_query(t) for t in texts]
                
            points = []
            for i, chunk in enumerate(chunks):
                metadata = {**chunk["metadata"], "content": texts[i], "project_id": project_id}
                points.append(
                    rest.PointStruct(
                        id=str(uuid.uuid4()),
                        vector=vectors[i],
                        payload=metadata
                    )
                )
                
            # Batch upsert
            self.qdrant.upsert(
                collection_name=self.collection_name,
                points=points
            )
            
        await asyncio.to_thread(_sync_embed_and_upsert)
        
    async def semantic_search(self, query: str, project_id: Optional[str] = None, limit: int = 5) -> List[Dict[str, Any]]:
        logger.info("Performing semantic search", query=query, project_id=project_id)
        
        vector = self.embeddings.embed_query(query)
        
        filter_ = None
        if project_id:
            filter_ = rest.Filter(
                must=[
                    rest.FieldCondition(
                        key="project_id",
                        match=rest.MatchValue(value=project_id)
                    )
                ]
            )
            
        search_result = self.qdrant.search(
            collection_name=self.collection_name,
            query_vector=vector,
            query_filter=filter_,
            limit=limit
        )
        
        return [
            {
                "score": hit.score,
                "payload": hit.payload
            }
            for hit in search_result
        ]

    async def delete_project_embeddings(self, project_id: str):
        """Delete all embeddings for a project"""
        self.qdrant.delete(
            collection_name=self.collection_name,
            points_selector=rest.FilterSelector(
                filter=rest.Filter(
                    must=[
                        rest.FieldCondition(
                            key="project_id",
                            match=rest.MatchValue(value=project_id)
                        )
                    ]
                )
            )
        )
        
    async def delete_file_embeddings(self, project_id: str, file_path: str):
        """Delete embeddings for a specific file"""
        self.qdrant.delete(
            collection_name=self.collection_name,
            points_selector=rest.FilterSelector(
                filter=rest.Filter(
                    must=[
                        rest.FieldCondition(
                            key="project_id",
                            match=rest.MatchValue(value=project_id)
                        ),
                        rest.FieldCondition(
                            key="file_path",
                            match=rest.MatchValue(value=file_path)
                        )
                    ]
                )
            )
        )

def get_search_service():
    """Lazy initialization of search service"""
    if not hasattr(get_search_service, "_instance"):
        get_search_service._instance = SearchService()
    return get_search_service._instance

# For backward compatibility, but this won't init until called
search_service = None
