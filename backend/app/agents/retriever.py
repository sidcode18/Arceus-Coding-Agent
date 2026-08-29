import structlog
from typing import Dict, Any
from langchain_core.messages import AIMessage, HumanMessage

from app.agents.base import BaseAgent
from app.core.config import settings
from app.services.search_service import get_search_service

logger = structlog.get_logger()


class RetrievalAgent(BaseAgent):
    """Agent for retrieving relevant code context using semantic search."""

    def __init__(self):
        super().__init__("retriever")
        # search_service also deferred: get_search_service() connects to Qdrant
        # at construction time.  We call it lazily on first ainvoke instead.
        self._search_service = None

    @property
    def search_service(self):
        if self._search_service is None:
            self._search_service = get_search_service()
        return self._search_service

    @search_service.setter
    def search_service(self, value) -> None:
        """Allow tests (and custom wiring) to inject a mock search service."""
        self._search_service = value

    async def ainvoke(self, state: Dict[str, Any]) -> Dict[str, Any]:
        """Retrieve relevant code context based on the current task."""
        logger.info("RetrievalAgent searching for relevant code")

        messages = state.get("messages", [])
        project_id = state.get("project_id")

        from app.services.memory_service import memory_service
        user_id = state.get("user_id")

        if not project_id:
            logger.warning("No project_id provided for retrieval")
            return {"messages": [], "retrieved_context": [], "memory_context": []}

        # Extract the latest user message to use as search query
        user_messages = [msg for msg in messages if isinstance(msg, HumanMessage)]
        if not user_messages:
            logger.warning("No user messages found for retrieval")
            return {"messages": [], "retrieved_context": [], "memory_context": []}
            
        memory_context = []
        if user_id:
            try:
                memory_context = await memory_service.get_context(user_id, project_id)
            except Exception as e:
                logger.error("Failed to fetch memory", error=str(e))

        query = user_messages[-1].content

        try:
            search_results = await self.search_service.semantic_search(
                query=query,
                project_id=project_id,
                limit=5,
            )

            min_score = settings.retrieval_min_score

            # --- relevance threshold filter ---
            # Discard results whose cosine similarity is below the configured
            # minimum.  Low-score snippets add noise to the context window and
            # can mislead the planner/coder.
            retrieved_context = []
            discarded = 0
            for result in search_results:
                score = result.get("score", 0.0)
                if score < min_score:
                    discarded += 1
                    continue
                payload = result.get("payload", {})
                retrieved_context.append(
                    {
                        "file_path": payload.get("file_path", "unknown"),
                        "content": payload.get("content", ""),
                        "score": score,
                    }
                )

            logger.info(
                "RetrievalAgent found context",
                kept=len(retrieved_context),
                discarded=discarded,
                min_score=min_score,
                project_id=project_id,
                workspace_id=user_id, # Frontend sets workspace context as user_id for isolation
                collection_queried=self.search_service.collection_name,
                similarity_scores=[c["score"] for c in retrieved_context],
                files_returned=[c["file_path"] for c in retrieved_context]
            )

            if retrieved_context:
                summary = (
                    f"Retrieved {len(retrieved_context)} relevant code snippet(s) "
                    f"from the repository (discarded {discarded} below score "
                    f"{min_score:.2f})."
                )
                if memory_context:
                    summary += f" Also loaded {len(memory_context)} memory items."
                return {
                    "messages": [AIMessage(content=summary)],
                    "retrieved_context": retrieved_context,
                    "memory_context": memory_context,
                }
            else:
                msg = (
                    f"Repository indexing appears to be unavailable or incomplete. "
                    f"No relevant code could be retrieved above the threshold ({min_score:.2f})."
                    if discarded
                    else "Repository indexing appears to be unavailable or incomplete. No code found in the repository index."
                )
                if memory_context:
                    msg += f" Loaded {len(memory_context)} memory items."
                return {
                    "messages": [AIMessage(content=msg)],
                    "retrieved_context": [],
                    "memory_context": memory_context,
                }

        except Exception as e:
            logger.error("RetrievalAgent failed to search", error=str(e))
            return {
                "messages": [AIMessage(content=f"Retrieval failed: {str(e)}")],
                "retrieved_context": [],
                "memory_context": memory_context,
            }
