"""
Tests verifying that retrieved_context is propagated through the RAG pipeline
and that Reviewer/Reflection agents use structured output routing.

These tests are deliberately unit-level: they mock the LLM so they run without
real API keys and with no external services.
"""
import pytest
from unittest.mock import AsyncMock, MagicMock, patch
from langchain_core.messages import AIMessage, HumanMessage

from app.agents.planner import PlannerAgent, _format_retrieved_context
from app.agents.coder import CoderAgent
from app.agents.reviewer import ReviewerAgent, ReviewOutput
from app.agents.reflection import ReflectionAgent, ReflectionOutput


# ---------------------------------------------------------------------------
# Helpers / fixtures
# ---------------------------------------------------------------------------

SAMPLE_CONTEXT = [
    {
        "file_path": "src/auth/login.py",
        "content": "def login(username, password):\n    # Authenticate user\n    return check_credentials(username, password)",
        "score": 0.92,
    },
    {
        "file_path": "src/utils/db.py",
        "content": "def get_connection():\n    return sqlite3.connect('app.db')",
        "score": 0.75,
    },
]


def _make_state(extra=None):
    state = {
        "messages": [HumanMessage(content="Add a logout function to the auth module")],
        "retrieved_context": SAMPLE_CONTEXT,
        "plan_steps": ["Read src/auth/login.py", "Add logout() function"],
        "code_changes": [],
        "review_status": "",
        "reflection_action": "",
        "status": "in_progress",
        "errors": [],
        "project_id": "proj-test",
    }
    if extra:
        state.update(extra)
    return state


# ---------------------------------------------------------------------------
# _format_retrieved_context unit tests
# ---------------------------------------------------------------------------

class TestFormatRetrievedContext:
    def test_empty_returns_empty_string(self):
        assert _format_retrieved_context([]) == ""

    def test_includes_file_paths(self):
        result = _format_retrieved_context(SAMPLE_CONTEXT)
        assert "src/auth/login.py" in result
        assert "src/utils/db.py" in result

    def test_includes_code_content(self):
        result = _format_retrieved_context(SAMPLE_CONTEXT)
        assert "def login(username, password)" in result
        assert "def get_connection()" in result

    def test_includes_relevance_scores(self):
        result = _format_retrieved_context(SAMPLE_CONTEXT)
        assert "0.920" in result
        assert "0.750" in result

    def test_truncates_long_content(self):
        long_ctx = [{"file_path": "big.py", "content": "x" * 2000, "score": 0.5}]
        result = _format_retrieved_context(long_ctx)
        assert "truncated" in result

    def test_caps_at_five_snippets(self):
        many = [
            {"file_path": f"f{i}.py", "content": f"code{i}", "score": 0.5}
            for i in range(10)
        ]
        result = _format_retrieved_context(many)
        # Only the first 5 should appear
        assert "f4.py" in result
        assert "f5.py" not in result


# ---------------------------------------------------------------------------
# PlannerAgent — retrieved_context flows into the LLM prompt
# ---------------------------------------------------------------------------

