import asyncio
import httpx
import time

API_URL = "http://localhost:8000/api/v1"

async def test_workspace_engine():
    async with httpx.AsyncClient() as client:
        print("1. Creating Project (triggers clone & index)...")
        res = await client.post(f"{API_URL}/projects/", json={
            "name": "test-repo",
            "repository_url": "https://github.com/octocat/Hello-World.git",
            "branch": "master"
        })
        assert res.status_code == 201, f"Failed to create project: {res.text}"
        project_id = res.json()["id"]
        print(f"Project created with ID: {project_id}")
        
        # Wait for background celery clone and index to finish
        print("Waiting 15 seconds for celery background tasks...")
        await asyncio.sleep(15)
        
        print("2. Verifying File Tree Generation...")
        res = await client.get(f"{API_URL}/projects/{project_id}/tree")
        assert res.status_code == 200, f"Failed to get tree: {res.text}"
        tree = res.json()
        assert "children" in tree
        # find README
        readme = next((child for child in tree["children"] if child["name"] == "README"), None)
        assert readme is not None, "README not found in tree"
        print("File tree generated successfully.")
        
        print("3. Verifying File CRUD...")
        # Read
        res = await client.get(f"{API_URL}/projects/{project_id}/file?path=README")
        assert res.status_code == 200, f"Failed to read file: {res.text}"
        assert "Hello World!" in res.json()["content"]
        
        # Update
        res = await client.put(f"{API_URL}/projects/{project_id}/file?path=README", json={
            "content": "Hello World! Updated via API",
            "commit_message": "Update README"
        })
        assert res.status_code == 200, f"Failed to update file: {res.text}"
        
        # Path traversal protection
        res = await client.get(f"{API_URL}/projects/{project_id}/file?path=../etc/passwd")
        assert res.status_code == 400, "Path traversal protection failed!"
        print("File CRUD & Traversal Protection verified.")
        
        # Wait a moment for Qdrant index of the modified file
        await asyncio.sleep(5)
        
        print("4. Verifying Semantic Search (Qdrant)...")
        res = await client.post(f"{API_URL}/projects/{project_id}/search", json={
            "query": "Hello World",
            "limit": 5
        })
        assert res.status_code == 200, f"Search failed: {res.text}"
        results = res.json()
        assert len(results) > 0, "No search results returned"
        assert "payload" in results[0]
        print("Semantic search verified.")
        
        print("5. Deleting Project...")
        res = await client.delete(f"{API_URL}/projects/{project_id}")
        assert res.status_code == 204, f"Delete project failed: {res.text}"
        print("Project deleted successfully.")
        
        print("\nAll end-to-end tests passed! Workspace Engine is fully operational.")

if __name__ == "__main__":
    asyncio.run(test_workspace_engine())
