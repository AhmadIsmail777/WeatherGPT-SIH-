from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)


def test_health_endpoint() -> None:
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json() == {"status": "healthy", "service": "WeatherGPT Backend"}


def test_current_weather_uses_valid_schema() -> None:
    response = client.get("/api/v1/weather/current?latitude=20.2961&longitude=85.8245")
    assert response.status_code == 200
    body = response.json()
    assert body["source"] == "mock"
    assert body["temperature"] == 28.0


def test_weather_requires_coordinates() -> None:
    response = client.get("/api/v1/weather/current")
    assert response.status_code == 422
