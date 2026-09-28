import path from "node:path";
import { fileURLToPath } from "node:url";

import cors from "cors";
import express from "express";

import config from "./config.js";
import api from "./routes.js";
import { LocationServiceUnavailable } from "./services/locationService.js";
import { WeatherServiceUnavailable } from "./services/weatherService.js";
import { IndiaLocationRequired } from "./services/indiaService.js";

const app = express();
const currentFile = fileURLToPath(import.meta.url);
const projectRoot = path.resolve(path.dirname(currentFile), "../..");

app.disable("x-powered-by");
app.use(cors({ origin: config.corsOrigins, credentials: true }));
app.use(express.json({ limit: "1mb" }));

app.get("/health", (req, res) =>
  res.json({ status: "healthy", service: "WeatherGPT API", stack: "MERN" }),
);
app.use("/api/v1", api);

const frontendDist = path.join(projectRoot, "frontend", "dist");
app.use(express.static(frontendDist));
app.get("*splat", (req, res, next) => {
  if (req.path.startsWith("/api/") || req.path === "/health") return next();
  return res.sendFile(
    path.join(frontendDist, "index.html"),
    (error) => error && next(),
  );
});

app.use((error, req, res, next) => {
  if (res.headersSent) return next(error);
  if (
    error instanceof WeatherServiceUnavailable ||
    error instanceof LocationServiceUnavailable
  )
    return res.status(503).json({ detail: error.message });
  if (error instanceof IndiaLocationRequired)
    return res.status(422).json({ detail: error.message });
  console.error(error);
  return res
    .status(500)
    .json({ detail: "The server could not complete that request." });
});

export default app;
