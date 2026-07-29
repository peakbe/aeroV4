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

import { airports, AVWX_API_KEY } from "./config.js";

import { initMap, map, resetMapView } from "./map.js";

import { fetchMetar, updateMetarUI } from "./metar.js";
import { fetchTaf, updateTafUI } from "./taf.js";

import { updateWindRose } from "./windrose.js";

import { refreshILS } from "./ils.js";

import { updateSono } from "./sono.js";

import { updateFidsFlights } from "./fids.js";

import { initTabs } from "./tabs.js";

import { angleDiff } from "./utils.js";

import { fetchStationInfo, updateStationUI } from "./station.js";

import { updateRunwayHUD } from "./hud.js";

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

function runwayColor(crosswind) {
  if (crosswind <= 10) return "runway-green";
  if (crosswind <= 20) return "runway-orange";
  return "runway-red";
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
   * 5) SONO
   ***********************/
  if (ap.activeRunway?.name) {
    updateSono(airportKey, ap.activeRunway.name, map);
  }

  /***********************
   * 6) FIDS avionique
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

    /********************************************
     * Tracking AirLabs — ND Airbus
     ********************************************/
    setInterval(async () => {
      try {
        // EBCI
        const urlEbci = `https://airlabs.co/api/v9/flights?api_key=${AVWX_API_KEY}&arr_iata=CRL`;
        const resEbci = await fetch(urlEbci);
        const dataEbci = await resEbci.json();

        if (dataEbci.response && dataEbci.response.length > 0) {
          const f = dataEbci.response[0];

          airports.EBCI.aircraft.lat   = f.lat;
          airports.EBCI.aircraft.lon   = f.lng;
          airports.EBCI.aircraft.altFt = f.alt;
          airports.EBCI.aircraft.hdg   = f.dir;
          airports.EBCI.aircraft.gs    = f.speed;

          refreshIlsNd();
          updateNdAirbus("EBCI");
        }

        // EBLG
        const urlEblg = `https://airlabs.co/api/v9/flights?api_key=${AVWX_API_KEY}&arr_iata=LGG`;
        const resEblg = await fetch(urlEblg);
        const dataEblg = await resEblg.json();

        if (dataEblg.response && dataEblg.response.length > 0) {
          const f = dataEblg.response[0];

          airports.EBLG.aircraft.lat   = f.lat;
          airports.EBLG.aircraft.lon   = f.lng;
          airports.EBLG.aircraft.altFt = f.alt;
          airports.EBLG.aircraft.hdg   = f.dir;
          airports.EBLG.aircraft.gs    = f.speed;

          refreshIlsNd();
          updateNdAirbus("EBLG");
        }

      } catch (err) {
        console.error("AirLabs error:", err);
      }
    }, 5000);

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
   * Rafraîchissement FIDS
   ********************************************/
  setInterval(() => {
    updateFidsFlights("EBCI");
    updateFidsFlights("EBLG");
  }, 30000);

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
  const sections = {
    EBCI: [
      document.getElementById("wind-rose-ebci"),
      document.getElementById("metar-ebci"),
      document.getElementById("station-ebci")
    ].filter(Boolean),
    EBLG: [
      document.getElementById("wind-rose-eblg"),
      document.getElementById("metar-eblg"),
      document.getElementById("station-eblg")
    ].filter(Boolean)
  };

  document.querySelectorAll(".sidebar-btn").forEach(btn => {
    btn.addEventListener("click", () => {

      document.querySelectorAll(".sidebar-btn")
        .forEach(b => b.classList.remove("active"));
      btn.classList.add("active");

      const target = btn.dataset.target;

      if (target === "EBCI") {
        sections.EBCI.forEach(el => el.style.display = "block");
        sections.EBLG.forEach(el => el.style.display = "none");
      }
      else if (target === "EBLG") {
        sections.EBCI.forEach(el => el.style.display = "none");
        sections.EBLG.forEach(el => el.style.display = "block");
      }
      else {
        sections.EBCI.forEach(el => el.style.display = "block");
        sections.EBLG.forEach(el => el.style.display = "block");
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
