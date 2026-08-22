"""WeatherGPT FastAPI application entry point."""

import logging
from pathlib import Path

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles

from app.api.routes import alerts, chat, location, users, weather
from app.core.config import settings
from app.core.logging import configure_logging

configure_logging(settings.debug)
logger = logging.getLogger(__name__)

app = FastAPI(
    title=settings.app_name,
    description="AI-powered conversational weather forecasting and alert service.",
    version="0.1.0",
)
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origin_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.exception_handler(RequestValidationError)
async def validation_exception_handler(_: Request, exc: RequestValidationError) -> JSONResponse:
    """Return validation failures in the same JSON detail envelope as HTTP errors."""

    return JSONResponse(status_code=422, content={"detail": exc.errors()})


@app.get("/health", tags=["health"])
async def health_check() -> dict[str, str]:
    """Report that the HTTP service is available."""

    return {"status": "healthy", "service": "WeatherGPT Backend"}


api_prefix = "/api/v1"
app.include_router(weather.router, prefix=api_prefix)
app.include_router(chat.router, prefix=api_prefix)
app.include_router(alerts.router, prefix=api_prefix)
app.include_router(location.router, prefix=api_prefix)
app.include_router(users.router, prefix=api_prefix)

# Serve the dependency-free frontend from the same origin in local development
# and simple deployments. API routes above remain higher priority than this mount.
frontend_directory = Path(__file__).resolve().parents[2] / "frontend"
if frontend_directory.is_dir():
    app.mount("/", StaticFiles(directory=frontend_directory, html=True), name="frontend")
