import path from "node:path";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";

const backendDirectory = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
dotenv.config({ path: path.join(backendDirectory, ".env") });

function asBoolean(value, fallback = false) {
  if (value == null) return fallback;
  return ["true", "1", "yes", "on"].includes(String(value).toLowerCase());
}

const nodeEnv = process.env.NODE_ENV || "development";

const config = {
  nodeEnv,
  port: Number.parseInt(process.env.PORT || "5000", 10),
  mongoUri: process.env.MONGO_URI || "mongodb://127.0.0.1:27017/weathergpt",
  jwtSecretKey: process.env.JWT_SECRET_KEY || "change-this-development-secret",
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || "1d",
  corsOrigins: (process.env.CORS_ORIGINS || "http://localhost:5173,http://127.0.0.1:5173")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean),
  weatherProvider: nodeEnv === "test" ? "mock" : process.env.WEATHER_PROVIDER || "mock",
  geminiApiKey: nodeEnv === "test" ? "" : process.env.GEMINI_API_KEY || "",
  geminiModel: process.env.GEMINI_MODEL || "gemini-2.5-flash",
  indiaAlertsUrl: nodeEnv === "test" ? "" : process.env.INDIA_ALERTS_URL || "https://cap-sources.s3.amazonaws.com/in-imd-en/rss.xml",
  alertRefreshMs: Number.parseInt(process.env.ALERT_REFRESH_MS || "300000", 10),
  requireMongo: asBoolean(process.env.REQUIRE_MONGO, false),
};

if (config.nodeEnv === "production" && config.jwtSecretKey === "change-this-development-secret") {
  throw new Error("JWT_SECRET_KEY must be changed before running in production.");
}

export default config;
