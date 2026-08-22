"""Conversational weather API schemas."""

from typing import Literal

from pydantic import BaseModel, Field, model_validator


SupportedLanguage = Literal["en", "or", "hi", "bn", "mr", "te"]


class ChatRequest(BaseModel):
    """A user message with an optional location context."""

    message: str = Field(min_length=1, max_length=2000)
    latitude: float | None = Field(default=None, ge=-90, le=90)
    longitude: float | None = Field(default=None, ge=-180, le=180)
    language: SupportedLanguage = "en"

    @model_validator(mode="after")
    def validate_coordinate_pair(self) -> "ChatRequest":
        if (self.latitude is None) != (self.longitude is None):
            raise ValueError("latitude and longitude must be provided together")
        return self


class ChatResponse(BaseModel):
    """A generated, grounded response to a chat request."""

    response: str
    location: str | None = None
    language: SupportedLanguage
