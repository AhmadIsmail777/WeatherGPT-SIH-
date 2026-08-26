import jwt from "jsonwebtoken";

import config from "../config.js";

export function signToken(userId) {
  return jwt.sign({ sub: String(userId) }, config.jwtSecretKey, { expiresIn: config.jwtExpiresIn });
}

export function getTokenPayload(req) {
  const header = req.headers.authorization || "";
  if (!header.startsWith("Bearer ")) return null;
  try {
    return jwt.verify(header.slice(7), config.jwtSecretKey);
  } catch {
    return null;
  }
}

export function requireAuth(req, res, next) {
  const payload = getTokenPayload(req);
  if (!payload) return res.status(401).json({ detail: "Invalid or missing authentication token." });
  req.auth = payload;
  return next();
}
