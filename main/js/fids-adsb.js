/****************************************************
 * FIDS — Multi‑source PRO+++ (ADSB + OpenSky + AirLabs)
 * EBCI / EBLG — temps réel, trajectoires, filtres
 ****************************************************/

import { airports } from "./config.js";
import { updateNdAirbus } from "./nd-airbus.js";
import { showOptimizedAdsbTrajectory } from "./adsb-trajectory.js";

/****************************************************
 * Historique trajectoires ADSB (par ICAO)
 ****************************************************/
window.adsbHistory = window.adsbHistory || {};

function pushHistory(icao, lat, lon) {
  if (!icao || lat == null || lon == null) return;
  const key = String(icao);
  if (!window.adsbHistory[key]) window.adsbHistory[key] = [];
  const arr = window.adsbHistory[key];
  arr.push({ lat, lng: lon });
  if (arr.length > 80) arr.shift();
}

/****************************************************
 * Format HH:MM cockpit IFR
 ****************************************************/
function formatTime(ts) {
  if (!ts) return "--:--";
  const d = new Date(ts * 1000);
  return d.toTimeString().slice(0, 5);
}

/****************************************************
 * Distance NM
 ****************************************************/
function distanceNm(lat1, lon1, lat2, lon2) {
  const R = 6371000;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;

  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) *
    Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) ** 2;

  const d = R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return d / 1852;
}

/****************************************************
 * Classification ARR / DEP / ENR
 ****************************************************/
