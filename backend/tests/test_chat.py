from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)


def test_chat_returns_grounded_weather_response() -> None:
    response = client.post(
        "/api/v1/chat",
        json={"message": "What is the weather?", "latitude": 20.2961, "longitude": 85.8245},
    )
    assert response.status_code == 200
    assert "28" in response.json()["response"]


def test_chat_rejects_blank_message() -> None:
    response = client.post("/api/v1/chat", json={"message": ""})
    assert response.status_code == 422
