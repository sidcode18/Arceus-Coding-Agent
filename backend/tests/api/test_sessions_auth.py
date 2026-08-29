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

def create_session_with_token(client: TestClient, token: str, project_id: str = None):
    headers = {"Authorization": f"Bearer {token}"}
    payload = {"title": "Test Session"}
    if project_id:
        payload["project_id"] = project_id
        
    resp = client.post("/api/v1/sessions/", json=payload, headers=headers)
    assert resp.status_code == 201
    return resp.json()["id"]

def test_unauthenticated_session_access_rejected(client: TestClient):
    resp = client.get("/api/v1/sessions/")
    assert resp.status_code == 403

def test_cross_user_session_access_denied(client: TestClient):
    token_a = create_user_and_get_token(client)
    token_b = create_user_and_get_token(client)
    
    session_id = create_session_with_token(client, token_a)
    
    headers_b = {"Authorization": f"Bearer {token_b}"}
    
    resp = client.get(f"/api/v1/sessions/{session_id}", headers=headers_b)
    assert resp.status_code == 404
    
    resp = client.get("/api/v1/sessions/", headers=headers_b)
    assert resp.status_code == 200
    assert len(resp.json()) == 0

def test_cross_user_project_session_creation_denied(client: TestClient):
    token_a = create_user_and_get_token(client)
    token_b = create_user_and_get_token(client)
    
    project_id = create_project_with_token(client, token_a)
    
    # User B tries to create session under User A's project
    headers_b = {"Authorization": f"Bearer {token_b}"}
    resp = client.post(
        "/api/v1/sessions/", 
        json={"title": "Hack", "project_id": project_id},
        headers=headers_b
    )
    assert resp.status_code == 404
