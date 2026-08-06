import express from "express";
import fetch from "node-fetch";
import cors from "cors";

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
