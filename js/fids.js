/****************************************************
 * FIDS.js — Tableau avionique PRO+++ (AirLabs)
 ****************************************************/

import { angleDiff, safeSet } from "./utils.js";
import { computeRunway } from "./app.js";

/****************************************************
 * HUD Piste active
 ****************************************************/
export function updateRunwayHUD(airport, windDir) {
  const hud = document.getElementById("runway-hud");
  if (!hud) return;

  if (!windDir) {
    hud.innerHTML = "<div class='hud-line'>Piste active: n/a</div>";
    return;
  }

  const active = computeRunway(airport, windDir);

  hud.innerHTML = `
    <div class="hud-line">
      Vent: ${windDir}° — Piste active: <strong>${active}</strong>
    </div>
  `;
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

  // 15 prochains vols
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

    // Highlight vols en approche
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



// Fonction PRO+++ pour afficher les avions
import { map, planesLayer, planeIconApproach, planeIconDeparture } from "./map.js";

export async function updateAircraftPositions() {
  planesLayer.clearLayers();

  const key = "04cb1c09-8abb-468a-95fa-ee90c3c2b651";

  const urls = [
    `https://airlabs.co/api/v9/flights?arr_icao=EBLG&api_key=${key}`,
    `https://airlabs.co/api/v9/flights?dep_icao=EBLG&api_key=${key}`,
    `https://airlabs.co/api/v9/flights?arr_icao=EBCI&api_key=${key}`,
    `https://airlabs.co/api/v9/flights?dep_icao=EBCI&api_key=${key}`
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

  const aircraft = all.filter(f => f.lat && f.lng);

  aircraft.forEach(f => {

    // Déterminer si approche ou départ
    const isApproach =
      f.arr_icao === "EBLG" || f.arr_icao === "EBCI";

    const isDeparture =
      f.dep_icao === "EBLG" || f.dep_icao === "EBCI";

    // Choix de l’icône
    const icon = isApproach ? planeIconApproach : planeIconDeparture;

    const marker = L.marker([f.lat, f.lng], {
      icon: icon,
      rotationAngle: f.dir || 0,
      rotationOrigin: "center"
    });

    marker.bindPopup(`
      <b>${f.flight_iata || f.flight_icao || "?"}</b><br>
      ${f.airline_iata || f.airline_icao || ""}<br>
      ${f.dep_iata || "?"} → ${f.arr_iata || "?"}<br>
      <b>${f.status}</b>
    `);

    planesLayer.addLayer(marker);
  });
}


