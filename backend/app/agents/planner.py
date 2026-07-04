import structlog
from typing import Dict, Any
from langchain_core.messages import HumanMessage, AIMessage, SystemMessage

from app.agents.base import BaseAgent
from app.llm.factory import LLMFactory
from app.core.config import settings

logger = structlog.get_logger()


class PlannerAgent(BaseAgent):
    """Agent for planning and breaking down tasks into steps"""
    
    def __init__(self):
        super().__init__("planner")
        self.llm = LLMFactory.get_provider("gemini", model_name=settings.gemini_model)
    
    async def ainvoke(self, state: Dict[str, Any]) -> Dict[str, Any]:
        """Generate a plan for the given task"""
        logger.info("PlannerAgent generating plan")
        
        messages = state.get("messages", [])
        retrieved_context = state.get("retrieved_context", [])
        
        # Build planning prompt
        system_prompt = """You are a planning agent. Your task is to break down the user's request into a clear, actionable plan.
Consider:
1. What needs to be done
2. The order of operations
3. Dependencies between steps
4. Potential risks or edge cases

Format your plan as a numbered list of specific, actionable steps.
Each step should be clear and concise.
"""
        
        # Build context for planning
        context_parts = []
        
        # Add retrieved context if available
        if retrieved_context:
            context_parts.append("Relevant code context:")
            for ctx in retrieved_context[:3]:  # Limit to top 3
                context_parts.append(f"- {ctx.get('file_path', 'unknown')}")
        
        # Get the user's request
        user_messages = [msg for msg in messages if isinstance(msg, HumanMessage)]
        if user_messages:
            user_request = user_messages[-1].content
            context_parts.append(f"User request: {user_request}")
        
        planning_context = "\n\n".join(context_parts) if context_parts else "No additional context available."
        
        planning_messages = [
            SystemMessage(content=system_prompt),
            HumanMessage(content=f"Create a plan for the following request:\n\n{planning_context}")
        ]
        
        try:
            # Generate plan
            plan_response = await self.llm.generate(planning_messages)
            
            logger.info("PlannerAgent generated plan")
            
            # Extract plan steps
            plan_content = plan_response.content
            plan_steps = self._parse_plan_steps(plan_content)
            
            return {
                "messages": [plan_response],
                "plan": plan_content,
                "plan_steps": plan_steps
            }
            
        except Exception as e:
            logger.error("PlannerAgent failed to generate plan", error=str(e))
            error_message = AIMessage(content=f"Planning failed: {str(e)}")
            return {
                "messages": [error_message],
                "plan": "",
                "plan_steps": []
            }
    
    def _parse_plan_steps(self, plan_content: str) -> list:
        """Parse plan content into individual steps"""
        steps = []
        lines = plan_content.split('\n')
        
        for line in lines:
            line = line.strip()
            # Look for numbered lines (1., 2., etc.)
            if line and (line[0].isdigit() or line.startswith('-')):
                # Remove the number/bullet and clean up
                step = line.split('.', 1)[-1].split('-', 1)[-1].strip()
                if step:
                    steps.append(step)
        
        return steps
