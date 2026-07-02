/****************************************************
 * FIDS.js — Tableau avionique PRO+++ (AirLabs)
 ****************************************************/

import { angleDiff, safeSet } from "./utils.js";

/****************************************************
 * HUD Piste active
 ****************************************************/
export function updateRunwayHUD(airport, windDir) {
  if (!windDir) return;

  let best = null, bestDiff = 999;

  airport.runways.forEach(rw => {
    const diff = angleDiff(windDir, rw.heading);
    if (diff < bestDiff) { bestDiff = diff; best = rw; }
  });

  const id = airport.icao === "EBCI" ? "runway-ebci" : "runway-eblg";
  safeSet(id, best ? `Piste ${best.name}` : "n/a");
}

/****************************************************
 * Format HH:MM cockpit IFR
 ****************************************************/
function formatTime(t) {
  if (!t) return "n/a";
  try {
    return t.split("T")[1].replace("Z", "").slice(0, 5); // HH:MM
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
  const key = "04cb1c09-8abb-468a-95fa-ee90c3c2b651"; // ← Mets ta clé ici

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

  // Tri par heure
  flights.sort((a, b) => {
    const ta = a.arr_time || a.dep_time || "";
    const tb = b.arr_time || b.dep_time || "";
    return ta.localeCompare(tb);
  });

  tbody.innerHTML = "";

  flights.slice(0, 20).forEach(f => {
    const tr = document.createElement("tr");

    const time = formatTime(f.arr_time || f.dep_time);
    const flight = f.flight_iata || f.flight_icao || "n/a";
    const company = f.airline_iata || f.airline_icao || "n/a";
    const type = f.aircraft_icao || "n/a";
    const origin = f.dep_iata || f.dep_icao || "n/a";
    const dest = f.arr_iata || f.arr_icao || "n/a";
    const status = f.status || "n/a";

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

/****************************************************
 * Sonomètres (optionnel)
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

/****************************************************
 * Vols confirmés (fallback JSON)
 ****************************************************/
export async function updateFidsConfirmed() {
  const el = document.getElementById("fids-confirmed");
  if (!el) return;

  el.textContent = "Chargement...";

  try {
    const res = await fetch(`/api/fids/confirmed.json`);
    const data = await res.json();

    el.innerHTML = data
      .map(v => `${v.flight} — ${v.status}`)
      .join("<br>");
  } catch (e) {
    el.textContent = "Aucun vol confirmé";
  }
}
