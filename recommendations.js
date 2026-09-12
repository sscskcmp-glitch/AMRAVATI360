/*
 * GeoAI recommendation rules: for a selected category, which other category
 * ids are considered relevant nearby suggestions. Purely a lookup table —
 * actual recommended places are always real, already-mapped OSM locations
 * found by spatial proximity (see getRecommendations), never invented.
 */
const RECOMMENDATION_RULES = {
  hospitals: ["pharmacies", "atms", "parking", "restaurants"],
  clinics: ["pharmacies", "atms", "parking"],
  ev_charging: ["petrol", "parking", "malls", "restaurants"],
  petrol: ["ev_charging", "restaurants", "convenience"],
  hotels: ["restaurants", "parks", "temples", "malls"],
  railway: ["hotels", "restaurants", "atms", "busstops"],
  malls: ["restaurants", "parking", "atms", "cinemas"],
  parks: ["restaurants", "fastfood", "hotels"],
  schools: ["libraries", "parks", "convenience"],
  colleges: ["libraries", "fastfood", "convenience"],
  universities: ["libraries", "fastfood", "convenience"],
  temples: ["restaurants", "parks", "parking"],
  banks: ["atms", "restaurants"],
};

// Free-text "mood" queries (e.g. "family evening") map to a set of category
// ids to surface, in priority order — used by the AI search/assistant.
const MOOD_RULES = [
  { pattern: /family evening|weekend outing|family time/, ids: ["parks", "hotels", "restaurants", "malls"] },
  { pattern: /date night|romantic/, ids: ["restaurants", "cinemas", "parks"] },
  { pattern: /shopping trip/, ids: ["malls", "supermarkets", "clothing"] },
  { pattern: /morning walk|jogging|exercise/, ids: ["parks", "gyms"] },
];

function matchMoodQuery(text) {
  const lower = text.toLowerCase();
  const rule = MOOD_RULES.find(r => r.pattern.test(lower));
  return rule ? rule.ids : null;
}

/**
 * Finds real nearby places for the related categories of `catId`, sorted by
 * distance from `origin` ({lat, lon}). Returns a flat list of up to `limit`
 * places, each tagged with its category id and `_distanceKm`.
 */
function getRecommendations(catId, origin, placesByCategory, limit = 6) {
  const relatedIds = RECOMMENDATION_RULES[catId] || [];
  const candidates = [];

  relatedIds.forEach(relId => {
    (placesByCategory[relId] || []).forEach(place => {
      candidates.push({
        ...place,
        _catId: relId,
        _distanceKm: haversineKm(origin.lat, origin.lon, place.lat, place.lon),
      });
    });
  });

  return candidates.sort((a, b) => a._distanceKm - b._distanceKm).slice(0, limit);
}
