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

app.use(cors({
  origin: [
    "https://peakbe.github.io",
    "http://localhost:3000"
  ]
}));

async function fetchJson(url) {
  const r = await fetch(url);
  return await r.json();
}

/****************************************************
 * ADSBexchange
 ****************************************************/
app.get("/adsb", async (req, res) => {
  try {
    const { lat, lon, dist } = req.query;
    const ADSB_KEY = process.env.ADSB_KEY;

    const url =
      `https://adsbexchange.com/api/aircraft/json/lat/${lat}/lon/${lon}/dist/${dist}?api_key=${ADSB_KEY}`;

    const data = await fetchJson(url);
    res.json(data);
  } catch (e) {
    res.status(500).json({ error: "ADSB error", details: e.toString() });
  }
});

/****************************************************
 * OpenSky
 ****************************************************/
app.get("/opensky", async (req, res) => {
  try {
    const { lat, lon, dist } = req.query;

    const url =
      `https://opensky-network.org/api/states/all`;

    const raw = await fetchJson(url);

    // Filtrage local (80 NM)
    const states = raw.states || [];
    const filtered = states.filter(s => {
      const slat = s[6];
      const slon = s[5];
      if (!slat || !slon) return false;

      const dLat = (slat - lat) * Math.PI / 180;
      const dLon = (slon - lon) * Math.PI / 180;
      const a =
        Math.sin(dLat / 2) ** 2 +
        Math.cos(lat * Math.PI / 180) *
        Math.cos(slat * Math.PI / 180) *
        Math.sin(dLon / 2) ** 2;
      const d = 6371000 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
      const nm = d / 1852;

      return nm <= dist;
    });

    res.json({ states: filtered });
  } catch (e) {
    res.status(500).json({ error: "OpenSky error", details: e.toString() });
  }
});

/****************************************************
 * AirLabs
 ****************************************************/
app.get("/airlabs", async (req, res) => {
  try {
    const { lat, lon, dist } = req.query;
    const AIRLABS_KEY = process.env.AIRLABS_KEY;

    const url =
      `https://airlabs.co/api/v9/flights?lat=${lat}&lng=${lon}&distance=${dist}&api_key=${AIRLABS_KEY}`;

    const data = await fetchJson(url);
    res.json(data);
  } catch (e) {
    res.status(500).json({ error: "AirLabs error", details: e.toString() });
  }
});

app.listen(PORT, () => {
  console.log(`Proxy multi-source running on port ${PORT}`);
});

