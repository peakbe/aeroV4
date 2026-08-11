/****************************************************
 * PROXY ADS-B PRO+++ ULTRA (mise à jour)
 * Features: headers navigateur, timeouts allongés, clamp dist, debug, cache adaptatif
 ****************************************************/

import express from "express";
import fetch from "node-fetch";

const app = express();
const PORT = process.env.PORT || 3000;

/* ---------- Configuration ---------- */
const NODE_ENV = process.env.NODE_ENV || "production";
const DEBUG = process.env.DEBUG === "true" || NODE_ENV === "development";
const AIRLABS_KEY = process.env.AIRLABS_KEY || null;

const CACHE_LOCAL_MS = Number(process.env.CACHE_LOCAL_MS) || 30 * 1000; // 30s
const CACHE_GLOBAL_MS = Number(process.env.CACHE_GLOBAL_MS) || 5 * 60 * 1000; // 5min for global fallbacks
const MAX_DIST_NM = Number(process.env.MAX_DIST_NM) || 60; // clamp dist to 60 NM
const RETRIES = Number(process.env.RETRIES) || 3;
const RETRY_BASE_MS = Number(process.env.RETRY_BASE_MS) || 300;
const TIMEOUT_SHORT_MS = Number(process.env.TIMEOUT_SHORT_MS) || 8000;
const TIMEOUT_LONG_MS = Number(process.env.TIMEOUT_LONG_MS) || 12000;
const WATCHDOG_INTERVAL_MS = Number(process.env.WATCHDOG_INTERVAL_MS) || 0; // 0 = disabled

/* ---------- Headers to mimic a browser ---------- */
const DEFAULT_HEADERS = {
  "User-Agent": "Mozilla/5.0 (compatible; cockpit-ifr-proxy/1.0; +https://your.domain/)",
  "Accept": "application/json, text/plain, */*"
};

/* ---------- Logger ---------- */
function logIFR(level, msg) {
  const ts = new Date().toISOString();
  console.log(`[${ts}] [${level}] ${msg}`);
}
function debugLog(msg) {
  if (DEBUG) logIFR("DEBUG", msg);
}

/* ---------- CORS ---------- */
app.use((req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Headers", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET");
  next();
});

/* ---------- Cache ---------- */
const cache = new Map();
function getCache(key) {
  const e = cache.get(key);
  if (!e) return null;
  if (Date.now() - e.ts > e.ttl) {
    cache.delete(key);
    return null;
  }
  return e.data;
}
function setCache(key, data, ttl = CACHE_LOCAL_MS) {
  cache.set(key, { ts: Date.now(), ttl, data });
}

/* ---------- Helpers ---------- */
function isHtml(text) {
  return typeof text === "string" && text.trim().startsWith("<");
}
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}
async function fetchWithTimeout(url, opts = {}, timeoutMs = TIMEOUT_LONG_MS) {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, { ...opts, headers: { ...DEFAULT_HEADERS, ...(opts.headers || {}) }, signal: controller.signal });
    clearTimeout(id);
    return res;
  } catch (err) {
    clearTimeout(id);
    throw err;
  }
}
async function retry(fn, attempts = RETRIES, baseMs = RETRY_BASE_MS) {
  let lastErr;
  for (let i = 0; i < attempts; i++) {
    try {
      return await fn();
    } catch (err) {
      lastErr = err;
      const backoff = baseMs * Math.pow(2, i);
      debugLog(`Retry ${i + 1}/${attempts} after ${backoff}ms due to ${err.message || err}`);
      await sleep(backoff);
    }
  }
  throw lastErr;
}

/* ---------- Source fetchers ---------- */

