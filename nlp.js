/*
 * Rule-based natural-language query parser — the working fallback used by
 * both the AI Smart Search bar and the "Ask Amravati360" assistant.
 *
 * IMPORTANT: there is no real AI/LLM backend wired up here (and none should
 * ever expose an API key from frontend JS). This module only does keyword +
 * pattern matching. It is intentionally isolated behind a small function
 * surface (parseSmartQuery / answerAssistantQuery) so a real AI API call can
 * later replace the internals of these two functions without touching any
 * other file — see the `callRemoteAI` stub at the bottom.
 */

// Extra synonyms per category id, beyond the category's own display name.
const CATEGORY_SYNONYMS = {
  ev_charging: ["ev charging", "ev charger", "charging station", "electric vehicle"],
  atms: ["atm", "cash machine", "cash withdrawal"],
  cinemas: ["cinema", "movie theatre", "movie theater", "theatre", "theater"],
  malls: ["mall", "shopping mall", "shopping centre", "shopping center"],
  supermarkets: ["supermarket", "grocery store"],
  hospitals: ["hospital", "hospitals"],
  restaurants: ["restaurant", "cafe", "café", "food", "dining"],
  fastfood: ["fast food", "quick bite", "street food"],
  hotels: ["hotel", "guest house", "lodging", "stay"],
  petrol: ["petrol pump", "petrol station", "fuel station", "gas station", "diesel"],
  banks: ["bank"],
  schools: ["school"],
  colleges: ["college"],
  universities: ["university"],
  pharmacies: ["pharmacy", "medical store", "chemist", "medicine shop"],
  police: ["police station", "police"],
  fire: ["fire station", "fire brigade"],
  post: ["post office"],
  parks: ["park", "garden"],
  busstops: ["bus stop", "bus stand"],
  railway: ["railway station", "train station", "railway"],
  temples: ["temple", "mandir"],
  mosques: ["mosque", "masjid"],
  churches: ["church"],
  other_worship: ["place of worship", "prayer hall"],
  gyms: ["gym", "fitness centre", "fitness center", "sports centre"],
  libraries: ["library"],
  govt: ["government office", "govt office"],
  courts: ["court", "courthouse"],
  parking: ["parking", "parking lot"],
  dentists: ["dentist", "dental clinic"],
  clinics: ["clinic", "doctor"],
  bakeries: ["bakery"],
  convenience: ["convenience store", "general store", "grocery"],
  clothing: ["clothing store", "clothes shop", "boutique"],
  electronics: ["electronics store", "mobile shop", "computer shop"],
  hardware: ["hardware store"],
  venues: ["wedding venue", "event venue", "banquet hall", "community centre"],
};

function buildKeywordIndex() {
  // Longer phrases first so "railway station" wins over a looser "station" match.
  const entries = [];
  CATEGORIES.forEach(cat => {
    const phrases = new Set([cat.name.toLowerCase(), ...(CATEGORY_SYNONYMS[cat.id] || [])]);
    phrases.forEach(phrase => entries.push({ phrase, catId: cat.id }));
  });
  return entries.sort((a, b) => b.phrase.length - a.phrase.length);
}

const KEYWORD_INDEX = buildKeywordIndex();

function findCategoryInText(text) {
  const found = KEYWORD_INDEX.find(({ phrase }) => text.includes(phrase));
  return found ? found.catId : null;
}

function findRadiusKmInText(text) {
  const match = text.match(/(\d+(?:\.\d+)?)\s*(km|kilometre|kilometer)/);
  if (match) return parseFloat(match[1]);
  const meterMatch = text.match(/(\d+(?:\.\d+)?)\s*(m|meter|metre)\b/);
  if (meterMatch) return parseFloat(meterMatch[1]) / 1000;
  return null;
}

const NEAR_ME_PATTERN = /near me|nearby me|around me|my location|current location|close to me/;

/**
 * Parses free-text like "EV charging stations near shopping malls" or
 * "ATMs within 3 km" into a structured filter the map/results panel can act on.
 *
 * Returns: { categoryId, near: 'me' | anchorCategoryId | null, radiusKm }
 */
function parseSmartQuery(rawText) {
  const text = rawText.toLowerCase().trim();
  const radiusKm = findRadiusKmInText(text);
  const near = NEAR_ME_PATTERN.test(text) ? "me" : null;

  // Split on "near"/"within"/"around" to look for a second, anchor category
  // e.g. "restaurants near amravati railway station" -> anchor = railway.
  const nearSplit = text.split(/\bnear\b|\baround\b/);
  const mainText = nearSplit[0];
  const anchorText = nearSplit.length > 1 ? nearSplit.slice(1).join(" ") : "";

  const categoryId = findCategoryInText(mainText) || findCategoryInText(text);
  let anchor = near;
  if (!anchor && anchorText) {
    const anchorCatId = findCategoryInText(anchorText);
    if (anchorCatId && anchorCatId !== categoryId) anchor = anchorCatId;
  }

  return { categoryId, near: anchor, radiusKm };
}

/**
 * Answers a free-text question about the currently loaded dataset using only
 * real, already-fetched data (counts, category names) — never fabricated.
 * `context` = { placesByCategory, categoryById, totalPlaces }
 */
function answerAssistantQuery(rawText, context) {
  const text = rawText.toLowerCase().trim();
  const { placesByCategory, categoryById, totalPlaces } = context;

  if (/most places|largest category|biggest category/.test(text)) {
    const [topId, topArr] = Object.entries(placesByCategory).sort((a, b) => b[1].length - a[1].length)[0];
    const cat = categoryById[topId];
    return {
      text: `"${cat.name}" has the most mapped places right now: ${topArr.length} locations.`,
      categoryId: topId,
    };
  }

  const parsed = parseSmartQuery(text);
  if (parsed.categoryId) {
    const cat = categoryById[parsed.categoryId];
    const count = placesByCategory[parsed.categoryId].length;
    let reply = `There ${count === 1 ? "is" : "are"} ${count} ${cat.name} location${count === 1 ? "" : "s"} currently mapped in the loaded OpenStreetMap data.`;
    if (parsed.near === "me") reply += " I can show the ones nearest to you.";
    else if (parsed.radiusKm) reply += ` I can filter to ones within ${parsed.radiusKm} km.`;
    return { text: reply, categoryId: parsed.categoryId, near: parsed.near, radiusKm: parsed.radiusKm };
  }

  if (/how many|total|count/.test(text)) {
    return { text: `There are ${totalPlaces} places mapped across ${CATEGORIES.length} categories in this area.` };
  }

  return {
    text:
      "I couldn't match that to a mapped category. Try something like \"ATMs near me\", " +
      "\"hospitals within 2 km\", or \"which category has the most places?\".",
  };
}

// Placeholder integration point for a real AI/LLM API in the future.
// Never call this with an API key embedded in frontend code — route it
// through your own backend endpoint instead, e.g. fetch('/api/ai-query', ...).
async function callRemoteAI(_query) {
  throw new Error("No remote AI backend is configured — using local rule-based parser.");
}
