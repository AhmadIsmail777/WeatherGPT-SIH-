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
    feels_like: 29, humidity: 72, wind_speed: 12.5, rain_probability: 30,
    visibility: 10000, pressure: 1012, uv_index: 5,
    sunrise: "06:00", sunset: "18:20",
    weather_condition: "Partly cloudy", recorded_at: new Date().toISOString(), source: "mock",
  };
}

function mockHourly(start, hours = 48) {
  return Array.from({ length: hours }, (_, index) => {
    const time = new Date(start);
    time.setHours(start.getHours() + index, 0, 0, 0);
    return {
      time: time.toISOString(), temperature: 26 + Math.round(Math.sin(index / 4) * 4),
      feels_like: 27 + Math.round(Math.sin(index / 4) * 4), humidity: 65 + (index % 5) * 3,
      wind_speed: 10 + (index % 4) * 2, rain_probability: index % 9 === 0 ? 70 : 25,
      precipitation: index % 9 === 0 ? 0.8 : 0, visibility: 10000, pressure: 1012,
      uv_index: index % 24 >= 7 && index % 24 <= 17 ? 5 : 0,
      weather_condition: index % 9 === 0 ? "Light rain" : "Partly cloudy",
    };
  });
}

function mockForecast(latitude, longitude, days) {
  const start = new Date();
  return {
    latitude, longitude, location: locationLabel(latitude, longitude), source: "mock",
    hourly: mockHourly(start, Math.max(days * 24, 48)),
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
    current: "temperature_2m,apparent_temperature,relative_humidity_2m,wind_speed_10m,precipitation_probability,visibility,pressure_msl,uv_index,weather_code",
    hourly: "temperature_2m,apparent_temperature,relative_humidity_2m,wind_speed_10m,precipitation_probability,precipitation,visibility,pressure_msl,uv_index,weather_code",
    daily: "temperature_2m_max,temperature_2m_min,precipitation_probability_max,weather_code,sunrise,sunset",
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
      temperature: current.temperature_2m, feels_like: current.apparent_temperature,
      humidity: current.relative_humidity_2m,
      wind_speed: current.wind_speed_10m, rain_probability: current.precipitation_probability ?? null,
      visibility: current.visibility ?? null, pressure: current.pressure_msl ?? null,
      uv_index: current.uv_index ?? null,
      sunrise: daily.sunrise?.[0] || null, sunset: daily.sunset?.[0] || null,
      weather_condition: weatherCodes[current.weather_code] || "Unknown weather",
      recorded_at: new Date(current.time || Date.now()).toISOString(), source: "open-meteo",
    };
    const forecast = daily.time.map((date, index) => ({
      date, temperature_min: daily.temperature_2m_min[index], temperature_max: daily.temperature_2m_max[index],
      rain_probability: daily.precipitation_probability_max[index] ?? 0,
      weather_condition: weatherCodes[daily.weather_code[index]] || "Unknown weather",
    }));
    const hourly = (data.hourly?.time || []).map((time, index) => ({
      time, temperature: data.hourly.temperature_2m[index], feels_like: data.hourly.apparent_temperature?.[index],
      humidity: data.hourly.relative_humidity_2m?.[index], wind_speed: data.hourly.wind_speed_10m?.[index],
      rain_probability: data.hourly.precipitation_probability?.[index] ?? 0,
      precipitation: data.hourly.precipitation?.[index] ?? 0, visibility: data.hourly.visibility?.[index],
      pressure: data.hourly.pressure_msl?.[index], uv_index: data.hourly.uv_index?.[index],
      weather_condition: weatherCodes[data.hourly.weather_code[index]] || "Unknown weather",
    }));
    return { current: currentWeather, forecast: { latitude, longitude, location: currentWeather.location, forecast, hourly, source: "open-meteo" } };
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
