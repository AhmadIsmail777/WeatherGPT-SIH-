# WeatherGPT Backend

WeatherGPT is a FastAPI foundation for an AI-powered conversational weather forecasting and alert platform. It provides a modular integration layer between a Flutter client, weather/GIS/AI providers, PostgreSQL, and future notification services.

## Architecture

```text
Flutter client → FastAPI API routes → Service layer → provider/database adapters
                                  ├─ Weather service
                                  ├─ AI service (grounded in weather data)
                                  ├─ Alert service
                                  ├─ Location service
                                  └─ Notification service
```

Routes are intentionally thin. Provider-specific logic belongs in services, and persistence operations belong in `app/db/`, helping API, AI, weather, GIS, and database contributors work independently.

## Folder structure

```text
app/
  api/routes/       HTTP endpoints
  core/             settings, logging, security
  db/               SQLAlchemy setup and CRUD helpers
  models/           SQLAlchemy 2.x models
  schemas/          Pydantic validation and response models
  services/         weather, AI, alerts, location, notifications
  utils/            small shared helpers
tests/              endpoint-level tests
```

## Requirements

- Python 3.11+
- PostgreSQL 16+ (needed for user persistence)
- Docker and Docker Compose (optional)

## Environment setup

Copy `.env.example` to `.env` and replace development placeholders before deploying. `.env` is ignored by Git and must never contain committed secrets.

Important values:

| Variable | Purpose |
| --- | --- |
| `DATABASE_URL` | SQLAlchemy PostgreSQL connection URL |
| `JWT_SECRET_KEY` | Long, private key for signing login tokens |
| `CORS_ORIGINS` | Comma-separated allowed client origins |
| `WEATHER_API_URL` / `WEATHER_API_KEY` | Optional external weather provider adapter configuration |
| `OPENAI_API_KEY` | Reserved for a future LLM adapter |

Leaving `WEATHER_API_URL` blank uses deterministic mock weather data, so the base API and tests work with no external keys.

## Install and run locally

```bash
python -m venv .venv
```

```bash
# Windows PowerShell
.venv\Scripts\Activate.ps1
pip install -r requirements.txt
uvicorn app.main:app --reload
```

The service starts at `http://127.0.0.1:8000`. The WeatherGPT dashboard is now served at the same address, so no separate frontend server is needed. Browse interactive OpenAPI documentation at `http://127.0.0.1:8000/docs`.

## Run with Docker

```bash
docker compose up --build
```

The compose setup starts `backend` and `postgres` on a shared Docker network. It uses development database credentials only; set real secrets through an untracked environment file or your deployment secret manager.

## API endpoints

| Method | Endpoint | Purpose |
| --- | --- | --- |
| GET | `/` | WeatherGPT frontend dashboard |
| GET | `/health` | Service health status |
| GET | `/api/v1/weather/current` | Current weather; requires `latitude`, `longitude` |
| GET | `/api/v1/weather/forecast` | Forecast; accepts optional `days` (1–10) |
| POST | `/api/v1/chat` | Grounded conversational weather response |
| GET | `/api/v1/alerts` | Active alerts |
| GET | `/api/v1/alerts/{alert_id}` | Alert details |
| GET | `/api/v1/location/reverse-geocode` | Reverse-geocode coordinates |
| POST | `/api/v1/users/register` | Register an account |
| POST | `/api/v1/users/login` | Obtain a JWT bearer token |
| GET | `/api/v1/users/me` | Current authenticated account |

Example current-weather request:

```bash
curl "http://127.0.0.1:8000/api/v1/weather/current?latitude=20.2961&longitude=85.8245"
```

## Database migrations

Models expose SQLAlchemy `Base.metadata`, ready for Alembic. Once PostgreSQL is running, initialize migrations and generate the first revision:

```bash
alembic init alembic
alembic revision --autogenerate -m "create initial tables"
alembic upgrade head
```

Configure Alembic's `target_metadata` as `app.db.database.Base.metadata` and import `app.models` in its environment file so every model is discovered.

## Tests

```bash
pytest -q
```

Tests use mock weather and alert services, and therefore do not require API keys or a database.

## Development guidelines

- Keep HTTP handlers small and typed; put business decisions in services.
- Add a provider adapter instead of coupling a route to an external vendor.
- Pass verified weather information to any LLM; do not let it invent measurements.
- Keep secrets out of source, logs, Docker files, and API responses.
- Add migrations for model changes and tests for new behaviour.
