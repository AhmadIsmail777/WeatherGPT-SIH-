"""Location and reverse-geocoding endpoints."""

from fastapi import APIRouter, Query
from pydantic import BaseModel

from app.services.location_service import reverse_geocode

router = APIRouter(prefix="/location", tags=["location"])


class ReverseGeocodeResponse(BaseModel):
    """Location information returned by the active GIS provider."""

    latitude: float
    longitude: float
    location: str


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
