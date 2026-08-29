import pytest
from fastapi.testclient import TestClient
from fastapi.websockets import WebSocketDisconnect
import uuid
import json

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

def create_session_with_token(client: TestClient, token: str):
    headers = {"Authorization": f"Bearer {token}"}
    resp = client.post("/api/v1/sessions/", json={"title": "WS Test"}, headers=headers)
    assert resp.status_code == 201
    return resp.json()["id"]

def test_websocket_missing_token(client: TestClient):
    token = create_user_and_get_token(client)
    session_id = create_session_with_token(client, token)
    
    with pytest.raises(WebSocketDisconnect) as exc_info:
        with client.websocket_connect(f"/api/v1/websocket/ws/{session_id}") as websocket:
            pass
    assert exc_info.value.code == 1008

def test_websocket_invalid_token(client: TestClient):
    token = create_user_and_get_token(client)
    session_id = create_session_with_token(client, token)
    
    with pytest.raises(WebSocketDisconnect) as exc_info:
        with client.websocket_connect(f"/api/v1/websocket/ws/{session_id}?token=invalid.token.here") as websocket:
            pass
    assert exc_info.value.code == 1008

def test_websocket_cross_user_access(client: TestClient):
    token_a = create_user_and_get_token(client)
    token_b = create_user_and_get_token(client)
    
    session_id_a = create_session_with_token(client, token_a)
    
    # User B tries to connect to User A's session
    with pytest.raises(WebSocketDisconnect) as exc_info:
        with client.websocket_connect(f"/api/v1/websocket/ws/{session_id_a}?token={token_b}") as websocket:
            pass
    assert exc_info.value.code == 1008