class TestPlannerAgentContextInjection:
    @pytest.mark.asyncio
    async def test_planner_passes_file_paths_to_llm(self):
        """The message sent to the LLM must contain the retrieved file paths."""
        captured_messages = []

        async def fake_generate(messages, **kwargs):
            captured_messages.extend(messages)
            return AIMessage(content="1. Read login.py\n2. Add logout function")

        with patch.object(
            PlannerAgent, "__init__", lambda self: (
                setattr(self, "name", "planner") or
                setattr(self, "llm", MagicMock(generate=AsyncMock(side_effect=fake_generate)))
            )
        ):
            agent = PlannerAgent.__new__(PlannerAgent)
            agent.name = "planner"
            llm_mock = MagicMock()
            llm_mock.generate = AsyncMock(side_effect=fake_generate)
            agent.llm = llm_mock

            state = _make_state()
            await agent.ainvoke(state)

        # At least one message should contain both retrieved file paths
        all_content = " ".join(
            m.content for m in captured_messages if hasattr(m, "content")
        )
        assert "src/auth/login.py" in all_content, (
            "PlannerAgent must include retrieved file path in LLM prompt"
        )
        assert "src/utils/db.py" in all_content

    @pytest.mark.asyncio
    async def test_planner_passes_code_content_to_llm(self):
        """The message sent to the LLM must contain the actual code snippet."""
        captured_messages = []

        async def fake_generate(messages, **kwargs):
            captured_messages.extend(messages)
            return AIMessage(content="1. Step one")

        agent = PlannerAgent.__new__(PlannerAgent)
        agent.name = "planner"
        llm_mock = MagicMock()
        llm_mock.generate = AsyncMock(side_effect=fake_generate)
        agent.llm = llm_mock

        await agent.ainvoke(_make_state())

        all_content = " ".join(
            m.content for m in captured_messages if hasattr(m, "content")
        )
        assert "def login(username, password)" in all_content, (
            "PlannerAgent must include retrieved code content in LLM prompt"
        )

    @pytest.mark.asyncio
    async def test_planner_no_context_message_is_clear(self):
        """When no context is retrieved the prompt must say so explicitly."""
        captured_messages = []

        async def fake_generate(messages, **kwargs):
            captured_messages.extend(messages)
            return AIMessage(content="1. Step one")

        agent = PlannerAgent.__new__(PlannerAgent)
        agent.name = "planner"
        llm_mock = MagicMock()
        llm_mock.generate = AsyncMock(side_effect=fake_generate)
        agent.llm = llm_mock

        state = _make_state({"retrieved_context": []})
        await agent.ainvoke(state)

        all_content = " ".join(
            m.content for m in captured_messages if hasattr(m, "content")
        )
        assert "No repository context" in all_content


# ---------------------------------------------------------------------------
# CoderAgent — retrieved_context flows into the LLM prompt
# ---------------------------------------------------------------------------

class TestCoderAgentContextInjection:
    @pytest.mark.asyncio
    async def test_coder_passes_file_paths_to_llm(self):
        """The message sent to the LLM must contain the retrieved file paths."""
        captured_messages = []

        async def fake_generate(messages, **kwargs):
            captured_messages.extend(messages)
            return AIMessage(content="I will write the code now.")

        agent = CoderAgent.__new__(CoderAgent)
        agent.name = "coder"
        llm_mock = MagicMock()
        llm_mock.generate = AsyncMock(side_effect=fake_generate)
        agent.llm = llm_mock
        agent.tool_registry = MagicMock(get_openai_schemas=MagicMock(return_value=[]))

        await agent.ainvoke(_make_state())

        all_content = " ".join(
            m.content for m in captured_messages if hasattr(m, "content")
        )
        assert "src/auth/login.py" in all_content, (
            "CoderAgent must include retrieved file path in LLM prompt"
        )

    @pytest.mark.asyncio
    async def test_coder_passes_code_content_to_llm(self):
        """The message sent to the LLM must contain the actual code snippet."""
        captured_messages = []

        async def fake_generate(messages, **kwargs):
            captured_messages.extend(messages)
            return AIMessage(content="done")

        agent = CoderAgent.__new__(CoderAgent)
        agent.name = "coder"
        llm_mock = MagicMock()
        llm_mock.generate = AsyncMock(side_effect=fake_generate)
        agent.llm = llm_mock
        agent.tool_registry = MagicMock(get_openai_schemas=MagicMock(return_value=[]))

        await agent.ainvoke(_make_state())

        all_content = " ".join(
            m.content for m in captured_messages if hasattr(m, "content")
        )
        assert "def login(username, password)" in all_content, (
            "CoderAgent must include retrieved code content in LLM prompt"
        )

    @pytest.mark.asyncio
    async def test_coder_context_appears_before_plan(self):
        """Retrieved context must appear before the plan in the HumanMessage.

        The CoderAgent's prompt structure is:
          [SystemMessage, HumanMessage(context+plan), ...conversation history]

        We capture the FIRST HumanMessage (the constructed prompt) rather than
        any subsequent ones from conversation history.
        """
        captured_human_content = None

        async def fake_generate(messages, **kwargs):
            nonlocal captured_human_content
            # Take the first HumanMessage — that's the constructed context prompt.
            for m in messages:
                if isinstance(m, HumanMessage):
                    captured_human_content = m.content
                    break  # stop at the first one
            return AIMessage(content="done")

        agent = CoderAgent.__new__(CoderAgent)
        agent.name = "coder"
        llm_mock = MagicMock()
        llm_mock.generate = AsyncMock(side_effect=fake_generate)
        agent.llm = llm_mock
        agent.tool_registry = MagicMock(get_openai_schemas=MagicMock(return_value=[]))

        await agent.ainvoke(_make_state())

        assert captured_human_content is not None
        ctx_pos = captured_human_content.find("Retrieved code context")
        plan_pos = captured_human_content.find("Plan to implement")
        assert ctx_pos != -1, "HumanMessage must contain 'Retrieved code context' section"
        assert plan_pos != -1, "HumanMessage must contain 'Plan to implement' section"
        assert ctx_pos < plan_pos, (
            "Retrieved context must appear before the plan in the CoderAgent prompt"
        )


