"""
Comprehensive unit tests for workflow safeguards and execution limits.

Covers:
  - iteration_count increments correctly
  - retry_count increments correctly
  - should_continue enforces workflow_max_retries
  - should_retry enforces workflow_max_iterations
  - Successful workflows complete normally with correct metrics
  - RetrievalAgent relevance threshold filter
  - build_initial_state initialises all safeguard fields
  - _elapsed helper
  - _build_metrics (WebSocket handler helper)

All tests are unit-level; no LLM calls, no network, no DB.
"""
import asyncio
import time
import pytest
from unittest.mock import AsyncMock, MagicMock, patch

from langchain_core.messages import AIMessage, HumanMessage

# ---------------------------------------------------------------------------
# Module-level imports under test
# ---------------------------------------------------------------------------
from app.agents.workflows.coding_workflow import (
    AgentState,
    _elapsed,
    _retriever_node,
    _coder_node,
    should_review,
    should_continue,
    should_retry,
    build_initial_state,
)
from app.agents.retriever import RetrievalAgent
from app.api.v1.websocket.handler import _build_metrics

from langgraph.graph import END


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _base_state(**overrides) -> dict:
    """Build a minimal state dict; overrides replace defaults."""
    state = {
        "messages": [HumanMessage(content="Add logging to the auth module")],
        "plan": "",
        "plan_steps": [],
        "retrieved_context": [],
        "code_changes": [],
        "review_status": "",
        "review_content": "",
        "reflection_action": "",
        "reflection_content": "",
        "status": "in_progress",
        "errors": [],
        "project_id": "proj-unit",
        "iteration_count": 0,
        "retry_count": 0,
        "started_at": time.monotonic(),
        "termination_reason": "",
    }
    state.update(overrides)
    return state


def _make_search_result(score: float, file_path: str = "src/foo.py") -> dict:
    return {
        "score": score,
        "payload": {"file_path": file_path, "content": f"# code in {file_path}"},
    }


# ===========================================================================
# 1. build_initial_state
# ===========================================================================

class TestBuildInitialState:
    def test_all_safeguard_fields_present(self):
        state = build_initial_state("task", "proj-1")
        assert "iteration_count" in state
        assert "retry_count" in state
        assert "started_at" in state
        assert "termination_reason" in state

    def test_counters_start_at_zero(self):
        state = build_initial_state("task", "proj-1")
        assert state["iteration_count"] == 0
        assert state["retry_count"] == 0

    def test_termination_reason_empty(self):
        state = build_initial_state("task", "proj-1")
        assert state["termination_reason"] == ""

    def test_started_at_is_recent(self):
        before = time.monotonic()
        state = build_initial_state("task", "proj-1")
        after = time.monotonic()
        assert before <= state["started_at"] <= after

    def test_message_present(self):
        state = build_initial_state("hello world", "p1")
        assert len(state["messages"]) == 1
        assert state["messages"][0].content == "hello world"

    def test_project_id_set(self):
        state = build_initial_state("t", "my-project")
        assert state["project_id"] == "my-project"


# ===========================================================================
# 2. _elapsed
# ===========================================================================

class TestElapsed:
    def test_returns_non_negative(self):
        state = _base_state(started_at=time.monotonic() - 1.5)
        assert _elapsed(state) >= 1.5

    def test_zero_when_just_started(self):
        state = _base_state(started_at=time.monotonic())
        assert _elapsed(state) < 0.1

    def test_no_started_at_returns_near_zero(self):
        """Falls back to time.monotonic() so result should be ≈ 0."""
        state = _base_state()
        del state["started_at"]
        assert _elapsed(state) < 0.5


# ===========================================================================
# 3. _retriever_node — increments iteration_count
# ===========================================================================

class TestRetrieverNode:
    @pytest.mark.asyncio
    async def test_increments_iteration_count_from_zero(self):
        mock_agent = MagicMock()
        mock_agent.ainvoke = AsyncMock(return_value={"retrieved_context": [], "messages": []})

        state = _base_state(iteration_count=0)
        result = await _retriever_node(state, mock_agent)

        assert result["iteration_count"] == 1

    @pytest.mark.asyncio
    async def test_increments_iteration_count_from_existing(self):
        mock_agent = MagicMock()
        mock_agent.ainvoke = AsyncMock(return_value={"retrieved_context": [], "messages": []})

        state = _base_state(iteration_count=2)
        result = await _retriever_node(state, mock_agent)

        assert result["iteration_count"] == 3

    @pytest.mark.asyncio
    async def test_preserves_agent_output(self):
        ctx = [{"file_path": "a.py", "content": "x", "score": 0.9}]
        mock_agent = MagicMock()
        mock_agent.ainvoke = AsyncMock(
            return_value={"retrieved_context": ctx, "messages": [AIMessage(content="ok")]}
        )

        result = await _retriever_node(_base_state(), mock_agent)
        assert result["retrieved_context"] == ctx


