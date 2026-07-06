import express from "express";
import fetch from "node-fetch";

const app = express();
const PORT = 3001;

// ⭐ Ta clé AirLabs (sécurisée côté serveur)
const API_KEY = "04cb1c09-8abb-468a-95fa-ee90c3c2b651";

/****************************************************
 * Proxy METAR
 ****************************************************/
app.get("/metar", async (req, res) => {
  const icao = req.query.icao;
  const url = `https://airlabs.co/api/v9/metar?icao=${icao}&api_key=${API_KEY}`;

  try {
    const r = await fetch(url);
    const j = await r.json();
    res.json(j);
  } catch (e) {
    res.status(500).json({ error: "Proxy METAR error", details: e.toString() });
  }
});

/****************************************************
 * Proxy TAF
 ****************************************************/
app.get("/taf", async (req, res) => {
  const icao = req.query.icao;
  const url = `https://airlabs.co/api/v9/taf?icao=${icao}&api_key=${API_KEY}`;

  try {
    const r = await fetch(url);
    const j = await r.json();
    res.json(j);
  } catch (e) {
    res.status(500).json({ error: "Proxy TAF error", details: e.toString() });
  }
});

app.listen(PORT, () => {
  console.log(`Proxy AirLabs opérationnel sur http://localhost:${PORT}`);
});
