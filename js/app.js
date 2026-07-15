/****************************************************
 * APP.JS — Orchestrateur Cockpit IFR PRO+++
 ****************************************************/
/****************************************************
 * Règle IFR — Détection de l’onglet SONO
 ****************************************************/
function isSonoTab() {
  const activeTab = document.querySelector(".mcdu-tab.active")?.dataset.tab;
  return activeTab === "tab-sono";
}

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
 * Processus principal par aéroport — Version PRO+++
 ****************************************************/
export async function processAirport(airportKey) {

  window.currentAirportKey = airportKey;
  const ap = airports[airportKey];

  /***********************
   * Détection onglet actif (IFR)
   ***********************/
  const isSonoTab = isSonoTab(); // Fonction globale dans app.js

  /***********************
   * 1) METAR (toujours fetché, affiché seulement hors SONO)
   ***********************/
  const metar = await fetchMetar(ap.icao);
  ap.lastMetar = metar;
  metar.icao = airportKey;

  /***********************
   * 2) Piste active (toujours calculée)
   ***********************/
  const windDir = Number(metar?.wind_dir) || 0;
  const windSpd = Number(metar?.wind_speed) || 0;

  const activeRunway = computeRunway(ap, windDir);
  ap.activeRunway = activeRunway;
  window.activeRunway = activeRunway;

  /***********************
   * 3) Affichages METAR / HUD / Rose / Station
   *    👉 uniquement si on n’est PAS dans SONO
   ***********************/
  if (!isSonoTab) {

    updateMetarUI(
      airportKey,
      metar,
      airportKey === "EBCI" ? "metar-ebci" : "metar-eblg"
    );

    updateRunwayHUD(ap, windDir, windSpd);

    updateWindRose(metar);

    const station = await fetchStationInfo(ap.icao);
    updateStationUI(airportKey, station);
  }

  /***********************
   * 4) ILS dynamique (toujours)
   ***********************/
  refreshILS();

  /***********************
   * 5) SONO (toujours)
   ***********************/
  updateSono(airportKey, activeRunway, map);

  /***********************
   * 6) FIDS avionique (toujours)
   ***********************/
  updateFidsFlights(airportKey);
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
const ebciSection = document.getElementById("sidebar-ebci");
const eblgSection = document.getElementById("sidebar-eblg");

document.querySelectorAll(".sidebar-btn").forEach(btn => {
  btn.addEventListener("click", () => {

    // Highlight bouton actif
    document.querySelectorAll(".sidebar-btn").forEach(b => b.classList.remove("active"));
    btn.classList.add("active");

    const target = btn.dataset.target;

    if (target === "EBCI") {
      ebciSection.style.display = "block";
      eblgSection.style.display = "none";
    }

    else if (target === "EBLG") {
      ebciSection.style.display = "none";
      eblgSection.style.display = "block";
    }

    else {
      ebciSection.style.display = "block";
      eblgSection.style.display = "block";
    }
  });
});
  
/***********************
 * Boutons SONO : EBCI / EBLG / Tous
 ***********************/
const sonoEBCI = document.getElementById("sono-ebci");
const sonoEBLG = document.getElementById("sono-eblg");

document.querySelectorAll(".sidebar-btn").forEach(btn => {
  btn.addEventListener("click", () => {

    // Highlight bouton actif
    document.querySelectorAll(".sidebar-btn").forEach(b => b.classList.remove("active"));
    btn.classList.add("active");

    const target = btn.dataset.target;

    if (target === "EBCI") {
      sonoEBCI.style.display = "block";
      sonoEBLG.style.display = "none";
    }

    else if (target === "EBLG") {
      sonoEBCI.style.display = "none";
      sonoEBLG.style.display = "block";
    }

    else {
      sonoEBCI.style.display = "block";
      sonoEBLG.style.display = "block";
    }
  });
});
  
/***********************
 * Collapse SONO IFR
 ***********************/
document.querySelectorAll(".sono-collapse-header").forEach(header => {
  header.addEventListener("click", () => {
    const parent = header.parentElement;
    parent.classList.toggle("collapsed");
  });
});


});
