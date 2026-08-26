# WeatherGPT client

The frontend is a React 19 single-page app built with Vite. It retains the dashboard's responsive design, location search, geolocation, multilingual copy, theme toggle, forecast, alerts, and grounded chat flows.

Run it from the repository root with:

```bash
npm run dev
```

Vite serves the client on `http://localhost:5173` and proxies `/api` and `/health` to the Express API on port `5000`. Production assets are generated with `npm run build` and are served by Express when present in `frontend/dist`.
