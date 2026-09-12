/*
 * Category definitions for the Amravati GeoAI dashboard.
 *
 * NOTE ON DATA HONESTY:
 * All data comes from OpenStreetMap, a crowd-sourced map. Counts below only
 * reflect what OSM volunteers have already mapped in this area — this is
 * NOT a guaranteed 100% real-world census, and nothing here should be
 * presented as "100% complete" or "verified".
 *
 * Each category is checked in array order and the FIRST match wins, so a
 * single place is never double-counted across categories. The final
 * "other" category is a mandatory catch-all so nothing is ever left
 * unclassified or hidden from the map/sidebar.
 */

const CATEGORIES = [
  { id: "ev_charging", name: "EV Charging", icon: "🔌", color: "#2ecc71",
    match: t => t.amenity === "charging_station" || Boolean(t["socket:type2"]) || Boolean(t["socket:ccs"]) },

  { id: "atms", name: "ATMs", icon: "🏧", color: "#16a085",
    match: t => t.amenity === "atm" },

  { id: "cinemas", name: "Movie Theatres", icon: "🎬", color: "#8e44ad",
    // many Indian cinema halls get mistagged as amenity=theatre instead of amenity=cinema
    match: t => t.amenity === "cinema" || t.shop === "cinema" || t.building === "cinema" || t.amenity === "theatre" },

  { id: "malls", name: "Shopping Malls", icon: "🛍️", color: "#e67e22",
    match: t => t.shop === "mall" || t.shop === "shopping_centre" || t.amenity === "marketplace" },

  { id: "supermarkets", name: "Supermarkets", icon: "🛒", color: "#27ae60",
    match: t => t.shop === "supermarket" },

  { id: "hospitals", name: "Hospitals (Govt + Private)", icon: "🏥", color: "#e74c3c",
    match: t => t.amenity === "hospital" },

  { id: "restaurants", name: "Restaurants & Cafes", icon: "🍽️", color: "#d35400",
    match: t => t.amenity === "restaurant" || t.amenity === "cafe" },

  { id: "fastfood", name: "Fast Food", icon: "🍔", color: "#f39c12",
    match: t => t.amenity === "fast_food" },

  { id: "hotels", name: "Hotels", icon: "🏨", color: "#2980b9",
    match: t => t.tourism === "hotel" || t.tourism === "guest_house" },

  { id: "petrol", name: "Petrol Pumps", icon: "⛽", color: "#c0392b",
    match: t => t.amenity === "fuel" },

  { id: "banks", name: "Banks", icon: "🏦", color: "#34495e",
    match: t => t.amenity === "bank" },

  { id: "schools", name: "Schools", icon: "🏫", color: "#2c3e50",
    match: t => t.amenity === "school" },

  { id: "colleges", name: "Colleges", icon: "🎓", color: "#7f8c8d",
    match: t => t.amenity === "college" },

  { id: "universities", name: "Universities", icon: "🎓", color: "#9b59b6",
    match: t => t.amenity === "university" },

  { id: "pharmacies", name: "Pharmacies", icon: "💊", color: "#1abc9c",
    match: t => t.amenity === "pharmacy" },

  { id: "police", name: "Police Stations", icon: "🚓", color: "#2980b9",
    match: t => t.amenity === "police" },

  { id: "fire", name: "Fire Stations", icon: "🚒", color: "#e74c3c",
    match: t => t.amenity === "fire_station" || t.emergency === "fire_station" || t.building === "fire_station" },

  { id: "post", name: "Post Offices", icon: "📮", color: "#c0392b",
    match: t => t.amenity === "post_office" },

  { id: "parks", name: "Parks", icon: "🌳", color: "#27ae60",
    match: t => t.leisure === "park" },

  { id: "busstops", name: "Bus Stops", icon: "🚌", color: "#f39c12",
    match: t => t.highway === "bus_stop" },

  { id: "railway", name: "Railway Stations", icon: "🚉", color: "#8e44ad",
    match: t => t.railway === "station" },

  { id: "temples", name: "Temples", icon: "🛕", color: "#e67e22",
    match: t => t.amenity === "place_of_worship" && t.religion === "hindu" },

  { id: "mosques", name: "Mosques", icon: "🕌", color: "#16a085",
    match: t => t.amenity === "place_of_worship" && t.religion === "muslim" },

  { id: "churches", name: "Churches", icon: "⛪", color: "#2980b9",
    match: t => t.amenity === "place_of_worship" && t.religion === "christian" },

  { id: "other_worship", name: "Other Places of Worship", icon: "🙏", color: "#95a5a6",
    match: t => t.amenity === "place_of_worship" },

  { id: "gyms", name: "Gyms", icon: "💪", color: "#d35400",
    match: t => t.leisure === "fitness_centre" || t.leisure === "sports_centre" ||
      t.leisure === "fitness_station" || t.amenity === "gym" },

  { id: "libraries", name: "Libraries", icon: "📚", color: "#2c3e50",
    match: t => t.amenity === "library" },

  { id: "govt", name: "Government Offices", icon: "🏛️", color: "#34495e",
    match: t => t.office === "government" || t.amenity === "townhall" || t.amenity === "public_building" },

  { id: "courts", name: "Courts", icon: "⚖️", color: "#7f8c8d",
    match: t => t.amenity === "courthouse" || t.government === "court" },

  { id: "parking", name: "Parking", icon: "🅿️", color: "#3498db",
    match: t => t.amenity === "parking" || t.amenity === "parking_space" || t.amenity === "motorcycle_parking" },

  { id: "dentists", name: "Dentists", icon: "🦷", color: "#1abc9c",
    match: t => t.amenity === "dentist" },

  { id: "clinics", name: "Clinics", icon: "⚕️", color: "#e74c3c",
    match: t => t.amenity === "clinic" || t.amenity === "doctors" },

  { id: "bakeries", name: "Bakeries", icon: "🥖", color: "#e67e22",
    match: t => ["bakery", "pastry", "confectionery", "chocolate"].includes(t.shop) },

  { id: "convenience", name: "General/Convenience Stores", icon: "🏪", color: "#f39c12",
    match: t => t.shop === "convenience" || t.shop === "general" },

  { id: "clothing", name: "Clothing Stores", icon: "👗", color: "#d35400",
    match: t => ["clothes", "boutique", "fashion", "shoes", "tailor", "fabric"].includes(t.shop) },

  { id: "electronics", name: "Electronics Stores", icon: "📱", color: "#2980b9",
    match: t => ["electronics", "mobile_phone", "computer", "hifi", "electrical", "appliance"].includes(t.shop) },

  { id: "hardware", name: "Hardware Stores", icon: "🔧", color: "#7f8c8d",
    match: t => ["hardware", "doityourself", "trade", "paint", "houseware"].includes(t.shop) },

  { id: "venues", name: "Event/Wedding Venues", icon: "🎉", color: "#8e44ad",
    match: t => ["events_venue", "community_centre", "banquet_hall", "conference_centre"].includes(t.amenity) },

  // Mandatory catch-all: guarantees nothing on the map is ever unclassified.
  { id: "other", name: "Other Places", icon: "📍", color: "#95a5a6",
    match: t => Boolean(t.shop || t.amenity || t.tourism || t.office || t.leisure) },
];