/* Airplanes.live local */
async function fetchAirplanesLive(lat, lon, dist) {
  const url = `https://api.airplanes.live/v2/lat/${lat}/lon/${lon}/dist/${dist}`;
  return await retry(async () => {
    const r = await fetchWithTimeout(url, {}, TIMEOUT_LONG_MS);
    const text = await r.text();
    const ct = r.headers.get("content-type") || "";
    debugLog(`Airplanes.live status=${r.status} ct=${ct} len=${text.length}`);
    if (ct.includes("text/html") || isHtml(text)) {
      debugLog(`Airplanes.live snippet: ${text.slice(0, 300)}`);
      throw new Error("Airplanes.live returned HTML");
    }
    return JSON.parse(text);
  });
}

/* OpenSky bbox */
async function fetchOpenSky(lat, lon, dist) {
  const delta = Number(dist) / 60;
  const bbox = [lat - delta, lon - delta, lat + delta, lon + delta].join(",");
  const url = `https://opensky-network.org/api/states/all?bbox=${bbox}`;
  return await retry(async () => {
    const r = await fetchWithTimeout(url, {}, TIMEOUT_LONG_MS);
    const ct = r.headers.get("content-type") || "";
    debugLog(`OpenSky bbox status=${r.status} ct=${ct}`);
    const data = await r.json();
    if (!data || !data.states) return [];
    return data.states
      .filter(s => s[6] && s[5])
      .map(s => ({
        icao: s[0],
        callsign: s[1] || "n/a",
        lat: s[6],
        lon: s[5],
        altFt: s[13] || 0,
        gsKt: (s[9] || 0) * 1.94384,
        track: s[10] || 0,
        time: s[3],
        source: "opensky"
      }));
  }, RETRIES, RETRY_BASE_MS);
}

/* AirLabs (global/local) */
async function fetchAirLabs() {
  if (!AIRLABS_KEY) return [];
  const url = `https://airlabs.co/api/v9/flights?api_key=${AIRLABS_KEY}`;
  return await retry(async () => {
    const r = await fetchWithTimeout(url, {}, TIMEOUT_LONG_MS);
    const ct = r.headers.get("content-type") || "";
    debugLog(`AirLabs status=${r.status} ct=${ct}`);
    const data = await r.json();
    if (!data || !data.response) return [];
    return data.response.map(f => ({
      icao: f.hex,
      callsign: f.flight_icao || f.flight_iata || "n/a",
      airline: f.airline_icao || f.airline_iata || "n/a",
      origin: f.dep_iata || "n/a",
      destination: f.arr_iata || "n/a",
      status: f.status || "n/a",
      source: "airlabs"
    }));
  });
}

/* FR24 bbox */
async function fetchFR24(lat, lon, dist) {
  const delta = Number(dist) / 60;
  const bounds = [lat - delta, lon - delta, lat + delta, lon + delta].join(",");
  const url = `https://data-live.flightradar24.com/zones/fcgi/feed.json?bounds=${bounds}&faa=1&satellite=1&mlat=1&flarm=1&adsb=1&gnd=1&air=1`;
  return await retry(async () => {
    const r = await fetchWithTimeout(url, {}, TIMEOUT_LONG_MS);
    const text = await r.text();
    const ct = r.headers.get("content-type") || "";
    debugLog(`FR24 bbox status=${r.status} ct=${ct} len=${text.length}`);
    if (ct.includes("text/html") || isHtml(text)) {
      debugLog(`FR24 bbox snippet: ${text.slice(0, 300)}`);
      throw new Error("FR24 returned HTML");
    }
    const data = JSON.parse(text);
    return Object.entries(data)
      .filter(([k]) => k !== "full_count" && k !== "version")
      .map(([icao, arr]) => ({
        icao,
        lat: arr[1],
        lon: arr[2],
        altFt: arr[4],
        gsKt: arr[5],
        track: arr[3],
        callsign: arr[16] || "n/a",
        source: "fr24"
      }));
  });
}

