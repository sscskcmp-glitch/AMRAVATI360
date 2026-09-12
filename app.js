/*
 * Amravati GeoAI — Places Dashboard
 *
 * Data source: OpenStreetMap via the Overpass API. OSM is crowd-sourced,
 * so what is shown here reflects whatever volunteers have mapped so far —
 * it is NOT a verified or 100% complete real-world census.
 */

const BBOX = { south: 20.80, west: 77.62, north: 21.06, east: 77.95 };
const OVERPASS_PRIMARY = "https://overpass-api.de/api/interpreter";
const OVERPASS_FALLBACK = "https://overpass.kumi.systems/api/interpreter";
const REQUEST_TIMEOUT_MS = 90000;

// nwr = node/way/relation in one shot — relations matter because many malls,
// hospitals, parks and govt complexes are mapped as multipolygon relations,
// not plain nodes/ways, and were being silently skipped before.
const overpassQuery = `
[out:json][timeout:80];
(
  nwr["shop"](${BBOX.south},${BBOX.west},${BBOX.north},${BBOX.east});
  nwr["amenity"](${BBOX.south},${BBOX.west},${BBOX.north},${BBOX.east});
  nwr["tourism"](${BBOX.south},${BBOX.west},${BBOX.north},${BBOX.east});
  nwr["leisure"](${BBOX.south},${BBOX.west},${BBOX.north},${BBOX.east});
  nwr["office"="government"](${BBOX.south},${BBOX.west},${BBOX.north},${BBOX.east});
  nwr["railway"="station"](${BBOX.south},${BBOX.west},${BBOX.north},${BBOX.east});
  nwr["highway"="bus_stop"](${BBOX.south},${BBOX.west},${BBOX.north},${BBOX.east});
  nwr["emergency"](${BBOX.south},${BBOX.west},${BBOX.north},${BBOX.east});
  nwr["government"](${BBOX.south},${BBOX.west},${BBOX.north},${BBOX.east});
  nwr["building"~"^(cinema|fire_station)$"](${BBOX.south},${BBOX.west},${BBOX.north},${BBOX.east});
  nwr["socket:type2"](${BBOX.south},${BBOX.west},${BBOX.north},${BBOX.east});
  nwr["socket:ccs"](${BBOX.south},${BBOX.west},${BBOX.north},${BBOX.east});
);
out center tags;
`;

// ---------- Map setup ----------
const map = L.map("map", { zoomControl: true }).setView([20.9374, 77.7796], 13);

const streetLayer = L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
  attribution: "&copy; OpenStreetMap contributors",
  maxZoom: 19,
}).addTo(map);

const satelliteLayer = L.tileLayer(
  "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
  { attribution: "Tiles &copy; Esri", maxZoom: 19 }
);

const darkLayer = L.tileLayer("https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png", {
  attribution: "&copy; OpenStreetMap contributors &copy; CARTO",
  maxZoom: 19,
});

const terrainLayer = L.tileLayer("https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png", {
  attribution: "Map data: &copy; OpenStreetMap contributors, SRTM | Map style: &copy; OpenTopoMap",
  maxZoom: 17,
});

L.control.layers(
  {
    "Street (OSM)": streetLayer,
    "Satellite": satelliteLayer,
    "Dark": darkLayer,
    "Terrain": terrainLayer,
  },
  {},
  { position: "topright" }
).addTo(map);

L.control.scale({ position: "bottomleft", imperial: false }).addTo(map);

// Lightweight custom controls (no extra plugin/CDN needed).
const LocateControl = L.Control.extend({
  options: { position: "topright" },
  onAdd() {
    const btn = L.DomUtil.create("button", "map-control-btn leaflet-bar");
    btn.title = "Locate me";
    btn.innerHTML = "📍";
    L.DomEvent.disableClickPropagation(btn);
    L.DomEvent.on(btn, "click", () => map.locate({ setView: true, maxZoom: 16 }));
    return btn;
  },
});
map.addControl(new LocateControl());

const FullscreenControl = L.Control.extend({
  options: { position: "topright" },
  onAdd() {
    const btn = L.DomUtil.create("button", "map-control-btn leaflet-bar");
    btn.title = "Fullscreen";
    btn.innerHTML = "⛶";
    L.DomEvent.disableClickPropagation(btn);
    L.DomEvent.on(btn, "click", () => {
      const el = document.getElementById("app");
      if (!document.fullscreenElement) el.requestFullscreen?.();
      else document.exitFullscreen?.();
    });
    return btn;
  },
});
map.addControl(new FullscreenControl());

let locateMarker = null;
let userLocation = null;
map.on("locationfound", e => {
  userLocation = { lat: e.latlng.lat, lon: e.latlng.lng };
  if (locateMarker) map.removeLayer(locateMarker);
  locateMarker = L.circleMarker(e.latlng, { radius: 8, color: "#4d8cff", fillColor: "#4d8cff", fillOpacity: 0.5 })
    .addTo(map)
    .bindPopup("You are here")
    .openPopup();
});
map.on("locationerror", e => console.warn("Locate failed:", e.message));

