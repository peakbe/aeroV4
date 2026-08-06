import express from "express";
import fetch from "node-fetch";
import cors from "cors";

// -----------------------------
// CALCUL RUNWAY + VENT (Airbus)
// -----------------------------
function computeRunwayWind(runway, windDir, windSpeed) {
  const runwayHeading = runway * 10; // ex: RWY 24 → 240°
  const angle = Math.abs(runwayHeading - windDir);

  const headwind = Math.round(windSpeed * Math.cos(angle * Math.PI / 180));
  const crosswind = Math.round(windSpeed * Math.sin(angle * Math.PI / 180));

  return {
    runway: runway.toString(),
    wind_dir: windDir,
    wind_speed: windSpeed,
    headwind,
    crosswind,
    angle
  };
}

const app = express();
app.use(cors());

const USER = "peak";
const PASS = "u7Q.CjCQSAS.zE";

// Cache en mémoire
let cacheData = null;
let cacheTime = 0;
const CACHE_DURATION = 5000; // 5 secondes

app.get("/opensky", async (req, res) => {
  const now = Date.now();

  // Si cache encore valide → renvoyer immédiatement
  if (cacheData && (now - cacheTime < CACHE_DURATION)) {
    return res.json(cacheData);
  }

  const url = `https://opensky-network.org/api/states/all`;

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 3000);

    const r = await fetch(url, {
      signal: controller.signal,
      headers: {
        Authorization: "Basic " + Buffer.from(`${USER}:${PASS}`).toString("base64")
      }
    });

    clearTimeout(timeout);

    const data = await r.json();

    // Mise à jour du cache
    cacheData = data;
    cacheTime = now;

    res.json(data);

  } catch (err) {
    res.json({ error: "opensky_failed", details: err.toString() });
  }
});

app.listen(3000, () => console.log("OpenSky proxy running on port 3000"));
