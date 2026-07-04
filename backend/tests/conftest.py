import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.tools.registry import ToolRegistry

@pytest.fixture
def client():
    return TestClient(app)

@pytest.fixture
def registry():
    return ToolRegistry()