/* Global fallbacks */
async function fetchOpenSkyGlobal() {
  const url = `https://opensky-network.org/api/states/all`;
  return await retry(async () => {
    const r = await fetchWithTimeout(url, {}, TIMEOUT_LONG_MS);
    const data = await r.json();
    if (!data || !data.states) return [];
    return data.states.slice(0, 500).map(s => ({
      icao: s[0],
      callsign: s[1] || "n/a",
      lat: s[6],
      lon: s[5],
      altFt: s[13] || 0,
      gsKt: (s[9] || 0) * 1.94384,
      track: s[10] || 0,
      time: s[3],
      source: "opensky_global"
    }));
  });
}
async function fetchFR24Global() {
  const url = `https://data-live.flightradar24.com/zones/fcgi/feed.json?faa=1&satellite=1&mlat=1&flarm=1&adsb=1&gnd=1&air=1`;
  return await retry(async () => {
    const r = await fetchWithTimeout(url, {}, TIMEOUT_LONG_MS);
    const text = await r.text();
    const ct = r.headers.get("content-type") || "";
    debugLog(`FR24 global status=${r.status} ct=${ct} len=${text.length}`);
    if (ct.includes("text/html") || isHtml(text)) {
      debugLog(`FR24 global snippet: ${text.slice(0, 300)}`);
      throw new Error("FR24 global returned HTML");
    }
    const data = JSON.parse(text);
    return Object.entries(data)
      .filter(([k]) => k !== "full_count" && k !== "version")
      .slice(0, 1000)
      .map(([icao, arr]) => ({
        icao,
        lat: arr[1],
        lon: arr[2],
        altFt: arr[4],
        gsKt: arr[5],
        track: arr[3],
        callsign: arr[16] || "n/a",
        source: "fr24_global"
      }));
  });
}

/* ---------- Endpoint /airplanes ---------- */
app.get("/airplanes", async (req, res) => {
  const { lat, lon, dist } = req.query;
  if (!lat || !lon || !dist) {
    logIFR("WARN", "Missing lat/lon/dist");
    return res.status(400).json({ error: "Missing lat/lon/dist" });
  }

  // clamp dist to avoid huge bbox
  const distNm = Math.max(1, Math.min(Number(dist), MAX_DIST_NM));
  if (Number(dist) !== distNm) {
    debugLog(`Clamped dist ${dist} -> ${distNm}`);
  }

  const key = `${lat}_${lon}_${distNm}`;
  const cached = getCache(key);
  if (cached) {
    logIFR("INFO", `Cache hit ${key}`);
    return res.json(cached);
  }

  // 1) Airplanes.live local
  try {
    const al = await fetchAirplanesLive(lat, lon, distNm);
    if (al && (Array.isArray(al.ac) ? al.ac.length > 0 : Object.keys(al).length > 0)) {
      setCache(key, al, CACHE_LOCAL_MS);
      logIFR("INFO", "Airplanes.live OK");
      return res.json(al);
    }
    logIFR("WARN", "Airplanes.live returned no usable JSON → fallback");
  } catch (err) {
    logIFR("WARN", `Airplanes.live error: ${err.message || err}`);
  }

  // 2) OpenSky bbox
  try {
    const os = await fetchOpenSky(lat, lon, distNm);
    if (os && os.length > 0) {
      const payload = { source: "opensky", ac: os };
      setCache(key, payload, CACHE_LOCAL_MS);
      logIFR("INFO", "OpenSky bbox OK");
      return res.json(payload);
    }
    logIFR("WARN", "OpenSky bbox empty → fallback");
  } catch (err) {
    logIFR("WARN", `OpenSky bbox error: ${err.message || err}`);
  }

  // 3) AirLabs local
  try {
    const alabs = await fetchAirLabs();
    if (alabs && alabs.length > 0) {
      const payload = { source: "airlabs", ac: alabs };
      setCache(key, payload, CACHE_LOCAL_MS);
      logIFR("INFO", "AirLabs OK");
      return res.json(payload);
    }
    logIFR("WARN", "AirLabs local empty → fallback");
  } catch (err) {
    logIFR("WARN", `AirLabs error: ${err.message || err}`);
  }

  // 4) FR24 bbox
  try {
    const fr = await fetchFR24(lat, lon, distNm);
    if (fr && fr.length > 0) {
      const payload = { source: "fr24", ac: fr };
      setCache(key, payload, CACHE_LOCAL_MS);
      logIFR("INFO", "FR24 bbox OK");
      return res.json(payload);
    }
    logIFR("WARN", "FR24 bbox empty → fallback global");
  } catch (err) {
    logIFR("WARN", `FR24 bbox error: ${err.message || err}`);
  }

  // 5) Global fallbacks with longer cache
  try {
    const osg = await fetchOpenSkyGlobal();
    if (osg && osg.length > 0) {
      const payload = { source: "opensky_global", ac: osg.slice(0, 200) };
      setCache(key, payload, CACHE_GLOBAL_MS);
      logIFR("INFO", "OpenSky global OK");
      return res.json(payload);
    }
  } catch (err) {
    logIFR("WARN", `OpenSky global error: ${err.message || err}`);
  }

  try {
    const alabsGlobal = await fetchAirLabs();
    if (alabsGlobal && alabsGlobal.length > 0) {
      const payload = { source: "airlabs_global", ac: alabsGlobal.slice(0, 200) };
      setCache(key, payload, CACHE_GLOBAL_MS);
      logIFR("INFO", "AirLabs global OK");
      return res.json(payload);
    }
  } catch (err) {
    logIFR("WARN", `AirLabs global error: ${err.message || err}`);
  }

  try {
    const frg = await fetchFR24Global();
    if (frg && frg.length > 0) {
      const payload = { source: "fr24_global", ac: frg.slice(0, 500) };
      setCache(key, payload, CACHE_GLOBAL_MS);
      logIFR("INFO", "FR24 global OK");
      return res.json(payload);
    }
  } catch (err) {
    logIFR("WARN", `FR24 global error: ${err.message || err}`);
  }

  logIFR("ERROR", "ALL_SOURCES_DOWN");
  return res.status(502).json({
    error: "ALL_SOURCES_DOWN",
    details: "Airplanes.live returned no usable JSON, OpenSky/FR24/AirLabs empty or unreachable"
  });
});

