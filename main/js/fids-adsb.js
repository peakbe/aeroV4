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
 * Fetch OpenSky (API directe)
 ****************************************************/
async function fetchOpenSky(ap) {
  const url = "https://opensky-network.org/api/states/all";

  try {
    const r = await fetch(url);
    const data = await r.json();

    if (!data.states) return [];

    return data.states
      .map(s => ({
        icao: s[0],
        callsign: s[1],
        originCountry: s[2],
        lon: s[5],
        lat: s[6],
        altFt: Math.round(s[7] || 0),
        gsKt: Math.round(s[9] || 0),
        track: Math.round(s[10] || 0)
      }))
      .filter(a => a.lat && a.lon);
  } catch {
    return [];
  }
}

/****************************************************
 * Fetch AirLabs (API directe)
 ****************************************************/
async function fetchAirLabs(ap) {
  const url = `https://airlabs.co/api/v9/flights?api_key=04cb1c09-8abb-468a-95fa-ee90c3c2b651`;

  try {
    const r = await fetch(url);
    const data = await r.json();

    if (!data.response) return [];

    return data.response.map(f => ({
      icao: f.hex,
      callsign: f.flight_iata,
      airline: f.airline_iata,
      origin: f.dep_iata,
      destination: f.arr_iata,
      status: f.status
    }));
  } catch {
    return [];
  }
}
/****************************************************
 * Fusion OpenSky + AirLabs
 ****************************************************/
function mergeSources(osList, alList) {
  const map = new Map();

  // OpenSky → base
  osList.forEach(a => {
    map.set(a.icao, {
      icao: a.icao,
      callsign: a.callsign || "n/a",
      originCountry: a.originCountry || "n/a",
      lat: a.lat,
      lon: a.lon,
      altFt: a.altFt,
      gsKt: a.gsKt,
      gsMs: a.gsKt * 0.514444,
      track: a.track,
      time: formatTime(Math.floor(Date.now() / 1000))
    });
  });

  // AirLabs → enrichissement
  alList.forEach(f => {
    if (map.has(f.icao)) {
      const a = map.get(f.icao);
      a.airline = f.airline || "n/a";
      a.origin = f.origin || "n/a";
      a.destination = f.destination || "n/a";
      a.statusAirLabs = f.status || "n/a";
    }
  });

  return [...map.values()];
}

/****************************************************
 * Pipeline simplifié : OpenSky + AirLabs
 ****************************************************/
async function fetchAroundAirport(airportKey) {
  const ap = airports[airportKey];

  const os = await fetchOpenSky(ap);
  const al = await fetchAirLabs(ap);

  return mergeSources(os, al);
}

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

  aircraft.forEach(a => {
    const distNm = distanceNm(a.lat, a.lon, ap.lat, ap.lon);
    const status = classifyArrivalDeparture(a.track, a.lat, a.lon, airportKey);

    pushHistory(a.icao, a.lat, a.lon);

    const row = {
      icao: a.icao,
      time: a.time,
      callsign: a.callsign,
      originCountry: a.originCountry,
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
      <div>${f.time}</div>
      <div>${f.callsign}</div>
      <div>${f.originCountry}</div>
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
   * DEPARTURES
   ****************************************************/
  departures.sort((a, b) => parseFloat(a.distNm) - parseFloat(b.distNm));

  departures.forEach(f => {
    const tr = document.createElement("tr");
    tr.className = "fids-row";

    tr.innerHTML = `
      <div>${f.time}</div>
      <div>${f.callsign}</div>
      <div>${f.originCountry}</div>
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

  if (arrivals.length === 0) {
    arrTbody.innerHTML = "<tr><td colspan='9'>No arrivals</td></tr>";
  }
  if (departures.length === 0) {
    depTbody.innerHTML = "<tr><td colspan='9'>No departures</td></tr>";
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
/****************************************************
 * RUNWAY + WIND — Calcul composantes (Airbus style)
 ****************************************************/
function computeRunwayWind(runway, windDir, windSpeed) {
  const rwHeading = runway * 10; // RWY 24 → 240°
  const angle = Math.abs(rwHeading - windDir);

  const headwind = Math.round(windSpeed * Math.cos(angle * Math.PI / 180));
  const crosswind = Math.round(windSpeed * Math.sin(angle * Math.PI / 180));

  return {
    runway: runway.toString(),
    windDir,
    windSpeed,
    headwind,
    crosswind,
    angle
  };
}

/****************************************************
 * RUNWAY + WIND — Config simple EBCI / EBLG
 ****************************************************/
const RUNWAY_CONFIG = {
  EBCI: { runway: 24, windDir: 240, windSpeed: 8 },
  EBLG: { runway: 22, windDir: 230, windSpeed: 11 }
};

/****************************************************
 * RUNWAY + WIND — Mise à jour affichage FIDS
 ****************************************************/
export function updateRunwayWind(airportKey) {
  const cfg = RUNWAY_CONFIG[airportKey];
  if (!cfg) return;

  const rw = computeRunwayWind(cfg.runway, cfg.windDir, cfg.windSpeed);

  const el = document.getElementById(
    airportKey === "EBCI" ? "runway-ebci" : "runway-eblg"
  );
  if (!el) return;

  el.innerHTML = `
    RUNWAY ${rw.runway}<br>
    WIND ${rw.windDir}° / ${rw.windSpeed} kt<br>
    HEADWIND ${rw.headwind} kt<br>
    CROSSWIND ${rw.crosswind} kt<br>
    ANGLE ${rw.angle}°
  `;
}

/****************************************************
 * MODE LIVE — Intégration runway + FIDS
 ****************************************************/
export function startFidsLive() {
  updateRunwayWind("EBCI");
  updateRunwayWind("EBLG");

  updateFidsFlights("EBCI");
  updateFidsFlights("EBLG");

  setInterval(() => {
    updateRunwayWind("EBCI");
    updateRunwayWind("EBLG");

    updateFidsFlights("EBCI");
    updateFidsFlights("EBLG");
  }, 30000);
}
