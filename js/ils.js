/****************************************************
 * ILS.js — Cockpit IFR PRO+++ (HUD + ILS dynamique)
 ****************************************************/

import { drawILS, ilsLayer, ilsLabelsLayer } from "./map.js";

/****************************************************
 * 1) HUD Piste active — IFR
 ****************************************************/
export function updateRunwayHUD(ap, windDir, windSpd) {
  const hud = document.getElementById("runway-hud");
  if (!hud) return;

  const rwy = window.activeRunway || "n/a";
  const dir = windDir ?? "n/a";
  const spd = windSpd ?? "n/a";

  hud.innerHTML = `
    <div class="hud-line">
      Piste active ${rwy} — Vent ${dir}° / ${spd} kt
    </div>
  `;
}

/****************************************************
 * 2) ILS dynamique — redessine les cônes LOC + glide
 ****************************************************/
export function refreshILS() {
  if (!ilsLayer || !ilsLabelsLayer) return;

  ilsLayer.clearLayers();
  ilsLabelsLayer.clearLayers();

  // Redessine les ILS des deux aéroports
  drawILS("EBCI", "24");
  drawILS("EBCI", "06");
  drawILS("EBLG", "22");
  drawILS("EBLG", "04");
}