// Promise wrapper around browser geolocation, reused by Near Me + Smart Search "near me".
function requestUserLocation() {
  return new Promise((resolve, reject) => {
    if (userLocation) return resolve(userLocation);
    if (!navigator.geolocation) return reject(new Error("Geolocation is not supported by this browser."));
    navigator.geolocation.getCurrentPosition(
      pos => {
        userLocation = { lat: pos.coords.latitude, lon: pos.coords.longitude };
        resolve(userLocation);
      },
      err => reject(err),
      { enableHighAccuracy: true, timeout: 10000 }
    );
  });
}

// ---------- State ----------
const categoryById = Object.fromEntries(CATEGORIES.map(c => [c.id, c]));
const placesByCategory = Object.fromEntries(CATEGORIES.map(c => [c.id, []]));
// Marker/cluster layers are built lazily per category (see getOrBuildCluster) and
// cached here so switching categories back and forth never re-fetches or rebuilds.
const clusterCache = {};
let activeCategoryId = null;

// ---------- Spatial analysis state (only ever analyzes the active category) ----------
let clusterVisible = true;
let heatmapVisible = false;
let accessibilityVisible = false;
let heatLayer = null;
let accessibilityLayer = null;

function clearHeatLayer() {
  if (heatLayer) { map.removeLayer(heatLayer); heatLayer = null; }
}
function buildHeatLayer(catId) {
  clearHeatLayer();
  const points = placesByCategory[catId].map(p => [p.lat, p.lon, 0.6]);
  if (!points.length) return;
  heatLayer = L.heatLayer(points, { radius: 28, blur: 22, maxZoom: 16 }).addTo(map);
}

function clearAccessibilityLayer() {
  if (accessibilityLayer) { map.removeLayer(accessibilityLayer); accessibilityLayer = null; }
}
function buildAccessibilityLayer(catId) {
  clearAccessibilityLayer();
  const cat = categoryById[catId];
  accessibilityLayer = L.layerGroup(
    placesByCategory[catId].map(p =>
      L.circle([p.lat, p.lon], { radius: 400, color: cat.color, weight: 1, fillOpacity: 0.06 })
    )
  ).addTo(map);
}

document.getElementById("clusterToggle").addEventListener("click", e => {
  clusterVisible = !clusterVisible;
  e.currentTarget.classList.toggle("active", clusterVisible);
  if (!activeCategoryId) return;
  const { cluster } = clusterCache[activeCategoryId] || {};
  if (!cluster) return;
  if (clusterVisible) map.addLayer(cluster);
  else map.removeLayer(cluster);
});

document.getElementById("heatmapToggle").addEventListener("click", e => {
  heatmapVisible = !heatmapVisible;
  e.currentTarget.classList.toggle("active", heatmapVisible);
  if (!activeCategoryId) return;
  if (heatmapVisible) buildHeatLayer(activeCategoryId);
  else clearHeatLayer();
});

document.getElementById("accessibilityToggle").addEventListener("click", e => {
  accessibilityVisible = !accessibilityVisible;
  e.currentTarget.classList.toggle("active", accessibilityVisible);
  if (!activeCategoryId) return;
  if (accessibilityVisible) buildAccessibilityLayer(activeCategoryId);
  else clearAccessibilityLayer();
});


function makePinIcon(cat) {
  return L.divIcon({
    className: "",
    html: `<div class="custom-pin" style="background:${cat.color}"><span class="pin-icon">${cat.icon}</span></div>`,
    iconSize: [28, 28],
    iconAnchor: [14, 28],
    popupAnchor: [0, -26],
  });
}

function placeName(place, cat) {
  return place.tags && place.tags.name ? place.tags.name : `Unnamed ${cat.name}`;
}

function placeAddress(tags) {
  const parts = [
    tags["addr:housenumber"],
    tags["addr:street"] || tags["addr:place"],
    tags["addr:suburb"],
    tags["addr:city"],
  ].filter(Boolean);
  return parts.length ? parts.join(", ") : "Amravati, Maharashtra";
}

function naOr(value) {
  return value ? escapeHtml(value) : "Not available";
}

