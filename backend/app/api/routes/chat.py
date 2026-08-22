"""Conversational weather endpoint."""

from fastapi import APIRouter

from app.schemas.chat import ChatRequest, ChatResponse
from app.services.ai_service import generate_weather_response

router = APIRouter(prefix="/chat", tags=["chat"])


@router.post("", response_model=ChatResponse)
async def chat(payload: ChatRequest) -> ChatResponse:
    """Route a message through the grounded AI orchestration service."""

    return await generate_weather_response(
        payload.message, payload.latitude, payload.longitude, payload.language
    )
