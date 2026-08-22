"""Current weather and forecast endpoints."""

from fastapi import APIRouter, HTTPException, Query, status

from app.schemas.weather import ForecastResponse, WeatherResponse
from app.services.location_service import LocationServiceUnavailable, geocode
from app.services.weather_service import (
    WeatherServiceUnavailable,
    get_current_weather,
    get_forecast,
)


router = APIRouter(
    prefix="/weather",
    tags=["weather"],
)


# ============================================================
# CURRENT WEATHER BY COORDINATES
# ============================================================

@router.get(
    "/current",
    response_model=WeatherResponse,
)
async def current_weather(
    latitude: float = Query(..., ge=-90, le=90),
    longitude: float = Query(..., ge=-180, le=180),
) -> WeatherResponse:
    """
    Get current weather using latitude and longitude.
    """

    try:

        return await get_current_weather(
            latitude,
            longitude,
        )

    except WeatherServiceUnavailable as exc:

        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Weather service is temporarily unavailable.",
        ) from exc


# ============================================================
# FORECAST BY COORDINATES
# ============================================================

@router.get(
    "/forecast",
    response_model=ForecastResponse,
)
async def weather_forecast(
    latitude: float = Query(..., ge=-90, le=90),
    longitude: float = Query(..., ge=-180, le=180),
    days: int = Query(3, ge=1, le=10),
) -> ForecastResponse:
    """
    Get a daily forecast using latitude and longitude.
    """

    try:

        return await get_forecast(
            latitude,
            longitude,
            days,
        )

    except WeatherServiceUnavailable as exc:

        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Weather service is temporarily unavailable.",
        ) from exc


# ============================================================
# CURRENT WEATHER BY CITY
# ============================================================

@router.get(
    "/city",
    response_model=WeatherResponse,
)
async def current_weather_by_city(
    city: str = Query(
        ...,
        min_length=1,
        max_length=100,
    ),
) -> WeatherResponse:
    """
    Get current weather by city name.

    Flow:
        city
        ↓
        Open-Meteo Geocoding
        ↓
        latitude + longitude
        ↓
        Open-Meteo Weather
    """

    # --------------------------------------------------------
    # Step 1: Convert city name into coordinates
    # --------------------------------------------------------

    try:
        location = await geocode(city)
    except LocationServiceUnavailable as exc:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="City search is temporarily unavailable. Please try again.",
        ) from exc

    if location is None:

        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Location '{city}' not found.",
        )

    # --------------------------------------------------------
    # Step 2: Get weather using coordinates
    # --------------------------------------------------------

    try:

        weather = await get_current_weather(
            location.latitude,
            location.longitude,
        )

        return weather.model_copy(update={"location": location.label})

    except WeatherServiceUnavailable as exc:

        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Weather service is temporarily unavailable.",
        ) from exc