function popupHtml(place, cat) {
  const name = placeName(place, cat);
  const tags = place.tags || {};
  const dirUrl = `https://www.google.com/maps/dir/?api=1&destination=${place.lat},${place.lon}`;
  return `
    <div class="popup-title">${escapeHtml(name)}</div>
    <div class="popup-category">${cat.icon} ${escapeHtml(cat.name)}</div>
    <div class="popup-meta">📍 ${escapeHtml(placeAddress(tags))}</div>
    <div class="popup-meta">📌 ${place.lat.toFixed(5)}, ${place.lon.toFixed(5)}</div>
    <div class="popup-meta">🕒 Hours: ${naOr(tags.opening_hours)}</div>
    <div class="popup-meta">☎️ Phone: ${naOr(tags.phone || tags["contact:phone"])}</div>
    <div class="popup-meta">🌐 Website: ${naOr(tags.website || tags["contact:website"])}</div>
    <a class="popup-directions" href="${dirUrl}" target="_blank" rel="noopener">📍 Get Directions</a>
  `;
}

function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
}


// ---------- Fetch with timeout + fallback ----------
async function fetchOverpass(url) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      method: "POST",
      body: "data=" + encodeURIComponent(overpassQuery),
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      signal: controller.signal,
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } finally {
    clearTimeout(timer);
  }
}

async function loadData() {
  setStatus("loading", "Fetching live data from OpenStreetMap…");

  let data;
  try {
    data = await fetchOverpass(OVERPASS_PRIMARY);
  } catch (err) {
    console.warn("Primary Overpass endpoint failed, trying fallback:", err);
    try {
      data = await fetchOverpass(OVERPASS_FALLBACK);
    } catch (err2) {
      console.error("Fallback Overpass endpoint also failed:", err2);
      setStatus("error", "⚠ Failed to load — tap to retry");
      return;
    }
  }

  try {
    processElements(data.elements || []);
  } catch (err) {
    console.error("Failed to process Overpass data:", err);
    setStatus("error", "⚠ Failed to load — tap to retry");
    return;
  }

  const total = Object.values(placesByCategory).reduce((sum, arr) => sum + arr.length, 0);
  setStatus("success", `Loaded ${total} places from OpenStreetMap ✔`);
}

function setStatus(kind, text) {
  const el = document.getElementById("status");
  el.className = `status ${kind}`;
  el.textContent = text;

  const liveEl = document.getElementById("statLive");
  liveEl.className = `stat-pill ${kind === "success" ? "live" : kind}`;
  liveEl.textContent = kind === "success" ? "● Live" : kind === "error" ? "● Offline" : "● Loading";

  if (kind === "success") {
    const total = Object.values(placesByCategory).reduce((sum, arr) => sum + arr.length, 0);
    document.getElementById("statTotal").textContent = `Places: ${total}`;
    document.getElementById("statUpdated").textContent = `Updated: ${new Date().toLocaleTimeString()}`;
  }
}

document.getElementById("status").addEventListener("click", () => {
  const el = document.getElementById("status");
  if (el.classList.contains("error")) loadData();
});

// ---------- Process (data only — markers are built lazily per category) ----------
function processElements(elements) {
  let placeIdCounter = 0;

  elements.forEach(el => {
    const lat = el.type === "node" ? el.lat : el.center && el.center.lat;
    const lon = el.type === "node" ? el.lon : el.center && el.center.lon;
    if (lat == null || lon == null) return;

    const tags = el.tags || {};
    const catId = classifyTags(tags);
    if (!catId) return;

    placesByCategory[catId].push({ id: `p${placeIdCounter++}`, lat, lon, tags });
  });

  mergeManualPlaces();
  renderCategoryList();
}

// Adds the manually-verified places (manual-places.js) into their matching
// category so they render with the exact same pin/popup/panel/route behavior
// as every OSM-sourced place — merged after the fetch, before any markers exist.
function mergeManualPlaces() {
  Object.entries(MANUAL_PLACES).forEach(([catId, places]) => {
    if (!placesByCategory[catId]) return;
    places.forEach((p, idx) => {
      placesByCategory[catId].push({
        id: `manual-${catId}-${idx}`,
        lat: p.lat,
        lon: p.lon,
        tags: { name: p.name, manual_source: "Verified via Google Maps (2026-09-03)" },
      });
    });
  });
}

// Builds (and caches) the marker-cluster layer for a category the first time
// it's selected, so 1000+ places are never all rendered as markers at once.
function getOrBuildCluster(catId) {
  if (clusterCache[catId]) return clusterCache[catId];

  const cat = categoryById[catId];
  const cluster = L.markerClusterGroup({ showCoverageOnHover: false });
  const markersByPlaceId = {};

  placesByCategory[catId].forEach(place => {
    const marker = L.marker([place.lat, place.lon], { icon: makePinIcon(cat) });
    marker.bindPopup(popupHtml(place, cat));
    cluster.addLayer(marker);
    markersByPlaceId[place.id] = marker;
  });

  clusterCache[catId] = { cluster, markersByPlaceId };
  return clusterCache[catId];
}

