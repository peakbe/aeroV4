/****************************************************
 * FIDS — Pipeline OpenSky + AirLabs PRO+++
 ****************************************************/

import { airports, AIRLABS_API_KEY } from "./config.js";
import { distanceNm } from "./utils.js";
import { updateNdAirbus } from "./nd-airbus.js";
import { showOptimizedAdsbTrajectory, pushHistory } from "./adsb-trajectory.js";
import { fetchMetar } from "./metar.js";

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
    const d = new Date(ts);
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
 * Fetch Airplanes.live
 ****************************************************/
async function fetchAirplanesLive(ap) {
  const url = `https://api.airplanes.live/v2/lat/${ap.lat}/lon/${ap.lon}/dist/120`;

  try {
    const r = await fetch(url);
    const data = await r.json();

    if (!data.ac) return [];

    return data.ac
      .filter(ac => ac.lat && ac.lon)
      .map(ac => ({
        icao: ac.hex,
        callsign: ac.flight || "n/a",
        originCountry: ac.r || "n/a",
        lat: ac.lat,
        lon: ac.lon,
        altFt: Math.round(ac.alt_baro || 0),
        gsKt: Math.round(ac.gs || 0),
        gsMs: (ac.gs || 0) * 0.514444,
        track: Math.round(ac.track || 0),
        type: ac.type || "n/a",
        time: formatTime(Date.now())
      }));
  } catch {
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
  } catch {
    return [];
  }
}

/****************************************************
 * Fusion Airplanes.live + AirLabs — robuste
 ****************************************************/
function mergeSources(aliveList, airlabsList) {
  const map = new Map();

  aliveList.forEach(a => map.set(a.icao, { ...a }));

  airlabsList.forEach(f => {
    if (!f.icao) return;
    if (!map.has(f.icao)) return;

    const a = map.get(f.icao);
    a.airline = f.airline;
    a.origin = f.origin;
    a.destination = f.destination;
    a.statusAirLabs = f.status;
  });

  return [...map.values()];
}

/****************************************************
 * Pipeline principal
 ****************************************************/
export async function fetchAroundAirport(airportKey) {
  const ap = airports[airportKey];

  const alive = await fetchAirplanesLive(ap);
  const airlabs = await fetchAirLabs(ap);

  return mergeSources(alive, airlabs);
}

/****************************************************
 * FIDS Airbus ECAM — Mise à jour (partie 2)
 ****************************************************/
import { airports } from "./config.js";
import { fidsFilter, fetchAroundAirport } from "./fids-adsb.js";
import { updateNdAirbus } from "./nd-airbus.js";
import { showOptimizedAdsbTrajectory, pushHistory, drawWindOnNd } from "./adsb-trajectory.js";
import { fetchMetar } from "./metar.js";
import { computeWindComponents } from "./wind-components.js"; // à adapter au bon fichier

function statusClass(status) {
  return {
    ARR: "fids-status-arr",
    DEP: "fids-status-dep",
    ENR: "fids-status-enr"
  }[status] || "";
}

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
    const distNm = distanceNm(a.lat, a.lon, ap.lat, ap.lon);
    const status = classifyArrivalDeparture(a.track, a.lat, a.lon, airportKey);

    if (a.lat && a.lon) {
      pushHistory(a.icao, a.lat, a.lon, a.gsKt, a.altFt, a.track);
    }

    const row = {
      icao: a.icao,
      time: a.time,
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
      updateNdAirbus([f]); // ND centré sur l’avion sélectionné
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

