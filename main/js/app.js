/****************************************************
 * APP.JS — Orchestrateur Cockpit IFR PRO+++
 ****************************************************/

/****************************************************
 * Détection de l’onglet SONO
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

import { computeWindComponents } from "./wind-components.js";   // ✔ CORRECT

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

  const comp = computeWindComponents(best.heading, windDirDeg, windSpeedKt);

  return {
    name: best.name,
    heading: best.heading,
    angle: comp.angle,
    headwind: comp.headwind,
    crosswind: comp.crosswind,
    color: runwayColor(comp.crosswind)
  };
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

  const windDir = Number(metar?.wind_dir) || 0;
  const windSpd = Number(metar?.wind_speed) || 0;

  const locDev = ilsData?.locDev || 0;
  const gsDev = ilsData?.gsDev || 0;

  const ac = airports[airportKey].aircraft || {};

  const data = {
    pitch: ac.pitch || 2,
    bank: ac.bank || 5,
    speed: ac.gs || 140,
    altitude: ac.altFt || 3000,
    vsi: ac.vsi || 200,
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

  airports.current = airportKey;
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