// ---------- Single active-category selection ----------
function selectCategory(catId) {
  if (activeCategoryId === catId) return;

  if (activeCategoryId && clusterCache[activeCategoryId]) {
    map.removeLayer(clusterCache[activeCategoryId].cluster);
  }
  clearHeatLayer();
  clearAccessibilityLayer();

  activeCategoryId = catId;
  const { cluster } = getOrBuildCluster(catId);
  if (clusterVisible) map.addLayer(cluster);

  const bounds = cluster.getBounds();
  if (bounds.isValid()) {
    map.flyToBounds(bounds, { maxZoom: 15, padding: [40, 40], duration: 0.8 });
  }

  highlightActiveRow(catId);
  renderResultsPanel(catId);
  renderRecommendationsSection(catId);

  document.getElementById("statSelected").textContent = `Category: ${categoryById[catId].name}`;

  if (heatmapVisible) buildHeatLayer(catId);
  if (accessibilityVisible) buildAccessibilityLayer(catId);
}

function highlightActiveRow(catId) {
  document.querySelectorAll("#categoryList .category-row").forEach(row => {
    row.classList.toggle("active", row.dataset.catId === catId);
  });
}

// ---------- Sidebar: Smart City Layers (grouped categories) ----------
function buildGroupedCategories() {
  const groupedIds = new Set(CATEGORY_GROUPS.flatMap(g => g.ids));
  const otherIds = CATEGORIES.map(c => c.id).filter(id => !groupedIds.has(id));
  const groups = CATEGORY_GROUPS.map(g => ({ ...g, ids: g.ids.filter(id => categoryById[id]) }));
  if (otherIds.length) groups.push({ name: "Other", icon: "📍", ids: otherIds });
  return groups;
}

function renderCategoryList() {
  const heading = document.getElementById("categoriesHeading");
  heading.textContent = `Smart City Layers (${CATEGORIES.length})`;

  const list = document.getElementById("categoryList");
  list.innerHTML = "";

  buildGroupedCategories().forEach(group => {
    const groupEl = document.createElement("div");
    groupEl.className = "category-group";

    const header = document.createElement("div");
    header.className = "category-group-header";
    header.innerHTML = `<span class="chev">▾</span> ${group.icon} ${group.name}`;
    header.addEventListener("click", () => groupEl.classList.toggle("collapsed"));

    const body = document.createElement("div");
    body.className = "category-group-body";

    group.ids.forEach(id => {
      const cat = categoryById[id];
      const count = placesByCategory[id].length;

      const row = document.createElement("div");
      row.className = "category-row";
      row.dataset.catId = cat.id;
      row.dataset.catName = cat.name.toLowerCase();
      row.addEventListener("click", () => selectCategory(cat.id));

      const dot = document.createElement("span");
      dot.className = "dot";
      dot.style.background = cat.color;
      dot.style.color = cat.color;

      const icon = document.createElement("span");
      icon.className = "cat-icon";
      icon.textContent = cat.icon;

      const name = document.createElement("span");
      name.className = "cat-name";
      name.textContent = cat.name;

      const countEl = document.createElement("span");
      countEl.className = "cat-count";
      countEl.textContent = count;

      row.append(dot, icon, name, countEl);
      body.appendChild(row);
    });

    groupEl.append(header, body);
    list.appendChild(groupEl);
  });
}

function debounce(fn, delay) {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), delay);
  };
}

document.getElementById("searchBox").addEventListener(
  "input",
  debounce(e => {
    const query = e.target.value.trim().toLowerCase();
    document.querySelectorAll("#categoryList .category-row").forEach(row => {
      const matches = row.dataset.catName.includes(query);
      row.classList.toggle("hidden-by-search", !matches);
    });
  }, 150)
);


// ---------- Mobile sidebar drawer ----------
document.getElementById("sidebarToggle").addEventListener("click", () => {
  document.getElementById("app").classList.toggle("sidebar-open");
});
document.getElementById("sidebarScrim").addEventListener("click", () => {
  document.getElementById("app").classList.remove("sidebar-open");
});

// ---------- Results (detail) slide-in panel ----------
const detailPanel = document.getElementById("detailPanel");
const detailPanelTitle = document.getElementById("detailPanelTitle");
const detailPanelSubtitle = document.getElementById("detailPanelSubtitle");
const detailPanelList = document.getElementById("detailPanelList");
const panelSearchBox = document.getElementById("panelSearchBox");

function renderResultsPanel(catId) {
  const cat = categoryById[catId];
  const places = placesByCategory[catId];

  detailPanelTitle.textContent = `${cat.icon} ${cat.name}`;
  detailPanelSubtitle.textContent = `${places.length} Location${places.length === 1 ? "" : "s"}`;
  panelSearchBox.value = "";
  panelSearchBox.oninput = debounce(() => renderResultsList(catId, panelSearchBox.value), 150);

  renderResultsList(catId, "");
  detailPanel.classList.add("open");
  document.getElementById("app").classList.remove("sidebar-open");
}

