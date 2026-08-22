"""Conversational weather API schemas."""

from pydantic import BaseModel, Field, model_validator


class ChatRequest(BaseModel):
    """A user message with an optional location context."""

    message: str = Field(min_length=1, max_length=2000)
    latitude: float | None = Field(default=None, ge=-90, le=90)
    longitude: float | None = Field(default=None, ge=-180, le=180)
    language: str = Field(default="en", min_length=2, max_length=10)

    @model_validator(mode="after")
    def validate_coordinate_pair(self) -> "ChatRequest":
        if (self.latitude is None) != (self.longitude is None):
            raise ValueError("latitude and longitude must be provided together")
        return self


class ChatResponse(BaseModel):
    """A generated, grounded response to a chat request."""

    response: str
    location: str | None = None
    language: str
