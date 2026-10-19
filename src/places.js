const nominatim = "https://nominatim.openstreetmap.org/search";
const osrm = "https://router.project-osrm.org/route/v1/driving";

const headers = {
  Accept: "application/json",
  "User-Agent": "RideWorth/0.1 (Karachi ride-offer demo)",
};

export function mapQueries(said, hinted) {
  const queries = [];
  const add = (value) => {
    const text = String(value ?? "").replace(/\s+/g, " ").trim();
    if (!text) return;
    if (queries.some((item) => item.toLowerCase() === text.toLowerCase())) return;
    queries.push(text);
  };
  add(hinted);
  add(spellForMap(said));
  add(said);
  return queries;
}

export function spellForMap(value) {
  return String(value ?? "")
    .replace(/\bchorangi\b/gi, "Chowrangi")
    .replace(/\bchwrangi\b/gi, "Chowrangi")
    .replace(/\bjaill\b/gi, "Jail");
}

function inKarachi(hit) {
  const lat = Number(hit.lat);
  const lon = Number(hit.lon);
  return lat >= 24.75 && lat <= 25.65 && lon >= 66.55 && lon <= 67.65;
}

async function searchOnce(query) {
  const url = new URL(nominatim);
  url.searchParams.set("q", `${query}, Karachi, Pakistan`);
  url.searchParams.set("format", "jsonv2");
  url.searchParams.set("limit", "3");
  url.searchParams.set("countrycodes", "pk");
  url.searchParams.set("viewbox", "66.6,25.6,67.6,24.75");

  const response = await fetch(url, { headers, signal: AbortSignal.timeout(15000) });
  if (!response.ok) throw new Error(`Place search failed (${response.status}).`);
  const results = await response.json();
  const hit = results.find(inKarachi);
  if (!hit) return null;
  return {
    label: hit.display_name,
    lat: Number(hit.lat),
    lon: Number(hit.lon),
    query,
  };
}

export async function geocode(said, hinted) {
  const queries = mapQueries(said, hinted);
  for (const query of queries) {
    const found = await searchOnce(query);
    if (found) return found;
  }
  return null;
}

export async function drive(from, to) {
  const url = `${osrm}/${from.lon},${from.lat};${to.lon},${to.lat}?overview=full&geometries=geojson`;
  const response = await fetch(url, { headers, signal: AbortSignal.timeout(15000) });
  if (!response.ok) throw new Error(`Route lookup failed (${response.status}).`);
  const payload = await response.json();
  const route = payload.routes?.[0];
  if (!route) return null;
  return {
    km: route.distance / 1000,
    minutes: route.duration / 60,
    geometry: route.geometry,
  };
}
