/****************************************************
 * APP.JS — Orchestrateur Cockpit IFR PRO+++
 ****************************************************/

import { airports } from "./config.js";
import { initMap, map, resetMapView } from "./map.js";
import { fetchMetar, updateMetarUI, fetchTaf, updateTafUI, injectMetarEmbed, updateWindRose, initMetarSwitch } from "./metar.js";
import { updateSono } from "./sono.js";
import { updateFidsList, updateFidsFlights, updateFidsConfirmed } from "./fids.js";
import { updateRunwayHUD } from "./fids.js";
import { initTabs } from "./tabs.js";
import { angleDiff } from "./utils.js";
import { updateAircraftPositions } from "./fids.js";

setInterval(updateAircraftPositions, 30000);
updateAircraftPositions();
;

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
  window.currentAirportKey = airportKey;

  const ap = airports[airportKey];

  // METAR
  const metar = await fetchMetar(ap.icao);
  updateMetarUI(airportKey, metar);

  // TAF
  const taf = await fetchTaf(ap.icao);
  updateTafUI(airportKey, taf);

  // Embed METAR-TAF.com
  injectMetarEmbed(airportKey);

  // Rose des vents
  updateWindRose(metar);

  // Piste active
  const windDir = metar?.wind_direction?.value;
  const activeRunway = computeRunway(ap, windDir);

  updateRunwayHUD(ap, windDir);

  // SONO
  updateSono(airportKey, activeRunway, map);

  // ⭐ FIDS — Sonomètres + Vols + Confirmés
  updateFidsFlights(airportKey);

  updateFidsList(airportKey);
  updateFidsFlights(airportKey);
  updateFidsConfirmed();
}

/****************************************************
 * Initialisation cockpit IFR
 ****************************************************/
document.addEventListener("DOMContentLoaded", async () => {

  initTabs();
  initMap();
  initMetarSwitch();

  // Attendre que la carte soit prête
  map.whenReady(async () => {
    await Promise.all([
      processAirport("EBCI"),
      processAirport("EBLG")
    ]);
  });

  /****************************************************
   * Bouton SONO ON/OFF
   ****************************************************/
  const toggle = document.getElementById("toggle-sono");
  if (toggle) {
    toggle.checked = true;
    toggle.addEventListener("change", () => {
      window.sonoEnabled = toggle.checked;
      const ind = document.querySelector(".mcd-switch-indicator");
      if (ind) ind.textContent = window.sonoEnabled ? "ON" : "OFF";
    });
  }

  /****************************************************
   * Bouton RESET MAP — centré sur l’aéroport actif
   ****************************************************/
  const resetBtn = document.getElementById("reset-map");
  if (resetBtn) {
    resetBtn.addEventListener("click", () => {
      if (window.currentAirportKey) {
        resetMapView(window.currentAirportKey);
      }
    });
  }
});
