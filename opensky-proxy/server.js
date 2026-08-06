import express from "express";
import fetch from "node-fetch";
import cors from "cors";

const app = express();
app.use(cors()); // autorise toutes les origines (GitHub Pages, etc.)

// OpenSky API URL
const URL = "https://opensky-network.org/api/states/all";

// Proxy route
app.get("/states", async (req, res) => {
  try {
    const r = await fetch(URL);
    const data = await r.json();

    // CORS permissif pour ton cockpit IFR
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Headers", "*");

    res.json(data);
  } catch (err) {
    res.json({ error: "opensky_failed", details: err.toString() });
  }
});

// Port Render
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log("OpenSky Proxy running on port " + PORT));