function classifyArrivalDeparture(track, lat, lon, airportKey) {
  const ap = airports[airportKey];
  const rw = ap.runways[0];

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
 * Statut avionique Airbus ECAM (classes CSS)
 ****************************************************/
function statusClass(status) {
  return {
    ARR: "fids-status-arr",
    DEP: "fids-status-dep",
    ENR: "fids-status-enr"
  }[status] || "";
}

/****************************************************
 * Filtre global FIDS : EBCI / EBLG / ALL
 ****************************************************/
window.fidsFilter = "ALL";

export function setFidsFilter(filter) {
  if (["EBCI", "EBLG", "ALL"].includes(filter)) {
    window.fidsFilter = filter;
  }
}

/****************************************************
 * Normalisation multi‑source (ADSB / OpenSky / AirLabs)
 ****************************************************/
function normalizeAircraftList(raw) {
  if (Array.isArray(raw?.ac)) return raw.ac;
  if (Array.isArray(raw?.aircraft)) return raw.aircraft;
  if (Array.isArray(raw?.response?.aircraft)) return raw.response.aircraft;

  if (Array.isArray(raw?.states)) {
    return raw.states.map(s => ({
      icao: s[0],
      call: s[1],
      country: s[2],
      lon: s[5],
      lat: s[6],
      alt_baro: s[7],
      gs: s[9],
      track: s[10],
      seen_pos: 0
    }));
  }

  if (Array.isArray(raw)) return raw;

  return [];
}

/****************************************************
 * Fetch Airlabs via proxy Render
 ****************************************************/
async function fetchAviationStackAroundAirport(ap) {
  const url =
    `https://aerov4.onrender.com/aviationstack?lat=${ap.lat}&lon=${ap.lon}&dist=80`;

  try {
    const r = await fetch(url);
    const data = await r.json();
    return normalizeAircraftList(data);
  } catch {
    return [];
  }
}

/****************************************************
 * Fetch ADSBexchange via proxy Render
 ****************************************************/
async function fetchAdsbAroundAirport(ap) {
  const url =
    `https://aerov4.onrender.com/adsb?lat=${ap.lat}&lon=${ap.lon}&dist=80`;

  try {
    const r = await fetch(url);
    const data = await r.json();
    return normalizeAircraftList(data);
  } catch {
    return [];
  }
}

/****************************************************
 * Fetch OpenSky (via proxy)
 ****************************************************/
async function fetchOpenSkyAroundAirport(ap) {
  const url =
    `https://aerov4.onrender.com/opensky?lat=${ap.lat}&lon=${ap.lon}&dist=80`;

  try {
    const r = await fetch(url);
    const data = await r.json();
    return normalizeAircraftList(data);
  } catch {
    return [];
  }
}

/****************************************************
 * Fetch AirLabs via proxy Render
 ****************************************************/
async function fetchAirLabsAroundAirport(ap) {
  const url =
    `https://aerov4.onrender.com/airlabs?lat=${ap.lat}&lon=${ap.lon}&dist=80`;

  try {
    const r = await fetch(url);
    const data = await r.json();
    return normalizeAircraftList(data);
  } catch {
    return [];
  }
}


/****************************************************
 * Multi‑source : ADSB → OpenSky → AirLabs
 ****************************************************/
async function fetchMultiSourceAroundAirport(airportKey) {
  const ap = airports[airportKey];

  let list = await fetchAdsbAroundAirport(ap);
  if (list.length > 0) return list;

  list = await fetchOpenSkyAroundAirport(ap);
  if (list.length > 0) return list;

  list = await fetchAirLabsAroundAirport(ap);
  if (list.length > 0) return list;

  list = await fetchAviationStackAroundAirport(ap);
  if (list.length > 0) return list;

  return [];
}

/****************************************************
 * FIDS Airbus ECAM — Mise à jour (multi‑source)
 ****************************************************/
export async function updateFidsFlights(airportKey) {
  const filter = window.fidsFilter;
  if (filter !== "ALL" && filter !== airportKey) return;

  const arrTbody = document.getElementById(
    airportKey === "EBCI" ? "fids-arr-ebci" : "fids-arr-eblg"
  );

  const depTbody = document.getElementById(
    airportKey === "EBCI" ? "fids-dep-ebci" : "fids-dep-eblg"
  );

  if (!arrTbody || !depTbody) return;

  arrTbody.innerHTML = "<tr><td colspan='9'>Loading flights...</td></tr>";
  depTbody.innerHTML = "<tr><td colspan='9'>Loading flights...</td></tr>";

  const ap = airports[airportKey];
  const aircraft = await fetchMultiSourceAroundAirport(airportKey);

  arrTbody.innerHTML = "";
  depTbody.innerHTML = "";

  const arrivals = [];
  const departures = [];

  aircraft.forEach(a => {
    const icao = a.icao || a.icao24 || a.hex || "n/a";
    const callsign = (a.call || a.flight || a.callsign || "").trim() || "n/a";
    const originCountry = a.country || a.origin_country || "n/a";

    const ts = a.seen_pos || a.seen || a.t || 0;
    const time = formatTime(ts ? ts : Math.floor(Date.now() / 1000));

    const lat = a.lat ?? a.latitude ?? (Array.isArray(a.pos) ? a.pos[0] : null);
    const lon = a.lon ?? a.longitude ?? (Array.isArray(a.pos) ? a.pos[1] : null);
    if (lat == null || lon == null) return;

    const altFt = a.alt_baro ?? a.alt_geom ?? a.alt ?? 0;
    const gsKt = a.gs ?? a.speed ?? a.spd ?? 0;
    const gsMs = gsKt * 0.514444;
    const track = a.track ?? a.heading ?? a.hdg ?? 0;

    const distNm = distanceNm(lat, lon, ap.lat, ap.lon);
    const status = classifyArrivalDeparture(track, lat, lon, airportKey);

    pushHistory(icao, lat, lon);

    const row = {
      icao,
      time,
      callsign,
      originCountry,
      distNm: distNm.toFixed(1),
      altFt: Number(altFt).toFixed(0),
      gsMs: gsMs.toFixed(1),
      gsKt: Number(gsKt).toFixed(0),
      track: Number(track).toFixed(0),
      lat,
      lon,
      status
    };

    if (status === "ARR") arrivals.push(row);
    else if (status === "DEP") departures.push(row);
  });

  /****************************************************
   * ARRIVALS
   ****************************************************/
  arrivals.sort((a, b) => parseFloat(a.distNm) - parseFloat(b.distNm));

  arrivals.forEach(f => {
    const tr = document.createElement("tr");

    tr.innerHTML = `
      <td>${f.time}</td>
      <td>${f.callsign}</td>
      <td>${f.originCountry}</td>
      <td>${f.distNm} NM</td>
      <td>${f.altFt} ft</td>
      <td>${f.gsKt} kt</td>
      <td>${f.gsMs} m/s</td>
      <td>${f.track}°</td>
      <td class="${statusClass(f.status)}">${f.status}</td>
    `;

    tr.addEventListener("click", () => {
      airports[airportKey].aircraft.lat   = f.lat;
      airports[airportKey].aircraft.lon   = f.lon;
      airports[airportKey].aircraft.altFt = Number(f.altFt);
      airports[airportKey].aircraft.hdg   = Number(f.track);
      airports[airportKey].aircraft.gs    = Number(f.gsKt);

      showOptimizedAdsbTrajectory(f.icao);
      updateNdAirbus(airportKey);
    });

    arrTbody.appendChild(tr);
  });

  /****************************************************
   * DEPARTURES
   ****************************************************/
  departures.sort((a, b) => parseFloat(a.distNm) - parseFloat(b.distNm));

  departures.forEach(f => {
    const tr = document.createElement("tr");

    tr.innerHTML = `
      <td>${f.time}</td>
      <td>${f.callsign}</td>
      <td>${f.originCountry}</td>
      <td>${f.distNm} NM</td>
      <td>${f.altFt} ft</td>
      <td>${f.gsKt} kt</td>
      <td>${f.gsMs} m/s</td>
      <td>${f.track}°</td>
      <td class="${statusClass(f.status)}">${f.status}</td>
    `;

    tr.addEventListener("click", () => {
      airports[airportKey].aircraft.lat   = f.lat;
      airports[airportKey].aircraft.lon   = f.lon;
      airports[airportKey].aircraft.altFt = Number(f.altFt);
      airports[airportKey].aircraft.hdg   = Number(f.track);
      airports[airportKey].aircraft.gs    = Number(f.gsKt);

      showOptimizedAdsbTrajectory(f.icao);
      updateNdAirbus(airportKey);
    });

    depTbody.appendChild(tr);
  });

  if (arrivals.length === 0) {
    arrTbody.innerHTML = "<tr><td colspan='9'>No arrivals (multi‑source)</td></tr>";
  }
  if (departures.length === 0) {
    depTbody.innerHTML = "<tr><td colspan='9'>No departures (multi‑source)</td></tr>";
  }
}

/****************************************************
 * MODE LIVE — Rafraîchissement automatique
 ****************************************************/
export function startFidsLive() {
  updateFidsFlights("EBCI");
  updateFidsFlights("EBLG");

  setInterval(() => {
    updateFidsFlights("EBCI");
    updateFidsFlights("EBLG");
  }, 30000);
}