function renderResultsList(catId, filterText) {
  const cat = categoryById[catId];
  const places = placesByCategory[catId];
  const query = filterText.trim().toLowerCase();

  const filtered = query
    ? places.filter(p => placeName(p, cat).toLowerCase().includes(query))
    : places;

  detailPanelList.innerHTML = "";

  if (filtered.length === 0) {
    detailPanelList.innerHTML = `<p class="panel-empty">No places found.</p>`;
    return;
  }

  filtered.forEach(place => detailPanelList.appendChild(buildPlaceCard(place, cat, catId)));
}

function buildPlaceCard(place, cat, catId) {
  const name = placeName(place, cat);
  const address = placeAddress(place.tags || {});
  const dirUrl = `https://www.google.com/maps/dir/?api=1&destination=${place.lat},${place.lon}`;

  const card = document.createElement("div");
  card.className = "place-card";

  const nameEl = document.createElement("div");
  nameEl.className = "place-card-name";
  nameEl.textContent = name;

  const catEl = document.createElement("div");
  catEl.className = "place-card-category";
  catEl.textContent = `${cat.icon} ${cat.name}`;

  const addrEl = document.createElement("div");
  addrEl.className = "place-card-address";
  addrEl.textContent = `📍 ${address}`;

  const actions = document.createElement("div");
  actions.className = "place-card-actions";

  const viewBtn = document.createElement("button");
  viewBtn.className = "btn btn-primary";
  viewBtn.textContent = "🔍 View on Map";
  viewBtn.addEventListener("click", () => viewOnMap(catId, place.id));

  const dirLink = document.createElement("a");
  dirLink.className = "btn btn-secondary";
  dirLink.href = dirUrl;
  dirLink.target = "_blank";
  dirLink.rel = "noopener";
  dirLink.textContent = "📍 Directions";

  const routeBtn = document.createElement("button");
  routeBtn.className = "btn btn-secondary route-btn";
  routeBtn.textContent = "+ Route";
  routeBtn.dataset.catId = catId;
  routeBtn.dataset.placeId = place.id;

  actions.append(viewBtn, dirLink, routeBtn);
  card.append(nameEl, catEl, addrEl, actions);
  return card;
}

// Single delegated listener (not one-per-button) so "+ Route" keeps working
// no matter how many times the panel's cards are rebuilt/re-rendered.
detailPanelList.addEventListener("click", e => {
  const btn = e.target.closest(".route-btn");
  if (!btn) return;
  const { catId, placeId } = btn.dataset;
  const place = (placesByCategory[catId] || []).find(p => p.id === placeId);
  if (place) addToRoute(place, categoryById[catId]);
});

function viewOnMap(catId, placeId) {
  if (activeCategoryId !== catId) selectCategory(catId);

  const entry = clusterCache[catId];
  const marker = entry && entry.markersByPlaceId[placeId];
  if (!marker) return;

  entry.cluster.zoomToShowLayer(marker, () => {
    marker.openPopup();
    setTimeout(() => pulseMarker(marker), 250);
  });
}

function pulseMarker(marker) {
  const el = marker.getElement();
  const pin = el && el.querySelector(".custom-pin");
  if (!pin) return;
  pin.classList.add("marker-pulse");
  setTimeout(() => pin.classList.remove("marker-pulse"), 1600);
}

function closeDetailPanel() {
  detailPanel.classList.remove("open");
}

document.getElementById("detailPanelClose").addEventListener("click", closeDetailPanel);

// ---------- GeoAI Recommendations ----------
function renderRecommendationsSection(catId) {
  const section = document.getElementById("recommendationsSection");
  section.innerHTML = "";

  const { cluster } = clusterCache[catId];
  const bounds = cluster.getBounds();
  if (!bounds.isValid()) return;
  const origin = { lat: bounds.getCenter().lat, lon: bounds.getCenter().lng };

  const recs = getRecommendations(catId, origin, placesByCategory, 6);
  if (!recs.length) return;

  const heading = document.createElement("h4");
  heading.textContent = "✨ Smart Recommendations Nearby";
  section.appendChild(heading);

  recs.forEach(rec => {
    const recCat = categoryById[rec._catId];
    const card = document.createElement("div");
    card.className = "rec-card";

    const dirUrl = `https://www.google.com/maps/dir/?api=1&destination=${rec.lat},${rec.lon}`;
    card.innerHTML = `
      <div class="rec-card-top">
        <span class="rec-card-name">${escapeHtml(placeName(rec, recCat))}</span>
        <span class="rec-card-distance">${formatDistanceKm(rec._distanceKm)}</span>
      </div>
      <div class="rec-card-category">${recCat.icon} ${escapeHtml(recCat.name)}</div>
      <div class="rec-card-actions">
        <button class="btn btn-primary rec-view">🔍 View on Map</button>
        <a class="btn btn-secondary" href="${dirUrl}" target="_blank" rel="noopener">📍 Directions</a>
      </div>
    `;
    card.querySelector(".rec-view").addEventListener("click", () => viewOnMap(rec._catId, rec.id));
    section.appendChild(card);
  });
}

