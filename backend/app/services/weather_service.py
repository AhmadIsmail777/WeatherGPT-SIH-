"""Weather provider abstraction and Open-Meteo implementation."""

import logging
from datetime import datetime, timezone
from typing import Any, Protocol

import httpx

from app.core.config import settings
from app.schemas.weather import (
    ForecastDay,
    ForecastResponse,
    WeatherResponse,
)
from app.utils.helpers import location_label


logger = logging.getLogger(__name__)


# ============================================================
# OPEN-METEO CONFIGURATION
# ============================================================

OPEN_METEO_URL = "https://api.open-meteo.com/v1/forecast"


# ============================================================
# WEATHER PROVIDER INTERFACE
# ============================================================

class WeatherProvider(Protocol):
    """Contract implemented by weather providers."""

    async def current_weather(
        self,
        latitude: float,
        longitude: float,
    ) -> WeatherResponse:
        ...

    async def forecast(
        self,
        latitude: float,
        longitude: float,
        days: int,
    ) -> ForecastResponse:
        ...


# ============================================================
# MOCK WEATHER PROVIDER
# ============================================================

class MockWeatherProvider:
    """
    Deterministic fallback used for local development and tests.
    """

    async def current_weather(
        self,
        latitude: float,
        longitude: float,
    ) -> WeatherResponse:

        return WeatherResponse(
            location=location_label(latitude, longitude),
            latitude=latitude,
            longitude=longitude,
            temperature=28.0,
            humidity=68.0,
            wind_speed=12.0,
            rain_probability=35.0,
            weather_condition="Partly cloudy",
            recorded_at=datetime.now(timezone.utc),
            source="mock",
        )

    async def forecast(
        self,
        latitude: float,
        longitude: float,
        days: int,
    ) -> ForecastResponse:

        today = datetime.now(timezone.utc).date()

        return ForecastResponse(
            location=location_label(latitude, longitude),
            latitude=latitude,
            longitude=longitude,
            source="mock",
            forecast=[
                ForecastDay(
                    date=str(
                        today.fromordinal(
                            today.toordinal() + offset
                        )
                    ),
                    temperature_min=24.0 + offset,
                    temperature_max=30.0 + offset,
                    rain_probability=35.0 + (offset * 5),
                    weather_condition=(
                        "Partly cloudy"
                        if offset == 0
                        else "Cloudy"
                    ),
                )
                for offset in range(days)
            ],
        )


# ============================================================
# OPEN-METEO WEATHER PROVIDER
# ============================================================

