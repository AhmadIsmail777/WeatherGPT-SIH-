import bcrypt from "bcryptjs";
import { Router } from "express";

import { isMongoConnected } from "./db.js";
import User from "./models/User.js";
import Conversation from "./models/Conversation.js";
import { getTokenPayload, requireAuth, signToken } from "./middleware/auth.js";
import { memoryStore, makeMemoryUser } from "./store.js";
import { getActiveAlerts, getAlertById } from "./services/alertService.js";
import { geocode, LocationServiceUnavailable, reverseGeocode, searchLocations } from "./services/locationService.js";
import { isIndiaCoordinates } from "./services/indiaService.js";
import { generateWeatherResponse } from "./services/chatService.js";
import { getCurrentWeather, getForecast, WeatherServiceUnavailable } from "./services/weatherService.js";

const api = Router();
const SUPPORTED_LANGUAGES = ["en", "or", "hi", "bn", "mr", "te"];

function validCoordinates(latitude, longitude) {
  return Number.isFinite(latitude) && Number.isFinite(longitude) && latitude >= -90 && latitude <= 90 && longitude >= -180 && longitude <= 180;
}

function coordinatesFromQuery(req, res) {
  const latitude = Number(req.query.latitude);
  const longitude = Number(req.query.longitude);
  if (!validCoordinates(latitude, longitude)) {
    res.status(422).json({ detail: "latitude and longitude must be valid coordinates." });
    return null;
  }
  if (!isIndiaCoordinates(latitude, longitude)) {
    res.status(422).json({ detail: "WeatherGPT currently supports locations within India only." });
    return null;
  }
  return { latitude, longitude };
}

function userResponse(user) {
  return {
    id: user.id, name: user.name, email: user.email, preferred_language: user.preferredLanguage,
    latitude: user.latitude ?? null, longitude: user.longitude ?? null,
    created_at: new Date(user.createdAt).toISOString(),
  };
}

function normalizeUser(user) {
  if (!user) return null;
  const source = user.toObject ? user.toObject() : user;
  return { ...source, id: source.id || String(source._id), preferredLanguage: source.preferredLanguage || "en" };
}

