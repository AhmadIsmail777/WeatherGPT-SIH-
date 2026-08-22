"""Alert retrieval endpoints."""

from fastapi import APIRouter, HTTPException, status

from app.schemas.alert import AlertResponse
from app.services.alert_service import get_active_alerts

router = APIRouter(prefix="/alerts", tags=["alerts"])


@router.get("", response_model=list[AlertResponse])
async def list_alerts() -> list[AlertResponse]:
    """List active weather alerts."""

    return await get_active_alerts()


@router.get("/{alert_id}", response_model=AlertResponse)
async def get_alert(alert_id: int) -> AlertResponse:
    """Return a single active alert by ID."""

    for alert in await get_active_alerts():
        if alert.id == alert_id:
            return alert
    raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Alert not found.")
