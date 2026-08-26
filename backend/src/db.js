import mongoose from "mongoose";

import config from "./config.js";

let connectionAttempted = false;

export function isMongoConnected() {
  return mongoose.connection.readyState === 1;
}

export async function connectDatabase() {
  if (connectionAttempted) return isMongoConnected();
  connectionAttempted = true;

  try {
    await mongoose.connect(config.mongoUri, {
      serverSelectionTimeoutMS: 2500,
      connectTimeoutMS: 2500,
    });
    console.log("MongoDB connected");
    return true;
  } catch (error) {
    mongoose.disconnect().catch(() => undefined);
    if (config.requireMongo) {
      throw new Error(`MongoDB connection failed: ${error.message}`);
    }
    console.warn("MongoDB is unavailable; using the in-memory development store.");
    return false;
  }
}

export { mongoose };
