/****************************************************
 * FIDS — Pipeline Airplanes.live (proxy Render) + AirLabs PRO+++
 ****************************************************/

import { airports, AIRLABS_API_KEY } from "./config.js";
import { distanceNm } from "./utils.js";
import { updateNdAirbus } from "./nd-airbus.js";
import { showOptimizedAdsbTrajectory, pushHistory, drawWindOnNd } from "./adsb-trajectory.js";
import { fetchMetar } from "./metar.js";
import { computeWindComponents } from "./wind-components.js";

/****************************************************
 * Filtre global FIDS
 ****************************************************/
export let fidsFilter = "ALL";

export function setFidsFilter(filter) {
  if (["EBCI", "EBLG", "ALL"].includes(filter)) {
    fidsFilter = filter;
  }
}

/****************************************************
 * Format HH:MM cockpit IFR
 ****************************************************/
function formatTime(ts) {
  try {
    const d = new Date(ts * 1000); // Airplanes.live = epoch seconds
    return d.toTimeString().slice(0, 5);
  } catch {
    return "--:--";
  }
}

/****************************************************
 * Classification ARR / DEP / ENR — Airbus ECAM
 ****************************************************/
function classifyArrivalDeparture(track, lat, lon, airportKey) {
  const ap = airports[airportKey];
  const rw = ap.activeRunway || ap.runways[0];

  const dist = distanceNm(lat, lon, ap.lat, ap.lon);
  if (dist > 80) return "ENR";

  const heading = rw.heading;
  const diff = Math.abs(((track - heading + 180) % 360) - 180);
  const anti = Math.abs(((track - ((heading + 180) % 360) + 180) % 360) - 180);

  if (dist <= 40 && diff < 35) return "ARR";
  if (dist <= 40 && anti < 35) return "DEP";

  return "ENR";
}

/****************************************************
 * Cache local FIDS (anti surcharge proxy)
 ****************************************************/
const fidsCache = new Map();
const FIDS_CACHE_MS = 5000; // 5 s

function getCachedFids(key) {
  const entry = fidsCache.get(key);
  if (!entry) return null;
  if (Date.now() - entry.ts > FIDS_CACHE_MS) return null;
  return entry.data;
}

function setCachedFids(key, data) {
  fidsCache.set(key, { ts: Date.now(), data });
}

/****************************************************
 * FIDS — Fetch via PROXY Render (Airplanes.live)
 ****************************************************/
async function fetchFids(lat, lon, dist) {
  const cacheKey = `${lat}_${lon}_${dist}`;
  const cached = getCachedFids(cacheKey);
  if (cached) return cached;

  try {
    const url = `https://aerov4-proxy.onrender.com/airplanes?lat=${lat}&lon=${lon}&dist=${dist}`;
    const response = await fetch(url);

    if (!response.ok) {
      throw new Error("Proxy Render error: " + response.status);
    }

    const data = await response.json();
    setCachedFids(cacheKey, data);
    return data;

  } catch (err) {
    console.error("FIDS ADS-B error:", err);
    return [];
  }
}

/****************************************************
 * Fetch AirLabs
 ****************************************************/
async function fetchAirLabs(ap) {
  const url = `https://airlabs.co/api/v9/flights?api_key=${AIRLABS_API_KEY}`;

  try {
    const r = await fetch(url);
    const data = await r.json();

    if (!data.response) return [];

    return data.response.map(f => ({
      icao: f.hex,
      callsign: f.flight_iata || f.flight_icao || "n/a",
      airline: f.airline_iata || f.airline_icao || "n/a",
      origin: f.dep_iata || "n/a",
      destination: f.arr_iata || "n/a",
      status: f.status || "n/a"
    }));
  } catch (err) {
    console.error("AirLabs error:", err);
    return [];
  }
}

// PATCH 1 — Ajouter normalizeSource
function normalizeSource(payload) {
  if (!payload) return [];

  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload.ac)) return payload.ac;
  if (Array.isArray(payload.states)) return payload.states;

  if (typeof payload === "object") {
    const arrs = Object.values(payload).filter(v => Array.isArray(v));
    if (arrs.length > 0) return arrs.flat();
  }

  return [];
}

// Filtrer les avions invalides
function sanitizeAircraft(list) {
  return list.filter(a =>
    a &&
    typeof a.lat === "number" &&
    typeof a.lon === "number" &&
    !isNaN(a.lat) &&
    !isNaN(a.lon)
  );
}


