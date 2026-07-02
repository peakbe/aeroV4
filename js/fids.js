import { angleDiff, safeSet } from "./utils.js";

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

export function updateFlightsUI(airportKey, flights) {
  const id = airportKey === "EBCI" ? "flights-ebci" : "flights-eblg";
  const el = document.getElementById(id);
  if (!el) return;

  el.innerHTML = flights
    .slice(0, 10)
    .map(f => `${f.flight_iata || f.flight_icao || "?"} — ${f.aircraft_icao || "?"}`)
    .join("\n");
}

// Liste des sonomètres
export async function updateFidsList(airportKey) {
  const id = airportKey === "EBCI" ? "sonos-ebci" : "sonos-eblg";
  const el = document.getElementById(id);
  if (!el) return;

  el.textContent = "Chargement...";

  try {
    const res = await fetch(`/api/fids/${airportKey}/sonos`);
    const data = await res.json();

    el.innerHTML = data.map(s => `${s.name} — ${s.value} dB`).join("<br>");
  } catch (e) {
    el.textContent = "Erreur FIDS";
  }
}

// Liste des vols
export async function updateFidsFlights(airportKey) {
  const id = airportKey === "EBCI" ? "flights-ebci" : "flights-eblg";
  const el = document.getElementById(id);
  if (!el) return;

  el.textContent = "Chargement...";

  try {
    const res = await fetch(`/api/fids/${airportKey}/flights`);
    const flights = await res.json();

    updateFlightsUI(airportKey, flights);
  } catch (e) {
    el.textContent = "Erreur vols";
  }
}

// Vols confirmés
export async function updateFidsConfirmed() {
  const el = document.getElementById("fids-confirmed");
  if (!el) return;

  el.textContent = "Chargement...";

  try {
    const res = await fetch(`/api/fids/confirmed`);
    const data = await res.json();

    el.innerHTML = data.map(v => `${v.flight} — ${v.status}`).join("<br>");
  } catch (e) {
    el.textContent = "Erreur confirmés";
  }
}
