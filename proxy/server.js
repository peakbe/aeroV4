/****************************************************
 * PROXY AIRPLANES.LIVE — Render — Cockpit IFR PRO+++
 ****************************************************/
import express from "express";
import fetch from "node-fetch";

const app = express();
const PORT = process.env.PORT || 3000;

/****************************************************
 * Cache simple (anti rate-limit Airplanes.live)
 ****************************************************/
let cache = {};
const CACHE_DURATION = 5000; // 5 sec

async function cachedFetch(url) {
  const now = Date.now();

  if (cache[url] && now - cache[url].timestamp < CACHE_DURATION) {
    return cache[url].data;
  }

  const res = await fetch(url);
  const text = await res.text();

  cache[url] = {
    timestamp: now,
    data: text
  };

  return text;
}

/****************************************************
 * CORS GLOBAL
 ****************************************************/
app.use((req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Headers", "*");
  next();
});

/****************************************************
 * ENDPOINT AIRPLANES.LIVE
 ****************************************************/
app.get("/airplanes", async (req, res) => {
  const { lat, lon, dist } = req.query;

  if (!lat || !lon || !dist) {
    return res.status(400).json({ error: "Missing lat/lon/dist" });
  }

  const url = `https://api.airplanes.live/v2/lat/${lat}/lon/${lon}/dist/${dist}`;

  try {
    const data = await cachedFetch(url);
    res.setHeader("Content-Type", "application/json");
    res.send(data);
  } catch (err) {
    res.status(500).json({ error: "Airplanes.live error", details: err.toString() });
  }
});

/****************************************************
 * ENDPOINT OPENSKY (optionnel)
 ****************************************************/
app.get("/opensky", async (req, res) => {
  const { bbox } = req.query;
  if (!bbox) return res.status(400).json({ error: "Missing bbox" });

  const url = `https://opensky-network.org/api/states/all?bbox=${bbox}`;

  try {
    const data = await cachedFetch(url);
    res.setHeader("Content-Type", "application/json");
    res.send(data);
  } catch (err) {
    res.status(500).json({ error: "OpenSky error", details: err.toString() });
  }
});

/****************************************************
 * ENDPOINT AIRLABS (optionnel)
 ****************************************************/
app.get("/airlabs", async (req, res) => {
  const { icao } = req.query;
  if (!icao) return res.status(400).json({ error: "Missing ICAO" });

  const url = `https://airlabs.co/api/v9/metar?station=${icao}&api_key=${process.env.AIRLABS_KEY}`;

  try {
    const data = await cachedFetch(url);
    res.setHeader("Content-Type", "application/json");
    res.send(data);
  } catch (err) {
    res.status(500).json({ error: "AirLabs error", details: err.toString() });
  }
});

/****************************************************
 * SERVER START
 ****************************************************/
app.listen(PORT, () => {
  console.log(`Cockpit IFR PRO+++ proxy running on port ${PORT}`);
});

