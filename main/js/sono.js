/****************************************************
 * SONO MODULE PRO+++ — Cockpit IFR
 ****************************************************/
/* global L */
import { airports } from "./config.js";
import { sonometersEBCI, sonometersEBLG } from "./sono-data.js";

window.sonoEnabled = true;

/****************************************************
 * Utilitaire IFR — Conversion RWY → Heading
 ****************************************************/
function runwayHeading(rwy) {
  return parseInt(rwy) * 10; // RWY 24 → 240°
}

/****************************************************
 * 0) Markers Leaflet — création dynamique
 ****************************************************/
let sonoLayerEBCI = null;
let sonoLayerEBLG = null;

let sonoRenderedEBCI = false;
let sonoRenderedEBLG = false;

function renderSonoMarkers(airportKey, map) {
  const list = airportKey === "EBCI" ? sonometersEBCI : sonometersEBLG;
  const group = L.layerGroup();

  list.forEach(s => {
    const marker = L.circleMarker([s.lat, s.lon], {
      radius: 7,
      color: "#e2e8f0",
      fillColor: "#e2e8f0",
      fillOpacity: 0.9,
      weight: 2
    });

    marker.bindPopup(`<b>${s.id}</b><br>${s.address}`);
    marker._sonoId = s.id;

    group.addLayer(marker);
  });

  if (airportKey === "EBCI") {
    sonoLayerEBCI = group;
  } else {
    sonoLayerEBLG = group;
  }

  group.addTo(map);
}

/****************************************************
 * 1) Rendu UI MCDU
 ****************************************************/
let sonoListRenderedEBCI = false;
let sonoListRenderedEBLG = false;

export function updateSonoListUI(airportKey) {
  const list = airportKey === "EBCI" ? sonometersEBCI : sonometersEBLG;
  const id = airportKey === "EBCI" ? "sono-list-ebci" : "sono-list-eblg";
  const el = document.getElementById(id);

  if (!el) return;

  el.innerHTML = list
    .map(s => `<div id="sono-${s.id}" class="sono-line">${s.id} — ${s.address}</div>`)
    .join("");
}

/****************************************************
 * 2) Règles d’affichage SONO
 ****************************************************/
const RULES_EBCI = {
  "24": { green: ["F101","F102","F103","F104","F105","F106","F107","F108","F109","F110","F111","F112","F114","F116","F117","F118","F119"], red: [] },
  "06": { green: ["F101","F102","F103","F104","F105","F106","F107","F108","F109","F110","F111","F112","F119"], red: ["F114","F116","F117","F118"] }
};

const RULES_EBLG = {
  "22": { green: ["F001","F002","F003","F004","F005","F006","F007","F008","F009","F010","F011","F012","F013","F014","F015","F016","F017"], red: [] },
  "04": { green: ["F001","F002","F003","F007","F008","F009","F011","F013","F014","F015"], red: ["F004","F005","F006","F010","F012","F016","F017"] }
};

/****************************************************
 * 3) Application des règles SONO
 ****************************************************/
export function applySonoRules(airportKey, activeRunway, map) {
  const rules = airportKey === "EBCI" ? RULES_EBCI : RULES_EBLG;
  if (!rules[activeRunway]) return;

  const { green, red } = rules[activeRunway];
  const list = airportKey === "EBCI" ? sonometersEBCI : sonometersEBLG;
  const layer = airportKey === "EBCI" ? sonoLayerEBCI : sonoLayerEBLG;

  if (!layer) return;

  // Reset
  list.forEach(s => {
    const el = document.getElementById(`sono-${s.id}`);
    if (el) el.style.color = "#e2e8f0";

    layer.eachLayer(marker => {
      if (marker._sonoId === s.id) {
        marker.setStyle({ color: "#e2e8f0", fillColor: "#e2e8f0" });
      }
    });
  });

  // Green
  green.forEach(id => {
    const el = document.getElementById(`sono-${id}`);
    if (el) el.style.color = "lime";

    layer.eachLayer(marker => {
      if (marker._sonoId === id) {
        marker.setStyle({ color: "lime", fillColor: "lime" });
      }
    });
  });

  // Red
  red.forEach(id => {
    const el = document.getElementById(`sono-${id}`);
    if (el) el.style.color = "red";

    layer.eachLayer(marker => {
      if (marker._sonoId === id) {
        marker.setStyle({ color: "red", fillColor: "red" });
      }
    });
  });
}

/****************************************************
 * 4) Fonction principale — PRO+++
 ****************************************************/
export function updateSono(airportKey, activeRunway, map) {

  const ap = airports[airportKey];
  if (!ap) return;

  const metar = ap.lastMetar;
  if (!metar) return;

  const windDir = metar.wind_dir;
  const windSpd = metar.wind_speed;

  const sonoPanel = document.getElementById(
    airportKey === "EBCI" ? "sono-status-ebci" : "sono-status-eblg"
  );
  if (!sonoPanel) return;

  const color =
    windSpd <= 8 ? "lime" :
    windSpd <= 15 ? "orange" :
    "red";

  const windMs = (windSpd * 0.514444).toFixed(1);

  const runwayName = typeof activeRunway === "string"
    ? activeRunway
    : activeRunway?.name || "N/A";

  /***********************
   * Affichage SONO
   ***********************/
  sonoPanel.innerHTML = `
    <div class="sono-line" style="color:${color}">
      Vent ${windDir}° / ${windMs} m/s — Piste ${runwayName}
    </div>
  `;

  /***********************
   * Indicateur vent IFR
   ***********************/
  const indicatorId = airportKey === "EBCI"
    ? "wind-indicator-ebci"
    : "wind-indicator-eblg";

  const indicator = document.getElementById(indicatorId);

  if (indicator) {
    indicator.textContent = `${windDir}° / ${windMs} m/s — RWY ${runwayName}`;

    const heading = runwayHeading(runwayName);
    const diff = Math.abs(heading - windDir);

    indicator.className =
      diff < 30 ? "wind-indicator lime" :
      diff < 90 ? "wind-indicator orange" :
      "wind-indicator red";
  }

  /***********************
   * Flèche vent IFR
   ***********************/
  const arrowId = airportKey === "EBCI"
    ? "wind-arrow-ebci"
    : "wind-arrow-eblg";

  const arrow = document.getElementById(arrowId);

  if (arrow) {
    arrow.style.transform = `rotate(${windDir}deg)`;

    const heading = runwayHeading(runwayName);
    const diff = Math.abs(heading - windDir);

    arrow.className =
      diff < 30 ? "wind-arrow lime" :
      diff < 90 ? "wind-arrow orange" :
      "wind-arrow red";
  }

  /***********************
   * Génération liste SONO
   ***********************/
  if (airportKey === "EBCI" && !sonoListRenderedEBCI) {
    updateSonoListUI("EBCI");
    sonoListRenderedEBCI = true;
  }
  if (airportKey === "EBLG" && !sonoListRenderedEBLG) {
    updateSonoListUI("EBLG");
    sonoListRenderedEBLG = true;
  }

  /***********************
   * Markers SONO
   ***********************/
  if (airportKey === "EBCI" && !sonoRenderedEBCI) {
    renderSonoMarkers("EBCI", map);
    sonoRenderedEBCI = true;
  }
  if (airportKey === "EBLG" && !sonoRenderedEBLG) {
    renderSonoMarkers("EBLG", map);
    sonoRenderedEBLG = true;
  }

  /***********************
   * Règles SONO
   ***********************/
  applySonoRules(airportKey, runwayName, map);
}
