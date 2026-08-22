/* WeatherGPT dashboard: a dependency-free client for the FastAPI backend. */

// Same-origin when FastAPI serves the dashboard; retain a local API fallback
// for standalone frontend development on port 5173.
const API_BASE = window.WEATHERGPT_API_URL || (
  window.location.port === "8000" ? window.location.origin : "http://127.0.0.1:8000"
);
const DEFAULT_LOCATION = { latitude: 20.2961, longitude: 85.8245 };
const state = { ...DEFAULT_LOCATION };

const elements = {
  apiState: document.querySelector("#api-state"),
  locationForm: document.querySelector("#location-form"),
  locationSearch: document.querySelector("#location-search"),
  currentLocation: document.querySelector("#current-location"),
  refresh: document.querySelector("#refresh-data"),
  locationName: document.querySelector(".location-name"),
  weatherSymbol: document.querySelector("#weather-symbol"),
  temperature: document.querySelector("#current-temperature"),
  condition: document.querySelector("#weather-condition"),
  humidity: document.querySelector("#humidity"),
  wind: document.querySelector("#wind-speed"),
  rain: document.querySelector("#rain-probability"),
  lastUpdated: document.querySelector("#last-updated"),
  source: document.querySelector("#weather-source"),
  forecastList: document.querySelector("#forecast-list"),
  forecastTemplate: document.querySelector("#forecast-template"),
  alertList: document.querySelector("#alert-list"),
  alertCount: document.querySelector("#alert-count"),
  chatForm: document.querySelector("#chat-form"),
  chatMessage: document.querySelector("#chat-message"),
  chatLog: document.querySelector("#chat-log"),
  sendButton: document.querySelector("#send-button"),
  themeToggle: document.querySelector("#theme-toggle"),
};

function weatherIcon(condition = "") {
  const description = condition.toLowerCase();
  if (description.includes("rain") || description.includes("storm")) return "☂";
  if (description.includes("cloud")) return "◒";
  if (description.includes("wind")) return "≋";
  if (description.includes("sun") || description.includes("clear")) return "☀";
  return "◌";
}

function setApiState(kind, message) {
  elements.apiState.className = `api-state ${kind === "online" ? "is-online" : kind === "error" ? "is-error" : ""}`;
  elements.apiState.lastElementChild.textContent = message;
}

