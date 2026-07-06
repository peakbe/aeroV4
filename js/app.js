/****************************************************
 * APP.JS — Orchestrateur Cockpit IFR PRO+++
 ****************************************************/

import { AIRLABS_API_KEY } from "./config.js";
import { airports } from "./config.js";
import { initMap, map, resetMapView, refreshILS } from "./map.js";
import { fetchMetar, updateMetarUI, fetchTaf, updateTafUI, updateWindRose, initMetarSwitch } from "./metar.js";
import { updateSono } from "./sono.js";
import { updateFidsList, updateFidsFlights } from "./fids.js";
import { updateRunwayHUD } from "./fids.js";
import { initTabs } from "./tabs.js";
import { angleDiff } from "./utils.js";
import { updateAircraftPositions } from "./fids.js";
import { fetchStationInfo } from "./station.js";

/****************************************************
 * Détection piste active (computeRunway)
 ****************************************************/
export function computeRunway(airport, windDirDeg) {
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
 * Processus principal par aéroport — Version optimisée
 ****************************************************/
export async function processAirport(airportKey) {
  window.currentAirportKey = airportKey;

  const ap = airports[airportKey];

  /***********************
   * 1) METAR (AirLabs)
   ***********************/
  const metar = await fetchMetar(ap.icao);
  ap.lastMetar = metar;
  updateMetarUI(airportKey, metar);

  /***********************
   * 2) TAF (AirLabs)
   ***********************/
  const taf = await fetchTaf(ap.icao);
  updateTafUI(airportKey, taf);

  /***********************
   * 3) Rose des vents
   ***********************/
  updateWindRose(metar);

  /***********************
   * 4) Piste active (AirLabs)
   ***********************/
  const windDir = metar?.wind_dir;
  const windSpd = metar?.wind_speed;

  const activeRunway = computeRunway(ap, windDir);
  window.activeRunway = activeRunway;   // ⭐ utilisé par ILS dynamique + SONO

  updateRunwayHUD(ap, windDir, windSpd);

  /***********************
   * 5) ILS dynamique
   ***********************/
  refreshILS();   // ⭐ maintenant au bon endroit

  /***********************
   * 6) SONO
   ***********************/
  updateSono(airportKey, activeRunway, map);

  /***********************
   * 7) FIDS avionique
   ***********************/
  updateFidsFlights(airportKey);
  updateFidsList(airportKey);
}
 /***********************
   *8) Station météo
   ***********************/

const station = await fetchStationInfo(ap.icao);
updateStationUI(airportKey, station);

/****************************************************
 * Initialisation cockpit IFR
 ****************************************************/
document.addEventListener("DOMContentLoaded", async () => {

  initTabs();
  initMap();          // ⭐ protégé dans map.js
  initMetarSwitch();

  map.whenReady(async () => {

    updateAircraftPositions();
    setInterval(updateAircraftPositions, 30000);

    await Promise.all([
      processAirport("EBCI"),
      processAirport("EBLG")
    ]);
  });

  const toggle = document.getElementById("toggle-sono");
  if (toggle) {
    toggle.checked = true;
    toggle.addEventListener("change", () => {
      window.sonoEnabled = toggle.checked;
      const ind = document.querySelector(".mcd-switch-indicator");
      if (ind) ind.textContent = window.sonoEnabled ? "ON" : "OFF";
    });
  }

  const resetBtn = document.getElementById("reset-map");
  if (resetBtn) {
    resetBtn.addEventListener("click", () => {
      if (window.currentAirportKey) {
        resetMapView(window.currentAirportKey);
      }
    });
  }

});

