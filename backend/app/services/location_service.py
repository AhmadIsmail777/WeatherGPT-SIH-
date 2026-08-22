"""Location-provider abstraction."""

from typing import Protocol

import httpx  # NEW

from app.utils.helpers import location_label


# NEW
GEOCODING_URL = "https://geocoding-api.open-meteo.com/v1/search"


class LocationServiceUnavailable(RuntimeError):
    """Raised when the geocoding provider cannot be reached."""


# NEW
class Location:
    """Represents a geocoded location."""

    def __init__(
        self,
        name: str,
        latitude: float,
        longitude: float,
        country: str | None = None,
        admin1: str | None = None,
        timezone: str | None = None,
    ):
        self.name = name
        self.latitude = latitude
        self.longitude = longitude
        self.country = country
        self.admin1 = admin1
        self.timezone = timezone

    @property
    def label(self) -> str:
        """Return the most useful, human-readable place name supplied by Open-Meteo."""

        parts = [self.name]
        if self.admin1 and self.admin1 != self.name:
            parts.append(self.admin1)
        if self.country:
            parts.append(self.country)
        return ", ".join(parts)


class LocationProvider(Protocol):
    """Contract for GIS/geocoding providers."""

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

        normalized_city = city.strip()
        if not normalized_city:
            return None

        params = {
            "name": normalized_city,
            "count": 1,
            "language": "en",
            "format": "json",
        }

        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                response = await client.get(
                    GEOCODING_URL,
                    params=params,
                )
                response.raise_for_status()
        except httpx.HTTPError as exc:
            raise LocationServiceUnavailable("City search is temporarily unavailable.") from exc

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
            admin1=result.get("admin1"),
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

    async def geocode(self, city: str) -> Location | None:
        return None

    async def reverse_geocode(
        self,
        latitude: float,
        longitude: float
    ) -> str:

        return location_label(latitude, longitude)


# NEW
async def geocode(city: str) -> Location | None:
    """Resolve a city name into coordinates."""

    return await OpenMeteoLocationProvider().geocode(city)


# EXISTING
async def reverse_geocode(
    latitude: float,
    longitude: float
) -> str:

    return await MockLocationProvider().reverse_geocode(
        latitude,
        longitude
    )
