import operator
from typing import Annotated, Sequence, TypedDict, Literal
import structlog
from langgraph.graph import StateGraph, END

from langchain_core.messages import BaseMessage

from app.agents.planner import PlannerAgent
from app.agents.coder import CoderAgent
from app.agents.retriever import RetrievalAgent
from app.agents.reviewer import ReviewerAgent
from app.agents.reflection import ReflectionAgent

logger = structlog.get_logger()


class AgentState(TypedDict):
    messages: Annotated[Sequence[BaseMessage], operator.add]
    plan: str
    plan_steps: list
    retrieved_context: list
    code_changes: list
    review_status: str
    review_content: str
    reflection_action: str
    reflection_content: str
    status: str
    errors: list
    project_id: str


def should_review(state: AgentState) -> Literal["reviewer", "reflection"]:
    """Determine if we should review or go to reflection"""
    code_changes = state.get("code_changes", [])
    if code_changes:
        return "reviewer"
    return "reflection"


def should_continue(state: AgentState) -> Literal["coder", "reflection", END]:
    """Determine next step based on review status"""
    review_status = state.get("review_status", "")
    
    if review_status == "changes_requested":
        return "coder"
    elif review_status == "approved":
        return "reflection"
    else:
        return "reflection"


def should_retry(state: AgentState) -> Literal["retriever", END]:
    """Determine if we should retry or end"""
    reflection_action = state.get("reflection_action", "continue")
    
    if reflection_action == "retry":
        return "retriever"
    elif reflection_action == "abort":
        return END
    else:
        return END


def create_coding_workflow():
    """Create the comprehensive coding workflow graph"""
    
    workflow = StateGraph(AgentState)
    
    # Initialize agents
    retriever = RetrievalAgent()
    planner = PlannerAgent()
    coder = CoderAgent()
    reviewer = ReviewerAgent()
    reflection = ReflectionAgent()
    
    # Add nodes
    workflow.add_node("retriever", retriever.ainvoke)
    workflow.add_node("planner", planner.ainvoke)
    workflow.add_node("coder", coder.ainvoke)
    workflow.add_node("reviewer", reviewer.ainvoke)
    workflow.add_node("reflection", reflection.ainvoke)
    
    # Set entry point
    workflow.set_entry_point("retriever")
    
    # Add edges
    workflow.add_edge("retriever", "planner")
    workflow.add_edge("planner", "coder")
    workflow.add_conditional_edges(
        "coder",
        should_review,
        {
            "reviewer": "reviewer",
            "reflection": "reflection"
        }
    )
    workflow.add_conditional_edges(
        "reviewer",
        should_continue,
        {
            "coder": "coder",
            "reflection": "reflection"
        }
    )
    workflow.add_conditional_edges(
        "reflection",
        should_retry,
        {
            "retriever": "retriever",
            END: END
        }
    )
    
    return workflow.compile()
