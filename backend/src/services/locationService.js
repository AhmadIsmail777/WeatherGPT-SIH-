import { locationLabel } from "./weatherService.js";
import { isIndiaCoordinates } from "./indiaService.js";

const GEOCODING_URL = "https://geocoding-api.open-meteo.com/v1/search";

export class LocationServiceUnavailable extends Error {}

const INDIA_CITY_FALLBACKS = [
  ["Ahmedabad", 23.0225, 72.5714, "Gujarat"], ["Amritsar", 31.6340, 74.8723, "Punjab"],
  ["Bengaluru", 12.9716, 77.5946, "Karnataka"], ["Bhopal", 23.2599, 77.4126, "Madhya Pradesh"],
  ["Bhubaneswar", 20.2961, 85.8245, "Odisha"], ["Chandigarh", 30.7333, 76.7794, "Chandigarh"],
  ["Chennai", 13.0827, 80.2707, "Tamil Nadu"], ["Dehradun", 30.3165, 78.0322, "Uttarakhand"],
  ["Delhi", 28.6139, 77.2090, "Delhi"], ["Gandhinagar", 23.2156, 72.6369, "Gujarat"],
  ["Guwahati", 26.1445, 91.7362, "Assam"], ["Hyderabad", 17.3850, 78.4867, "Telangana"],
  ["Imphal", 24.8170, 93.9368, "Manipur"], ["Jaipur", 26.9124, 75.7873, "Rajasthan"],
  ["Jammu", 32.7266, 74.8570, "Jammu and Kashmir"], ["Kochi", 9.9312, 76.2673, "Kerala"],
  ["Kolkata", 22.5726, 88.3639, "West Bengal"], ["Lucknow", 26.8467, 80.9462, "Uttar Pradesh"],
  ["Mumbai", 19.0760, 72.8777, "Maharashtra"], ["Nagpur", 21.1458, 79.0882, "Maharashtra"],
  ["Patna", 25.5941, 85.1376, "Bihar"], ["Pune", 18.5204, 73.8567, "Maharashtra"],
  ["Ranchi", 23.3441, 85.3096, "Jharkhand"], ["Srinagar", 34.0837, 74.7973, "Jammu and Kashmir"],
  ["Thiruvananthapuram", 8.5241, 76.9366, "Kerala"], ["Vijayawada", 16.5062, 80.6480, "Andhra Pradesh"],
  ["Visakhapatnam", 17.6868, 83.2185, "Andhra Pradesh"], ["Jaipur", 26.9124, 75.7873, "Rajasthan"],
];

function normalized(value) {
  return String(value).toLocaleLowerCase("en-IN").normalize("NFKD").replace(/[\u0300-\u036f]/g, "").replace(/[^\p{L}\p{N}]+/gu, "");
}

function words(value) {
  return String(value).toLocaleLowerCase("en-IN").normalize("NFKD").replace(/[\u0300-\u036f]/g, "").split(/[^\p{L}\p{N}]+/u).filter((word) => word.length > 1);
}

function editDistance(left, right) {
  const row = Array.from({ length: right.length + 1 }, (_, index) => index);
  for (let i = 1; i <= left.length; i += 1) {
    let diagonal = row[0];
    row[0] = i;
    for (let j = 1; j <= right.length; j += 1) {
      const above = row[j];
      row[j] = left[i - 1] === right[j - 1] ? diagonal : Math.min(diagonal + 1, above + 1, row[j - 1] + 1);
      diagonal = above;
    }
  }
  return row[right.length];
}

function fallbackSuggestions(query) {
  const term = normalized(query);
  return INDIA_CITY_FALLBACKS
    .map(([name, latitude, longitude, admin1]) => ({ name, latitude, longitude, admin1, country: "India", country_code: "IN", timezone: "Asia/Kolkata", score: editDistance(term, normalized(name)) }))
    .filter((result) => result.score <= Math.max(2, Math.ceil(term.length * 0.45)))
    .sort((left, right) => left.score - right.score)
    .slice(0, 5);
}

function scoreLocation(query, result) {
  const queryValue = normalized(query);
  const nameValue = normalized(result.name);
  const fullValue = normalized(`${result.name} ${result.admin1 || ""} ${result.country || ""}`);
  const queryWords = words(query);
  const resultWords = words(`${result.name} ${result.admin1 || ""}`);
  const sharedWords = queryWords.filter((word) => resultWords.some((candidate) => candidate === word || candidate.startsWith(word) || word.startsWith(candidate))).length;
  let score = sharedWords * 24;
  if (nameValue === queryValue) score += 120;
  else if (nameValue.startsWith(queryValue)) score += 80;
  else if (fullValue.includes(queryValue)) score += 42;
  const distance = editDistance(queryValue, nameValue);
  if (distance <= 2) score += 80;
  else if (distance <= Math.max(2, Math.ceil(queryValue.length * 0.3))) score += 30;
  score -= Math.min(distance, 25) * 1.5;
  return score;
}

function mapLocation(result) {
  if (!result || result.country_code?.toUpperCase() !== "IN" || !isIndiaCoordinates(result.latitude, result.longitude)) return null;
  const parts = [result.name, result.admin1, result.country].filter((part, index, list) => part && list.indexOf(part) === index);
  return {
    name: result.name,
    admin1: result.admin1 || "",
    country: result.country || "India",
    latitude: result.latitude,
    longitude: result.longitude,
    location: parts.join(", ") || locationLabel(result.latitude, result.longitude),
    timezone: result.timezone || "Asia/Kolkata",
    country_code: "IN",
  };
}

export async function searchLocations(city) {
  const normalizedCity = String(city || "").trim();
  if (!normalizedCity) return null;

  const url = new URL(GEOCODING_URL);
  url.search = new URLSearchParams({ name: normalizedCity, count: "10", language: "en", format: "json", countryCode: "IN" });
  try {
    const response = await fetch(url, { signal: AbortSignal.timeout(5000) });
    if (!response.ok) throw new Error(`Geocoding returned ${response.status}`);
    const data = await response.json();
    const results = (data.results || []).map(mapLocation).filter(Boolean);
    const fallback = fallbackSuggestions(normalizedCity).map(mapLocation).filter(Boolean);
    const merged = [...results, ...fallback]
      .filter((result, index, list) => list.findIndex((candidate) => candidate.latitude === result.latitude && candidate.longitude === result.longitude) === index)
      .map((result) => ({ ...result, score: scoreLocation(normalizedCity, result) }))
      .filter((result) => result.score >= 15)
      .sort((left, right) => right.score - left.score)
      .slice(0, 8);
    if (merged.length) return merged;
    return [];
  } catch (error) {
    const fallback = fallbackSuggestions(normalizedCity).map(mapLocation).filter(Boolean)
      .map((result) => ({ ...result, score: scoreLocation(normalizedCity, result) }))
      .filter((result) => result.score >= 15);
    if (fallback.length) return fallback;
    throw new LocationServiceUnavailable("City search is temporarily unavailable.");
  }
}

export async function geocode(city) {
  const results = await searchLocations(city);
  return results?.[0] || null;
}

export function reverseGeocode(latitude, longitude) {
  return locationLabel(latitude, longitude);
}