class OpenMeteoWeatherProvider:
    """
    Weather provider using the Open-Meteo Forecast API.

    Open-Meteo provides weather data using latitude and longitude.
    """

    def __init__(self) -> None:
        self.base_url = OPEN_METEO_URL

    async def _get(
        self,
        params: dict[str, Any],
    ) -> dict[str, Any]:
        """
        Send a GET request to Open-Meteo and return JSON data.
        """

        try:
            async with httpx.AsyncClient(
                timeout=10.0
            ) as client:

                response = await client.get(
                    self.base_url,
                    params=params,
                )

                response.raise_for_status()

                data = response.json()

                if not isinstance(data, dict):
                    raise WeatherServiceUnavailable(
                        "Invalid response from Open-Meteo."
                    )

                return data

        except httpx.HTTPError as exc:

            logger.error(
                "Open-Meteo request failed: %s",
                exc,
            )

            raise WeatherServiceUnavailable(
                "Open-Meteo weather service is unavailable."
            ) from exc


    # ========================================================
    # CURRENT WEATHER
    # ========================================================

    async def current_weather(
        self,
        latitude: float,
        longitude: float,
    ) -> WeatherResponse:

        params = {
            "latitude": latitude,
            "longitude": longitude,

            # Current weather variables
            "current": (
                "temperature_2m,"
                "relative_humidity_2m,"
                "apparent_temperature,"
                "precipitation,"
                "weather_code,"
                "wind_speed_10m"
            ),

            # Hourly rain probability
            "hourly": "precipitation_probability",

            # One day is enough for current weather
            "forecast_days": 1,

            # Use the location's local timezone
            "timezone": "auto",
        }

        data = await self._get(params)

        current = data.get("current")

        if not isinstance(current, dict):
            raise WeatherServiceUnavailable(
                "Current weather data is missing."
            )

        # ----------------------------------------------------
        # Extract current weather values
        # ----------------------------------------------------

        temperature = float(
            current.get("temperature_2m", 0.0)
        )

        humidity = float(
            current.get("relative_humidity_2m", 0.0)
        )

        wind_speed = float(
            current.get("wind_speed_10m", 0.0)
        )

        weather_code = int(
            current.get("weather_code", 0)
        )

        # ----------------------------------------------------
        # Extract rain probability
        # ----------------------------------------------------

        rain_probability = 0.0

        hourly = data.get("hourly")

        if isinstance(hourly, dict):

            probabilities = hourly.get(
                "precipitation_probability"
            )

            if (
                isinstance(probabilities, list)
                and probabilities
            ):
                rain_probability = float(
                    probabilities[0] or 0
                )

        # ----------------------------------------------------
        # Convert weather code to readable text
        # ----------------------------------------------------

        weather_condition = weather_code_to_description(
            weather_code
        )

        # ----------------------------------------------------
        # Return our application's WeatherResponse
        # ----------------------------------------------------

        return WeatherResponse(
            location=location_label(
                latitude,
                longitude,
            ),
            latitude=latitude,
            longitude=longitude,
            temperature=temperature,
            humidity=humidity,
            wind_speed=wind_speed,
            rain_probability=rain_probability,
            weather_condition=weather_condition,
            recorded_at=datetime.now(timezone.utc),
            source="open-meteo",
        )


    # ========================================================
    # DAILY FORECAST
    # ========================================================

    async def forecast(
        self,
        latitude: float,
        longitude: float,
        days: int,
    ) -> ForecastResponse:

        # Open-Meteo supports forecasts up to 16 days.
        days = max(1, min(days, 16))

        params = {
            "latitude": latitude,
            "longitude": longitude,

            "daily": (
                "temperature_2m_min,"
                "temperature_2m_max,"
                "precipitation_probability_max,"
                "weather_code"
            ),

            "forecast_days": days,

            "timezone": "auto",
        }

        data = await self._get(params)

        daily = data.get("daily")

        if not isinstance(daily, dict):
            raise WeatherServiceUnavailable(
                "Daily forecast data is missing."
            )

        # ----------------------------------------------------
        # Extract arrays from Open-Meteo response
        # ----------------------------------------------------

        dates = daily.get("time", [])

        min_temperatures = daily.get(
            "temperature_2m_min",
            [],
        )

        max_temperatures = daily.get(
            "temperature_2m_max",
            [],
        )

        rain_probabilities = daily.get(
            "precipitation_probability_max",
            [],
        )

        weather_codes = daily.get(
            "weather_code",
            [],
        )

        # ----------------------------------------------------
        # Validate response arrays
        # ----------------------------------------------------

        if not all(
            isinstance(value, list)
            for value in [
                dates,
                min_temperatures,
                max_temperatures,
                rain_probabilities,
                weather_codes,
            ]
        ):
            raise WeatherServiceUnavailable(
                "Invalid daily forecast response."
            )

        # ----------------------------------------------------
        # Convert Open-Meteo arrays into ForecastDay objects
        # ----------------------------------------------------

        forecast_days = []

        for index in range(len(dates)):

            # Prevent index errors if API returns incomplete data.
            if not (
                index < len(min_temperatures)
                and index < len(max_temperatures)
                and index < len(rain_probabilities)
                and index < len(weather_codes)
            ):
                break

            weather_code = int(
                weather_codes[index] or 0
            )

            rain_probability = float(
                rain_probabilities[index] or 0
            )

            forecast_days.append(
                ForecastDay(
                    date=str(dates[index]),

                    temperature_min=float(
                        min_temperatures[index]
                    ),

                    temperature_max=float(
                        max_temperatures[index]
                    ),

                    rain_probability=rain_probability,

                    weather_condition=(
                        weather_code_to_description(
                            weather_code
                        )
                    ),
                )
            )

        return ForecastResponse(
            location=location_label(
                latitude,
                longitude,
            ),
            latitude=latitude,
            longitude=longitude,
            source="open-meteo",
            forecast=forecast_days,
        )


# ============================================================
# OPEN-METEO WEATHER CODE CONVERTER
# ============================================================

