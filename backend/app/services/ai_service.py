"""LLM orchestration that grounds answers in weather service data."""

import logging

from app.schemas.chat import ChatResponse
from app.services.weather_service import WeatherServiceUnavailable, get_current_weather

logger = logging.getLogger(__name__)


def _needs_weather(message: str) -> bool:
    weather_terms = ("weather", "rain", "temperature", "forecast", "wind", "humidity", "storm")
    return any(term in message.lower() for term in weather_terms)


async def generate_weather_response(
    message: str,
    latitude: float | None,
    longitude: float | None,
    language: str = "en",
) -> ChatResponse:
    """Generate a safe development response based only on verified weather data.

    An LLM adapter can be introduced here later. It must receive weather data as
    context and must not manufacture measurements.
    """

    if not _needs_weather(message):
        return ChatResponse(
            response=(
                "I can help with weather questions. Share a location or coordinates "
                "for a local forecast."
            ),
            language=language,
        )
    if latitude is None or longitude is None:
        return ChatResponse(
            response="Please provide latitude and longitude so I can retrieve verified weather data.",
            language=language,
        )

    try:
        weather = await get_current_weather(latitude, longitude)
    except WeatherServiceUnavailable:
        logger.warning("AI weather context unavailable")
        return ChatResponse(
            response="Weather service is temporarily unavailable.",
            language=language,
        )

    response = (
        f"Current verified conditions for {weather.location}: {weather.weather_condition}, "
        f"{weather.temperature:g}°C, humidity {weather.humidity:g}%, and wind "
        f"{weather.wind_speed:g} km/h. Rain probability is {weather.rain_probability:g}%."
    )
    return ChatResponse(response=response, location=weather.location, language=language)
