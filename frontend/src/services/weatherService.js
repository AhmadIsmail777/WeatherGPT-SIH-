import { request } from "./api";

export async function searchLocations(city) {
  return request(`/api/v1/location/search?city=${encodeURIComponent(city)}`);
}

export async function getWeather(latitude, longitude, location = "", language = "en") {
  const query = `latitude=${encodeURIComponent(latitude)}&longitude=${encodeURIComponent(longitude)}`;
  const alertQuery = `${query}&location=${encodeURIComponent(location)}&language=${encodeURIComponent(language)}`;
  const [current, forecast, alerts] = await Promise.all([
    request(`/api/v1/weather/current?${query}`),
    request(`/api/v1/weather/forecast?${query}&days=7`),
    request(`/api/v1/alerts?${alertQuery}`),
  ]);
  return { current, forecast, alerts };
}
