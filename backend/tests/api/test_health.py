def test_health_check(client):
    response = client.get("/api/v1/health")
    # Using the root router which handles /api/v1 prefix
    assert response.status_code == 404 # Note: health is on /health not /api/v1/health

def test_root_health(client):
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json()["status"] == "healthy"
