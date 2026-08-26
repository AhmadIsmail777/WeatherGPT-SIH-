# WeatherGPT API

The backend is an Express 5 API running on Node.js. It uses Mongoose models for MongoDB persistence, JWT authentication, Open-Meteo for optional live weather, and Gemini when a key is configured.

## Local development

From the repository root:

```bash
npm install
npm run dev
```

The API runs on `http://localhost:5000`; the Vite React client runs on `http://localhost:5173` and proxies `/api` requests to it.

MongoDB is configured through `MONGO_URI`. If MongoDB is not available in development, the API uses an explicit in-memory store for account and alert smoke testing. Set `REQUIRE_MONGO=true` when a running MongoDB instance must be required.

Copy `.env.example` to `.env` and configure:

| Variable | Purpose |
| --- | --- |
| `MONGO_URI` | MongoDB connection string |
| `JWT_SECRET_KEY` | Secret used to sign access tokens |
| `CORS_ORIGINS` | Comma-separated allowed frontend origins |
| `WEATHER_PROVIDER` | `mock` for deterministic offline data or `open-meteo` for live data |
| `GEMINI_API_KEY` / `GEMINI_MODEL` | Optional grounded chat integration |
| `INDIA_ALERTS_URL` | Official IMD CAP/RSS feed used for India-wide alerts |
| `ALERT_REFRESH_MS` | Alert feed cache duration; defaults to 5 minutes |

## API contract

The API keeps the existing routes under `/api/v1`:

- `GET /weather/current`
- `GET /weather/forecast`
- `GET /location/search`
- `GET /location/reverse-geocode`
- `GET /alerts` and `GET /alerts/:alertId`
- `POST /chat`
- `POST /users/register`, `POST /users/login`, and `GET /users/me`

Run the Node test suite with `npm test` from the repository root.

`GET /alerts?latitude=20.2961&longitude=85.8245&location=Bhubaneswar%2C%20Odisha%2C%20India&language=or` evaluates only the searched location, combines official and forecast safety alerts, and localizes generated messages.