/****************************************************
 * Fusion Airplanes.live + AirLabs — robuste
 ****************************************************/
function mergeSources(aliveList, airlabsList) {

  aliveList = normalizeSource(aliveList);
  airlabsList = normalizeSource(airlabsList);
  aliveList = sanitizeAircraft(normalizeSource(aliveList));

  const map = new Map();

  aliveList.forEach(a => {
    if (!a || isNaN(a.lat) || isNaN(a.lon)) return;

    map.set(a.icao, {
      icao: a.icao,
      lat: a.lat,
      lon: a.lon,
      altFt: a.alt_baro || a.altFt || 0,
      gsMs: a.gs || a.gsMs || 0,
      gsKt: a.gs ? a.gs * 1.94384 : (a.gsKt || 0),
      track: a.track || 0,
      time: a.time || a.last_contact || 0,
      callsign: a.callsign || "n/a",
      airline: "n/a",
      origin: "n/a",
      destination: "n/a",
      statusAirLabs: null
    });
  });

  airlabsList.forEach(f => {
    if (!f || !f.icao) return;
    if (!map.has(f.icao)) return;

    const a = map.get(f.icao);
    a.airline = f.airline || a.airline;
    a.origin = f.origin || a.origin;
    a.destination = f.destination || a.destination;
    a.statusAirLabs = f.status || a.statusAirLabs;
  });

  return [...map.values()];
}

/****************************************************
 * Pipeline principal
 ****************************************************/
export async function fetchAroundAirport(airportKey) {
  const ap = airports[airportKey];

  let aliveRaw = await fetchFids(ap.lat, ap.lon, ap.radius || 120);
let alive = normalizeSource(aliveRaw);

  const airlabs = await fetchAirLabs(ap);

  return mergeSources(alive, airlabs);
}

/****************************************************
 * FIDS Airbus ECAM — Statut CSS
 ****************************************************/
function statusClass(status) {
  return {
    ARR: "fids-status-arr",
    DEP: "fids-status-dep",
    ENR: "fids-status-enr"
  }[status] || "";
}

/****************************************************
 * FIDS Airbus ECAM — Mise à jour
 ****************************************************/
