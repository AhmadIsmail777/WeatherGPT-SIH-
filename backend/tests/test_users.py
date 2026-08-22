from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)


def test_me_rejects_missing_credentials() -> None:
    response = client.get("/api/v1/users/me")
    assert response.status_code == 401


def test_login_validates_payload() -> None:
    response = client.post("/api/v1/users/login", json={"email": "not-an-email", "password": "x"})
    assert response.status_code == 422
