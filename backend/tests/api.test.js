import assert from "node:assert/strict";
import test from "node:test";

process.env.NODE_ENV = "test";
const { default: app } = await import("../src/app.js");

async function withServer(callback) {
  const server = app.listen(0);
  try {
    const address = server.address();
    return await callback(`http://127.0.0.1:${address.port}`);
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
}

test("health reports a MERN API", () => withServer(async (baseUrl) => {
  const response = await fetch(`${baseUrl}/health`);
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { status: "healthy", service: "WeatherGPT API", stack: "MERN" });
}));

test("current weather works offline with the mock provider", () => withServer(async (baseUrl) => {
  const response = await fetch(`${baseUrl}/api/v1/weather/current?latitude=20.2961&longitude=85.8245`);
  assert.equal(response.status, 200);
  const body = await response.json();
  assert.equal(body.temperature, 28);
  assert.equal(body.source, "mock");
}));

test("weather validates missing coordinates", () => withServer(async (baseUrl) => {
  const response = await fetch(`${baseUrl}/api/v1/weather/current`);
  assert.equal(response.status, 422);
}));

test("weather rejects locations outside India", () => withServer(async (baseUrl) => {
  const response = await fetch(`${baseUrl}/api/v1/weather/current?latitude=40&longitude=70`);
  assert.equal(response.status, 422);
  assert.match((await response.json()).detail, /India/);
}));

test("alerts are available and unknown alerts return 404", () => withServer(async (baseUrl) => {
  const list = await fetch(`${baseUrl}/api/v1/alerts`);
  assert.equal(list.status, 200);
  assert.ok(Array.isArray(await list.json()));
  const missing = await fetch(`${baseUrl}/api/v1/alerts/99999`);
  assert.equal(missing.status, 404);
}));

test("registration, login, and me work without MongoDB for local development", () => withServer(async (baseUrl) => {
  const suffix = Date.now();
  const registration = await fetch(`${baseUrl}/api/v1/users/register`, {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name: "Test User", email: `test-${suffix}@example.com`, password: "password123" }),
  });
  assert.equal(registration.status, 201);
  const login = await fetch(`${baseUrl}/api/v1/users/login`, {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: `test-${suffix}@example.com`, password: "password123" }),
  });
  assert.equal(login.status, 200);
  const token = (await login.json()).access_token;
  const me = await fetch(`${baseUrl}/api/v1/users/me`, { headers: { Authorization: `Bearer ${token}` } });
  assert.equal(me.status, 200);
}));

test("chat returns a grounded fallback without an AI key", () => withServer(async (baseUrl) => {
  const response = await fetch(`${baseUrl}/api/v1/chat`, {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ message: "What is the weather?", latitude: 20.2961, longitude: 85.8245 }),
  });
  assert.equal(response.status, 200);
  assert.match((await response.json()).response, /28/);
}));

test("chat puts unrelated questions into a weather context", () => withServer(async (baseUrl) => {
  const response = await fetch(`${baseUrl}/api/v1/chat`, {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ message: "What is the capital of India?", latitude: 20.2961, longitude: 85.8245 }),
  });
  assert.equal(response.status, 200);
  const body = await response.json();
  assert.match(body.response, /28|weather|weather context/i);
  assert.doesNotMatch(body.response, /only answer weather-related questions/i);
}));

test("chat gives activity-specific weather guidance", () => withServer(async (baseUrl) => {
  const response = await fetch(`${baseUrl}/api/v1/chat`, {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ message: "Can I go for a run today?", latitude: 20.2961, longitude: 85.8245 }),
  });
  assert.equal(response.status, 200);
  assert.match((await response.json()).response, /outdoor plans|28|weather/i);
}));
