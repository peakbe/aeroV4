/****************************************************
 * Proxy ADSBexchange — PRO+++ (Render)
 * - Anti-CORS
 * - Anti-spam
 * - Cache intelligent
 * - Logs IFR
 ****************************************************/

import express from "express";
import fetch from "node-fetch";
import cors from "cors";

const app = express();
const PORT = process.env.PORT || 3000;

// Autoriser ton cockpit IFR
app.use(cors({
  origin: [
    "https://peakbe.github.io",   // ton cockpit IFR
    "http://localhost:3000"       // dev local
  ]
}));

// Cache simple (30 sec)
const cache = new Map();

function cacheKey(url) {
  return url;
}

async function fetchWithCache(url) {
  const key = cacheKey(url);
  const now = Date.now();

  if (cache.has(key)) {
    const entry = cache.get(key);
    if (now - entry.time < 30000) {
      console.log("[CACHE] HIT", url);
      return entry.data;
    }
  }

  console.log("[CACHE] MISS", url);
  const r = await fetch(url);
  const data = await r.json();

  cache.set(key, { time: now, data });
  return data;
}

/****************************************************
 * Endpoint proxy ADSBexchange
 ****************************************************/
app.get("/adsb", async (req, res) => {
  try {
    const { lat, lon, dist } = req.query;

    if (!lat || !lon || !dist) {
      return res.status(400).json({ error: "Missing parameters" });
    }

    const ADSB_KEY = process.env.ADSB_KEY; // clé API Render

    const url =
      `https://adsbexchange.com/api/aircraft/json/lat/${lat}/lon/${lon}/dist/${dist}?api_key=${ADSB_KEY}`;

    const data = await fetchWithCache(url);

    res.json(data);

  } catch (e) {
    console.error("Proxy ADSB error:", e);
    res.status(500).json({ error: "Proxy error", details: e.toString() });
  }
});

/****************************************************
 * Démarrage serveur
 ****************************************************/
app.listen(PORT, () => {
  console.log(`Proxy ADSBexchange running on port ${PORT}`);
});