# ===========================================================================
# 4. _coder_node — increments retry_count only after changes_requested
# ===========================================================================

class TestCoderNode:
    @pytest.mark.asyncio
    async def test_no_increment_on_first_run(self):
        mock_agent = MagicMock()
        mock_agent.ainvoke = AsyncMock(return_value={"code_changes": [], "messages": []})

        state = _base_state(review_status="", retry_count=0)
        result = await _coder_node(state, mock_agent)

        assert result["retry_count"] == 0

    @pytest.mark.asyncio
    async def test_increments_on_changes_requested(self):
        mock_agent = MagicMock()
        mock_agent.ainvoke = AsyncMock(return_value={"code_changes": [], "messages": []})

        state = _base_state(review_status="changes_requested", retry_count=0)
        result = await _coder_node(state, mock_agent)

        assert result["retry_count"] == 1

    @pytest.mark.asyncio
    async def test_increments_cumulatively(self):
        mock_agent = MagicMock()
        mock_agent.ainvoke = AsyncMock(return_value={"code_changes": [], "messages": []})

        state = _base_state(review_status="changes_requested", retry_count=2)
        result = await _coder_node(state, mock_agent)

        assert result["retry_count"] == 3

    @pytest.mark.asyncio
    async def test_no_increment_on_approved(self):
        mock_agent = MagicMock()
        mock_agent.ainvoke = AsyncMock(return_value={"code_changes": [], "messages": []})

        state = _base_state(review_status="approved", retry_count=1)
        result = await _coder_node(state, mock_agent)

        # approved is not "changes_requested" so no increment
        assert result["retry_count"] == 1


# ===========================================================================
# 5. should_review
# ===========================================================================

class TestShouldReview:
    def test_goes_to_reviewer_when_changes_present(self):
        state = _base_state(code_changes=[{"tool": "write_file", "file_path": "x.py"}])
        assert should_review(state) == "reviewer"

    def test_skips_reviewer_when_no_changes(self):
        state = _base_state(code_changes=[])
        assert should_review(state) == "reflection"


# ===========================================================================
# 6. should_continue — retry limit enforcement
# ===========================================================================

class TestShouldContinue:
    def test_routes_to_coder_when_changes_requested_under_limit(self):
        from app.core.config import settings
        state = _base_state(
            review_status="changes_requested",
            retry_count=settings.workflow_max_retries - 1,
        )
        assert should_continue(state) == "coder"

    def test_forces_reflection_when_retry_limit_reached(self):
        from app.core.config import settings
        state = _base_state(
            review_status="changes_requested",
            retry_count=settings.workflow_max_retries,  # exactly at limit
        )
        assert should_continue(state) == "reflection"

    def test_forces_reflection_when_retry_limit_exceeded(self):
        """Exceeding (not just meeting) the limit also terminates."""
        from app.core.config import settings
        state = _base_state(
            review_status="changes_requested",
            retry_count=settings.workflow_max_retries + 5,
        )
        assert should_continue(state) == "reflection"

    def test_routes_to_reflection_on_approved(self):
        state = _base_state(review_status="approved", retry_count=0)
        assert should_continue(state) == "reflection"

    def test_routes_to_reflection_on_neutral(self):
        state = _base_state(review_status="neutral", retry_count=0)
        assert should_continue(state) == "reflection"

    def test_custom_limit_respected(self):
        """Patching settings verifies the limit is read at call time."""
        from app.core import config as cfg
        original = cfg.settings.workflow_max_retries
        try:
            cfg.settings.__dict__["workflow_max_retries"] = 1
            # retry_count == 1 → at limit → reflection
            state = _base_state(review_status="changes_requested", retry_count=1)
            assert should_continue(state) == "reflection"
            # retry_count == 0 → under limit → coder
            state2 = _base_state(review_status="changes_requested", retry_count=0)
            assert should_continue(state2) == "coder"
        finally:
            cfg.settings.__dict__["workflow_max_retries"] = original


# ===========================================================================
# 7. should_retry — iteration limit enforcement
# ===========================================================================

