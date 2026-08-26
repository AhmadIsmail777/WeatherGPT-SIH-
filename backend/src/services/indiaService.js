const INDIA_BOUNDS = {
  minLatitude: 6.5,
  maxLatitude: 37.5,
  minLongitude: 68,
  maxLongitude: 97.6,
};

// A deliberately conservative outline used for coordinate requests. City searches
// are additionally checked against Open-Meteo's country_code=IN response.
const INDIA_OUTLINE = [
  [8.1, 68.1], [23.8, 68.1], [30.5, 72.5], [35.8, 73.5], [37.3, 77.5],
  [35.5, 82.5], [31.2, 88.2], [27.4, 97.5], [22.2, 94.2], [18.2, 93.1],
  [12.2, 92.2], [6.5, 78.5], [8.1, 68.1],
];

function pointInPolygon(latitude, longitude) {
  let inside = false;
  for (let index = 0, previous = INDIA_OUTLINE.length - 1; index < INDIA_OUTLINE.length; previous = index++) {
    const [currentLat, currentLon] = INDIA_OUTLINE[index];
    const [previousLat, previousLon] = INDIA_OUTLINE[previous];
    const intersects = ((currentLon > longitude) !== (previousLon > longitude))
      && latitude < ((previousLat - currentLat) * (longitude - currentLon)) / (previousLon - currentLon) + currentLat;
    if (intersects) inside = !inside;
  }
  return inside;
}

export function isIndiaCoordinates(latitude, longitude) {
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return false;
  if (latitude < INDIA_BOUNDS.minLatitude || latitude > INDIA_BOUNDS.maxLatitude) return false;
  if (longitude < INDIA_BOUNDS.minLongitude || longitude > INDIA_BOUNDS.maxLongitude) return false;
  return pointInPolygon(latitude, longitude);
}

export class IndiaLocationRequired extends Error {}

export function assertIndiaCoordinates(latitude, longitude) {
  if (!isIndiaCoordinates(latitude, longitude)) {
    throw new IndiaLocationRequired("WeatherGPT currently supports locations within India only.");
  }
}
