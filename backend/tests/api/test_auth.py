import pytest
from fastapi.testclient import TestClient
import uuid

def create_test_user(client: TestClient, password: str = "password123"):
    unique_id = uuid.uuid4()
    email = f"user_{unique_id}@example.com"
    resp = client.post(
        "/api/v1/auth/register",
        json={"username": email.split("@")[0], "email": email, "password": password}
    )
    assert resp.status_code == 200
    return email, password

def test_register(client: TestClient):
    unique_id = uuid.uuid4()
    response = client.post(
        "/api/v1/auth/register",
        json={"username": f"newuser_{unique_id}", "email": f"newuser_{unique_id}@example.com", "password": "newpassword123"}
    )
    assert response.status_code == 200
    data = response.json()
    assert "access_token" in data
    assert "refresh_token" in data
    assert data["token_type"] == "bearer"

def test_login(client: TestClient):
    email, password = create_test_user(client)
    
    response = client.post(
        "/api/v1/auth/token",
        data={"username": email, "password": password}
    )
    assert response.status_code == 200
    data = response.json()
    assert "access_token" in data
    assert "refresh_token" in data

def test_refresh_token(client: TestClient):
    email, password = create_test_user(client)
    
    # Login to get refresh token
    login_resp = client.post(
        "/api/v1/auth/token",
        data={"username": email, "password": password}
    )
    refresh_token = login_resp.json()["refresh_token"]

    # Use it to get a new token pair
    refresh_resp = client.post(
        "/api/v1/auth/refresh",
        json={"refresh_token": refresh_token}
    )
    assert refresh_resp.status_code == 200
    data = refresh_resp.json()
    assert "access_token" in data
    assert "refresh_token" in data

def test_logout_and_blocklist(client: TestClient):
    email, password = create_test_user(client)
    
    login_resp = client.post(
        "/api/v1/auth/token",
        data={"username": email, "password": password}
    )
    refresh_token = login_resp.json()["refresh_token"]

    # Logout
    logout_resp = client.post(
        "/api/v1/auth/logout",
        json={"refresh_token": refresh_token}
    )
    assert logout_resp.status_code == 200

    # Try to refresh with the blocklisted token
    refresh_resp = client.post(
        "/api/v1/auth/refresh",
        json={"refresh_token": refresh_token}
    )
    assert refresh_resp.status_code == 401

def test_me_endpoint(client: TestClient):
    email, password = create_test_user(client)
    
    login_resp = client.post(
        "/api/v1/auth/token",
        data={"username": email, "password": password}
    )
    access_token = login_resp.json()["access_token"]

    me_resp = client.get(
        "/api/v1/auth/me",
        headers={"Authorization": f"Bearer {access_token}"}
    )
    assert me_resp.status_code == 200
    assert me_resp.json()["email"] == email

def test_e2e_register_login_username_flow(client: TestClient):
    unique_id = uuid.uuid4()
    username = f"End2EndUser_{unique_id}"
    email = f"{username}@example.com"
    password = "e2epassword123!"

    # 1. Register
    reg_resp = client.post(
        "/api/v1/auth/register",
        json={"username": username, "email": email, "password": password}
    )
    assert reg_resp.status_code == 200, reg_resp.text

    # 2. Login immediately with USERNAME in a different case
    login_resp = client.post(
        "/api/v1/auth/token",
        data={"username": username.upper(), "password": password}
    )
    assert login_resp.status_code == 200, login_resp.text
    access_token = login_resp.json()["access_token"]

    # 3. Verify /me
    me_resp = client.get(
        "/api/v1/auth/me",
        headers={"Authorization": f"Bearer {access_token}"}
    )
    assert me_resp.status_code == 200, me_resp.text
    assert me_resp.json()["username"] == username.lower()
    assert me_resp.json()["email"] == email.lower()

def test_login_email_flow(client: TestClient):
    unique_id = uuid.uuid4()
    username = f"EmailUser_{unique_id}"
    email = f"{username}@test.com"
    password = "e2epassword123!"

    # 1. Register
    reg_resp = client.post(
        "/api/v1/auth/register",
        json={"username": username, "email": email, "password": password}
    )
    assert reg_resp.status_code == 200, reg_resp.text

    # 2. Login immediately with EMAIL in a different case
    login_resp = client.post(
        "/api/v1/auth/token",
        data={"username": email.upper(), "password": password}
    )
    assert login_resp.status_code == 200, login_resp.text
    access_token = login_resp.json()["access_token"]

    # 3. Verify /me
    me_resp = client.get(
        "/api/v1/auth/me",
        headers={"Authorization": f"Bearer {access_token}"}
    )
    assert me_resp.status_code == 200, me_resp.text
    assert me_resp.json()["username"] == username.lower()
    assert me_resp.json()["email"] == email.lower()
