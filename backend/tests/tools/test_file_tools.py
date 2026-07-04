import os
import pytest

from app.tools.file_tools import ReadFileTool, WriteFileTool
from app.services.repository import repository_manager


@pytest.fixture
def workspace(tmp_path, monkeypatch):
    """Point the RepositoryManager at a temp workspace with one project dir."""
    monkeypatch.setattr(repository_manager, "workspace_dir", str(tmp_path))
    project_id = "proj-1"
    os.makedirs(os.path.join(str(tmp_path), project_id), exist_ok=True)
    return project_id


@pytest.mark.asyncio
async def test_write_and_read_file(workspace):
    project_id = workspace
    test_content = "Hello, World!"

    write_tool = WriteFileTool()
    write_result = await write_tool.execute(
        file_path="src/test.txt", content=test_content, project_id=project_id
    )
    assert write_result["status"] == "success"

    read_tool = ReadFileTool()
    read_result = await read_tool.execute(file_path="src/test.txt", project_id=project_id)
    assert read_result["content"] == test_content


@pytest.mark.asyncio
async def test_read_nonexistent_file(workspace):
    read_tool = ReadFileTool()
    result = await read_tool.execute(file_path="nope.txt", project_id=workspace)
    assert "error" in result


@pytest.mark.asyncio
async def test_write_requires_project_id():
    write_tool = WriteFileTool()
    result = await write_tool.execute(file_path="x.txt", content="y")
    assert "error" in result


@pytest.mark.asyncio
async def test_path_traversal_blocked(workspace):
    read_tool = ReadFileTool()
    result = await read_tool.execute(file_path="../../etc/passwd", project_id=workspace)
    assert "error" in result
    assert "Security Error" in result["error"]
