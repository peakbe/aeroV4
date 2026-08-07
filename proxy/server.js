import express from "express";
import fetch from "node-fetch";

const app = express();
const PORT = process.env.PORT || 3000;

/****************************************************
 * CORS
 ****************************************************/
app.use((req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Headers", "*");
  next();
});

/****************************************************
 * Cache backend (anti rate-limit)
 ****************************************************/
const cache = new Map();
const CACHE_MS = 5000;

function getCache(key) {
  const entry = cache.get(key);
  if (!entry) return null;
  if (Date.now() - entry.ts > CACHE_MS) return null;
  return entry.data;
}

function setCache(key, data) {
  cache.set(key, { ts: Date.now(), data });
}

/****************************************************
 * Helper : fetch JSON ou détecter HTML
 ****************************************************/
async function safeFetchJson(url) {
  const r = await fetch(url);
  const text = await r.text();

  // Airplanes.live / OpenSky / AirLabs renvoient parfois du HTML → erreur
  if (text.startsWith("<")) {
    return { error: "HTML_RESPONSE", raw: text };
  }

  try {
    return JSON.parse(text);
  } catch {
    return { error: "INVALID_JSON", raw: text };
  }
}

/****************************************************
 * FALLBACK 1 — OpenSky
 ****************************************************/
async function fetchOpenSky(lat, lon, dist) {
  const d = dist * 1852; // NM → mètres
  const latMin = lat - (dist / 60);
  const latMax = lat + (dist / 60);
  const lonMin = lon - (dist / 60);
  const lonMax = lon + (dist / 60);

  const url = `https://opensky-network.org/api/states/all?bbox=${latMin},${lonMin},${latMax},${lonMax}`;
  const data = await safeFetchJson(url);

  if (data.error) return null;
  if (!data.states) return null;

  return data.states.map(s => ({
    icao: s[0],
    callsign: s[1],
    lat: s[6],
    lon: s[5],
    altFt: s[13] || 0,
    gsKt: (s[9] || 0) * 1.94384,
    track: s[10] || 0,
    time: s[3]
  }));
}

/****************************************************
 * FALLBACK 2 — AirLabs
 ****************************************************/
async function fetchAirLabs() {
  const key = process.env.AIRLABS_KEY;
  if (!key) return null;

  const url = `https://airlabs.co/api/v9/flights?api_key=${key}`;
  const data = await safeFetchJson(url);

  if (data.error) return null;
  if (!data.response) return null;

  return data.response.map(f => ({
    icao: f.hex,
    callsign: f.flight_icao || f.flight_iata,
    airline: f.airline_icao || f.airline_iata,
    origin: f.dep_iata,
    destination: f.arr_iata
  }));
}

/****************************************************
 * ENDPOINT PRINCIPAL — Airplanes.live + fallbacks
 ****************************************************/
app.get("/airplanes", async (req, res) => {
  const { lat, lon, dist } = req.query;

  if (!lat || !lon || !dist) {
    return res.status(400).json({ error: "Missing lat/lon/dist" });
  }

  const cacheKey = `${lat}_${lon}_${dist}`;
  const cached = getCache(cacheKey);
  if (cached) return res.json(cached);

  /****************************************************
   * 1 — Airplanes.live (source principale)
   ****************************************************/
  const urlAL = `https://api.airplanes.live/v2/lat/${lat}/lon/${lon}/dist/${dist}`;
  const dataAL = await safeFetchJson(urlAL);

  if (!dataAL.error && dataAL.ac) {
    setCache(cacheKey, dataAL);
    return res.json(dataAL);
  }

  console.log("Airplanes.live DOWN → fallback OpenSky");

  /****************************************************
   * 2 — OpenSky fallback
   ****************************************************/
  const dataOS = await fetchOpenSky(Number(lat), Number(lon), Number(dist));

  if (dataOS && dataOS.length > 0) {
    const payload = { ac: dataOS, source: "opensky" };
    setCache(cacheKey, payload);
    return res.json(payload);
  }

  console.log("OpenSky DOWN → fallback AirLabs");

  /****************************************************
   * 3 — AirLabs fallback
   ****************************************************/
  const dataALabs = await fetchAirLabs();

  if (dataALabs && dataALabs.length > 0) {
    const payload = { ac: dataALabs, source: "airlabs" };
    setCache(cacheKey, payload);
    return res.json(payload);
  }

  /****************************************************
   * 4 — Tout est DOWN → réponse propre
   ****************************************************/
  return res.status(502).json({
    error: "ALL_SOURCES_DOWN",
    details: "Airplanes.live, OpenSky and AirLabs returned invalid data",
    rawAirplanesLive: dataAL.raw || null
  });
});

/****************************************************
 * START SERVER
 ****************************************************/
app.listen(PORT, () => {
  console.log(`Cockpit IFR PRO+++ proxy running on port ${PORT}`);
});
