import express from "express";
import fetch from "node-fetch";

const app = express();
const PORT = 3001;

app.get("/opensky", async (req, res) => {
  try {
    const url = `https://opensky-network.org/api/states/all?${req.url.split("?")[1]}`;
    const r = await fetch(url);
    const data = await r.json();
    res.json(data);
  } catch (e) {
    res.status(500).json({ error: "Proxy error", details: e.toString() });
  }
});

app.listen(PORT, () => {
  console.log(`OpenSky proxy running on port ${PORT}`);
});
