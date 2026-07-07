/****************************************************
 * SONO MODULE PRO+++ — Cockpit IFR
 ****************************************************/
/* global L */
import { airports } from "./config.js";
import { sonometersEBCI, sonometersEBLG } from "./sono-data.js";
import { sonoLayer } from "./map.js";

window.sonoEnabled = true;

/* -------------------------------------------------
   0) Markers Leaflet — création dynamique (optimisée)
--------------------------------------------------*/
let sonoLayerEBCI = null;
let sonoLayerEBLG = null;

let sonoRenderedEBCI = false;
let sonoRenderedEBLG = false;

function renderSonoMarkers(airportKey, map) {
  const list = airportKey === "EBCI" ? sonometersEBCI : sonometersEBLG;

  
const group = sonoLayer;


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

/* -------------------------------------------------
   1) Rendu UI MCDU (optimisé)
--------------------------------------------------*/
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

/* -------------------------------------------------
   2) Règles d’affichage
--------------------------------------------------*/
const RULES_EBCI = {
  "24": { green: ["F101","F102","F103","F104","F105","F106","F107","F108","F109","F110","F111","F112","F114","F116","F117","F118","F119"], red: [] },
  "06": { green: ["F101","F102","F103","F104","F105","F106","F107","F108","F109","F110","F111","F112","F119"], red: ["F114","F116","F117","F118"] }
};

const RULES_EBLG = {
  "22": { green: ["F001","F002","F003","F004","F005","F006","F007","F008","F009","F010","F011","F012","F013","F014","F015","F016","F017"], red: [] },
  "04": { green: ["F001","F002","F003","F007","F008","F009","F011","F013","F014","F015"], red: ["F004","F005","F006","F010","F012","F016","F017"] }
};

/* -------------------------------------------------
   3) Application des règles (sécurisée)
--------------------------------------------------*/
export function applySonoRules(airportKey, activeRunway, map) {
  const rules = airportKey === "EBCI" ? RULES_EBCI : RULES_EBLG;
  if (!rules[activeRunway]) return;

  const { green, red } = rules[activeRunway];
  const list = airportKey === "EBCI" ? sonometersEBCI : sonometersEBLG;
  const layer = airportKey === "EBCI" ? sonoLayerEBCI : sonoLayerEBLG;

  if (!layer) return; // ⭐ protection anti-crash

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

/* -------------------------------------------------
   4) Masquage SONO
--------------------------------------------------*/
function hideSono(airportKey, map) {
  const layer = airportKey === "EBCI" ? sonoLayerEBCI : sonoLayerEBLG;
  if (layer) map.removeLayer(layer);

  const list = airportKey === "EBCI" ? sonometersEBCI : sonometersEBLG;
  list.forEach(s => {
    const el = document.getElementById(`sono-${s.id}`);
    if (el) el.style.color = "#444";
  });
}

/* -------------------------------------------------
   5) Fonction principale — Optimisée PRO+++
--------------------------------------------------*/
export function updateSono(airportKey, activeRunway, map) {
  const ap = airports[airportKey];
  if (!ap) return;

  const metar = ap.lastMetar;
  if (!metar) return;

  const windDir = metar.wind_dir;
  const windSpd = metar.wind_speed;

  const sono = document.getElementById("sono-status");
  if (!sono) return;

  if (!windDir || !windSpd) {
    sono.innerHTML = "<div class='sono-line'>SONO: n/a</div>";
    return;
  }

  const color =
    windSpd <= 8 ? "lime" :
    windSpd <= 15 ? "orange" :
    "red";

  sono.innerHTML = `
    <div class="sono-line" style="color:${color}">
      Vent ${windDir}° / ${windSpd} kt — Piste ${activeRunway}
    </div>
  `;

  // ⭐ Génération liste SONO une seule fois
  if (airportKey === "EBCI" && !sonoListRenderedEBCI) {
    updateSonoListUI("EBCI");
    sonoListRenderedEBCI = true;
  }
  if (airportKey === "EBLG" && !sonoListRenderedEBLG) {
    updateSonoListUI("EBLG");
    sonoListRenderedEBLG = true;
  }

  // ⭐ Génération markers SONO une seule fois
  if (airportKey === "EBCI" && !sonoRenderedEBCI) {
    renderSonoMarkers("EBCI", map);
    sonoRenderedEBCI = true;
  }
  if (airportKey === "EBLG" && !sonoRenderedEBLG) {
    renderSonoMarkers("EBLG", map);
    sonoRenderedEBLG = true;
  }

  // ⭐ Application des règles (toujours)
  applySonoRules(airportKey, activeRunway, map);
}
