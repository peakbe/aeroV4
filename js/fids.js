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