export async function updateFidsFlights(airportKey) {

  if (fidsFilter !== "ALL" && fidsFilter !== airportKey) return;

  const arrTbody = document.getElementById(
    airportKey === "EBCI" ? "fids-arr-ebci" : "fids-arr-eblg"
  );
  const depTbody = document.getElementById(
    airportKey === "EBCI" ? "fids-dep-ebci" : "fids-dep-eblg"
  );

  if (!arrTbody || !depTbody) return;

  arrTbody.innerHTML = "<tr><td colspan='10'>Loading flights...</td></tr>";
  depTbody.innerHTML = "<tr><td colspan='10'>Loading flights...</td></tr>";

  const ap = airports[airportKey];
  const aircraft = await fetchAroundAirport(airportKey);

  arrTbody.innerHTML = "";
  depTbody.innerHTML = "";

  const arrivals = [];
  const departures = [];

  aircraft.forEach(a => {
    if (!a.lat || !a.lon) return;

    const distNm = distanceNm(a.lat, a.lon, ap.lat, ap.lon);
    const status = classifyArrivalDeparture(a.track, a.lat, a.lon, airportKey);

    pushHistory(a.icao, a.lat, a.lon, a.gsKt, a.altFt, a.track);

    const row = {
      icao: a.icao,
      time: formatTime(a.time),
      callsign: a.callsign,
      airline: a.airline || "n/a",
      origin: a.origin || "n/a",
      destination: a.destination || "n/a",
      distNm: distNm.toFixed(1),
      altFt: Number(a.altFt).toFixed(0),
      gsMs: a.gsMs.toFixed(1),
      gsKt: Number(a.gsKt).toFixed(0),
      track: Number(a.track).toFixed(0),
      lat: a.lat,
      lon: a.lon,
      status
    };

    if (status === "ARR") arrivals.push(row);
    else if (status === "DEP") departures.push(row);
  });

  /****************************************************
   * Mise à jour ND Airbus (trajectoires + future path)
   ****************************************************/
  updateNdAirbus(aircraft);

  /****************************************************
   * ARRIVALS
   ****************************************************/
  arrivals.sort((a, b) => parseFloat(a.distNm) - parseFloat(b.distNm));

  arrivals.forEach(f => {
    const tr = document.createElement("tr");
    tr.className = "fids-row";

    tr.innerHTML = `
      <td>${f.time}</td>
      <td>${f.callsign}</td>
      <td>${f.airline}</td>
      <td>${f.origin}</td>
      <td>${f.distNm}</td>
      <td>${f.altFt}</td>
      <td>${f.gsKt}</td>
      <td>${f.gsMs}</td>
      <td>${f.track}</td>
      <td class="${statusClass(f.status)}">${f.status}</td>
    `;

    tr.addEventListener("click", () => {
      document.querySelectorAll(".fids-row").forEach(r => r.classList.remove("fids-selected"));
      tr.classList.add("fids-selected");

      airports[airportKey].aircraft = {
        lat: f.lat,
        lon: f.lon,
        altFt: Number(f.altFt),
        hdg: Number(f.track),
        gs: Number(f.gsKt)
      };

      showOptimizedAdsbTrajectory(f.icao);
      updateNdAirbus([f]);
    });

    arrTbody.appendChild(tr);
  });

  /****************************************************
   * DEPARTURES
   ****************************************************/
  departures.sort((a, b) => parseFloat(a.distNm) - parseFloat(b.distNm));

  departures.forEach(f => {
    const tr = document.createElement("tr");
    tr.className = "fids-row";

    tr.innerHTML = `
      <td>${f.time}</td>
      <td>${f.callsign}</td>
      <td>${f.airline}</td>
      <td>${f.origin}</td>
      <td>${f.distNm}</td>
      <td>${f.altFt}</td>
      <td>${f.gsKt}</td>
      <td>${f.gsMs}</td>
      <td>${f.track}</td>
      <td class="${statusClass(f.status)}">${f.status}</td>
    `;

    tr.addEventListener("click", () => {
      document.querySelectorAll(".fids-row").forEach(r => r.classList.remove("fids-selected"));
      tr.classList.add("fids-selected");

      airports[airportKey].aircraft = {
        lat: f.lat,
        lon: f.lon,
        altFt: Number(f.altFt),
        hdg: Number(f.track),
        gs: Number(f.gsKt)
      };

      showOptimizedAdsbTrajectory(f.icao);
      updateNdAirbus([f]);
    });

    depTbody.appendChild(tr);
  });

  if (arrivals.length === 0) {
    arrTbody.innerHTML = "<tr><td colspan='10'>No arrivals</td></tr>";
  }
  if (departures.length === 0) {
    depTbody.innerHTML = "<tr><td colspan='10'>No departures</td></tr>";
  }
}

/****************************************************
 * RUNWAY + WIND
 ****************************************************/
export async function updateRunwayPanel(airportKey) {
  const ap = airports[airportKey];
  const runway = ap.activeRunway;

  const metar = await fetchMetar(airportKey);
  if (!metar || !runway) return;

  drawWindOnNd(airportKey, metar);

  const runwayHeading = runway.heading;
  const windDir = metar.wind_dir === "VRB" ? null : Number(metar.wind_dir);
  const windSpeed = Number(metar.wind_speed || 0);

  const { headwind, crosswind, angle } =
    computeWindComponents(runwayHeading, windDir, windSpeed);

  const el = document.getElementById(
    airportKey === "EBCI" ? "runway-ebci" : "runway-eblg"
  );
  if (!el) return;

  el.innerHTML = `
    RUNWAY ${runway.name}<br>
    WIND ${metar.wind_dir}° / ${metar.wind_speed} kt<br>
    HEADWIND ${headwind} kt<br>
    CROSSWIND ${crosswind} kt<br>
    ANGLE ${angle}°
  `;
}

/****************************************************
 * LIVE MODE
 ****************************************************/
export function startFidsLive() {
  updateRunwayPanel("EBCI");
  updateRunwayPanel("EBLG");

  updateFidsFlights("EBCI");
  updateFidsFlights("EBLG");

  setInterval(() => {
    updateRunwayPanel("EBCI");
    updateRunwayPanel("EBLG");

    updateFidsFlights("EBCI");
    updateFidsFlights("EBLG");
  }, 30000);
}

