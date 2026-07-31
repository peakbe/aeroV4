/****************************************************
 * FIDS — ADSBexchange Airbus ECAM PRO+++ v1
 * EBCI / EBLG — temps réel, trajectoires, filtres
 ****************************************************/

import { airports } from "./config.js";
import { updateNdAirbus } from "./nd-airbus.js";
import { showFullFlightPath } from "./map.js";
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
  if (arr.length > 80) arr.shift(); // limite historique
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
 * Classification ARR / DEP / ENR améliorée
 ****************************************************/
function classifyArrivalDeparture(track, lat, lon, airportKey) {
  const ap = airports[airportKey];
  const rw = ap.runways[0]; // piste principale

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
 * Fetch ADSBexchange autour d'un aéroport
 * (lat / lon / radius en NM)
 ****************************************************/
async function fetchAdsbAroundAirport(airportKey) {
  const ap = airports[airportKey];

  // rayon 80 NM autour de l'aéroport
  const radiusNm = 80;

  // NOTE: URL typique ADSBexchange (peut varier selon ton plan)
  const url =
    `https://adsbexchange.com/api/aircraft/json/lat/${ap.lat}/lon/${ap.lon}/dist/${radiusNm}`;

  try {
    const r = await fetch(url);
    const data = await r.json();
    return data.ac || [];
  } catch (e) {
    console.warn("ADSBexchange error:", e);
    return [];
  }
}

/****************************************************
 * FIDS Airbus ECAM — Mise à jour (ADSBexchange)
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

  arrTbody.innerHTML = "<tr><td colspan='9'>Loading ADSBexchange...</td></tr>";
  depTbody.innerHTML = "<tr><td colspan='9'>Loading ADSBexchange...</td></tr>";

  const ap = airports[airportKey];
  const aircraft = await fetchAdsbAroundAirport(airportKey);

  arrTbody.innerHTML = "";
  depTbody.innerHTML = "";

  const arrivals = [];
  const departures = [];

  aircraft.forEach(a => {
    const icao = a.icao || a.hex || "n/a";
    const callsign = (a.call || a.flight || "").trim() || "n/a";
    const originCountry = a.country || "n/a";
    const ts = a.seen_pos || a.seen || 0;
    const time = formatTime(Math.floor(Date.now() / 1000 - ts)); // approx

    const lat = a.lat;
    const lon = a.lon;
    if (lat == null || lon == null) return;

    const altFt = a.alt_baro || a.alt_geom || 0; // déjà en ft
    const gsKt = a.gs || a.speed || 0;           // kt
    const gsMs = gsKt * 0.514444;                // m/s
    const track = a.track || a.heading || 0;

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
   * ARRIVALS — Airbus ECAM (ADSBexchange)
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

  // Trajectoire ADSBexchange optimisée
  showOptimizedAdsbTrajectory(f.icao);

  // Mise à jour ND Airbus
  updateNdAirbus(airportKey);
});

    arrTbody.appendChild(tr);
  });

  /****************************************************
   * DEPARTURES — Airbus ECAM (ADSBexchange)
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

  // Trajectoire ADSBexchange optimisée
  showOptimizedAdsbTrajectory(f.icao);

  // Mise à jour ND Airbus
  updateNdAirbus(airportKey);
});

    depTbody.appendChild(tr);
  });

  if (arrivals.length === 0) {
    arrTbody.innerHTML = "<tr><td colspan='9'>No arrivals (ADSBexchange)</td></tr>";
  }
  if (departures.length === 0) {
    depTbody.innerHTML = "<tr><td colspan='9'>No departures (ADSBexchange)</td></tr>";
  }
}

/****************************************************
 * MODE LIVE — Rafraîchissement automatique (ADSB)
 ****************************************************/
export function startFidsLive() {
  updateFidsFlights("EBCI");
  updateFidsFlights("EBLG");

  setInterval(() => {
    updateFidsFlights("EBCI");
    updateFidsFlights("EBLG");
  }, 30000); // 30 sec
}