// ---------- Smart Route (multi-stop directions, no API key required) ----------
const routeStops = [];
const MAX_ROUTE_STOPS = 5;

function addToRoute(place, cat) {
  if (routeStops.some(s => s.place.id === place.id)) return;
  if (routeStops.length >= MAX_ROUTE_STOPS) return;
  routeStops.push({ place, cat });
  renderRouteBar();
}

function renderRouteBar() {
  const bar = document.getElementById("routeBar");
  if (!routeStops.length) {
    bar.classList.remove("visible");
    bar.innerHTML = "";
    return;
  }
  bar.classList.add("visible");
  bar.innerHTML = `
    <span>🧭 Route: ${routeStops.map(s => s.cat.icon).join(" → ")} (${routeStops.length})</span>
    <span>
      <button id="routeClearBtn" class="btn btn-secondary">Clear</button>
      <button id="routeGoBtn" class="btn btn-primary">Get Route</button>
    </span>
  `;
  document.getElementById("routeClearBtn").addEventListener("click", () => {
    routeStops.length = 0;
    renderRouteBar();
  });
  document.getElementById("routeGoBtn").addEventListener("click", () => {
    const points = routeStops.map(s => `${s.place.lat},${s.place.lon}`);
    const destination = points[points.length - 1];
    const waypoints = points.slice(0, -1);
    let url = `https://www.google.com/maps/dir/?api=1&destination=${destination}`;
    if (userLocation) url += `&origin=${userLocation.lat},${userLocation.lon}`;
    if (waypoints.length) url += `&waypoints=${waypoints.join("|")}`;
    window.open(url, "_blank", "noopener");
  });
}

// ---------- Analytics dashboard ----------
let analyticsCharts = [];
document.getElementById("analyticsBtn").addEventListener("click", () => {
  renderAnalytics();
  document.getElementById("analyticsModal").classList.add("open");
});
document.getElementById("analyticsClose").addEventListener("click", () => {
  document.getElementById("analyticsModal").classList.remove("open");
});
document.querySelector("#analyticsModal .modal-backdrop").addEventListener("click", () => {
  document.getElementById("analyticsModal").classList.remove("open");
});

function renderAnalytics() {
  analyticsCharts.forEach(c => c.destroy());
  analyticsCharts = [];

  const total = Object.values(placesByCategory).reduce((sum, arr) => sum + arr.length, 0);
  const sorted = CATEGORIES.map(c => ({ cat: c, count: placesByCategory[c.id].length }))
    .sort((a, b) => b.count - a.count);
  const top = sorted.slice(0, 10);

  const body = document.getElementById("analyticsBody");
  body.innerHTML = `
    <div class="analytics-summary">
      <div class="analytics-stat-card"><div class="value">${total}</div><div class="label">Total mapped places</div></div>
      <div class="analytics-stat-card"><div class="value">${CATEGORIES.length}</div><div class="label">Total categories</div></div>
      <div class="analytics-stat-card"><div class="value">${activeCategoryId ? placesByCategory[activeCategoryId].length : "—"}</div><div class="label">Selected category count</div></div>
      <div class="analytics-stat-card"><div class="value">${sorted[0].cat.name}</div><div class="label">Largest category</div></div>
    </div>
    <div class="analytics-charts">
      <canvas id="analyticsBarChart" height="220"></canvas>
      <canvas id="analyticsDonutChart" height="220"></canvas>
    </div>
    <p class="analytics-footnote">
      Data source: OpenStreetMap (crowd-sourced — not a guaranteed complete real-world census).<br />
      Last updated: ${new Date().toLocaleString()}
    </p>
  `;

  if (typeof Chart === "undefined") return; // Chart.js failed to load (e.g. offline) — summary cards above still work.

  const labels = top.map(t => t.cat.name);
  const counts = top.map(t => t.count);
  const colors = top.map(t => t.cat.color);

  analyticsCharts.push(new Chart(document.getElementById("analyticsBarChart"), {
    type: "bar",
    data: { labels, datasets: [{ label: "Places", data: counts, backgroundColor: colors }] },
    options: {
      plugins: { legend: { display: false }, title: { display: true, text: "Top Categories by Count", color: "#cdd5e6" } },
      scales: {
        x: { ticks: { color: "#9aa4b8", maxRotation: 60, minRotation: 40 }, grid: { display: false } },
        y: { ticks: { color: "#9aa4b8" }, grid: { color: "rgba(255,255,255,0.06)" } },
      },
    },
  }));

  analyticsCharts.push(new Chart(document.getElementById("analyticsDonutChart"), {
    type: "doughnut",
    data: { labels, datasets: [{ data: counts, backgroundColor: colors }] },
    options: {
      plugins: {
        legend: { position: "bottom", labels: { color: "#cdd5e6", boxWidth: 10, font: { size: 10 } } },
        title: { display: true, text: "Category Share", color: "#cdd5e6" },
      },
    },
  }));
}

