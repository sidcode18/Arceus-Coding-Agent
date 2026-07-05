import structlog
from typing import Dict, Any
from langchain_core.messages import AIMessage, HumanMessage

from app.agents.base import BaseAgent
from app.llm.factory import LLMFactory
from app.core.config import settings
from app.services.search_service import get_search_service

logger = structlog.get_logger()


class RetrievalAgent(BaseAgent):
    """Agent for retrieving relevant code context using semantic search."""

    def __init__(self):
        super().__init__("retriever")
        self.llm = LLMFactory.get_provider("gemini", model_name=settings.gemini_model)
        self.search_service = get_search_service()

    async def ainvoke(self, state: Dict[str, Any]) -> Dict[str, Any]:
        """Retrieve relevant code context based on the current task."""
        logger.info("RetrievalAgent searching for relevant code")

        messages = state.get("messages", [])
        project_id = state.get("project_id")

        if not project_id:
            logger.warning("No project_id provided for retrieval")
            return {"messages": [], "retrieved_context": []}

        # Extract the latest user message to use as search query
        user_messages = [msg for msg in messages if isinstance(msg, HumanMessage)]
        if not user_messages:
            logger.warning("No user messages found for retrieval")
            return {"messages": [], "retrieved_context": []}

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
            )

            if retrieved_context:
                summary = (
                    f"Retrieved {len(retrieved_context)} relevant code snippet(s) "
                    f"from the repository (discarded {discarded} below score "
                    f"{min_score:.2f})."
                )
                return {
                    "messages": [AIMessage(content=summary)],
                    "retrieved_context": retrieved_context,
                }
            else:
                msg = (
                    f"No relevant code found above the relevance threshold "
                    f"({min_score:.2f}). All {discarded} result(s) were below the "
                    "minimum score."
                    if discarded
                    else "No code found in the repository index."
                )
                return {
                    "messages": [AIMessage(content=msg)],
                    "retrieved_context": [],
                }

        except Exception as e:
            logger.error("RetrievalAgent failed to search", error=str(e))
            return {
                "messages": [AIMessage(content=f"Retrieval failed: {str(e)}")],
                "retrieved_context": [],
            }
