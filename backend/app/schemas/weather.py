"""Weather API schemas."""

from datetime import datetime

from pydantic import BaseModel, Field


class Coordinates(BaseModel):
    """Reusable geographic coordinate validation."""

    latitude: float = Field(ge=-90, le=90)
    longitude: float = Field(ge=-180, le=180)


class WeatherResponse(Coordinates):
    """Current weather returned by a provider."""

    location: str
    temperature: float
    humidity: float = Field(ge=0, le=100)
    wind_speed: float = Field(ge=0)
    rain_probability: float | None = Field(default=None, ge=0, le=100)
    weather_condition: str
    recorded_at: datetime
    source: str = "mock"


class ForecastRequest(Coordinates):
    """Parameters used to request a forecast."""

    days: int = Field(default=3, ge=1, le=10)


class ForecastDay(BaseModel):
    """A single daily forecast."""

    date: str
    temperature_min: float
    temperature_max: float
    rain_probability: float = Field(ge=0, le=100)
    weather_condition: str


class ForecastResponse(Coordinates):
    """Forecast response with provider provenance."""

    location: str
    forecast: list[ForecastDay]
    source: str = "mock"
