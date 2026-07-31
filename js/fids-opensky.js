/****************************************************
 * FIDS — OpenSky Network Airbus ECAM PRO+++
 * Vols en temps réel autour de EBCI / EBLG
 ****************************************************/

import { airports } from "./config.js";
import { updateNdAirbus } from "./nd-airbus.js";
import { showFullFlightPath } from "./map.js";

/****************************************************
 * Bounding box OpenSky autour des aéroports
 ****************************************************/
const openskyBoxes = {
  EBCI: {
    lamin: 50.40,
    lamax: 50.52,
    lomin: 4.40,
    lomax: 4.52
  },
  EBLG: {
    lamin: 50.60,
    lamax: 50.68,
    lomin: 5.40,
    lomax: 5.50
  }
};

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
    Math.sin(dLat/2)**2 +
    Math.cos(lat1 * Math.PI/180) *
    Math.cos(lat2 * Math.PI/180) *
    Math.sin(dLon/2)**2;

  const d = R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return (d / 1852).toFixed(1);
}

/****************************************************
 * Classification simple ARR / DEP selon cap
 ****************************************************/
function classifyArrivalDeparture(state, airportKey) {
  const ap = airports[airportKey];
  const rw = ap.runways[0]; // piste principale

  const track = state[10] || 0; // true_track
  const dist = distanceNm(state[6], state[5], ap.lat, ap.lon);

  // Si l'avion est à moins de 30 NM
  if (dist > 30) return "ENR";

  const diff = Math.abs(track - rw.heading);
  const anti = Math.abs(track - ((rw.heading + 180) % 360));

  if (diff < 40) return "ARR";      // vers la piste
  if (anti < 40) return "DEP";     // s'éloigne de la piste

  return "ENR";
}

/****************************************************
 * Statut avionique Airbus ECAM
 ****************************************************/
function statusClass(status) {
  return {
    "ARR": "fids-status-arr",
    "DEP": "fids-status-dep",
    "ENR": "fids-status-enr"
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
 * FIDS Airbus ECAM — Mise à jour (OpenSky)
 ****************************************************/
export async function updateFidsFlights(airportKey) {

  const arrTbody = document.getElementById(
    airportKey === "EBCI" ? "fids-arr-ebci" : "fids-arr-eblg"
  );

  const depTbody = document.getElementById(
    airportKey === "EBCI" ? "fids-dep-ebci" : "fids-dep-eblg"
  );

  if (!arrTbody || !depTbody) return;

  arrTbody.innerHTML = "<tr><td colspan='8'>Loading OpenSky...</td></tr>";
  depTbody.innerHTML = "<tr><td colspan='8'>Loading OpenSky...</td></tr>";

  const ap = airports[airportKey];
  const states = await fetchOpenSkyStates(airportKey);

  arrTbody.innerHTML = "";
  depTbody.innerHTML = "";

  const arrivals = [];
  const departures = [];

  states.forEach(s => {
    const callsign = (s[1] || "").trim() || "n/a";
    const originCountry = s[2] || "n/a";
    const time = formatTimeFromTimestamp(s[3]);
    const lat = s[6];
    const lon = s[5];
    const alt = s[7] ? s[7] * 3.2808 : 0; // m → ft
    const gs = s[9] ? s[9] * 1.94384 : 0; // m/s → kt
    const track = s[10] || 0;

    const distNm = distanceNm(lat, lon, ap.lat, ap.lon);
    const status = classifyArrivalDeparture(s, airportKey);

    const row = {
      time,
      callsign,
      originCountry,
      distNm,
      altFt: alt.toFixed(0),
      gsKt: gs.toFixed(0),
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
  arrivals.sort((a, b) => a.distNm - b.distNm);

  arrivals.forEach(f => {
    const tr = document.createElement("tr");

    tr.innerHTML = `
      <td>${f.time}</td>
      <td>${f.callsign}</td>
      <td>${f.originCountry}</td>
      <td>${f.distNm} NM</td>
      <td>${f.altFt} ft</td>
      <td>${f.gsKt} kt</td>
      <td>${f.track}°</td>
      <td class="${statusClass(f.status)}">${f.status}</td>
    `;

    tr.addEventListener("click", () => {
      airports[airportKey].aircraft.lat = f.lat;
      airports[airportKey].aircraft.lon = f.lon;
      airports[airportKey].aircraft.altFt = Number(f.altFt);
      airports[airportKey].aircraft.hdg = Number(f.track);
      airports[airportKey].aircraft.gs = Number(f.gsKt);

      // Pas de track complet avec OpenSky free → on montre juste le point
      showFullFlightPath([
        { lat: f.lat, lng: f.lon }
      ]);

      updateNdAirbus(airportKey);
    });

    arrTbody.appendChild(tr);
  });

  /****************************************************
   * DEPARTURES — Airbus ECAM (OpenSky)
   ****************************************************/
  departures.sort((a, b) => a.distNm - b.distNm);

  departures.forEach(f => {
    const tr = document.createElement("tr");

    tr.innerHTML = `
      <td>${f.time}</td>
      <td>${f.callsign}</td>
      <td>${f.originCountry}</td>
      <td>${f.distNm} NM</td>
      <td>${f.altFt} ft</td>
      <td>${f.gsKt} kt</td>
      <td>${f.track}°</td>
      <td class="${statusClass(f.status)}">${f.status}</td>
    `;

    tr.addEventListener("click", () => {
      airports[airportKey].aircraft.lat = f.lat;
      airports[airportKey].aircraft.lon = f.lon;
      airports[airportKey].aircraft.altFt = Number(f.altFt);
      airports[airportKey].aircraft.hdg = Number(f.track);
      airports[airportKey].aircraft.gs = Number(f.gsKt);

      showFullFlightPath([
        { lat: f.lat, lng: f.lon }
      ]);

      updateNdAirbus(airportKey);
    });

    depTbody.appendChild(tr);
  });

  if (arrivals.length === 0) {
    arrTbody.innerHTML = "<tr><td colspan='8'>No arrivals (OpenSky)</td></tr>";
  }
  if (departures.length === 0) {
    depTbody.innerHTML = "<tr><td colspan='8'>No departures (OpenSky)</td></tr>";
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
