/*
 * Small geospatial helpers shared by Near Me, Smart Search, Recommendations
 * and the route builder. Pure functions, no DOM/Leaflet dependency.
 */

// Haversine great-circle distance in kilometres between two lat/lon points.
function haversineKm(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.asin(Math.sqrt(a));
}

function formatDistanceKm(km) {
  if (km < 1) return `${Math.round(km * 1000)} m`;
  return `${km.toFixed(1)} km`;
}

// Returns places (from a flat array of {lat, lon, ...}) within radiusKm of
// origin, each annotated with `_distanceKm`, sorted nearest-first.
function placesWithinRadius(places, origin, radiusKm) {
  return places
    .map(p => ({ ...p, _distanceKm: haversineKm(origin.lat, origin.lon, p.lat, p.lon) }))
    .filter(p => p._distanceKm <= radiusKm)
    .sort((a, b) => a._distanceKm - b._distanceKm);
}

// Returns the single nearest place to origin from a flat array, or null.
function nearestPlace(places, origin) {
  let best = null;
  let bestDist = Infinity;
  places.forEach(p => {
    const d = haversineKm(origin.lat, origin.lon, p.lat, p.lon);
    if (d < bestDist) {
      bestDist = d;
      best = { ...p, _distanceKm: d };
    }
  });
  return best;
}
