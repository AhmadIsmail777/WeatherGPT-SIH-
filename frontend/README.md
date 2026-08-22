# WeatherGPT Frontend

A dependency-free responsive dashboard for the WeatherGPT FastAPI backend. It consumes the existing weather, forecast, alerts, and chat endpoints and uses browser geolocation when permitted.

## Run locally

The recommended setup serves this frontend through FastAPI on the same origin. From the parent `backend/` directory, run:

```bash
uvicorn app.main:app --reload
```

Open `http://127.0.0.1:8000` in your browser. The backend serves `index.html`, `styles.css`, and `app.js` from this directory while keeping `/api/v1/*` routes active.

For standalone frontend-only work, you can still use `python -m http.server 5173`, but it is not required for normal use.

## Backend connection

The frontend defaults to `http://127.0.0.1:8000`. To point it to a deployed API before loading `app.js`, define:

```html
<script>window.WEATHERGPT_API_URL = "https://api.example.com";</script>
```

The deployed backend must allow the frontend origin in `CORS_ORIGINS`.
