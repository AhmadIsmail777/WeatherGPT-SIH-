"""Gemini-backed weather chat grounded in the live weather service."""

import asyncio
import logging

from app.core.config import settings
from app.schemas.chat import ChatResponse, SupportedLanguage
from app.services.weather_service import WeatherServiceUnavailable, get_current_weather

logger = logging.getLogger(__name__)

LANGUAGE_NAMES: dict[SupportedLanguage, str] = {
    "en": "English",
    "or": "Odia",
    "hi": "Hindi",
    "bn": "Bengali",
    "mr": "Marathi",
    "te": "Telugu",
}


class GeminiServiceUnavailable(RuntimeError):
    """Raised when Gemini cannot generate a response."""


def _build_prompt(message: str, language: SupportedLanguage, weather_context: str) -> str:
    """Create a grounded, multilingual request for the Gemini API."""

    return f"""You are WeatherGPT, a concise and practical weather assistant.
Reply only in {LANGUAGE_NAMES[language]}. Use the verified meteorological data below
as the only source for measurements, current conditions, and weather claims. Do not
invent values, alerts, forecasts, or locations. If the user asks for a detail absent
from the data, say that it is unavailable. Give practical advice only when it follows
from the verified data.

Verified weather data:
{weather_context}

User message:
{message}
"""


def _generate_with_gemini(prompt: str) -> str:
    """Call the official Google GenAI SDK in a worker thread."""

    if not settings.gemini_api_key:
        raise GeminiServiceUnavailable("GEMINI_API_KEY is not configured.")

    try:
        from google import genai

        client = genai.Client(api_key=settings.gemini_api_key)
        response = client.models.generate_content(
            model=settings.gemini_model,
            contents=prompt,
        )
        text = (response.text or "").strip()
    except Exception as exc:  # The SDK exposes several provider-specific error types.
        raise GeminiServiceUnavailable("Gemini could not generate a response.") from exc

    if not text:
        raise GeminiServiceUnavailable("Gemini returned an empty response.")
    return text


async def generate_weather_response(
    message: str,
    latitude: float | None,
    longitude: float | None,
    language: SupportedLanguage = "en",
) -> ChatResponse:
    """Answer through Gemini with live weather context when a location is available."""

    weather = None
    if latitude is not None and longitude is not None:
        try:
            weather = await get_current_weather(latitude, longitude)
        except WeatherServiceUnavailable:
            logger.warning("Gemini chat requested while weather context was unavailable")

    if weather is None:
        weather_context = (
            "No verified weather data is currently available because the user has not "
            "provided a usable location or the weather service is temporarily unavailable."
        )
        location = None
    else:
        weather_context = (
            f"Location: {weather.location}\n"
            f"Condition: {weather.weather_condition}\n"
            f"Temperature: {weather.temperature:g} °C\n"
            f"Humidity: {weather.humidity:g}%\n"
            f"Wind speed: {weather.wind_speed:g} km/h\n"
            f"Rain probability: {weather.rain_probability:g}%\n"
            f"Observed at: {weather.recorded_at.isoformat()}\n"
            f"Meteorological source: {weather.source}"
        )
        location = weather.location

    try:
        response = await asyncio.to_thread(
            _generate_with_gemini,
            _build_prompt(message, language, weather_context),
        )
    except GeminiServiceUnavailable:
        logger.exception("Gemini chat request failed")
        return ChatResponse(
            response=(
                "The Gemini weather assistant is temporarily unavailable. "
                "Please try again shortly."
            ),
            location=location,
            language=language,
        )

    return ChatResponse(response=response, location=location, language=language)
