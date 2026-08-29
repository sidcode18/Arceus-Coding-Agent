import pytest
from fastapi.testclient import TestClient
import uuid

def create_user_and_get_token(client: TestClient):
    unique_id = uuid.uuid4()
    email = f"user_{unique_id}@example.com"
    password = "password123"
    username = email.split("@")[0]
    
    reg_resp = client.post(
        "/api/v1/auth/register",
        json={"username": username, "email": email, "password": password}
    )
    assert reg_resp.status_code == 200, reg_resp.text
    return reg_resp.json()["access_token"]

def create_project_with_token(client: TestClient, token: str):
    headers = {"Authorization": f"Bearer {token}"}
    resp = client.post(
        "/api/v1/projects/",
        json={
            "name": f"Project {uuid.uuid4()}",
            "description": "Test Project",
            "repository_url": "https://github.com/test/repo",
            "branch": "main"
        },
        headers=headers
    )
    assert resp.status_code == 201
    return resp.json()["id"]

def test_unauthenticated_access_rejected(client: TestClient):
    resp = client.get("/api/v1/projects/")
    assert resp.status_code == 403  # HTTPBearer returns 403 when missing header

def test_cross_user_project_access_denied(client: TestClient):
    # Create two users
    token_a = create_user_and_get_token(client)
    token_b = create_user_and_get_token(client)
    
    # User A creates project
    project_id = create_project_with_token(client, token_a)
    
    # User B tries to access it
    headers_b = {"Authorization": f"Bearer {token_b}"}
    
    # Get project should 404 to hide it
    resp = client.get(f"/api/v1/projects/{project_id}", headers=headers_b)
    assert resp.status_code == 404
    
    # List should not show it
    resp = client.get("/api/v1/projects/", headers=headers_b)
    assert resp.status_code == 200
    assert len(resp.json()) == 0
    
    # Delete should 404
    resp = client.delete(f"/api/v1/projects/{project_id}", headers=headers_b)
    assert resp.status_code == 404

def test_owner_project_access_allowed(client: TestClient):
    token = create_user_and_get_token(client)
    project_id = create_project_with_token(client, token)
    headers = {"Authorization": f"Bearer {token}"}
    
    # Get project
    resp = client.get(f"/api/v1/projects/{project_id}", headers=headers)
    assert resp.status_code == 200
    assert resp.json()["id"] == project_id
    
    # List
    resp = client.get("/api/v1/projects/", headers=headers)
    assert resp.status_code == 200
    assert len(resp.json()) == 1
    assert resp.json()[0]["id"] == project_id
