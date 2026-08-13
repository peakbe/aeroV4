/****************************************************
 * FIDS — Pipeline Airplanes.live (proxy Render) + AirLabs PRO+++
 ****************************************************/

import { airports } from "./config.js";
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
  if (!ts || isNaN(ts)) return "--:--";
  try {
    const d = new Date(ts * 1000);
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

  // Filtre distance IFR
  if (dist > 200) return "ENR";
  if (dist > 60) return "ENR";

  const heading = rw.heading;
  const diff = Math.abs(((track - heading + 180) % 360) - 180);
  const anti = Math.abs(((track - ((heading + 180) % 360) + 180) % 360) - 180);

  if (dist <= 25 && diff < 30) return "ARR";
  if (dist <= 25 && anti < 30) return "DEP";

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
 * ADS-B Simplifié — OpenSky uniquement
 ****************************************************/
async function fetchAroundAirport(airportKey) {
  const ap = airports[airportKey];
  const BOX = 0.35;
const url = `https://opensky-network.org/api/states/all?lamin=${ap.lat - BOX}&lomin=${ap.lon - BOX}&lamax=${ap.lat + BOX}&lomax=${ap.lon + BOX}`;

  let data;
  try {
    const res = await fetch(url);
    data = await res.json();
  } catch {
    return [];
  }

  if (!data || !Array.isArray(data.states)) return [];

  const aircraft = data.states.map(s => ({
    icao: s[0],
    callsign: s[1] && s[1].trim() !== "" ? s[1].trim().toUpperCase() : "N/A",
    lat: s[6],
    lon: s[5],
    altFt: s[13] || s[7] || 0,
    gsMs: s[9] || 0,
    gsKt: (s[9] || 0) * 1.94384,
    track: s[10] || 0,
    time: data.time || 0,
    airline: "n/a",
    origin: "n/a",
    destination: "n/a"
  }));

  const cacheKey = `OSN_${airportKey}`;
  const cached = getCachedFids(cacheKey);
  if (cached) return cached;

  aircraft = aircraft.filter(a =>
  a.gsKt > 30 &&          // vitesse minimale
  a.altFt > 500 &&        // éviter les avions au sol
  a.track >= 0 && a.track <= 360
);

  setCachedFids(cacheKey, aircraft);

  return aircraft.filter(a =>
    typeof a.lat === "number" &&
    typeof a.lon === "number" &&
    !isNaN(a.lat) &&
    !isNaN(a.lon)
  );
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
  let aircraft = await fetchAroundAirport(airportKey);
 
  // Filtre anti-NaN AVANT la boucle
aircraft = aircraft.filter(a =>
  typeof a.lat === "number" &&
  typeof a.lon === "number" &&
  !isNaN(a.lat) &&
  !isNaN(a.lon)
);
  
  arrTbody.innerHTML = "";
  depTbody.innerHTML = "";

  let arrivals = [];
  let departures = [];

  aircraft.forEach(a => {
    if (
  typeof a.lat !== "number" ||
  typeof a.lon !== "number" ||
  isNaN(a.lat) ||
  isNaN(a.lon)
) return;

    const distNm = distanceNm(a.lat, a.lon, ap.lat, ap.lon);
    const status = classifyArrivalDeparture(a.track, a.lat, a.lon, airportKey);

    pushHistory(a.icao, a.lat, a.lon, a.gsKt, a.altFt, a.track);

    let row = {
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
      for (const r of document.getElementsByClassName("fids-row")) {
  r.classList.remove("fids-selected");
}


      airports[airportKey].aircraft = {
        lat: f.lat,
        lon: f.lon,
        altFt: Number(f.altFt),
        hdg: Number(f.track),
        gs: Number(f.gsKt)
      };

      showOptimizedAdsbTrajectory(f.icao);
     updateNdAirbus([{
  lat: f.lat,
  lon: f.lon,
  altFt: f.altFt,
  gsKt: f.gsKt,
  track: f.track
}]);

}); // <-- FIN DU addEventListener

arrTbody.appendChild(tr);
}); // <-- FIN DU arrivals.forEach

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

