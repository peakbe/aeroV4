/****************************************************
 * APP.JS — Orchestrateur Cockpit IFR PRO+++
 ****************************************************/

/****************************************************
 * Règle IFR — Détection de l’onglet SONO (globale)
 ****************************************************/
window.isSonoTab = function () {
  const activeTab = document.querySelector(".mcdu-tab.active")?.dataset.tab;
  return activeTab === "tab-sono";
};

/****************************************************
 * IMPORTS
 ****************************************************/
import { updateNdAirbus } from "./nd-airbus.js";
import { refreshIlsNd } from "./ils-nd.js";
import { airports } from "./config.js";
import { AVWX_API_KEY } from "./config.js";
import { initMap, map, resetMapView } from "./map.js";
import { fetchMetar, updateMetarUI } from "./metar.js";
import { fetchTaf, updateTafUI } from "./taf.js";
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

  // Calcul vent de face / travers
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


// Calcul vent de face / vent de travers
function computeWindComponents(windDirDeg, windSpeedKt, runwayHeadingDeg) {
  if (isNaN(windDirDeg) || isNaN(windSpeedKt) || isNaN(runwayHeadingDeg)) {
    return { headwind: 0, crosswind: 0, angle: 0 };
  }

  // Angle vent/piste
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

  /***********************
   * Détection onglet actif (IFR)
   ***********************/
  const sonoMode = window.isSonoTab(); // ✔ pas de shadowing

  /***********************
   * 1) METAR (toujours fetché)
   ***********************/
  const metar = await fetchMetar(ap.icao);
  ap.lastMetar = metar;
  metar.icao = airportKey;

  /***********************
   * 2) Piste active (toujours calculée)
   ***********************/
  /***********************
 * 2) Piste active (toujours calculée)
 ***********************/
const windDir = Number(metar?.wind_dir) || 0;
const windSpd = Number(metar?.wind_speed) || 0;

// Nouveau computeRunway PRO+++
const rw = computeRunway(ap, windDir, windSpd);

// Sauvegarde cockpit IFR
ap.activeRunway = rw;
window.activeRunway = rw;

// Affichage piste active (crosswind / headwind / angle)
document.getElementById(`runway-${airportKey.toLowerCase()}`).innerHTML = `
  <div class="${rw.color}">
    Piste active : ${rw.name}
    <br>Vent de face : ${rw.headwind} kt
    <br>Vent de travers : ${rw.crosswind} kt
    <br>Angle vent/piste : ${rw.angle}°
  </div>
`;

  /***********************
   * 3) METAR / HUD / Rose / Station
   *    👉 uniquement si on n’est PAS dans SONO
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
   * 4) ILS dynamique (toujours)
   ***********************/
  refreshILS();    // ton ILS classique
 
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
 * Tracking AirLabs — EBCI + EBLG (ND Airbus)
 ********************************************/
setInterval(async () => {
  try {
    // EBCI — Arrivées vers CRL
    const urlEbci = `https://airlabs.co/api/v9/flights?api_key=${AVWX_API_KEY}&arr_iata=CRL`;
    const resEbci = await fetch(urlEbci);
    const dataEbci = await resEbci.json();

    if (dataEbci.response && dataEbci.response.length > 0) {
      const flightEbci = dataEbci.response[0];

      airports.EBCI.aircraft.lat   = flightEbci.lat;
      airports.EBCI.aircraft.lon   = flightEbci.lng;
      airports.EBCI.aircraft.altFt = flightEbci.alt;
      airports.EBCI.aircraft.hdg   = flightEbci.dir;
      airports.EBCI.aircraft.gs    = flightEbci.speed;

      refreshIlsNd();
      updateNdAirbus("EBCI");
    } else {
      console.warn("AirLabs: aucun vol trouvé vers CRL (EBCI)");
    }

    // EBLG — Arrivées vers LGG
    const urlEblg = `https://airlabs.co/api/v9/flights?api_key=${AVWX_API_KEY}&arr_iata=LGG`;
    const resEblg = await fetch(urlEblg);
    const dataEblg = await resEblg.json();

    if (dataEblg.response && dataEblg.response.length > 0) {
      const flightEblg = dataEblg.response[0];

      airports.EBLG.aircraft.lat   = flightEblg.lat;
      airports.EBLG.aircraft.lon   = flightEblg.lng;
      airports.EBLG.aircraft.altFt = flightEblg.alt;
      airports.EBLG.aircraft.hdg   = flightEblg.dir;
      airports.EBLG.aircraft.gs    = flightEblg.speed;

      refreshIlsNd();
      updateNdAirbus("EBLG");
    } else {
      console.warn("AirLabs: aucun vol trouvé vers LGG (EBLG)");
    }

  } catch (err) {
    console.error("AirLabs error:", err);
  }
}, 5000);



    /********************************************
     * Rafraîchissement SONO toutes les 30 sec
     ********************************************/
    setInterval(() => {
      updateSono("EBCI", airports.EBCI.activeRunway, map);
      updateSono("EBLG", airports.EBLG.activeRunway, map);
    }, 30000);
  });
  
  /********************************************
   * Rafraîchissement FIDS toutes les 30 sec
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
   * Affichage EBCI-EBLG dans la side-bar
   ***********************/
  const ebciSection = document.getElementById("sidebar-ebci");
  const eblgSection = document.getElementById("sidebar-eblg");

  document.querySelectorAll(".sidebar-btn").forEach(btn => {
    btn.addEventListener("click", () => {

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
