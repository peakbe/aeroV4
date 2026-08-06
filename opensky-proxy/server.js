import express from "express";
import fetch from "node-fetch";
import cors from "cors";

const app = express();
app.use(cors());

const USER = "peak";
const PASS = "u7Q.CjCQSAS.zE";

app.get("/opensky", async (req, res) => {
  const { lat, lon, dist } = req.query;

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
    res.json(data);
  } catch (err) {
    res.json({ error: "opensky_failed", details: err.toString() });
  }
});

app.listen(3000, () => console.log("OpenSky proxy running on port 3000"));
