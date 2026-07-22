/****************************************************
 * FIDS.js — Tableau avionique PRO+++ (AirLabs)
 ****************************************************/

import { AVWX_API_KEY, airports } from "./config.js";

/****************************************************
 * Format HH:MM cockpit IFR
 ****************************************************/
function formatTime(t) {
  if (!t) return "n/a";
  try {
    return t.split("T")[1].replace("Z", "").slice(0, 5);
  } catch {
    return "n/a";
  }
}

/****************************************************
 * Statut avionique (couleurs cockpit)
 ****************************************************/
function statusClass(status) {
  return {
    "scheduled": "fids-status-dep",
    "active": "fids-status-enr",
    "landed": "fids-status-lnd",
    "arrived": "fids-status-arr"
  }[status] || "";
}

/****************************************************
 * Fusion Arrivées + Départs AirLabs
 ****************************************************/
async function fetchAirlabs(icao) {
  const key = AVWX_API_KEY;

  const urlArr = `https://airlabs.co/api/v9/flights?arr_icao=${icao}&api_key=${key}`;
  const urlDep = `https://airlabs.co/api/v9/flights?dep_icao=${icao}&api_key=${key}`;

  const [arrRes, depRes] = await Promise.all([
    fetch(urlArr),
    fetch(urlDep)
  ]);

  const arrData = await arrRes.json();
  const depData = await depRes.json();

  return {
    arrivals: arrData.response || [],
    departures: depData.response || []
  };
}


  return all;
}

import { updateNdAirbus } from "./nd-airbus.js";
import { airports } from "./config.js";

export async function updateFidsFlights(airportKey) {

  const icao = airportKey === "EBCI" ? "CRL" : "LGG";

  const arrTbody = document.getElementById(
    airportKey === "EBCI" ? "fids-arr-ebci" : "fids-arr-eblg"
  );

  const depTbody = document.getElementById(
    airportKey === "EBCI" ? "fids-dep-ebci" : "fids-dep-eblg"
  );

  if (!arrTbody || !depTbody) return;

  arrTbody.innerHTML = "<tr><td colspan='7'>Loading...</td></tr>";
  depTbody.innerHTML = "<tr><td colspan='7'>Loading...</td></tr>";

  const fids = await fetchAirlabs(icao);

  /***************
   * ARRIVALS
   ***************/
  const arrivals = [...fids.arrivals].sort((a, b) => {
    const ta = a.arr_time || "";
    const tb = b.arr_time || "";
    return ta.localeCompare(tb);
  });

  arrTbody.innerHTML = "";

  arrivals.forEach(f => {
    const tr = document.createElement("tr");

    const time = formatTime(f.arr_time);
    const flight = f.flight_iata || f.flight_icao || "n/a";
    const company = f.airline_iata || f.airline_icao || "n/a";
    const type = f.aircraft_icao || "n/a";
    const origin = f.dep_iata || f.dep_icao || "n/a";
    const status = f.status || "n/a";

    tr.innerHTML = `
      <td>${time}</td>
      <td>${flight}</td>
      <td>${company}</td>
      <td>${type}</td>
      <td>${origin}</td>
      <td>${icao}</td>
      <td class="${statusClass(status)}">${status}</td>
    `;

    /********************************************
     * CLICK → ND Airbus (tracking avion réel)
     ********************************************/
    tr.addEventListener("click", () => {
      airports[airportKey].aircraft.lat = f.lat;
      airports[airportKey].aircraft.lon = f.lng;
      airports[airportKey].aircraft.altFt = f.alt;
      airports[airportKey].aircraft.hdg = f.dir;
      airports[airportKey].aircraft.gs = f.speed;

      updateNdAirbus(airportKey);
    });

    arrTbody.appendChild(tr);
  });

  /***************
   * DEPARTURES
   ***************/
  const departures = [...fids.departures].sort((a, b) => {
    const ta = a.dep_time || "";
    const tb = b.dep_time || "";
    return ta.localeCompare(tb);
  });

  depTbody.innerHTML = "";

  departures.forEach(f => {
    const tr = document.createElement("tr");

    const time = formatTime(f.dep_time);
    const flight = f.flight_iata || f.flight_icao || "n/a";
    const company = f.airline_iata || f.airline_icao || "n/a";
    const type = f.aircraft_icao || "n/a";
    const dest = f.arr_iata || f.arr_icao || "n/a";
    const status = f.status || "n/a";

    tr.innerHTML = `
      <td>${time}</td>
      <td>${flight}</td>
      <td>${company}</td>
      <td>${type}</td>
      <td>${icao}</td>
      <td>${dest}</td>
      <td class="${statusClass(status)}">${status}</td>
    `;

    /********************************************
     * CLICK → ND Airbus (tracking avion réel)
     ********************************************/
    tr.addEventListener("click", () => {
      airports[airportKey].aircraft.lat = f.lat;
      airports[airportKey].aircraft.lon = f.lng;
      airports[airportKey].aircraft.altFt = f.alt;
      airports[airportKey].aircraft.hdg = f.dir;
      airports[airportKey].aircraft.gs = f.speed;

      updateNdAirbus(airportKey);
    });

    depTbody.appendChild(tr);
  });
}


/****************************************************
 * Sonomètres (FIDS) — OPTION 2
 ****************************************************/
export async function updateFidsList(airportKey) {
  const id = airportKey === "EBCI" ? "sonos-ebci" : "sonos-eblg";
  const el = document.getElementById(id);
  if (!el) return;

  el.textContent = "Chargement...";

  try {
    const res = await fetch(`/api/fids/${airportKey}/sonos.json`);
    const data = await res.json();
    el.innerHTML = data.map(s => `${s.name} — ${s.value} dB`).join("<br>");
  } catch (e) {
    el.textContent = "Sonomètres indisponibles";
  }
}
