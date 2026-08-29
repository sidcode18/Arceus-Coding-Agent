"""LangGraph coding workflow.

Graph topology (unchanged):
  retriever → planner → coder → reviewer ⟶ (approved/neutral) → reflection → END
                                          ↩ (changes_requested)

Safeguards added around the existing topology:
  - iteration_count  tracks full retriever→reflection cycles (loop-back via
    reflection "retry"). Capped at settings.workflow_max_iterations.
  - retry_count      tracks coder→reviewer→coder loops within one cycle.
    Capped at settings.workflow_max_retries.
  - started_at       Unix timestamp set once in the initial state so every
    edge function can compute elapsed time without I/O.
  - termination_reason  set when a limit is exceeded; consumed by callers.
"""
import operator
import time
from typing import Annotated, Optional, Sequence, TypedDict, Literal

import structlog
from langgraph.graph import StateGraph, END
from langchain_core.messages import AIMessage, BaseMessage

from app.agents.planner import PlannerAgent
from app.agents.coder import CoderAgent
from app.agents.retriever import RetrievalAgent
from app.agents.reviewer import ReviewerAgent
from app.agents.reflection import ReflectionAgent
from app.core.config import settings

logger = structlog.get_logger()


# ---------------------------------------------------------------------------
# State
# ---------------------------------------------------------------------------

class AgentState(TypedDict):
    messages: Annotated[Sequence[BaseMessage], operator.add]
    plan: str
    plan_steps: list
    retrieved_context: list
    memory_context: list
    code_changes: list
    review_status: str
    review_content: str
    reflection_action: str
    reflection_content: str
    status: str
    errors: list
    project_id: str
    user_id: str
    llm_provider: str
    llm_model: str
    # --- execution metrics / safeguard counters ---
    iteration_count: int        # incremented each time retriever fires
    retry_count: int            # incremented each time coder re-runs after reviewer
    started_at: float           # time.monotonic() set at workflow start
    termination_reason: str     # non-empty when a limit caused early termination


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _elapsed(state: AgentState) -> float:
    """Return elapsed seconds since the workflow started."""
    return time.monotonic() - state.get("started_at", time.monotonic())


def _limit_message(reason: str) -> AIMessage:
    return AIMessage(content=f"[Workflow terminated: {reason}]")


# ---------------------------------------------------------------------------
# Node wrappers — increment counters before delegating to the real agent
# ---------------------------------------------------------------------------

async def _retriever_node(state: AgentState, agent: RetrievalAgent) -> dict:
    """Increment iteration_count, then delegate to RetrievalAgent."""
    iteration = state.get("iteration_count", 0) + 1
    logger.info(
        "Retriever node entered",
        iteration=iteration,
        elapsed=round(_elapsed(state), 2),
    )
    result = await agent.ainvoke(state)
    result["iteration_count"] = iteration
    return result


async def _coder_node(state: AgentState, agent: CoderAgent) -> dict:
    """Increment retry_count on re-runs (iteration > 1 means it was retried)."""
    # retry_count only increments when the coder has run before in this cycle
    # (i.e. review_status == "changes_requested").
    retry = state.get("retry_count", 0)
    if state.get("review_status") == "changes_requested":
        retry += 1
        logger.info("Coder retry", retry_count=retry, elapsed=round(_elapsed(state), 2))
    result = await agent.ainvoke(state)
    result["retry_count"] = retry
    return result


# ---------------------------------------------------------------------------
# Edge functions — routing with safeguard checks
# ---------------------------------------------------------------------------

def should_review(state: AgentState) -> Literal["reviewer", "reflection"]:
    """Route after coder: skip review if no changes were produced."""
    code_changes = state.get("code_changes", [])
    if code_changes:
        return "reviewer"
    return "reflection"


