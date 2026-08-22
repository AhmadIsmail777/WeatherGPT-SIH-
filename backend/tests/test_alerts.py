from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)


def test_list_alerts() -> None:
    response = client.get("/api/v1/alerts")
    assert response.status_code == 200
    assert isinstance(response.json(), list)


def test_missing_alert_returns_not_found() -> None:
    response = client.get("/api/v1/alerts/99999")
    assert response.status_code == 404
