import asyncio
import os
import sys

sys.path.append(os.path.dirname(os.path.abspath(__file__)))
from app.workers.tasks import index_project
from app.services.repository import repository_manager

def test_clone_and_index():
    project_id = "test-project-123"
    os.makedirs(f"/tmp/{project_id}/src", exist_ok=True)
    with open(f"/tmp/{project_id}/src/main.py", "w") as f:
        f.write("def hello():\n    print('world')\n")
        
    repository_manager._repositories = {project_id: f"/tmp/{project_id}"}
    
    try:
        index_project(project_id, ["src/main.py"])
        print("Indexing completed successfully!")
    except Exception as e:
        print(f"Indexing failed: {e}")

if __name__ == "__main__":
    test_clone_and_index()
