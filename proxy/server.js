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

  // CORS sur toutes les réponses
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Headers", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET");

  if (!lat || !lon || !dist) {
    return res.status(400).json({ error: "Missing lat/lon/dist" });
  }

  const url = `https://api.airplanes.live/v2/lat/${lat}/lon/${lon}/dist/${dist}`;

  try {
    const r = await fetch(url);
    const text = await r.text();

    // Airplanes.live renvoie du HTML → fallback
    if (text.startsWith("<")) {
      console.log("Airplanes.live DOWN → fallback OpenSky");

      const opensky = await fetchOpenSky(Number(lat), Number(lon), Number(dist));
      if (opensky?.length > 0) {
        return res.json({ source: "opensky", ac: opensky });
      }

      console.log("OpenSky DOWN → fallback AirLabs");

      const airlabs = await fetchAirLabs();
      if (airlabs?.length > 0) {
        return res.json({ source: "airlabs", ac: airlabs });
      }

      return res.status(502).json({
        error: "ALL_SOURCES_DOWN",
        details: "Airplanes.live returned HTML, OpenSky empty, AirLabs empty"
      });
    }

    // Airplanes.live OK → JSON
    res.setHeader("Content-Type", "application/json");
    return res.send(text);

  } catch (err) {
    return res.status(500).json({
      error: "Proxy error",
      details: err.toString()
    });
  }
});


/****************************************************
 * START SERVER
 ****************************************************/
app.listen(PORT, () => {
  console.log(`Cockpit IFR PRO+++ proxy running on port ${PORT}`);
});
