"""
Tests that verify importing the application never requires GOOGLE_API_KEY.

These are the first tests that must pass in CI — if they fail, the import chain
is broken and every other test will also fail to collect.
"""


def test_debug_setting_tolerates_non_boolean_string():
    """Settings must not raise when DEBUG is set to a non-boolean string.

    Regression test for: DEBUG=release in the shell environment causing
    ``ValidationError`` at import time and breaking every test collection.
    """
    import os
    import importlib
    import app.core.config as cfg_module

    original = os.environ.get("DEBUG")
    try:
        os.environ["DEBUG"] = "release"
        # Clear the lru_cache so the next call re-reads the env.
        cfg_module.get_settings.cache_clear()
        settings = cfg_module.get_settings()
        # "release" is not a falsy keyword so it should coerce to True.
        assert isinstance(settings.debug, bool)
    finally:
        # Restore original env and cache state.
        if original is None:
            os.environ.pop("DEBUG", None)
        else:
            os.environ["DEBUG"] = original
        cfg_module.get_settings.cache_clear()
        # Re-prime the cache with the actual env state.
        cfg_module.settings = cfg_module.get_settings()


def test_import_agents_router_without_api_key():
    """Importing the agents router must not trigger LLM or workflow construction."""
    import app.api.v1.agents.router  # noqa: F401


def test_import_app_main_without_api_key():
    """Importing app.main must not raise even without GOOGLE_API_KEY set.

    This is a regression test for the bug where:
      conftest.py → app.main → websocket/handler.py
        → create_coding_workflow() at module level
          → RetrievalAgent() → GeminiProvider() → ChatGoogleGenerativeAI()
            → ValidationError: Did not find google_api_key
    """
    # Simply importing (or re-importing) must not raise.
    import importlib
    import app.main  # noqa: F401 — import-time side effects are what we're testing
    importlib.reload(app.main)  # also verify a second load is safe


def test_import_agents_without_api_key():
    """All agent modules must be importable without GOOGLE_API_KEY."""
    import app.agents.planner  # noqa: F401
    import app.agents.coder  # noqa: F401
    import app.agents.reviewer  # noqa: F401
    import app.agents.reflection  # noqa: F401
    import app.agents.retriever  # noqa: F401


def test_import_workflow_without_api_key():
    """create_coding_workflow() must not touch the Gemini client."""
    from app.agents.workflows.coding_workflow import create_coding_workflow
    workflow = create_coding_workflow()
    assert workflow is not None


def test_import_websocket_handler_without_api_key():
    """The WebSocket handler module must be importable without GOOGLE_API_KEY."""
    import app.api.v1.websocket.handler  # noqa: F401


def test_health_check(client):
    response = client.get("/api/v1/health")
    # health is on /health not /api/v1/health
    assert response.status_code == 404


def test_root_health(client):
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json()["status"] == "healthy"
