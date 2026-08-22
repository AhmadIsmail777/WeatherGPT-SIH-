"""Alert API schemas."""

from datetime import datetime

from pydantic import BaseModel, Field

from app.schemas.weather import Coordinates


class AlertCreate(Coordinates):
    """Internal schema used to create a weather alert."""

    location: str = Field(min_length=1, max_length=255)
    severity: str = Field(min_length=1, max_length=30)
    title: str = Field(min_length=1, max_length=255)
    message: str = Field(min_length=1, max_length=5000)
    alert_type: str = Field(min_length=1, max_length=80)
    expires_at: datetime | None = None


class AlertResponse(AlertCreate):
    """Public representation of an alert."""

    id: int
    created_at: datetime
