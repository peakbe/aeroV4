/****************************************************
 * APP.JS — Orchestrateur Cockpit IFR PRO+++
 ****************************************************/

import { airports } from "./config.js";

import { initMap, map, resetMapView } from "./map.js";

import { fetchMetar, updateMetarUI } from "./metar.js";
import { fetchTaf, updateTafUI, } from "./taf.js";

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

  // ICAO indispensable pour la rose des vents
  metar.icao = airportKey;

  // Affichage METAR
  updateMetarUI(
    airportKey,
    metar,
    airportKey === "EBCI" ? "metar-ebci" : "metar-eblg"
  );

  // Affichage rose des vents (une seule fois)
  updateWindRose(metar);

  /***********************
   * 2) TAF (désactivé)
   ***********************/
  // const taf = await fetchTaf(ap.icao);
  // updateTafUI(airportKey, taf);

  /***********************
   * 3) Piste active
   ***********************/
  const windDir = metar?.wind_dir;
  const windSpd = metar?.wind_speed;

  const activeRunway = computeRunway(ap, windDir);

  window.activeRunway = activeRunway;
  ap.activeRunway = activeRunway;

  updateRunwayHUD(ap, windDir, windSpd);

  /***********************
   * 4) ILS dynamique
   ***********************/
  refreshILS();

  /***********************
   * 5) SONO
   ***********************/
  updateSono(airportKey, ap.activeRunway, map);

  /***********************
   * 6) FIDS avionique
   ***********************/
  updateFidsFlights(airportKey);

  /***********************
   * 7) Station météo
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
  //const toggle = document.getElementById("toggle-sono");
  //if (toggle) {
    //toggle.checked = true;
    //toggle.addEventListener("change", () => {
     // window.sonoEnabled = toggle.checked;
      //const ind = document.querySelector(".mcd-switch-indicator");
      //if (ind) ind.textContent = window.sonoEnabled ? "ON" : "OFF";
   // });
 // }

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

   /***********************
   * Affichage EBCI-EBLG dans la side-bar
   ***********************/
document.addEventListener("DOMContentLoaded", () => {

  const ebci = document.getElementById("sidebar-ebci");
  const eblg = document.getElementById("sidebar-eblg");

  document.querySelectorAll(".sidebar-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      const target = btn.dataset.target;

      if (target === "EBCI") {
        ebci.style.display = "block";
        eblg.style.display = "none";
      }

      else if (target === "EBLG") {
        ebci.style.display = "none";
        eblg.style.display = "block";
      }

      else {
        ebci.style.display = "block";
        eblg.style.display = "block";
      }
    });
  });

});

