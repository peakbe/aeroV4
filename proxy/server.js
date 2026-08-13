import express from "express";
import fetch from "node-fetch";

const app = express();

app.get("/opensky", async (req, res) => {
  const { lamin, lomin, lamax, lomax } = req.query;

  const url = `https://opensky-network.org/api/states/all?lamin=${lamin}&lomin=${lomin}&lamax=${lamax}&lomax=${lomax}`;

  try {
    const r = await fetch(url);
    const data = await r.json();

    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Headers", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET");

    res.json(data);
  } catch (e) {
    res.status(500).json({ error: "OpenSky error", details: e.toString() });
  }
});

app.listen(3000, () => {
  console.log("Proxy OpenSky Render PRO+++ running on port 3000");
});
