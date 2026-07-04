import structlog
from typing import Dict, Any, Optional
from langchain_core.messages import AIMessage, HumanMessage

from app.agents.base import BaseAgent
from app.llm.factory import LLMFactory
from app.core.config import settings
from app.services.search_service import get_search_service

logger = structlog.get_logger()


class RetrievalAgent(BaseAgent):
    """Agent for retrieving relevant code context using semantic search"""
    
    def __init__(self):
        super().__init__("retriever")
        self.llm = LLMFactory.get_provider("gemini", model_name=settings.gemini_model)
        self.search_service = get_search_service()
    
    async def ainvoke(self, state: Dict[str, Any]) -> Dict[str, Any]:
        """Retrieve relevant code context based on the current task"""
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
            # Perform semantic search
            search_results = await self.search_service.semantic_search(
                query=query,
                project_id=project_id,
                limit=5
            )
            
            # Format retrieved context
            retrieved_context = []
            for result in search_results:
                payload = result.get("payload", {})
                context = {
                    "file_path": payload.get("file_path", "unknown"),
                    "content": payload.get("content", ""),
                    "score": result.get("score", 0.0)
                }
                retrieved_context.append(context)
            
            logger.info(
                "RetrievalAgent found context",
                results_count=len(retrieved_context),
                project_id=project_id
            )
            
            # Create a summary message
            if retrieved_context:
                summary = f"Retrieved {len(retrieved_context)} relevant code snippets from the repository."
                retrieval_message = AIMessage(content=summary)
                return {
                    "messages": [retrieval_message],
                    "retrieved_context": retrieved_context
                }
            else:
                no_results_message = AIMessage(content="No relevant code found in the repository.")
                return {
                    "messages": [no_results_message],
                    "retrieved_context": []
                }
                
        except Exception as e:
            logger.error("RetrievalAgent failed to search", error=str(e))
            error_message = AIMessage(content=f"Retrieval failed: {str(e)}")
            return {
                "messages": [error_message],
                "retrieved_context": []
            }
