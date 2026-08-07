/****************************************************
 * FIDS — Pipeline simplifié (OpenSky + AirLabs)
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
 * Fetch Airplanes.live (API ADS-B)
 ****************************************************/
async function fetchAirplanesLive(ap) {
  const url = `https://api.airplanes.live/v2/lat/${ap.lat}/lon/${ap.lon}/dist/120`;

  try {
    const r = await fetch(url);
    const data = await r.json();

    if (!data.ac) return [];

    return data.ac
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
        time: formatTime(Math.floor(Date.now() / 1000))
      }))
      .filter(a => a.lat && a.lon);
  } catch {
    return [];
  }
}

/****************************************************
 * Fetch AirLabs (API enrichissement)
 ****************************************************/
async function fetchAirLabs(ap) {
  const url = `https://airlabs.co/api/v9/flights?api_key=04cb1c09-8abb-468a-95fa-ee90c3c2b651`;

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
 * Fusion Airplanes.live + AirLabs
 ****************************************************/
function mergeSources(aliveList, airlabsList) {
  const map = new Map();

  // Airplanes.live → base
  aliveList.forEach(a => {
    map.set(a.icao, { ...a });
  });

  // AirLabs → enrichissement
  airlabsList.forEach(f => {
    if (map.has(f.icao)) {
      const a = map.get(f.icao);
      a.airline = f.airline;
      a.origin = f.origin;
      a.destination = f.destination;
      a.statusAirLabs = f.status;
    }
  });

  return [...map.values()];
}

/****************************************************
 * Pipeline principal : Airplanes.live + AirLabs
 ****************************************************/
async function fetchAroundAirport(airportKey) {
  const ap = airports[airportKey];

  const alive = await fetchAirplanesLive(ap);
  const airlabs = await fetchAirLabs(ap);

  return mergeSources(alive, airlabs);
}

/****************************************************
 * FIDS Airbus ECAM — Mise à jour
 ****************************************************/
/****************************************************
 * FIDS Airbus ECAM — Mise à jour
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
  const aircraft = await fetchAroundAirport(airportKey);

  arrTbody.innerHTML = "";
  depTbody.innerHTML = "";

  const arrivals = [];
  const departures = [];

  /****************************************************
   * Classification + Historique + Construction lignes
   ****************************************************/
  aircraft.forEach(a => {
    const distNm = distanceNm(a.lat, a.lon, ap.lat, ap.lon);
    const status = classifyArrivalDeparture(a.track, a.lat, a.lon, airportKey);

    pushHistory(a.icao, a.lat, a.lon);

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
   * PARTIE 2 — ARRIVALS
   ****************************************************/
  arrivals.sort((a, b) => parseFloat(a.distNm) - parseFloat(b.distNm));

  arrivals.forEach(f => {
    const tr = document.createElement("tr");
    tr.className = "fids-row";

    tr.innerHTML = `
      <div>${f.time}</div>
      <div>${f.callsign}</div>
      <div>${f.airline || "n/a"}</div>
      <div>${f.origin || "n/a"}</div>
      <div>${f.distNm}</div>
      <div>${f.altFt}</div>
      <div>${f.gsKt}</div>
      <div>${f.gsMs}</div>
      <div>${f.track}</div>
      <div class="${statusClass(f.status)}">${f.status}</div>
    `;

    tr.addEventListener("click", () => {
      document.querySelectorAll(".fids-row").forEach(r => r.classList.remove("fids-selected"));
      tr.classList.add("fids-selected");

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
   * PARTIE 2 — DEPARTURES
   ****************************************************/
  departures.sort((a, b) => parseFloat(a.distNm) - parseFloat(b.distNm));

  departures.forEach(f => {
    const tr = document.createElement("tr");
    tr.className = "fids-row";

    tr.innerHTML = `
      <div>${f.time}</div>
      <div>${f.callsign}</div>
      <div>${f.airline || "n/a"}</div>
      <div>${f.origin || "n/a"}</div>
      <div>${f.distNm}</div>
      <div>${f.altFt}</div>
      <div>${f.gsKt}</div>
      <div>${f.gsMs}</div>
      <div>${f.track}</div>
      <div class="${statusClass(f.status)}">${f.status}</div>
    `;

    tr.addEventListener("click", () => {
      document.querySelectorAll(".fids-row").forEach(r => r.classList.remove("fids-selected"));
      tr.classList.add("fids-selected");

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

  /****************************************************
   * Messages si vide
   ****************************************************/
  if (arrivals.length === 0) {
    arrTbody.innerHTML = "<tr><td colspan='9'>No arrivals</td></tr>";
  }
  if (departures.length === 0) {
    depTbody.innerHTML = "<tr><td colspan='9'>No departures</td></tr>";
  }
}

/****************************************************
 * PARTIE 3 — RUNWAY + WIND (à partir du METAR AVWX)
 ****************************************************/
import { fetchMetar } from "./metar.js";

/****************************************************
 * Calcul composantes vent (Airbus style)
 ****************************************************/
function computeWindComponents(runwayHeading, windDir, windSpeed) {
  if (!windDir || windDir === "VRB") {
    return {
      headwind: 0,
      crosswind: 0,
      angle: 0
    };
  }

  const angle = Math.abs(runwayHeading - windDir);
  const headwind = Math.round(windSpeed * Math.cos(angle * Math.PI / 180));
  const crosswind = Math.round(windSpeed * Math.sin(angle * Math.PI / 180));

  return { headwind, crosswind, angle };
}

/****************************************************
 * Mise à jour panneau RUNWAY FIDS (EBCI / EBLG)
 ****************************************************/
export async function updateRunwayPanel(airportKey) {
  const ap = airports[airportKey];
  const runway = ap.activeRunway;

  const metar = await fetchMetar(airportKey);
  if (!metar || !runway) return;

  /***********************
   * ND AIRBUS — Vent WX
   ***********************/
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
 * Intégration dans le mode LIVE
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

