import structlog
from typing import Dict, Any
from langchain_core.messages import AIMessage, HumanMessage, SystemMessage

from app.agents.base import BaseAgent
from app.llm.factory import LLMFactory
from app.core.config import settings

logger = structlog.get_logger()


class ReflectionAgent(BaseAgent):
    """Agent for self-reflection and error correction"""
    
    def __init__(self):
        super().__init__("reflection")
        self.llm = LLMFactory.get_provider("gemini", model_name=settings.gemini_model)
    
    async def ainvoke(self, state: Dict[str, Any]) -> Dict[str, Any]:
        """Reflect on the current state and determine if corrections are needed"""
        logger.info("ReflectionAgent analyzing current state")
        
        messages = state.get("messages", [])
        status = state.get("status", "in_progress")
        errors = state.get("errors", [])
        
        # Build reflection prompt
        system_prompt = """You are a reflective agent. Your task is to analyze the current state of the task and determine if corrections are needed.
Consider:
1. Have there been any errors or failures?
2. Is the current approach working?
3. Should we try a different strategy?
4. Are we making progress toward the goal?

Provide your reflection in the following format:
- Current status assessment
- Issues identified (if any)
- Recommended action (continue/retry/abort)
- Reasoning for your recommendation
"""
        
        # Build context for reflection
        context_parts = []
        context_parts.append(f"Current status: {status}")
        
        if errors:
            context_parts.append(f"Errors encountered: {len(errors)}")
            for i, error in enumerate(errors[-3:], 1):  # Last 3 errors
                context_parts.append(f"  {i}. {error}")
        
        # Get recent messages for context
        recent_messages = messages[-5:] if len(messages) > 5 else messages
        message_summary = "\n".join([
            f"{msg.__class__.__name__}: {msg.content[:200]}..."
            for msg in recent_messages
        ])
        context_parts.append(f"Recent messages:\n{message_summary}")
        
        reflection_context = "\n\n".join(context_parts)
        
        reflection_messages = [
            SystemMessage(content=system_prompt),
            HumanMessage(content=f"Please reflect on the current state:\n\n{reflection_context}")
        ]
        
        try:
            # Generate reflection
            reflection_response = await self.llm.generate(reflection_messages)
            
            logger.info("ReflectionAgent completed analysis")
            
            # Parse reflection to determine action
            reflection_content = reflection_response.content.lower()
            if "retry" in reflection_content or "try again" in reflection_content:
                action = "retry"
            elif "abort" in reflection_content or "give up" in reflection_content:
                action = "abort"
            else:
                action = "continue"
            
            return {
                "messages": [reflection_response],
                "reflection_action": action,
                "reflection_content": reflection_response.content
            }
            
        except Exception as e:
            logger.error("ReflectionAgent failed to analyze", error=str(e))
            error_message = AIMessage(content=f"Reflection failed: {str(e)}")
            return {
                "messages": [error_message],
                "reflection_action": "continue",  # Default to continue on error
                "reflection_content": str(e)
            }
