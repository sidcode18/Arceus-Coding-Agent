import structlog
from typing import Dict, Any
from langchain_core.messages import AIMessage, HumanMessage, SystemMessage

from app.agents.base import BaseAgent
from app.llm.factory import LLMFactory
from app.core.config import settings

logger = structlog.get_logger()


class ReviewerAgent(BaseAgent):
    """Agent for reviewing code changes and providing feedback"""
    
    def __init__(self):
        super().__init__("reviewer")
        self.llm = LLMFactory.get_provider("gemini", model_name=settings.gemini_model)
    
    async def ainvoke(self, state: Dict[str, Any]) -> Dict[str, Any]:
        """Review the code changes made by the Coder agent"""
        logger.info("ReviewerAgent reviewing code changes")
        
        code_changes = state.get("code_changes", [])
        
        if not code_changes:
            logger.warning("No code changes to review")
            no_changes_message = AIMessage(content="No code changes to review.")
            return {"messages": [no_changes_message], "review_status": "skipped"}
        
        # Build review prompt
        system_prompt = """You are a code reviewer. Your task is to review the provided code changes and provide constructive feedback.
Focus on:
1. Code quality and best practices
2. Potential bugs or issues
3. Security concerns
4. Performance considerations
5. Code readability and maintainability

Provide your review in the following format:
- Overall assessment (approve/request changes)
- Specific issues found (if any)
- Suggestions for improvement
"""
        
        # Format code changes for review using the consistent schema emitted
        # by the CoderAgent ({tool, file_path, content, command, result}).
        change_blocks = []
        for change in code_changes:
            tool = change.get("tool", "unknown")
            if change.get("error"):
                change_blocks.append(f"Tool `{tool}` FAILED: {change['error']}")
            elif change.get("command"):
                result = change.get("result") or {}
                change_blocks.append(
                    f"Command executed: {change['command']}\n"
                    f"stdout:\n{result.get('stdout', '')}\n"
                    f"stderr:\n{result.get('stderr', '')}"
                )
            else:
                change_blocks.append(
                    f"File: {change.get('file_path') or 'unknown'}\n"
                    f"New content:\n{change.get('content', '')}"
                )
        code_diff = "\n\n".join(change_blocks)
        
        review_messages = [
            SystemMessage(content=system_prompt),
            HumanMessage(content=f"Please review the following code changes:\n\n{code_diff}")
        ]
        
        try:
            # Generate review
            review_response = await self.llm.generate(review_messages)
            
            logger.info("ReviewerAgent completed review")
            
            # Parse review to determine approval status
            review_content = review_response.content.lower()
            if "approve" in review_content or "looks good" in review_content:
                review_status = "approved"
            elif "request changes" in review_content or "needs work" in review_content:
                review_status = "changes_requested"
            else:
                review_status = "neutral"
            
            return {
                "messages": [review_response],
                "review_status": review_status,
                "review_content": review_response.content
            }
            
        except Exception as e:
            logger.error("ReviewerAgent failed to review", error=str(e))
            error_message = AIMessage(content=f"Review failed: {str(e)}")
            return {
                "messages": [error_message],
                "review_status": "error",
                "review_content": str(e)
            }
