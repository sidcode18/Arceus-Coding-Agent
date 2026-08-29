import asyncio
import os
import sys

sys.path.append(os.path.dirname(os.path.abspath(__file__)))
from app.workers.tasks import index_project
from app.services.repository import repository_manager
from app.services.search_service import get_search_service
import uuid

def test_clone_and_index():
    project_id = str(uuid.uuid4())
    print(f"Using Project ID: {project_id}")
    os.makedirs(f"/tmp/{project_id}/src", exist_ok=True)
    with open(f"/tmp/{project_id}/src/main.py", "w") as f:
        f.write("def authenticate_user():\n    print('authenticated')\n")
        f.write("def db_models():\n    print('models')\n")
        
    repository_manager._repositories = {project_id: f"/tmp/{project_id}"}
    
    try:
        index_project(project_id, ["src/main.py"])
        print("Indexing completed successfully!")
    except Exception as e:
        import traceback
        print(f"Indexing failed:")
        traceback.print_exc()

if __name__ == "__main__":
    test_clone_and_index()
