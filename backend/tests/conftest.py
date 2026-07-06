"""
Root test conftest.

Provides:
  - ``client`` fixture — a synchronous FastAPI TestClient (used by API tests).
  - ``registry`` fixture — a bare ToolRegistry instance.
  - Auto-skip logic for ``@pytest.mark.integration`` tests when the required
    environment variables are absent.

Import policy
-------------
We do NOT import ``app.main`` at module level here.  Doing so would pull in
the WebSocket handler → ``create_coding_workflow()`` → agent ``__init__`` →
``LLMFactory.get_provider()`` → ``ChatGoogleGenerativeAI`` — which raises
``ValidationError`` if ``GOOGLE_API_KEY`` is not set.

The ``client`` fixture imports ``app.main`` lazily inside the fixture body so
that modules which never use the fixture (all agent/tool unit tests) are
completely unaffected.
"""
import os
import pytest


# ---------------------------------------------------------------------------
# Integration-test auto-skip
# ---------------------------------------------------------------------------

def pytest_configure(config):
    """Register custom markers (also declared in pyproject.toml, but
    registering here prevents PytestUnknownMarkWarning in older pytest)."""
    config.addinivalue_line(
        "markers",
        "integration: marks tests that call real external services. "
        "Skipped automatically when GOOGLE_API_KEY is not set.",
    )


def pytest_collection_modifyitems(config, items):
    """Skip all @pytest.mark.integration tests when GOOGLE_API_KEY is absent."""
    if os.environ.get("GOOGLE_API_KEY"):
        return  # key present — run everything

    skip_integration = pytest.mark.skip(
        reason="Integration test skipped: GOOGLE_API_KEY not set. "
               "Set GOOGLE_API_KEY to run integration tests."
    )
    for item in items:
        if item.get_closest_marker("integration"):
            item.add_marker(skip_integration)


# ---------------------------------------------------------------------------
# Fixtures
# ---------------------------------------------------------------------------

@pytest.fixture
def client():
    """FastAPI TestClient — imported lazily so test collection never triggers
    the full app import chain in environments without a Gemini API key."""
    from fastapi.testclient import TestClient
    from app.main import app  # deferred — see module docstring
    return TestClient(app)


@pytest.fixture
def registry():
    from app.tools.registry import ToolRegistry
    return ToolRegistry()