function emailIsValid(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

api.get("/weather/current", async (req, res, next) => {
  const coordinates = coordinatesFromQuery(req, res);
  if (!coordinates) return;
  try { return res.json(await getCurrentWeather(coordinates.latitude, coordinates.longitude)); }
  catch (error) { return next(error); }
});

api.get("/weather/forecast", async (req, res, next) => {
  const coordinates = coordinatesFromQuery(req, res);
  if (!coordinates) return;
  const days = Number(req.query.days || 3);
  if (!Number.isInteger(days) || days < 1 || days > 10) return res.status(422).json({ detail: "days must be an integer between 1 and 10." });
  try { return res.json(await getForecast(coordinates.latitude, coordinates.longitude, days)); }
  catch (error) { return next(error); }
});

api.get("/weather/city", async (req, res, next) => {
  const city = String(req.query.city || "").trim();
  if (!city || city.length > 100) return res.status(422).json({ detail: "city is required and must be at most 100 characters." });
  try {
    const location = await geocode(city);
    if (!location) return res.status(404).json({ detail: `Location '${city}' not found.` });
    const weather = await getCurrentWeather(location.latitude, location.longitude);
    return res.json({ ...weather, location: location.location });
  } catch (error) { return next(error); }
});

api.get("/location/search", async (req, res, next) => {
  const city = String(req.query.city || "").trim();
  if (!city || city.length > 100) return res.status(422).json({ detail: "city is required and must be at most 100 characters." });
  try {
    const suggestions = await searchLocations(city);
    if (!suggestions?.length) return res.status(404).json({ detail: `No Indian location similar to '${city}' was found.` });
    return res.json({ ...suggestions[0], query: city, suggestions });
  } catch (error) { return next(error); }
});

api.get("/location/reverse-geocode", (req, res) => {
  const coordinates = coordinatesFromQuery(req, res);
  if (!coordinates) return;
  return res.json({ ...coordinates, location: reverseGeocode(coordinates.latitude, coordinates.longitude) });
});

api.post("/chat", (req, res, next) => {
  req.auth = getTokenPayload(req);
  next();
}, async (req, res, next) => {
  const { message, latitude, longitude, language = "en" } = req.body || {};
  if (typeof message !== "string" || !message.trim() || message.length > 2000) return res.status(422).json({ detail: "message must contain between 1 and 2000 characters." });
  if (!SUPPORTED_LANGUAGES.includes(language)) return res.status(422).json({ detail: "language is not supported." });
  if ((latitude == null) !== (longitude == null) || (latitude != null && !validCoordinates(Number(latitude), Number(longitude)))) return res.status(422).json({ detail: "latitude and longitude must be provided together as valid coordinates." });
  if (latitude != null && !isIndiaCoordinates(Number(latitude), Number(longitude))) return res.status(422).json({ detail: "WeatherGPT currently supports locations within India only." });
  try {
    const result = await generateWeatherResponse(message.trim(), latitude == null ? null : Number(latitude), longitude == null ? null : Number(longitude), language);
    if (req.auth?.sub && isMongoConnected()) await Conversation.create({ userId: req.auth.sub, userMessage: message.trim(), assistantMessage: result.response, location: result.location });
    return res.json(result);
  } catch (error) { return next(error); }
});

api.get("/alerts", async (req, res, next) => {
  const coordinates = req.query.latitude == null && req.query.longitude == null ? null : coordinatesFromQuery(req, res);
  if (req.query.latitude != null || req.query.longitude != null) {
    if (!coordinates) return;
  }
  const location = typeof req.query.location === "string" ? req.query.location.trim().slice(0, 200) : "";
  const language = SUPPORTED_LANGUAGES.includes(req.query.language) ? req.query.language : "en";
  try { return res.json(await getActiveAlerts({ ...(coordinates || {}), location, language })); }
  catch (error) { return next(error); }
});

api.get("/alerts/:alertId", async (req, res, next) => {
  try {
    const alert = await getAlertById(req.params.alertId);
    return alert ? res.json(alert) : res.status(404).json({ detail: "Alert not found." });
  } catch (error) { return next(error); }
});

api.post("/users/register", async (req, res, next) => {
  const { name, email, password, preferred_language = "en", latitude = null, longitude = null } = req.body || {};
  if (typeof name !== "string" || !name.trim() || name.length > 120 || typeof email !== "string" || !emailIsValid(email) || typeof password !== "string" || password.length < 8 || password.length > 128) return res.status(422).json({ detail: "name, a valid email, and a password between 8 and 128 characters are required." });
  if (!SUPPORTED_LANGUAGES.includes(preferred_language)) return res.status(422).json({ detail: "preferred_language is not supported." });
  if ((latitude == null) !== (longitude == null) || (latitude != null && !validCoordinates(Number(latitude), Number(longitude)))) return res.status(422).json({ detail: "latitude and longitude must be provided together as valid coordinates." });
  if (latitude != null && !isIndiaCoordinates(Number(latitude), Number(longitude))) return res.status(422).json({ detail: "WeatherGPT currently supports locations within India only." });
  const normalizedEmail = email.toLowerCase().trim();
  try {
    const existing = isMongoConnected() ? await User.findOne({ email: normalizedEmail }).select("+passwordHash") : memoryStore.users.find((user) => user.email === normalizedEmail);
    if (existing) return res.status(409).json({ detail: "Email is already registered." });
    const record = makeMemoryUser({ name: name.trim(), email: normalizedEmail, passwordHash: await bcrypt.hash(password, 12), preferredLanguage: preferred_language, latitude: latitude == null ? null : Number(latitude), longitude: longitude == null ? null : Number(longitude) });
    const user = isMongoConnected() ? await User.create(record) : (memoryStore.users.push(record), record);
    return res.status(201).json(userResponse(normalizeUser(user)));
  } catch (error) { return next(error); }
});

api.post("/users/login", async (req, res, next) => {
  const { email, password } = req.body || {};
  if (typeof email !== "string" || !emailIsValid(email) || typeof password !== "string" || !password) return res.status(422).json({ detail: "A valid email and password are required." });
  try {
    const normalizedEmail = email.toLowerCase().trim();
    const user = isMongoConnected() ? await User.findOne({ email: normalizedEmail }).select("+passwordHash") : memoryStore.users.find((candidate) => candidate.email === normalizedEmail);
    if (!user || !(await bcrypt.compare(password, user.passwordHash))) return res.status(401).json({ detail: "Invalid email or password." });
    return res.json({ access_token: signToken(user.id), token_type: "bearer" });
  } catch (error) { return next(error); }
});

api.get("/users/me", requireAuth, async (req, res, next) => {
  try {
    const user = isMongoConnected() ? await User.findOne({ id: req.auth.sub }) : memoryStore.users.find((candidate) => candidate.id === req.auth.sub);
    return user ? res.json(userResponse(normalizeUser(user))) : res.status(404).json({ detail: "User not found." });
  } catch (error) { return next(error); }
});

export default api;