async function request(path, options = {}) {
  const response = await fetch(`${API_BASE}${path}`, {
    headers: { "Content-Type": "application/json", ...(options.headers || {}) },
    ...options,
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const detail = typeof data.detail === "string" ? data.detail : "The weather service could not complete that request.";
    throw new Error(detail);
  }
  return data;
}

function formatCoordinates(latitude, longitude) {
  return `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`;
}

function updateCurrentWeather(weather) {
  elements.locationName.textContent = weather.location || formatCoordinates(state.latitude, state.longitude);
  elements.weatherSymbol.textContent = weatherIcon(weather.weather_condition);
  elements.temperature.textContent = Math.round(weather.temperature);
  elements.condition.textContent = weather.weather_condition;
  elements.humidity.textContent = `${Math.round(weather.humidity)}%`;
  elements.wind.textContent = `${Math.round(weather.wind_speed)} km/h`;
  elements.rain.textContent = weather.rain_probability == null ? "—" : `${Math.round(weather.rain_probability)}%`;
  elements.lastUpdated.textContent = `UPDATED ${new Date(weather.recorded_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`;
  elements.source.textContent = String(weather.source || "weather service").toUpperCase();
}

function updateForecast(forecast) {
  elements.forecastList.replaceChildren();
  forecast.forecast.forEach((day) => {
    const row = elements.forecastTemplate.content.cloneNode(true);
    const date = new Date(`${day.date}T12:00:00`);
    row.querySelector(".forecast-date").textContent = date.toLocaleDateString([], { weekday: "short" });
    row.querySelector(".forecast-icon").textContent = weatherIcon(day.weather_condition);
    row.querySelector(".forecast-condition").textContent = day.weather_condition;
    row.querySelector(".forecast-rain").textContent = `${Math.round(day.rain_probability)}% rain`;
    row.querySelector(".forecast-range").textContent = `${Math.round(day.temperature_min)}° / ${Math.round(day.temperature_max)}°`;
    elements.forecastList.append(row);
  });
}

function updateAlerts(alerts) {
  elements.alertCount.textContent = alerts.length;
  elements.alertList.replaceChildren();
  if (!alerts.length) {
    const copy = document.createElement("p");
    copy.className = "empty-alerts";
    copy.textContent = "No active alerts for the available alert feed.";
    elements.alertList.append(copy);
    return;
  }
  alerts.forEach((alert) => {
    const item = document.createElement("article");
    item.className = "alert-item";
    item.innerHTML = `
      <span class="severity-dot" aria-hidden="true"></span>
      <div>
        <h3>${escapeHtml(alert.title)}</h3>
        <p>${escapeHtml(alert.message)}</p>
        <p class="alert-meta">${escapeHtml(alert.severity)} · ${escapeHtml(alert.alert_type)} · ${escapeHtml(alert.location)}</p>
      </div>`;
    elements.alertList.append(item);
  });
}

function escapeHtml(value) {
  const element = document.createElement("div");
  element.textContent = String(value);
  return element.innerHTML;
}

function appendMessage(text, role) {
  const message = document.createElement("div");
  message.className = `message ${role === "user" ? "user-message" : "assistant-message"}`;
  message.textContent = text;
  elements.chatLog.append(message);
  elements.chatLog.scrollTop = elements.chatLog.scrollHeight;
}

async function refreshDashboard() {
  elements.refresh.disabled = true;
  setApiState("loading", "Refreshing weather data");
  const query = `latitude=${encodeURIComponent(state.latitude)}&longitude=${encodeURIComponent(state.longitude)}`;
  try {
    const [weather, forecast, alerts] = await Promise.all([
      request(`/api/v1/weather/current?${query}`),
      request(`/api/v1/weather/forecast?${query}&days=3`),
      request("/api/v1/alerts"),
    ]);
    updateCurrentWeather(weather);
    updateForecast(forecast);
    updateAlerts(alerts);
    elements.locationSearch.value = formatCoordinates(state.latitude, state.longitude);
    setApiState("online", "Weather service connected");
  } catch (error) {
    console.error(error);
    setApiState("error", "Weather service unavailable");
    elements.condition.textContent = error.message;
    elements.forecastList.innerHTML = `<p class="loading-copy">${escapeHtml(error.message)}</p>`;
  } finally {
    elements.refresh.disabled = false;
  }
}

function parseCoordinates(value) {
  const parts = value.split(",").map((part) => Number.parseFloat(part.trim()));
  if (parts.length !== 2 || parts.some((part) => Number.isNaN(part))) return null;
  const [latitude, longitude] = parts;
  if (latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) return null;
  return { latitude, longitude };
}

elements.locationForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const coordinates = parseCoordinates(elements.locationSearch.value);
  if (!coordinates) {
    elements.locationSearch.setCustomValidity("Enter coordinates as latitude, longitude. For example: 20.2961, 85.8245");
    elements.locationSearch.reportValidity();
    return;
  }
  elements.locationSearch.setCustomValidity("");
  Object.assign(state, coordinates);
  refreshDashboard();
});

elements.currentLocation.addEventListener("click", () => {
  if (!navigator.geolocation) {
    setApiState("error", "Location is not supported in this browser");
    return;
  }
  elements.currentLocation.disabled = true;
  elements.currentLocation.textContent = "Finding your location…";
  navigator.geolocation.getCurrentPosition(
    ({ coords }) => {
      state.latitude = coords.latitude;
      state.longitude = coords.longitude;
      elements.currentLocation.disabled = false;
      elements.currentLocation.innerHTML = "<span aria-hidden=\"true\">⌖</span> Use my location";
      refreshDashboard();
    },
    () => {
      elements.currentLocation.disabled = false;
      elements.currentLocation.innerHTML = "<span aria-hidden=\"true\">⌖</span> Use my location";
      setApiState("error", "Location permission was not granted");
    },
    { enableHighAccuracy: false, timeout: 10000 }
  );
});

elements.refresh.addEventListener("click", refreshDashboard);

elements.chatForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const message = elements.chatMessage.value.trim();
  if (!message) return;
  appendMessage(message, "user");
  elements.chatMessage.value = "";
  elements.sendButton.disabled = true;
  try {
    const reply = await request("/api/v1/chat", {
      method: "POST",
      body: JSON.stringify({ message, latitude: state.latitude, longitude: state.longitude, language: "en" }),
    });
    appendMessage(reply.response, "assistant");
  } catch (error) {
    appendMessage(error.message, "assistant");
  } finally {
    elements.sendButton.disabled = false;
    elements.chatMessage.focus();
  }
});

elements.themeToggle.addEventListener("click", () => {
  document.body.classList.toggle("dark");
});

refreshDashboard();