function classifyTags(tags) {
  if (!tags) return null;
  for (const cat of CATEGORIES) {
    if (cat.match(tags)) return cat.id;
  }
  return null;
}

/*
 * Smart City Layers — logical groupings of the categories above, used by the
 * sidebar to organize dozens of categories into scannable sections. Any
 * category id not listed here automatically falls into an "Other" group
 * (built at render time in app.js) so nothing is ever hidden from the UI.
 */
const CATEGORY_GROUPS = [
  { name: "Healthcare", icon: "🏥", ids: ["hospitals", "pharmacies", "clinics", "dentists"] },
  { name: "Finance", icon: "🏦", ids: ["atms", "banks"] },
  { name: "Transportation", icon: "🚦", ids: ["petrol", "ev_charging", "parking", "busstops", "railway"] },
  { name: "Emergency", icon: "🚨", ids: ["police", "fire", "courts"] },
  { name: "Education", icon: "🎓", ids: ["schools", "colleges", "universities", "libraries"] },
  { name: "Shopping & Food", icon: "🛍️", ids: [
    "malls", "supermarkets", "restaurants", "fastfood", "bakeries",
    "convenience", "clothing", "electronics", "hardware", "venues",
  ] },
  { name: "Tourism & Recreation", icon: "🎉", ids: [
    "hotels", "parks", "cinemas", "gyms", "temples", "mosques", "churches", "other_worship",
  ] },
];

