"""Location-provider abstraction."""

from typing import Protocol

import httpx  # NEW

from app.utils.helpers import location_label


# NEW
GEOCODING_URL = "https://geocoding-api.open-meteo.com/v1/search"


# NEW
class Location:
    """Represents a geocoded location."""

    def __init__(
        self,
        name: str,
        latitude: float,
        longitude: float,
        country: str | None = None,
        timezone: str | None = None,
    ):
        self.name = name
        self.latitude = latitude
        self.longitude = longitude
        self.country = country
        self.timezone = timezone


class LocationProvider(Protocol):
    """Contract for GIS/geocoding providers."""

    # NEW
    async def geocode(self, city: str) -> Location | None: ...

    # EXISTING
    async def reverse_geocode(
        self,
        latitude: float,
        longitude: float
    ) -> str: ...


# NEW
class OpenMeteoLocationProvider:
    """Location provider using Open-Meteo Geocoding API."""

    async def geocode(self, city: str) -> Location | None:

        params = {
            "name": city,
            "count": 1,
            "language": "en",
            "format": "json",
        }

        async with httpx.AsyncClient(timeout=10.0) as client:

            response = await client.get(
                GEOCODING_URL,
                params=params,
            )

        response.raise_for_status()

        data = response.json()

        results = data.get("results")

        if not results:
            return None

        result = results[0]

        return Location(
            name=result["name"],
            latitude=result["latitude"],
            longitude=result["longitude"],
            country=result.get("country"),
            timezone=result.get("timezone"),
        )

    # Keep your existing reverse geocoding fallback
    async def reverse_geocode(
        self,
        latitude: float,
        longitude: float
    ) -> str:

        return location_label(latitude, longitude)


# EXISTING FALLBACK
class MockLocationProvider:
    """Fallback that avoids tying routes to a GIS vendor."""

    async def reverse_geocode(
        self,
        latitude: float,
        longitude: float
    ) -> str:

        return location_label(latitude, longitude)


# NEW
async def geocode(city: str) -> Location | None:
    """Resolve a city name into coordinates."""

    provider = OpenMeteoLocationProvider()

    return await provider.geocode(city)


# EXISTING
async def reverse_geocode(
    latitude: float,
    longitude: float
) -> str:

    return await MockLocationProvider().reverse_geocode(
        latitude,
        longitude
    )