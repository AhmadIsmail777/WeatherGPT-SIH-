import config from "../config.js";

const OPEN_METEO_URL = "https://api.open-meteo.com/v1/forecast";

const weatherCodes = {
  0: "Clear sky", 1: "Mainly clear", 2: "Partly cloudy", 3: "Overcast",
  45: "Fog", 48: "Depositing rime fog", 51: "Light drizzle", 53: "Moderate drizzle",
  55: "Dense drizzle", 56: "Light freezing drizzle", 57: "Dense freezing drizzle",
  61: "Slight rain", 63: "Moderate rain", 65: "Heavy rain", 66: "Light freezing rain",
  67: "Heavy freezing rain", 71: "Slight snowfall", 73: "Moderate snowfall",
  75: "Heavy snowfall", 77: "Snow grains", 80: "Slight rain showers",
  81: "Moderate rain showers", 82: "Violent rain showers", 85: "Slight snow showers",
  86: "Heavy snow showers", 95: "Thunderstorm", 96: "Thunderstorm with slight hail",
  99: "Thunderstorm with heavy hail",
};

export class WeatherServiceUnavailable extends Error {}

export function locationLabel(latitude, longitude) {
  return `${Number(latitude).toFixed(4)}, ${Number(longitude).toFixed(4)}`;
}

function mockCurrent(latitude, longitude) {
  return {
    latitude, longitude, location: locationLabel(latitude, longitude), temperature: 28,
    humidity: 72, wind_speed: 12.5, rain_probability: 30,
    weather_condition: "Partly cloudy", recorded_at: new Date().toISOString(), source: "mock",
  };
}

function mockForecast(latitude, longitude, days) {
  const start = new Date();
  return {
    latitude, longitude, location: locationLabel(latitude, longitude), source: "mock",
    forecast: Array.from({ length: days }, (_, index) => {
      const date = new Date(start);
      date.setDate(start.getDate() + index);
      return {
        date: date.toISOString().slice(0, 10), temperature_min: 24 + index,
        temperature_max: 31 + index, rain_probability: 30 + index * 10,
        weather_condition: index === 1 ? "Light rain" : "Partly cloudy",
      };
    }),
  };
}

async function openMeteo(latitude, longitude, days) {
  const url = new URL(OPEN_METEO_URL);
  url.search = new URLSearchParams({
    latitude: String(latitude), longitude: String(longitude), timezone: "auto",
    current: "temperature_2m,relative_humidity_2m,wind_speed_10m,precipitation_probability,weather_code",
    daily: "temperature_2m_max,temperature_2m_min,precipitation_probability_max,weather_code",
    forecast_days: String(days),
  });

  let response;
  try {
    response = await fetch(url, { signal: AbortSignal.timeout(7000) });
    if (!response.ok) throw new Error(`Open-Meteo returned ${response.status}`);
    const data = await response.json();
    const current = data.current;
    const daily = data.daily;
    if (!current || !daily?.time?.length) throw new Error("Open-Meteo returned incomplete data");
    const currentWeather = {
      latitude, longitude, location: locationLabel(latitude, longitude),
      temperature: current.temperature_2m, humidity: current.relative_humidity_2m,
      wind_speed: current.wind_speed_10m, rain_probability: current.precipitation_probability ?? null,
      weather_condition: weatherCodes[current.weather_code] || "Unknown weather",
      recorded_at: new Date(current.time || Date.now()).toISOString(), source: "open-meteo",
    };
    const forecast = daily.time.map((date, index) => ({
      date, temperature_min: daily.temperature_2m_min[index], temperature_max: daily.temperature_2m_max[index],
      rain_probability: daily.precipitation_probability_max[index] ?? 0,
      weather_condition: weatherCodes[daily.weather_code[index]] || "Unknown weather",
    }));
    return { current: currentWeather, forecast: { latitude, longitude, location: currentWeather.location, forecast, source: "open-meteo" } };
  } catch (error) {
    throw new WeatherServiceUnavailable("Weather service is temporarily unavailable.");
  }
}

export async function getCurrentWeather(latitude, longitude) {
  if (config.weatherProvider !== "open-meteo") return mockCurrent(latitude, longitude);
  try {
    return (await openMeteo(latitude, longitude, 3)).current;
  } catch (error) {
    if (config.nodeEnv !== "production") return mockCurrent(latitude, longitude);
    throw error;
  }
}

export async function getForecast(latitude, longitude, days = 3) {
  if (config.weatherProvider !== "open-meteo") return mockForecast(latitude, longitude, days);
  try {
    return (await openMeteo(latitude, longitude, days)).forecast;
  } catch (error) {
    if (config.nodeEnv !== "production") return mockForecast(latitude, longitude, days);
    throw error;
  }
}