// ---------- Near Me ----------
document.getElementById("nearMeBtn").addEventListener("click", async () => {
  const panel = document.getElementById("nearMePanel");
  panel.classList.add("open");
  document.getElementById("nearMeList").innerHTML = `<p class="near-me-empty">Locating you…</p>`;
  try {
    const loc = await requestUserLocation();
    map.setView([loc.lat, loc.lon], 15);
    renderNearMe(loc, "all");
  } catch (err) {
    document.getElementById("nearMeList").innerHTML =
      `<p class="near-me-empty">📍 Location permission is required to show what's nearby. Please allow location access and try again.</p>`;
    console.warn("Near Me geolocation failed:", err);
  }
});
document.getElementById("nearMeClose").addEventListener("click", () => {
  document.getElementById("nearMePanel").classList.remove("open");
});

function renderNearMe(origin, filterCatId) {
  const RADIUS_KM = 5;
  let allNearby = [];
  CATEGORIES.forEach(cat => {
    placesWithinRadius(placesByCategory[cat.id], origin, RADIUS_KM).forEach(p => {
      allNearby.push({ ...p, _catId: cat.id });
    });
  });
  allNearby.sort((a, b) => a._distanceKm - b._distanceKm);

  const presentCatIds = [...new Set(allNearby.map(p => p._catId))].slice(0, 6);
  const filters = document.getElementById("nearMeFilters");
  filters.innerHTML = "";
  const allChip = document.createElement("button");
  allChip.className = `chip ${filterCatId === "all" ? "active" : ""}`;
  allChip.textContent = "All";
  allChip.addEventListener("click", () => renderNearMe(origin, "all"));
  filters.appendChild(allChip);
  presentCatIds.forEach(id => {
    const cat = categoryById[id];
    const chip = document.createElement("button");
    chip.className = `chip ${filterCatId === id ? "active" : ""}`;
    chip.textContent = `${cat.icon} ${cat.name}`;
    chip.addEventListener("click", () => renderNearMe(origin, id));
    filters.appendChild(chip);
  });

  const list = document.getElementById("nearMeList");
  const filtered = (filterCatId === "all" ? allNearby : allNearby.filter(p => p._catId === filterCatId)).slice(0, 25);
  list.innerHTML = "";
  if (!filtered.length) {
    list.innerHTML = `<p class="near-me-empty">No mapped places found within ${RADIUS_KM} km.</p>`;
    return;
  }
  filtered.forEach(p => {
    const cat = categoryById[p._catId];
    const item = document.createElement("div");
    item.className = "near-me-item";
    item.innerHTML = `
      <span class="nm-name">${cat.icon} ${escapeHtml(placeName(p, cat))}</span>
      <span class="nm-meta">${formatDistanceKm(p._distanceKm)}</span>
    `;
    item.addEventListener("click", () => viewOnMap(p._catId, p.id));
    list.appendChild(item);
  });
}

// ---------- AI Smart Search (rule-based NLP fallback, see nlp.js) ----------
const aiSearchBox = document.getElementById("aiSearchBox");
const aiSearchHint = document.getElementById("aiSearchHint");

aiSearchBox.addEventListener("keydown", e => {
  if (e.key === "Enter") runSmartSearch(aiSearchBox.value);
});

async function runSmartSearch(rawText) {
  const text = rawText.trim();
  if (!text) return;

  const parsed = parseSmartQuery(text);
  if (!parsed.categoryId) {
    aiSearchHint.textContent = "Couldn't identify a category — try \"ATMs near me\" or \"hospitals within 2 km\".";
    return;
  }

  selectCategory(parsed.categoryId);
  const radiusKm = parsed.radiusKm || 3;

  if (parsed.near === "me") {
    try {
      const loc = await requestUserLocation();
      applySearchFilter(parsed.categoryId, loc, radiusKm, "your location");
    } catch (err) {
      aiSearchHint.textContent = "Location permission is required for \"near me\" searches.";
    }
  } else if (parsed.near) {
    const anchorCat = categoryById[parsed.near];
    const anchorPlace = nearestPlace(placesByCategory[parsed.near], mapCenterAsOrigin());
    if (anchorPlace) {
      applySearchFilter(parsed.categoryId, anchorPlace, radiusKm, anchorCat.name.toLowerCase());
    } else {
      aiSearchHint.textContent = `No mapped ${anchorCat.name.toLowerCase()} found to anchor the search.`;
    }
  } else if (parsed.radiusKm) {
    // A radius was given without an explicit "near me"/anchor — filter around the map's current view.
    applySearchFilter(parsed.categoryId, mapCenterAsOrigin(), radiusKm, "the current map view");
  } else {
    aiSearchHint.textContent = `Showing all ${categoryById[parsed.categoryId].name}.`;
  }
}

