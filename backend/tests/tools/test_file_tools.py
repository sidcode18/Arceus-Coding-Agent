import os
import pytest
from app.tools.file_tools import ReadFileTool, WriteFileTool

@pytest.mark.asyncio
async def test_write_and_read_file(tmp_path):
    test_file = tmp_path / "test.txt"
    test_content = "Hello, World!"
    
    # Test Write
    write_tool = WriteFileTool()
    write_result = await write_tool.execute(file_path=str(test_file), content=test_content)
    assert write_result["status"] == "success"
    assert os.path.exists(test_file)
    
    # Test Read
    read_tool = ReadFileTool()
    read_result = await read_tool.execute(file_path=str(test_file))
    assert read_result["content"] == test_content
    
@pytest.mark.asyncio
async def test_read_nonexistent_file():
    read_tool = ReadFileTool()
    result = await read_tool.execute(file_path="/path/to/nowhere.txt")
    assert "error" in result
