/****************************************************
 * SONO MODULE PRO+++ — Cockpit IFR
 * - Rendu liste sonomètres
 * - Coloration dynamique selon piste active
 * - Règles EBCI / EBLG
 ****************************************************/

import { sonometersEBCI, sonometersEBLG } from "./sono-data.js";

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
export function applySonoRules(airportKey, activeRunway) {
  const rules = airportKey === "EBCI" ? RULES_EBCI : RULES_EBLG;

  if (!rules[activeRunway]) {
    console.warn(`⚠️ Aucune règle SONO pour ${airportKey} piste ${activeRunway}`);
    return;
  }

  const { green, red } = rules[activeRunway];

  // Reset couleurs
  const list = airportKey === "EBCI" ? sonometersEBCI : sonometersEBLG;
  list.forEach(s => {
    const el = document.getElementById(`sono-${s.id}`);
    if (el) el.style.color = "#e2e8f0"; // gris cockpit
  });

  // Appliquer vert
  green.forEach(id => {
    const el = document.getElementById(`sono-${id}`);
    if (el) el.style.color = "lime";
  });

  // Appliquer rouge
  red.forEach(id => {
    const el = document.getElementById(`sono-${id}`);
    if (el) el.style.color = "red";
  });
}

/* -------------------------------------------------
   5) Fonction principale appelée par app.js
--------------------------------------------------*/
export function updateSono(airportKey, activeRunway) {
  updateSonoListUI(airportKey);
  applySonoRules(airportKey, activeRunway);
}
