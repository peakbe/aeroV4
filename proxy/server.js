/****************************************************
 * PROXY RENDER — Airplanes.live → OpenSky → AirLabs
 * Version PRO+++ robuste, avionique, anti-HTML
 ****************************************************/

import express from "express";
import fetch from "node-fetch";

const app = express();
const PORT = process.env.PORT || 3000;

/****************************************************
 * CORS global (toutes réponses, même erreurs)
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
 * Helper : détecter HTML
 ****************************************************/
function isHtml(text) {
  return text.trim().startsWith("<");
}

/****************************************************
 * FALLBACK 1 — OpenSky
 ****************************************************/
async function fetchOpenSky(lat, lon, distNm) {
  const delta = distNm / 60; // approx deg
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
   * 1️⃣ Airplanes.live (source principale)
   ****************************************************/
  const urlAL = `https://api.airplanes.live/v2/lat/${lat}/lon/${lon}/dist/${dist}`;

  try {
    const r = await fetch(urlAL);
    const text = await r.text();

    if (!isHtml(text)) {
      const json = JSON.parse(text);
      setCache(cacheKey, json);
      return res.json(json);
    }

    console.log("Airplanes.live DOWN → fallback OpenSky");

  } catch (err) {
    console.log("Airplanes.live unreachable → fallback OpenSky");
  }

  /****************************************************
   * 2️⃣ Fallback OpenSky
   ****************************************************/
  const opensky = await fetchOpenSky(Number(lat), Number(lon), Number(dist));

  if (opensky.length > 0) {
    const payload = { source: "opensky", ac: opensky };
    setCache(cacheKey, payload);
    return res.json(payload);
  }

  console.log("OpenSky DOWN → fallback AirLabs");

  /****************************************************
   * 3️⃣ Fallback AirLabs
   ****************************************************/
  const airlabs = await fetchAirLabs();

  if (airlabs.length > 0) {
    const payload = { source: "airlabs", ac: airlabs };
    setCache(cacheKey, payload);
    return res.json(payload);
  }

  /****************************************************
   * 4️⃣ Tout DOWN → réponse JSON propre
   ****************************************************/
  return res.status(502).json({
    error: "ALL_SOURCES_DOWN",
    details: "Airplanes.live returned HTML, OpenSky empty, AirLabs empty"
  });
});

/****************************************************
 * START SERVER
 ****************************************************/
app.listen(PORT, () => {
  console.log(`Proxy ADS-B PRO+++ running on port ${PORT}`);
});
