/****************************************************
 * APP.JS — Orchestrateur Cockpit IFR PRO+++
 ****************************************************/

import { airports } from "./config.js";

import { initMap, map, resetMapView } from "./map.js";

import { fetchMetar, updateMetarUI } from "./metar.js";
import { fetchTaf, updateTafUI, initMetarSwitch } from "./taf.js";

import { updateWindRose } from "./windrose.js";

import { updateRunwayHUD, refreshILS } from "./ils.js";

import { updateSono } from "./sono.js";

import { updateFidsFlights } from "./fids.js";

import { initTabs } from "./tabs.js";

import { angleDiff } from "./utils.js";

import { fetchStationInfo, updateStationUI } from "./station.js";

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
   * 1) METAR
   ***********************/
  const metar = await fetchMetar(ap.icao);
  ap.lastMetar = metar;
  updateMetarUI(airportKey, metar, airportKey === "EBCI" ? "metar-ebci" : "metar-eblg");


  /***********************
   * 2) TAF
   ***********************/
  // const taf = await fetchTaf(ap.icao);
  // updateTafUI(airportKey, taf);

  /***********************
   * 3) Rose des vents
   ***********************/
  updateWindRose(metar);

  /***********************
   * 4) Piste active
   ***********************/
  const windDir = metar?.wind_dir;
  const windSpd = metar?.wind_speed;

  const activeRunway = computeRunway(ap, windDir);

  // ⭐ Piste active globale (ancienne logique)
  window.activeRunway = activeRunway;

  // ⭐ Piste active PAR AÉROPORT (nouvelle logique)
  ap.activeRunway = activeRunway;

  updateRunwayHUD(ap, windDir, windSpd);

  /***********************
   * 5) ILS dynamique
   ***********************/
  refreshILS();

  /***********************
   * 6) SONO
   ***********************/
  updateSono(airportKey, ap.activeRunway, map);

  /***********************
   * 7) FIDS avionique
   ***********************/
  updateFidsFlights(airportKey);

  /***********************
   * 8) Station météo
   ***********************/
  const station = await fetchStationInfo(ap.icao);
  updateStationUI(airportKey, station);
}


/****************************************************
 * Initialisation cockpit IFR
 ****************************************************/
document.addEventListener("DOMContentLoaded", async () => {

  initTabs();
  initMap();
  initMetarSwitch();

  map.whenReady(async () => {

    /********************************************
     * IMPORTANT : processAirport AVANT SONO LOOP
     ********************************************/
    await Promise.all([
      processAirport("EBCI"),
      processAirport("EBLG")
    ]);

    /********************************************
     * Rafraîchissement SONO toutes les 30 sec
     ********************************************/
    setInterval(() => {
      updateSono("EBCI", airports.EBCI.activeRunway, map);
      updateSono("EBLG", airports.EBLG.activeRunway, map);
    }, 30000);
  });

  /***********************
   * Toggle SONO
   ***********************/
  const toggle = document.getElementById("toggle-sono");
  if (toggle) {
    toggle.checked = true;
    toggle.addEventListener("change", () => {
      window.sonoEnabled = toggle.checked;
      const ind = document.querySelector(".mcd-switch-indicator");
      if (ind) ind.textContent = window.sonoEnabled ? "ON" : "OFF";
    });
  }

  /***********************
   * Reset MAP
   ***********************/
  const resetBtn = document.getElementById("reset-map");
  if (resetBtn) {
    resetBtn.addEventListener("click", () => {
      if (window.currentAirportKey) {
        resetMapView(window.currentAirportKey);
      }
    });
  }

});