class TestShouldRetry:
    def test_routes_to_retriever_on_retry_under_limit(self):
        from app.core.config import settings
        state = _base_state(
            reflection_action="retry",
            iteration_count=settings.workflow_max_iterations - 1,
        )
        assert should_retry(state) == "retriever"

    def test_routes_to_end_when_iteration_limit_reached(self):
        from app.core.config import settings
        state = _base_state(
            reflection_action="retry",
            iteration_count=settings.workflow_max_iterations,  # at limit
        )
        assert should_retry(state) is END

    def test_routes_to_end_when_iteration_limit_exceeded(self):
        from app.core.config import settings
        state = _base_state(
            reflection_action="retry",
            iteration_count=settings.workflow_max_iterations + 10,
        )
        assert should_retry(state) is END

    def test_routes_to_end_on_abort_regardless_of_count(self):
        state = _base_state(reflection_action="abort", iteration_count=0)
        assert should_retry(state) is END

    def test_routes_to_end_on_continue(self):
        state = _base_state(reflection_action="continue", iteration_count=0)
        assert should_retry(state) is END

    def test_custom_limit_respected(self):
        from app.core import config as cfg
        original = cfg.settings.workflow_max_iterations
        try:
            cfg.settings.__dict__["workflow_max_iterations"] = 2
            # iteration_count=2 → at limit → END
            state = _base_state(reflection_action="retry", iteration_count=2)
            assert should_retry(state) is END
            # iteration_count=1 → under limit → retriever
            state2 = _base_state(reflection_action="retry", iteration_count=1)
            assert should_retry(state2) == "retriever"
        finally:
            cfg.settings.__dict__["workflow_max_iterations"] = original


# ===========================================================================
# 8. RetrievalAgent — relevance threshold filter
# ===========================================================================

class TestRetrievalAgentThreshold:
    def _make_agent(self, search_results):
        agent = RetrievalAgent.__new__(RetrievalAgent)
        agent.name = "retriever"
        agent.llm = MagicMock()
        search_svc = MagicMock()
        search_svc.semantic_search = AsyncMock(return_value=search_results)
        agent.search_service = search_svc
        return agent

    @pytest.mark.asyncio
    async def test_high_score_results_are_kept(self):
        from app.core import config as cfg
        results = [_make_search_result(0.95), _make_search_result(0.80)]
        agent = self._make_agent(results)
        original = cfg.settings.retrieval_min_score
        try:
            cfg.settings.__dict__["retrieval_min_score"] = 0.30
            state = _base_state(project_id="p1")
            output = await agent.ainvoke(state)
            assert len(output["retrieved_context"]) == 2
        finally:
            cfg.settings.__dict__["retrieval_min_score"] = original

    @pytest.mark.asyncio
    async def test_low_score_results_are_discarded(self):
        from app.core import config as cfg
        results = [
            _make_search_result(0.95, "good.py"),
            _make_search_result(0.10, "noise.py"),  # below threshold
        ]
        agent = self._make_agent(results)
        original = cfg.settings.retrieval_min_score
        try:
            cfg.settings.__dict__["retrieval_min_score"] = 0.30
            state = _base_state(project_id="p1")
            output = await agent.ainvoke(state)
            paths = [c["file_path"] for c in output["retrieved_context"]]
            assert "good.py" in paths
            assert "noise.py" not in paths
            assert len(output["retrieved_context"]) == 1
        finally:
            cfg.settings.__dict__["retrieval_min_score"] = original

    @pytest.mark.asyncio
    async def test_all_below_threshold_returns_empty(self):
        from app.core import config as cfg
        results = [_make_search_result(0.05), _make_search_result(0.10)]
        agent = self._make_agent(results)
        original = cfg.settings.retrieval_min_score
        try:
            cfg.settings.__dict__["retrieval_min_score"] = 0.30
            state = _base_state(project_id="p1")
            output = await agent.ainvoke(state)
            assert output["retrieved_context"] == []
        finally:
            cfg.settings.__dict__["retrieval_min_score"] = original

    @pytest.mark.asyncio
    async def test_threshold_zero_keeps_all(self):
        """Setting the threshold to 0 keeps everything, including score=0.0."""
        from app.core import config as cfg
        results = [_make_search_result(0.0), _make_search_result(0.01)]
        agent = self._make_agent(results)
        original = cfg.settings.retrieval_min_score
        try:
            cfg.settings.__dict__["retrieval_min_score"] = 0.0
            state = _base_state(project_id="p1")
            output = await agent.ainvoke(state)
            assert len(output["retrieved_context"]) == 2
        finally:
            cfg.settings.__dict__["retrieval_min_score"] = original

    @pytest.mark.asyncio
    async def test_threshold_one_discards_all(self):
        """Setting the threshold to 1.0 discards everything (no perfect score)."""
        from app.core import config as cfg
        results = [_make_search_result(0.99), _make_search_result(0.95)]
        agent = self._make_agent(results)
        original = cfg.settings.retrieval_min_score
        try:
            cfg.settings.__dict__["retrieval_min_score"] = 1.0
            state = _base_state(project_id="p1")
            output = await agent.ainvoke(state)
            assert output["retrieved_context"] == []
        finally:
            cfg.settings.__dict__["retrieval_min_score"] = original

    @pytest.mark.asyncio
    async def test_no_project_id_returns_empty(self):
        agent = self._make_agent([])
        state = _base_state(project_id="")
        state["project_id"] = None
        output = await agent.ainvoke(state)
        assert output["retrieved_context"] == []

    @pytest.mark.asyncio
    async def test_message_mentions_discarded_count(self):
        from app.core import config as cfg
        results = [
            _make_search_result(0.90, "good.py"),
            _make_search_result(0.05, "bad.py"),
        ]
        agent = self._make_agent(results)
        original = cfg.settings.retrieval_min_score
        try:
            cfg.settings.__dict__["retrieval_min_score"] = 0.30
            state = _base_state(project_id="p1")
            output = await agent.ainvoke(state)
            msg_content = output["messages"][0].content
            assert "1" in msg_content  # 1 discarded
        finally:
            cfg.settings.__dict__["retrieval_min_score"] = original


