/****************************************************
 * APP.JS — Orchestrateur Cockpit IFR PRO+++
 ****************************************************/

/****************************************************
 * Détection de l’onglet SONO (globale IFR)
 ****************************************************/
window.isSonoTab = function () {
  const activeTab = document.querySelector(".mcdu-tab.active")?.dataset.tab;
  return activeTab === "tab-sono";
};

/****************************************************
 * IMPORTS — Modules Airbus PRO+++
 ****************************************************/
import { updateNdAirbus } from "./nd-airbus.js";
import { refreshIlsNd } from "./ils-nd.js";

import { airports } from "./config.js";

import { initMap, map, resetMapView } from "./map.js";

import { fetchMetar, updateMetarUI } from "./metar.js";
import { fetchTaf, updateTafUI } from "./taf.js";

import { updateWindRose } from "./windrose.js";

import { refreshILS } from "./ils.js";

import { updateSono } from "./sono.js";

import { updateFidsFlights, startFidsLive } from "./fids-adsb.js";

import { initTabs } from "./tabs.js";

import { angleDiff } from "./utils.js";

import { fetchStationInfo, updateStationUI } from "./station.js";

import { updateRunwayHUD } from "./hud.js";

import { drawPFD } from "./pfd.js";

/****************************************************
 * Détection piste active (computeRunway)
 ****************************************************/
export function computeRunway(airport, windDirDeg, windSpeedKt) {
  if (!airport || !airport.runways || airport.runways.length === 0) {
    console.warn("No runway data for airport", airport);
    return null;
  }

  if (isNaN(windDirDeg)) windDirDeg = 0;

  let best = null;
  let bestDiff = 999;

  airport.runways.forEach(rw => {
    const heading = Number(rw.heading);
    if (isNaN(heading)) return;

    const diff = Math.abs(((windDirDeg - heading + 180) % 360) - 180);

    if (diff < bestDiff) {
      bestDiff = diff;
      best = rw;
    }
  });

  if (!best) return null;

  const comp = computeWindComponents(windDirDeg, windSpeedKt, best.heading);

  return {
    name: best.name,
    heading: best.heading,
    angle: comp.angle,
    headwind: comp.headwind,
    crosswind: comp.crosswind,
    color: runwayColor(comp.crosswind)
  };
}

function computeWindComponents(windDirDeg, windSpeedKt, runwayHeadingDeg) {
  if (isNaN(windDirDeg) || isNaN(windSpeedKt) || isNaN(runwayHeadingDeg)) {
    return { headwind: 0, crosswind: 0, angle: 0 };
  }

  const angle = Math.abs(((windDirDeg - runwayHeadingDeg + 180) % 360) - 180);
  const rad = angle * Math.PI / 180;

  const headwind = Math.round(windSpeedKt * Math.cos(rad));
  const crosswind = Math.round(windSpeedKt * Math.sin(rad));

  return { headwind, crosswind, angle };
}

/****************************************************
 * conversion kt vers Ms
 ****************************************************/
function ktToMs(kt) {
  return (kt * 0.514444).toFixed(1);
}

function runwayColor(crosswind) {
  if (crosswind <= 10) return "runway-green";
  if (crosswind <= 20) return "runway-orange";
  return "runway-red";
}

/****************************************************
 * PFD — Génération avionique Airbus PRO+++
 ****************************************************/
function updatePFD(airportKey, metar, ilsData) {

  const canvas =
    airportKey === "EBCI"
      ? document.getElementById("pfd-canvas-EBCI")
      : document.getElementById("pfd-canvas-EBLG");

  if (!canvas) return;

  // Données METAR
  const windDir = Number(metar?.wind_dir) || 0;
  const windSpd = Number(metar?.wind_speed) || 0;

  // Données ILS
  const locDev = ilsData?.locDev || 0;
  const gsDev = ilsData?.gsDev || 0;

  // Données avion (AirLabs ou FIDS)
  const speed = window.airlabs?.[airportKey]?.speed || 140;
  const altitude = window.airlabs?.[airportKey]?.altitude || 3000;
  const vsi = window.airlabs?.[airportKey]?.vsi || 200;
  const pitch = window.airlabs?.[airportKey]?.pitch || 2;
  const bank = window.airlabs?.[airportKey]?.bank || 5;

  const data = {
    pitch,
    bank,
    speed,
    altitude,
    vsi,
    locDev,
    gsDev,
    ap: true,
    athr: true,
    loc: ilsData?.locActive || false,
    gs: ilsData?.gsActive || false
  };

  drawPFD(canvas, data);
}

/****************************************************
 * Processus principal par aéroport — Version PRO+++
 ****************************************************/
