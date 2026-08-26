# WeatherGPT — MERN

WeatherGPT is now a full MERN application:

- MongoDB + Mongoose models for users, conversations, and alerts
- Express 5 + Node.js API with JWT auth and the existing `/api/v1` contract
- React 19 + Vite dashboard with the original multilingual weather experience
- Expo React Native mobile client in `mobile/`

## Run locally

```bash
npm install
npm run dev
```

The React client runs at `http://localhost:5173` and the Express API at `http://localhost:5000`. Configure MongoDB and optional providers with `backend/.env` based on `backend/.env.example`.

All weather and location endpoints enforce India-only coordinates. Location search returns multiple India suggestions, including close matches for common spelling mistakes. Active alerts combine the official IMD CAP feed (when reachable) with safety rules derived from current and forecast weather; the web dashboard refreshes them every five minutes.

The web chat accepts voice input through browser speech recognition and can read answers aloud. Random/non-weather questions are reframed into useful weather decisions using the selected Indian location. Alerts are scoped to the searched location, refresh every five minutes, and generated safety messages are available in the selected language. The mobile client adds native speech recognition, spoken answers, location permission handling, authentication, forecasts, and the same location-scoped multilingual alerts.

If MongoDB is unavailable in development, the API uses a clearly scoped in-memory fallback so the weather dashboard and auth smoke flow remain usable. Set `REQUIRE_MONGO=true` to fail startup instead.

## Verify

```bash
npm test
npm run build
npm run mobile
```
