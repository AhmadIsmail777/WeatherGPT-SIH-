"""Alert business logic, separate from HTTP handlers."""

from datetime import datetime, timedelta, timezone

from app.schemas.alert import AlertCreate, AlertResponse

_alerts: list[AlertResponse] = [
    AlertResponse(
        id=1,
        location="Demo location",
        latitude=20.2961,
        longitude=85.8245,
        severity="moderate",
        title="Heavy rain watch",
        message="Monitor local official weather updates before travel.",
        alert_type="rain",
        created_at=datetime.now(timezone.utc),
        expires_at=datetime.now(timezone.utc) + timedelta(hours=12),
    )
]


async def get_active_alerts() -> list[AlertResponse]:
    """Return non-expired alerts; replace the in-memory store with a repository later."""

    now = datetime.now(timezone.utc)
    return [alert for alert in _alerts if alert.expires_at is None or alert.expires_at > now]


async def create_alert(payload: AlertCreate) -> AlertResponse:
    """Create an alert through the service boundary."""

    alert = AlertResponse(id=max((item.id for item in _alerts), default=0) + 1, created_at=datetime.now(timezone.utc), **payload.model_dump())
    _alerts.append(alert)
    return alert


async def check_weather_for_alerts(latitude: float, longitude: float) -> list[AlertResponse]:
    """Future extension point for rule-based and provider-based alert detection."""

    return [alert for alert in await get_active_alerts() if alert.latitude == latitude and alert.longitude == longitude]
