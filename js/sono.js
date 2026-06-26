/****************************************************
 * SONO MODULE PRO+++ — Cockpit IFR
 * - Rendu liste sonomètres
 * - Coloration dynamique selon piste active
 * - Règles EBCI / EBLG
 ****************************************************/
import L from "leaflet";

import { sonometersEBCI, sonometersEBLG } from "./sono-data.js";
let sonoEnabled = true;

/* -------------------------------------------------
   0) Markers Leaflet — création dynamique
--------------------------------------------------*/
let sonoLayerEBCI = null;
let sonoLayerEBLG = null;

function renderSonoMarkers(airportKey, map) {
  const list = airportKey === "EBCI" ? sonometersEBCI : sonometersEBLG;

  // Supprimer ancienne couche
  if (airportKey === "EBCI" && sonoLayerEBCI) map.removeLayer(sonoLayerEBCI);
  if (airportKey === "EBLG" && sonoLayerEBLG) map.removeLayer(sonoLayerEBLG);

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
    marker._sonoId = s.id; // pour recoloration

    group.addLayer(marker);
  });

  if (airportKey === "EBCI") sonoLayerEBCI = group;
  if (airportKey === "EBLG") sonoLayerEBLG = group;

  group.addTo(map);
}


/* -------------------------------------------------
   1) Rendu UI MCDU
--------------------------------------------------*/
export function updateSonoListUI(airportKey) {
  const list = airportKey === "EBCI" ? sonometersEBCI : sonometersEBLG;
  const id = airportKey === "EBCI" ? "sono-list-ebci" : "sono-list-eblg";
  const el = document.getElementById(id);

  if (!el) {
    console.warn("⚠️ Élément manquant :", id);
    return;
  }

  // Rendu MCDU
  el.innerHTML = list
    .map(s => `<div id="sono-${s.id}" class="sono-line">${s.id} — ${s.address}</div>`)
    .join("");
}

/* -------------------------------------------------
   2) Règles d’affichage — EBCI
--------------------------------------------------*/
const RULES_EBCI = {
  "24": {
    green: [
      "F101","F102","F103","F104","F105","F106","F107","F108","F109",
      "F110","F111","F112","F114","F116","F117","F118","F119"
    ],
    red: []
  },
  "06": {
    green: [
      "F101","F102","F103","F104","F105","F106","F107","F108","F109",
      "F110","F111","F112","F119"
    ],
    red: ["F114","F116","F117","F118"]
  }
};

/* -------------------------------------------------
   3) Règles d’affichage — EBLG
--------------------------------------------------*/
const RULES_EBLG = {
  "22": {
    green: [
      "F001","F002","F003","F004","F005","F006","F007","F008","F009",
      "F010","F011","F012","F013","F014","F015","F016","F017"
    ],
    red: []
  },
  "04": {
    green: [
      "F001","F002","F003","F007","F008","F009","F011","F013","F014","F015"
    ],
    red: [
      "F004","F005","F006","F010","F012","F016","F017"
    ]
  }
};

/* -------------------------------------------------
   4) Application des règles
--------------------------------------------------*/
export function applySonoRules(airportKey, activeRunway, map) {
  const rules = airportKey === "EBCI" ? RULES_EBCI : RULES_EBLG;

  if (!rules[activeRunway]) {
    console.warn(`⚠️ Aucune règle SONO pour ${airportKey} piste ${activeRunway}`);
    return;
  }

  const { green, red } = rules[activeRunway];
  const list = airportKey === "EBCI" ? sonometersEBCI : sonometersEBLG;

  // Sélection de la couche Leaflet
  const layer = airportKey === "EBCI" ? sonoLayerEBCI : sonoLayerEBLG;

  /* -------------------------
     RESET (gris cockpit)
  ------------------------- */
  list.forEach(s => {
    // UI
    const el = document.getElementById(`sono-${s.id}`);
    if (el) el.style.color = "#e2e8f0";

    // Marker
    layer.eachLayer(marker => {
      if (marker._sonoId === s.id) {
        marker.setStyle({
          color: "#e2e8f0",
          fillColor: "#e2e8f0"
        });
      }
    });
  });

  /* -------------------------
     VERT
  ------------------------- */
  green.forEach(id => {
    // UI
    const el = document.getElementById(`sono-${id}`);
    if (el) el.style.color = "lime";

    // Marker
    layer.eachLayer(marker => {
      if (marker._sonoId === id) {
        marker.setStyle({
          color: "lime",
          fillColor: "lime"
        });
      }
    });
  });

  /* -------------------------
     ROUGE
  ------------------------- */
  red.forEach(id => {
    // UI
    const el = document.getElementById(`sono-${id}`);
    if (el) el.style.color = "red";

    // Marker
    layer.eachLayer(marker => {
      if (marker._sonoId === id) {
        marker.setStyle({
          color: "red",
          fillColor: "red"
        });
      }
    });
  });
}


/* -------------------------------------------------
   5) Fonction principale appelée par app.js
--------------------------------------------------*/
function hideSono(airportKey, map) {
  const layer = airportKey === "EBCI" ? sonoLayerEBCI : sonoLayerEBLG;
  if (layer) map.removeLayer(layer);

  const list = airportKey === "EBCI" ? sonometersEBCI : sonometersEBLG;
  list.forEach(s => {
    const el = document.getElementById(`sono-${s.id}`);
    if (el) el.style.color = "#444"; // gris éteint
  });
}


export function updateSono(airportKey, activeRunway, map) {

  // Gestion du bouton ON/OFF
  const toggle = document.getElementById("toggle-sono");
  if (toggle) {
    toggle.onchange = () => {
      sonoEnabled = toggle.checked;
      document.querySelector(".mcd-switch-indicator").textContent =
        sonoEnabled ? "ON" : "OFF";

      if (!sonoEnabled) {
        hideSono(airportKey, map);
      } else {
        updateSono(airportKey, activeRunway, map);
      }
    };
  }

  if (!sonoEnabled) {
    hideSono(airportKey, map);
    return;
  }

  updateSonoListUI(airportKey);
  renderSonoMarkers(airportKey, map);
  applySonoRules(airportKey, activeRunway, map);
}


