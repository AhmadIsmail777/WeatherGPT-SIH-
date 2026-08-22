"""Location and reverse-geocoding endpoints."""

from fastapi import APIRouter, HTTPException, Query, status
from pydantic import BaseModel

from app.services.location_service import LocationServiceUnavailable, geocode, reverse_geocode

router = APIRouter(prefix="/location", tags=["location"])


class ReverseGeocodeResponse(BaseModel):
    """Location information returned by the active GIS provider."""

    latitude: float
    longitude: float
    location: str


class GeocodeResponse(BaseModel):
    """A city search result that the dashboard can use to refresh weather."""

    latitude: float
    longitude: float
    location: str
    timezone: str | None = None


@router.get("/search", response_model=GeocodeResponse)
async def search_city(
    city: str = Query(..., min_length=1, max_length=100),
) -> GeocodeResponse:
    """Resolve a city name to coordinates for the weather dashboard."""

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
            detail=f"Location '{city.strip()}' was not found.",
        )

    return GeocodeResponse(
        latitude=location.latitude,
        longitude=location.longitude,
        location=location.label,
        timezone=location.timezone,
    )


@router.get("/reverse-geocode", response_model=ReverseGeocodeResponse)
async def get_reverse_geocode(
    latitude: float = Query(..., ge=-90, le=90),
    longitude: float = Query(..., ge=-180, le=180),
) -> ReverseGeocodeResponse:
    """Resolve coordinates using the abstracted location service."""

    return ReverseGeocodeResponse(
        latitude=latitude,
        longitude=longitude,
        location=await reverse_geocode(latitude, longitude),
    )
