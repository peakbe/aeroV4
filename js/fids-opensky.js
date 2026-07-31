/****************************************************
 * FIDS — OpenSky Network Airbus ECAM PRO+++ v2
 * EBCI / EBLG — temps réel, trajectoires, filtres
 ****************************************************/

import { airports } from "./config.js";
import { updateNdAirbus } from "./nd-airbus.js";
import { showFullFlightPath } from "./map.js";

/****************************************************
 * Bounding box OpenSky optimisée autour des aéroports
 ****************************************************/
const openskyBoxes = {
  EBCI: {
    lamin: 50.30,
    lamax: 50.60,
    lomin: 4.30,
    lomax: 4.60
  },
  EBLG: {
    lamin: 50.55,
    lamax: 50.75,
    lomin: 5.35,
    lomax: 5.55
  }
};

/****************************************************
 * Historique trajectoires OpenSky (par icao24)
 ****************************************************/
window.flightHistory = window.flightHistory || {};

function pushHistory(icao24, lat, lon) {
  if (!icao24 || lat == null || lon == null) return;
  const key = String(icao24);
  if (!window.flightHistory[key]) window.flightHistory[key] = [];
  const arr = window.flightHistory[key];
  arr.push({ lat, lng: lon });
  if (arr.length > 50) arr.shift(); // limite historique
}

/****************************************************
 * Format HH:MM cockpit IFR
 ****************************************************/
function formatTimeFromTimestamp(ts) {
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
function classifyArrivalDeparture(state, airportKey) {
  const ap = airports[airportKey];
  const rw = ap.runways[0]; // piste principale

  const lat = state[6];
  const lon = state[5];
  const track = state[10] || 0; // true_track
  const dist = distanceNm(lat, lon, ap.lat, ap.lon);

  if (!lat || !lon) return "ENR";

  // loin de l'aéroport → en route
  if (dist > 80) return "ENR";

  const heading = rw.heading;
  const diff = Math.abs(((track - heading + 180) % 360) - 180);
  const anti = Math.abs(((track - ((heading + 180) % 360) + 180) % 360) - 180);

  if (dist <= 40 && diff < 35) return "ARR";   // vers la piste
  if (dist <= 40 && anti < 35) return "DEP";  // s'éloigne de la piste

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
 * Fetch OpenSky states autour d'un aéroport
 ****************************************************/
async function fetchOpenSkyStates(airportKey) {
  const box = openskyBoxes[airportKey];

  const url =
    `https://opensky-network.org/api/states/all` +
    `?lamin=${box.lamin}&lomin=${box.lomin}` +
    `&lamax=${box.lamax}&lomax=${box.lomax}`;

  try {
    const r = await fetch(url);
    const data = await r.json();
    return data.states || [];
  } catch (e) {
    console.warn("OpenSky error:", e);
    return [];
  }
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
 * FIDS Airbus ECAM — Mise à jour (OpenSky)
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

  arrTbody.innerHTML = "<tr><td colspan='9'>Loading OpenSky...</td></tr>";
  depTbody.innerHTML = "<tr><td colspan='9'>Loading OpenSky...</td></tr>";

  const ap = airports[airportKey];
  const states = await fetchOpenSkyStates(airportKey);

  arrTbody.innerHTML = "";
  depTbody.innerHTML = "";

  const arrivals = [];
  const departures = [];

  states.forEach(s => {
    const icao24 = s[0];
    const callsign = (s[1] || "").trim() || "n/a";
    const originCountry = s[2] || "n/a";
    const time = formatTimeFromTimestamp(s[3]);
    const lat = s[6];
    const lon = s[5];
    const altFt = s[7] ? s[7] * 3.2808 : 0; // m → ft
    const gsMs = s[9] || 0;                 // m/s
    const gsKt = gsMs * 1.94384;           // kt
    const track = s[10] || 0;

    if (lat == null || lon == null) return;

    const distNm = distanceNm(lat, lon, ap.lat, ap.lon);
    const status = classifyArrivalDeparture(s, airportKey);

    pushHistory(icao24, lat, lon);

    const row = {
      icao24,
      time,
      callsign,
      originCountry,
      distNm: distNm.toFixed(1),
      altFt: altFt.toFixed(0),
      gsMs: gsMs.toFixed(1),
      gsKt: gsKt.toFixed(0),
      track: track.toFixed(0),
      lat,
      lon,
      status
    };

    if (status === "ARR") arrivals.push(row);
    else if (status === "DEP") departures.push(row);
  });

  /****************************************************
   * ARRIVALS — Airbus ECAM (OpenSky)
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

      const hist = window.flightHistory[String(f.icao24)] || [{ lat: f.lat, lng: f.lon }];
      showFullFlightPath(hist);

      updateNdAirbus(airportKey);
    });

    arrTbody.appendChild(tr);
  });

  /****************************************************
   * DEPARTURES — Airbus ECAM (OpenSky)
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

      const hist = window.flightHistory[String(f.icao24)] || [{ lat: f.lat, lng: f.lon }];
      showFullFlightPath(hist);

      updateNdAirbus(airportKey);
    });

    depTbody.appendChild(tr);
  });

  if (arrivals.length === 0) {
    arrTbody.innerHTML = "<tr><td colspan='9'>No arrivals (OpenSky)</td></tr>";
  }
  if (departures.length === 0) {
    depTbody.innerHTML = "<tr><td colspan='9'>No departures (OpenSky)</td></tr>";
  }
}

/****************************************************
 * MODE LIVE — Rafraîchissement automatique (OpenSky)
 ****************************************************/
export function startFidsLive() {
  updateFidsFlights("EBCI");
  updateFidsFlights("EBLG");

  setInterval(() => {
    updateFidsFlights("EBCI");
    updateFidsFlights("EBLG");
  }, 30000); // 30 sec
}