function mapCenterAsOrigin() {
  const c = map.getCenter();
  return { lat: c.lat, lon: c.lng };
}

// Rebuilds the active category's marker layer restricted to places within
// radiusKm of origin, and updates the results panel to match.
function applySearchFilter(catId, origin, radiusKm, originLabel) {
  const cat = categoryById[catId];
  const filtered = placesWithinRadius(placesByCategory[catId], origin, radiusKm);

  if (clusterCache[catId]) map.removeLayer(clusterCache[catId].cluster);
  const cluster = L.markerClusterGroup({ showCoverageOnHover: false });
  const markersByPlaceId = {};
  filtered.forEach(place => {
    const marker = L.marker([place.lat, place.lon], { icon: makePinIcon(cat) });
    marker.bindPopup(popupHtml(place, cat));
    cluster.addLayer(marker);
    markersByPlaceId[place.id] = marker;
  });
  clusterCache[catId] = { cluster, markersByPlaceId };
  if (clusterVisible) map.addLayer(cluster);

  const bounds = cluster.getBounds();
  if (bounds.isValid()) map.flyToBounds(bounds, { maxZoom: 15, padding: [40, 40], duration: 0.8 });

  aiSearchHint.textContent = `Showing ${filtered.length} ${cat.name} within ${radiusKm} km of ${originLabel}.`;

  detailPanelTitle.textContent = `${cat.icon} ${cat.name}`;
  detailPanelSubtitle.textContent = `${filtered.length} within ${radiusKm} km of ${originLabel}`;
  detailPanelList.innerHTML = "";
  if (!filtered.length) {
    detailPanelList.innerHTML = `<p class="panel-empty">No places found.</p>`;
  } else {
    filtered.forEach(place => detailPanelList.appendChild(buildPlaceCard(place, cat, catId)));
  }
  detailPanel.classList.add("open");
}

// ---------- AI Map Assistant ("Ask Amravati360") ----------
const assistantPanel = document.getElementById("assistantPanel");
const ASSISTANT_WELCOME_TEXT =
  "Hi! I'm Ask Amravati360. Ask me anything about places, locations, distances or spatial information in Amravati.";

document.getElementById("assistantToggle").addEventListener("click", () => {
  assistantPanel.classList.toggle("open");
});
document.getElementById("assistantClose").addEventListener("click", () => {
  assistantPanel.classList.remove("open");
});
document.getElementById("assistantClear").addEventListener("click", resetAssistantChat);

function resetAssistantChat() {
  document.getElementById("assistantMessages").innerHTML = "";
  document.getElementById("assistantInput").value = "";
  appendChatBubble(ASSISTANT_WELCOME_TEXT, "bot");
}

function appendChatBubble(text, who, actionCatId) {
  const messages = document.getElementById("assistantMessages");
  const bubble = document.createElement("div");
  bubble.className = `chat-bubble ${who}`;
  bubble.textContent = text;
  if (actionCatId) {
    const btn = document.createElement("button");
    btn.className = "btn btn-primary";
    btn.textContent = "🔍 Show on Map";
    btn.addEventListener("click", () => selectCategory(actionCatId));
    bubble.appendChild(document.createElement("br"));
    bubble.appendChild(btn);
  }
  messages.appendChild(bubble);
  messages.scrollTop = messages.scrollHeight;
}

resetAssistantChat();

document.getElementById("assistantForm").addEventListener("submit", e => {
  e.preventDefault();
  const input = document.getElementById("assistantInput");
  const text = input.value.trim();
  if (!text) return;
  appendChatBubble(text, "user");
  input.value = "";

  const total = Object.values(placesByCategory).reduce((sum, arr) => sum + arr.length, 0);
  const answer = answerAssistantQuery(text, { placesByCategory, categoryById, totalPlaces: total });
  appendChatBubble(answer.text, "bot", answer.categoryId);

  if (answer.categoryId && (answer.near || answer.radiusKm)) {
    selectCategory(answer.categoryId);
  }
});

// ---------- Mobile bottom nav ----------
document.querySelectorAll(".mobile-bottom-nav button").forEach(btn => {
  btn.addEventListener("click", () => {
    const action = btn.dataset.action;
    if (action === "categories") document.getElementById("app").classList.toggle("sidebar-open");
    else if (action === "nearme") document.getElementById("nearMeBtn").click();
    else if (action === "ai") assistantPanel.classList.toggle("open");
  });
});

// ---------- Boot ----------
loadData();


