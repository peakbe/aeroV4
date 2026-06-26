/****************************************************
 * APP.JS — Orchestrateur Cockpit IFR PRO+++
 ****************************************************/

import { airports } from "./config.js";
import { initMap } from "./map.js";
import { fetchMetar, updateMetarUI } from "./metar.js";
import { updateSono } from "./sono.js";
import { updateRunwayHUD } from "./fids.js";
import { initTabs } from "./tabs.js";
import { angleDiff } from "./utils.js";

/****************************************************
 * Détection piste active (computeRunway)
 ****************************************************/
function computeRunway(airport, windDirDeg) {
  if (!windDirDeg) return null;

  let best = null;
  let bestDiff = 999;

  airport.runways.forEach(rw => {
    const diff = angleDiff(windDirDeg, rw.heading);
    if (diff < bestDiff) {
      bestDiff = diff;
      best = rw;
    }
  });

  return best ? best.name : null;
}

/****************************************************
 * Processus principal par aéroport
 ****************************************************/
async function processAirport(airportKey) {
  const ap = airports[airportKey];

  const metar = await fetchMetar(ap.icao);
  updateMetarUI(airportKey, metar);

  const windDir = metar?.wind_direction?.value;
  const activeRunway = computeRunway(ap, windDir);

  updateRunwayHUD(ap, windDir);

  // IMPORTANT : envoyer la carte Leaflet
  updateSono(airportKey, activeRunway, map);
}

/****************************************************
 * Initialisation cockpit IFR
 ****************************************************/
document.addEventListener("DOMContentLoaded", async () => {

  initTabs();
  initMap();

  await Promise.all([
    processAirport("EBCI"),
    processAirport("EBLG")
  ]);
});

