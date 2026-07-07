/****************************************************
 * FIDS.js — Tableau avionique PRO+++ (AirLabs)
 ****************************************************/

import { angleDiff } from "./utils.js";

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
async function fetchAirlabsFlights(icao) {
  const key = "04cb1c09-8abb-468a-95fa-ee90c3c2b651";

  const urls = [
    `https://airlabs.co/api/v9/flights?arr_icao=${icao}&api_key=${key}`,
    `https://airlabs.co/api/v9/flights?dep_icao=${icao}&api_key=${key}`
  ];

  let all = [];

  for (const url of urls) {
    try {
      const res = await fetch(url);
      const json = await res.json();
      if (json.response) all = all.concat(json.response);
    } catch (e) {
      console.warn("AirLabs error:", e);
    }
  }

  return all;
}

/****************************************************
 * Tableau avionique PRO+++ (EBCI / EBLG)
 ****************************************************/
export async function updateFidsFlights(airportKey) {
  const id = airportKey === "EBCI" ? "fids-ebci" : "fids-eblg";
  const tbody = document.getElementById(id);
  if (!tbody) return;

  tbody.innerHTML = "<tr><td colspan='7'>Chargement...</td></tr>";

  const flights = await fetchAirlabsFlights(airportKey);

  if (!flights.length) {
    tbody.innerHTML = "<tr><td colspan='7'>Aucun vol</td></tr>";
    return;
  }

  flights.sort((a, b) => {
    const ta = a.arr_time || a.dep_time || "";
    const tb = b.arr_time || b.dep_time || "";
    return ta.localeCompare(tb);
  });

  const upcoming = flights.slice(0, 15);

  tbody.innerHTML = "";

  upcoming.forEach(f => {
    const tr = document.createElement("tr");

    const time = formatTime(f.arr_time || f.dep_time);
    const flight = f.flight_iata || f.flight_icao || "n/a";
    const company = f.airline_iata || f.airline_icao || "n/a";
    const type = f.aircraft_icao || "n/a";
    const origin = f.dep_iata || f.dep_icao || "n/a";
    const dest = f.arr_iata || f.arr_icao || "n/a";
    const status = f.status || "n/a";

    const isApproach =
      status === "active" ||
      status === "en-route" ||
      status === "enr" ||
      status === "approach" ||
      status === "on final";

    if (isApproach) tr.classList.add("fids-approach");

    tr.innerHTML = `
      <td>${time}</td>
      <td>${flight}</td>
      <td>${company}</td>
      <td>${type}</td>
      <td>${origin}</td>
      <td>${dest}</td>
      <td class="${statusClass(status)}">${status}</td>
    `;

    tbody.appendChild(tr);
  });
}