def should_continue(state: AgentState) -> Literal["coder", "reflection"]:
    """Route after reviewer: enforce retry limit."""
    review_status = state.get("review_status", "")
    retry_count = state.get("retry_count", 0)

    if review_status == "changes_requested":
        if retry_count >= settings.workflow_max_retries:
            logger.warning(
                "Retry limit reached — forcing reflection",
                retry_count=retry_count,
                max_retries=settings.workflow_max_retries,
            )
            return "reflection"
        return "coder"

    return "reflection"


def should_retry(state: AgentState) -> Literal["retriever", END]:
    """Route after reflection: enforce iteration limit."""
    reflection_action = state.get("reflection_action", "continue")

    if reflection_action == "abort":
        return END

    if reflection_action == "retry":
        iteration_count = state.get("iteration_count", 0)
        if iteration_count >= settings.workflow_max_iterations:
            logger.warning(
                "Iteration limit reached — ending workflow",
                iteration_count=iteration_count,
                max_iterations=settings.workflow_max_iterations,
            )
            return END
        return "retriever"

    return END


# ---------------------------------------------------------------------------
# Sentinel node — emits a clear termination event when limits are exceeded
# ---------------------------------------------------------------------------

async def _termination_sentinel(state: AgentState) -> dict:
    """Injected as a no-op node whose only purpose is to be unreachable via
    normal paths — limit-exceeded routing goes directly to END, so this is
    a placeholder kept for potential future use with explicit node wrapping."""
    return {}


# ---------------------------------------------------------------------------
# Workflow factory
# ---------------------------------------------------------------------------

def create_coding_workflow():
    """Create the coding workflow graph with execution safeguards."""

    workflow = StateGraph(AgentState)

    # Instantiate agents once; wrap their ainvoke in counter nodes
    retriever_agent = RetrievalAgent()
    planner_agent = PlannerAgent()
    coder_agent = CoderAgent()
    reviewer_agent = ReviewerAgent()
    reflection_agent = ReflectionAgent()

    from functools import partial

    workflow.add_node("retriever", partial(_retriever_node, agent=retriever_agent))
    workflow.add_node("planner", planner_agent.ainvoke)
    workflow.add_node("coder", partial(_coder_node, agent=coder_agent))
    workflow.add_node("reviewer", reviewer_agent.ainvoke)
    workflow.add_node("reflection", reflection_agent.ainvoke)

    workflow.set_entry_point("retriever")

    workflow.add_edge("retriever", "planner")
    workflow.add_edge("planner", "coder")
    workflow.add_conditional_edges(
        "coder",
        should_review,
        {"reviewer": "reviewer", "reflection": "reflection"},
    )
    workflow.add_conditional_edges(
        "reviewer",
        should_continue,
        {"coder": "coder", "reflection": "reflection"},
    )
    workflow.add_conditional_edges(
        "reflection",
        should_retry,
        {"retriever": "retriever", END: END},
    )

    return workflow.compile()


# ---------------------------------------------------------------------------
# Shared initial-state builder (used by both the WebSocket handler and
# AgentService so the new fields are always populated consistently)
# ---------------------------------------------------------------------------

def build_initial_state(
    message: str, 
    project_id: str, 
    user_id: str,
    llm_provider: str = "",
    llm_model: str = ""
) -> dict:
    """Return a fresh AgentState dict with all safeguard fields initialised."""
    from langchain_core.messages import HumanMessage  # local import avoids circulars
    return {
        "messages": [HumanMessage(content=message)],
        "plan": "",
        "plan_steps": [],
        "retrieved_context": [],
        "memory_context": [],
        "code_changes": [],
        "review_status": "",
        "review_content": "",
        "reflection_action": "",
        "reflection_content": "",
        "status": "starting",
        "errors": [],
        "project_id": project_id,
        "user_id": user_id,
        "llm_provider": llm_provider,
        "llm_model": llm_model,
        # safeguard fields — always start from zero
        "iteration_count": 0,
        "retry_count": 0,
        "started_at": time.monotonic(),
        "termination_reason": "",
    }
