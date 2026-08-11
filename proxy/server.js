/****************************************************
 * PROXY ADS-B PRO+++ — Airplanes.live → OpenSky → AirLabs → FR24
 * Version cockpit IFR : logs structurés, timestamps UTC, cache intelligent
 ****************************************************/

import express from "express";
import fetch from "node-fetch";

const app = express();
const PORT = process.env.PORT || 3000;

/****************************************************
 * LOG IFR — format avionique
 ****************************************************/
function logIFR(level, msg) {
  const ts = new Date().toISOString();
  console.log(`[${ts}] [${level}] ${msg}`);
}

/****************************************************
 * CORS global
 ****************************************************/
app.use((req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Headers", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET");
  next();
});

/****************************************************
 * Cache backend (anti surcharge)
 ****************************************************/
const cache = new Map();
const CACHE_MS = 30000; // 30 sec PRO+++

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
 * Helper : détecter HTML
 ****************************************************/
function isHtml(text) {
  return text.trim().startsWith("<");
}

/****************************************************
 * FALLBACK 1 — OpenSky
 ****************************************************/
async function fetchOpenSky(lat, lon, distNm) {
  const delta = distNm / 60;
  const bbox = [
    lat - delta,
    lon - delta,
    lat + delta,
    lon + delta
  ].join(",");

  const url = `https://opensky-network.org/api/states/all?bbox=${bbox}`;

  try {
    const r = await fetch(url);
    const data = await r.json();

    if (!data.states) return [];

    return data.states
      .filter(s => s[6] && s[5])
      .map(s => ({
        icao: s[0],
        callsign: s[1] || "n/a",
        lat: s[6],
        lon: s[5],
        altFt: s[13] || 0,
        gsKt: (s[9] || 0) * 1.94384,
        track: s[10] || 0,
        time: s[3],
        source: "opensky"
      }));

  } catch {
    return [];
  }
}

/****************************************************
 * FALLBACK 2 — AirLabs
 ****************************************************/
async function fetchAirLabs() {
  const key = process.env.AIRLABS_KEY;
  if (!key) return [];

  const url = `https://airlabs.co/api/v9/flights?api_key=${key}`;

  try {
    const r = await fetch(url);
    const data = await r.json();

    if (!data.response) return [];

    return data.response.map(f => ({
      icao: f.hex,
      callsign: f.flight_icao || f.flight_iata || "n/a",
      airline: f.airline_icao || f.airline_iata || "n/a",
      origin: f.dep_iata || "n/a",
      destination: f.arr_iata || "n/a",
      status: f.status || "n/a",
      source: "airlabs"
    }));

  } catch {
    return [];
  }
}

/****************************************************
 * FALLBACK 3 — FlightRadar24 (non officiel)
 ****************************************************/
async function fetchFR24(lat, lon, distNm) {
  const delta = distNm / 60;
  const bounds = [
    lat - delta,
    lon - delta,
    lat + delta,
    lon + delta
  ].join(",");

  const url = `https://data-live.flightradar24.com/zones/fcgi/feed.json?bounds=${bounds}&faa=1&satellite=1&mlat=1&flarm=1&adsb=1&gnd=1&air=1`;

  try {
    const r = await fetch(url);
    const data = await r.json();

    const ac = Object.entries(data)
      .filter(([key]) => key !== "full_count" && key !== "version")
      .map(([icao, arr]) => ({
        icao,
        lat: arr[1],
        lon: arr[2],
        altFt: arr[4],
        gsKt: arr[5],
        track: arr[3],
        callsign: arr[16] || "n/a",
        source: "fr24"
      }));

    return ac;

  } catch {
    return [];
  }
}

/****************************************************
 * ENDPOINT PRINCIPAL — Airplanes.live + fallbacks
 ****************************************************/
app.get("/airplanes", async (req, res) => {
  const { lat, lon, dist } = req.query;

  if (!lat || !lon || !dist) {
    logIFR("WARN", "Missing lat/lon/dist");
    return res.status(400).json({ error: "Missing lat/lon/dist" });
  }

  const cacheKey = `${lat}_${lon}_${dist}`;
  const cached = getCache(cacheKey);
  if (cached) {
    logIFR("INFO", "Cache hit");
    return res.json(cached);
  }

  /****************************************************
   * 1️⃣ Airplanes.live
   ****************************************************/
  const urlAL = `https://api.airplanes.live/v2/lat/${lat}/lon/${lon}/dist/${dist}`;

  try {
    const r = await fetch(urlAL);
    const text = await r.text();

    if (!isHtml(text)) {
      const json = JSON.parse(text);
      setCache(cacheKey, json);
      logIFR("INFO", "Airplanes.live OK");
      return res.json(json);
    }

    logIFR("WARN", "Airplanes.live returned HTML → fallback OpenSky");

  } catch {
    logIFR("ERROR", "Airplanes.live unreachable → fallback OpenSky");
  }

  /****************************************************
   * 2️⃣ OpenSky
   ****************************************************/
  const opensky = await fetchOpenSky(Number(lat), Number(lon), Number(dist));

  if (opensky.length > 0) {
    const payload = { source: "opensky", ac: opensky };
    setCache(cacheKey, payload);
    logIFR("INFO", "OpenSky OK");
    return res.json(payload);
  }

  logIFR("WARN", "OpenSky empty → fallback AirLabs");

  /****************************************************
   * 3️⃣ AirLabs
   ****************************************************/
  const airlabs = await fetchAirLabs();

  if (airlabs.length > 0) {
    const payload = { source: "airlabs", ac: airlabs };
    setCache(cacheKey, payload);
    logIFR("INFO", "AirLabs OK");
    return res.json(payload);
  }

  logIFR("WARN", "AirLabs empty → fallback FR24");

  /****************************************************
   * 4️⃣ FlightRadar24 (non officiel)
   ****************************************************/
  const fr24 = await fetchFR24(Number(lat), Number(lon), Number(dist));

  if (fr24.length > 0) {
    const payload = { source: "fr24", ac: fr24 };
    setCache(cacheKey, payload);
    logIFR("INFO", "FR24 OK");
    return res.json(payload);
  }

  /****************************************************
   * 5️⃣ Tout DOWN
   ****************************************************/
  logIFR("ERROR", "ALL SOURCES DOWN");
  return res.status(502).json({
    error: "ALL_SOURCES_DOWN",
    details: "Airplanes.live returned HTML, OpenSky empty, AirLabs empty, FR24 empty"
  });
});

/****************************************************
 * START SERVER
 ****************************************************/
app.listen(PORT, () => {
  logIFR("INFO", `Proxy ADS-B PRO+++ running on port ${PORT}`);
});