export async function processAirport(airportKey) {

  window.currentAirportKey = airportKey;
  const ap = airports[airportKey];

  const sonoMode = window.isSonoTab();

  /***********************
   * 1) METAR
   ***********************/
  const metar = await fetchMetar(ap.icao);
  ap.lastMetar = metar;
  metar.icao = airportKey;

  /***********************
   * 2) Piste active
   ***********************/
  const windDir = Number(metar?.wind_dir) || 0;
  const windSpd = Number(metar?.wind_speed) || 0;

  const rw = computeRunway(ap, windDir, windSpd);

  ap.activeRunway = rw;
  window.activeRunway = rw;

  /***********************
   * 3) METAR / HUD / Rose / Station
   ***********************/
  if (!sonoMode) {

    updateMetarUI(
      airportKey,
      metar,
      airportKey === "EBCI" ? "metar-ebci" : "metar-eblg"
    );

    updateRunwayHUD(ap, windDir, windSpd);

    updateWindRose(metar);

    const station = await fetchStationInfo(ap.icao);
    updateStationUI(airportKey, station, ap.lastMetar);
  }

  /***********************
   * 4) ILS dynamique
   ***********************/
  refreshILS();
  
  /***********************
   * 5) PFD Airbus PRO+++
   ***********************/
  updatePFD(airportKey, metar, window.ilsData?.[airportKey]);

  /***********************
   * 6) SONO
   ***********************/
  if (ap.activeRunway?.name) {
    updateSono(airportKey, ap.activeRunway.name, map);
  }

  /***********************
   * 7) FIDS avionique
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

    await Promise.all([
      processAirport("EBCI"),
      processAirport("EBLG")
    ]);
    
 // démarrage du mode LIVE FIDS
    startFidsLive();
    
    /********************************************
   * Rafraîchissement PFD — FULL GLASS COCKPIT
   ********************************************/
  setInterval(() => {
    updatePFD("EBCI", airports.EBCI.lastMetar, window.ilsData?.EBCI);
    updatePFD("EBLG", airports.EBLG.lastMetar, window.ilsData?.EBLG);
  }, 2000);
    

    /********************************************
     * Rafraîchissement SONO
     ********************************************/
    setInterval(() => {
      if (airports.EBCI.activeRunway?.name) {
        updateSono("EBCI", airports.EBCI.activeRunway.name, map);
      }
      if (airports.EBLG.activeRunway?.name) {
        updateSono("EBLG", airports.EBLG.activeRunway.name, map);
      }
    }, 30000);
  });

  /********************************************
   * Rafraîchissement FIDS - supprimé
   ********************************************/
 

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
   * Filtre EBCI / EBLG / ALL
   ***********************/
 const filterGroups = {
  EBCI: [
    document.getElementById("wind-rose-ebci")?.parentElement,
    document.getElementById("metar-ebci")?.parentElement,
    document.getElementById("station-ebci")?.parentElement,
    document.getElementById("sono-status-ebci")?.parentElement?.parentElement,
    document.getElementById("fids-arr-ebci")?.parentElement?.parentElement,
    document.getElementById("runway-ebci")?.parentElement
  ],
  EBLG: [
    document.getElementById("wind-rose-eblg")?.parentElement,
    document.getElementById("metar-eblg")?.parentElement,
    document.getElementById("station-eblg")?.parentElement,
    document.getElementById("sono-status-eblg")?.parentElement?.parentElement,
    document.getElementById("fids-arr-eblg")?.parentElement?.parentElement,
    document.getElementById("runway-eblg")?.parentElement
  ]
};
  
const filterND = {
  EBCI: [
    document.querySelector('.nd-box:nth-child(1)')
  ],
  EBLG: [
    document.querySelector('.nd-box:nth-child(2)')
  ]
};

document.querySelectorAll(".sidebar-btn").forEach(btn => {
  btn.addEventListener("click", () => {

    document.querySelectorAll(".sidebar-btn")
      .forEach(b => b.classList.remove("active"));
    btn.classList.add("active");

    const target = btn.dataset.target;

    if (target === "EBCI") {

      // METAR / SONO / FIDS
      filterGroups.EBCI.forEach(el => el && (el.style.display = "block"));
      filterGroups.EBLG.forEach(el => el && (el.style.display = "none"));

      // ND + PFD
      filterND.EBCI.forEach(el => el && (el.style.display = "block"));
      filterND.EBLG.forEach(el => el && (el.style.display = "none"));
    }

    else if (target === "EBLG") {

      // METAR / SONO / FIDS
      filterGroups.EBCI.forEach(el => el && (el.style.display = "none"));
      filterGroups.EBLG.forEach(el => el && (el.style.display = "block"));

      // ND + PFD
      filterND.EBCI.forEach(el => el && (el.style.display = "none"));
      filterND.EBLG.forEach(el => el && (el.style.display = "block"));
    }

    else {

      // METAR / SONO / FIDS
      filterGroups.EBCI.forEach(el => el && (el.style.display = "block"));
      filterGroups.EBLG.forEach(el => el && (el.style.display = "block"));

      // ND + PFD
      filterND.EBCI.forEach(el => el && (el.style.display = "block"));
      filterND.EBLG.forEach(el => el && (el.style.display = "block"));
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