# ===========================================================================
# 9. _build_metrics (WebSocket handler)
# ===========================================================================

class TestBuildMetrics:
    def test_extracts_all_fields(self):
        state = _base_state(iteration_count=2, retry_count=1, termination_reason="")
        metrics = _build_metrics(state, 12.345)
        assert metrics["iteration_count"] == 2
        assert metrics["retry_count"] == 1
        assert metrics["execution_time"] == 12.345
        assert metrics["termination_reason"] == ""

    def test_termination_reason_preserved(self):
        state = _base_state(termination_reason="max_retries_exceeded")
        metrics = _build_metrics(state, 5.0)
        assert metrics["termination_reason"] == "max_retries_exceeded"

    def test_execution_time_rounded(self):
        state = _base_state()
        metrics = _build_metrics(state, 3.141592)
        assert metrics["execution_time"] == 3.142

    def test_missing_keys_default_to_zero(self):
        """Gracefully handles states that don't have the safeguard keys."""
        state = {}
        metrics = _build_metrics(state, 1.0)
        assert metrics["iteration_count"] == 0
        assert metrics["retry_count"] == 0


# ===========================================================================
# 10. Infinite reviewer loop terminates safely (integration of edge functions)
# ===========================================================================

class TestInfiniteReviewerLoopTermination:
    """Simulate the edge function sequence that fires in an infinite loop
    and verify the safeguard cuts it off within workflow_max_retries steps."""

    def test_loop_terminates_at_max_retries(self):
        from app.core.config import settings

        retries = 0
        state = _base_state(review_status="changes_requested", retry_count=0)

        for _ in range(settings.workflow_max_retries + 5):
            route = should_continue(state)
            if route == "reflection":
                break
            assert route == "coder"
            # Simulate coder running: increment retry_count
            retries += 1
            state = {**state, "retry_count": retries, "review_status": "changes_requested"}

        # Must have broken out at or before the limit
        assert retries <= settings.workflow_max_retries
        # Final route must be reflection, not coder
        assert should_continue({**state, "retry_count": retries}) == "reflection"

    def test_loop_terminates_at_max_iterations(self):
        from app.core.config import settings

        iterations = 0
        state = _base_state(reflection_action="retry", iteration_count=0)

        for _ in range(settings.workflow_max_iterations + 5):
            route = should_retry(state)
            if route is END:
                break
            assert route == "retriever"
            iterations += 1
            state = {**state, "iteration_count": iterations, "reflection_action": "retry"}

        assert iterations <= settings.workflow_max_iterations
        assert should_retry({**state, "iteration_count": iterations}) is END

    def test_abort_always_terminates_immediately(self):
        """abort should end the workflow regardless of counters."""
        state = _base_state(reflection_action="abort", iteration_count=0)
        assert should_retry(state) is END

    def test_successful_workflow_not_truncated(self):
        """A workflow that never requests changes should complete normally."""
        state = _base_state(review_status="approved", retry_count=0)
        # should_continue must route to reflection, not coder
        assert should_continue(state) == "reflection"
        # After reflection says continue, should_retry must route to END
        state2 = _base_state(reflection_action="continue", iteration_count=1)
        assert should_retry(state2) is END