# ---------------------------------------------------------------------------
# ReviewerAgent — structured output routing
# ---------------------------------------------------------------------------

class TestReviewerStructuredOutput:
    @pytest.mark.asyncio
    async def test_reviewer_approved_sets_review_status(self):
        """review_status must equal 'approved' when LLM returns approved decision."""
        approved_output = ReviewOutput(
            decision="approved",
            summary="All changes look correct.",
            issues=[],
            suggestions=[],
        )

        agent = ReviewerAgent.__new__(ReviewerAgent)
        agent.name = "reviewer"
        llm_mock = MagicMock()
        llm_mock.generate_structured = AsyncMock(return_value=approved_output)
        agent.llm = llm_mock

        state = _make_state(
            {
                "code_changes": [
                    {
                        "tool": "write_file",
                        "file_path": "src/auth/login.py",
                        "content": "def logout(): pass",
                        "command": "",
                        "result": None,
                        "error": None,
                    }
                ]
            }
        )
        result = await agent.ainvoke(state)

        assert result["review_status"] == "approved"
        assert "approved" in result["review_content"]

    @pytest.mark.asyncio
    async def test_reviewer_changes_requested_sets_review_status(self):
        """review_status must equal 'changes_requested' for the routing edge."""
        cr_output = ReviewOutput(
            decision="changes_requested",
            summary="Missing error handling.",
            issues=["No exception handling in logout()"],
            suggestions=[],
        )

        agent = ReviewerAgent.__new__(ReviewerAgent)
        agent.name = "reviewer"
        llm_mock = MagicMock()
        llm_mock.generate_structured = AsyncMock(return_value=cr_output)
        agent.llm = llm_mock

        state = _make_state(
            {
                "code_changes": [
                    {
                        "tool": "write_file",
                        "file_path": "src/auth/login.py",
                        "content": "def logout(): pass",
                        "command": "",
                        "result": None,
                        "error": None,
                    }
                ]
            }
        )
        result = await agent.ainvoke(state)

        assert result["review_status"] == "changes_requested"
        assert "No exception handling" in result["review_content"]

    @pytest.mark.asyncio
    async def test_reviewer_skipped_when_no_changes(self):
        """When code_changes is empty the review must be skipped without calling the LLM."""
        agent = ReviewerAgent.__new__(ReviewerAgent)
        agent.name = "reviewer"
        llm_mock = MagicMock()
        llm_mock.generate_structured = AsyncMock()
        agent.llm = llm_mock

        result = await agent.ainvoke(_make_state({"code_changes": []}))

        assert result["review_status"] == "skipped"
        llm_mock.generate_structured.assert_not_called()

    @pytest.mark.asyncio
    async def test_reviewer_no_keyword_scan(self):
        """The word 'approve' appearing in file content must NOT affect routing.

        Old code: 'approve' in review_content.lower() → 'approved'
        New code: uses structured output; free text cannot influence routing.
        """
        # LLM returns changes_requested despite the word 'approve' in issues text
        tricky_output = ReviewOutput(
            decision="changes_requested",
            summary="Code has issues.",
            issues=["You should not auto-approve without tests"],
            suggestions=[],
        )

        agent = ReviewerAgent.__new__(ReviewerAgent)
        agent.name = "reviewer"
        llm_mock = MagicMock()
        llm_mock.generate_structured = AsyncMock(return_value=tricky_output)
        agent.llm = llm_mock

        state = _make_state(
            {
                "code_changes": [
                    {
                        "tool": "write_file",
                        "file_path": "x.py",
                        "content": "# approve this",
                        "command": "",
                        "result": None,
                        "error": None,
                    }
                ]
            }
        )
        result = await agent.ainvoke(state)

        # Must be changes_requested — not 'approved' because the word 'approve'
        # appeared in the issues list.
        assert result["review_status"] == "changes_requested", (
            "Structured output must not be overridden by keyword presence in text"
        )