def weather_code_to_description(
    code: int,
) -> str:
    """
    Convert Open-Meteo WMO weather codes
    into human-readable descriptions.
    """

    weather_codes = {

        # Clear
        0: "Clear sky",

        # Cloudy
        1: "Mainly clear",
        2: "Partly cloudy",
        3: "Overcast",

        # Fog
        45: "Fog",
        48: "Depositing rime fog",

        # Drizzle
        51: "Light drizzle",
        53: "Moderate drizzle",
        55: "Dense drizzle",

        # Freezing drizzle
        56: "Light freezing drizzle",
        57: "Dense freezing drizzle",

        # Rain
        61: "Slight rain",
        63: "Moderate rain",
        65: "Heavy rain",

        # Freezing rain
        66: "Light freezing rain",
        67: "Heavy freezing rain",

        # Snow
        71: "Slight snowfall",
        73: "Moderate snowfall",
        75: "Heavy snowfall",

        # Snow grains
        77: "Snow grains",

        # Rain showers
        80: "Slight rain showers",
        81: "Moderate rain showers",
        82: "Violent rain showers",

        # Snow showers
        85: "Slight snow showers",
        86: "Heavy snow showers",

        # Thunderstorm
        95: "Thunderstorm",

        # Thunderstorm + hail
        96: "Thunderstorm with slight hail",
        99: "Thunderstorm with heavy hail",
    }

    return weather_codes.get(
        code,
        "Unknown weather",
    )


# ============================================================
# GENERIC HTTP WEATHER PROVIDER
# ============================================================

class HttpWeatherProvider:
    """
    Generic HTTP provider adapter.

    This can be used later if the team decides to use
    another weather provider such as OpenWeather.
    """

    def __init__(
        self,
        base_url: str,
        api_key: str,
    ) -> None:

        self.base_url = base_url.rstrip("/")
        self.api_key = api_key

    async def _get(
        self,
        path: str,
        params: dict[str, Any],
    ) -> dict[str, Any]:

        headers = {
            "Authorization": f"Bearer {self.api_key}"
        }

        try:

            async with httpx.AsyncClient(
                timeout=10.0
            ) as client:

                response = await client.get(
                    f"{self.base_url}{path}",
                    params=params,
                    headers=headers,
                )

                response.raise_for_status()

                data = response.json()

                if not isinstance(data, dict):
                    raise WeatherServiceUnavailable(
                        "Invalid weather provider response."
                    )

                return data

        except httpx.HTTPError as exc:

            logger.warning(
                "Weather provider request failed: %s",
                exc.__class__.__name__,
            )

            raise WeatherServiceUnavailable(
                "Weather provider is unavailable."
            ) from exc

    async def current_weather(
        self,
        latitude: float,
        longitude: float,
    ) -> WeatherResponse:

        await self._get(
            "/current",
            {
                "latitude": latitude,
                "longitude": longitude,
            },
        )

        raise WeatherServiceUnavailable(
            "Provider response mapping has not been configured."
        )

    async def forecast(
        self,
        latitude: float,
        longitude: float,
        days: int,
    ) -> ForecastResponse:

        await self._get(
            "/forecast",
            {
                "latitude": latitude,
                "longitude": longitude,
                "days": days,
            },
        )

        raise WeatherServiceUnavailable(
            "Provider response mapping has not been configured."
        )


# ============================================================
# SERVICE ERROR
# ============================================================

class WeatherServiceUnavailable(RuntimeError):
    """Raised when the weather provider cannot provide data."""


# ============================================================
# PROVIDER SELECTION
# ============================================================

def _provider() -> WeatherProvider:

    # --------------------------------------------------------
    # If another weather provider is configured in .env,
    # use that provider.
    # --------------------------------------------------------

    if (
        settings.weather_api_url
        and settings.weather_api_key
    ):
        return HttpWeatherProvider(
            settings.weather_api_url,
            settings.weather_api_key,
        )

    # --------------------------------------------------------
    # Otherwise use Open-Meteo.
    #
    # Open-Meteo does not require an API key for the
    # normal non-commercial API usage.
    # --------------------------------------------------------

    return OpenMeteoWeatherProvider()


# ============================================================
# PUBLIC SERVICE FUNCTIONS
# ============================================================

async def get_current_weather(
    latitude: float,
    longitude: float,
) -> WeatherResponse:
    """
    Retrieve current weather.
    """

    provider = _provider()

    return await provider.current_weather(
        latitude,
        longitude,
    )


async def get_forecast(
    latitude: float,
    longitude: float,
    days: int = 3,
) -> ForecastResponse:
    """
    Retrieve multi-day weather forecast.
    """

    provider = _provider()

    return await provider.forecast(
        latitude,
        longitude,
        days,
    )