/* ---------- Health and metrics ---------- */
app.get("/health", (req, res) => res.json({ status: "ok", env: NODE_ENV }));
app.get("/metrics", (req, res) => {
  res.json({
    cacheSize: cache.size,
    cacheLocalMs: CACHE_LOCAL_MS,
    cacheGlobalMs: CACHE_GLOBAL_MS,
    retries: RETRIES,
    nodeEnv: NODE_ENV,
    debug: DEBUG
  });
});

/* ---------- Watchdog optional ---------- */
const watchedZones = new Set(); // fill if desired, format "lat_lon_dist"
async function watchdogTick() {
  for (const key of watchedZones) {
    try {
      const [lat, lon, dist] = key.split("_");
      await fetchWithTimeout(`http://127.0.0.1:${PORT}/airplanes?lat=${lat}&lon=${lon}&dist=${dist}`, {}, 5000);
    } catch (e) {
      // ignore
    }
  }
}
let watchdogInterval = null;
if (WATCHDOG_INTERVAL_MS > 0) {
  watchdogInterval = setInterval(watchdogTick, WATCHDOG_INTERVAL_MS);
}

/* ---------- Graceful shutdown ---------- */
function shutdown() {
  logIFR("INFO", "Shutting down gracefully");
  if (watchdogInterval) clearInterval(watchdogInterval);
  server.close(() => {
    logIFR("INFO", "Server closed");
    process.exit(0);
  });
  setTimeout(() => {
    logIFR("ERROR", "Force shutdown");
    process.exit(1);
  }, 10000);
}
process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);

/* ---------- Start ---------- */
const server = app.listen(PORT, () => {
  logIFR("INFO", `Proxy ADS-B PRO+++ ULTRA running on port ${PORT}`);
  debugLog(`Config: MAX_DIST_NM=${MAX_DIST_NM} CACHE_LOCAL_MS=${CACHE_LOCAL_MS} CACHE_GLOBAL_MS=${CACHE_GLOBAL_MS} DEBUG=${DEBUG}`);
});