# ---------------------------------------------------------------------------
# ReflectionAgent — structured output routing
# ---------------------------------------------------------------------------

class TestReflectionStructuredOutput:
    @pytest.mark.asyncio
    async def test_reflection_continue_action(self):
        continue_output = ReflectionOutput(
            action="continue",
            assessment="Task completed successfully.",
            reasoning="All steps executed without errors.",
        )

        agent = ReflectionAgent.__new__(ReflectionAgent)
        agent.name = "reflection"
        llm_mock = MagicMock()
        llm_mock.generate_structured = AsyncMock(return_value=continue_output)
        agent.llm = llm_mock

        result = await agent.ainvoke(_make_state())
        assert result["reflection_action"] == "continue"

    @pytest.mark.asyncio
    async def test_reflection_retry_action(self):
        retry_output = ReflectionOutput(
            action="retry",
            assessment="Write failed due to permission error.",
            reasoning="A fresh retrieval pass with a different file target may help.",
        )

        agent = ReflectionAgent.__new__(ReflectionAgent)
        agent.name = "reflection"
        llm_mock = MagicMock()
        llm_mock.generate_structured = AsyncMock(return_value=retry_output)
        agent.llm = llm_mock

        result = await agent.ainvoke(_make_state({"errors": ["Permission denied"]}))
        assert result["reflection_action"] == "retry"

    @pytest.mark.asyncio
    async def test_reflection_abort_action(self):
        abort_output = ReflectionOutput(
            action="abort",
            assessment="Task is impossible.",
            reasoning="The target file does not exist and cannot be created.",
        )

        agent = ReflectionAgent.__new__(ReflectionAgent)
        agent.name = "reflection"
        llm_mock = MagicMock()
        llm_mock.generate_structured = AsyncMock(return_value=abort_output)
        agent.llm = llm_mock

        result = await agent.ainvoke(_make_state())
        assert result["reflection_action"] == "abort"

    @pytest.mark.asyncio
    async def test_reflection_no_keyword_scan(self):
        """The word 'retry' appearing in assessment text must NOT affect routing.

        Old code: 'retry' in reflection_content.lower() → action='retry'
        New code: uses structured output; only the action field determines routing.
        """
        # LLM says continue even though 'retry' appears in the assessment text
        continue_output = ReflectionOutput(
            action="continue",
            assessment="No need to retry, everything looks fine.",
            reasoning="All code was written successfully.",
        )

        agent = ReflectionAgent.__new__(ReflectionAgent)
        agent.name = "reflection"
        llm_mock = MagicMock()
        llm_mock.generate_structured = AsyncMock(return_value=continue_output)
        agent.llm = llm_mock

        result = await agent.ainvoke(_make_state())

        assert result["reflection_action"] == "continue", (
            "Structured action field must not be overridden by keyword in assessment text"
        )

    @pytest.mark.asyncio
    async def test_reflection_defaults_to_continue_on_llm_error(self):
        """If generate_structured raises, the agent must default to 'continue'."""
        agent = ReflectionAgent.__new__(ReflectionAgent)
        agent.name = "reflection"
        llm_mock = MagicMock()
        llm_mock.generate_structured = AsyncMock(
            side_effect=RuntimeError("LLM unavailable")
        )
        agent.llm = llm_mock

        result = await agent.ainvoke(_make_state())
        assert result["reflection_action"] == "continue"
