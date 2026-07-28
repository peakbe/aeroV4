/****************************************************
 * ILS — Airbus ND / PFD PRO+++
 * Localizer + Glide Slope + Runway Centerline + HUD
 ****************************************************/

import { airports } from "./config.js";
import { map } from "./map.js";

/****************************************************
 * 1) Nettoyage des couches ILS
 ****************************************************/
function clearIlsLayers(ap) {
  if (ap.ilsLayers) {
    ap.ilsLayers.forEach(layer => map.removeLayer(layer));
  }
  ap.ilsLayers = [];
}

/****************************************************
 * 2) Localizer — ND Airbus (bleu cyan)
 ****************************************************/
function drawLocalizer(ap) {
  const loc = ap.ils?.localizer;
  if (!loc) return;

  const line = L.polyline(
    [
      [loc.lat, loc.lon],
      [loc.lat + loc.dirLat, loc.lon + loc.dirLon]
    ],
    {
      color: "#00e5ff",     // Airbus cyan LOC
      weight: 3,
      opacity: 0.95
    }
  );

  ap.ilsLayers.push(line);
  line.addTo(map);
}

/****************************************************
 * 3) Glide Slope — ND Airbus (orange GS)
 ****************************************************/
function drawGlideSlope(ap) {
  const gs = ap.ils?.glideSlope;
  if (!gs) return;

  const line = L.polyline(
    [
      [gs.lat, gs.lon],
      [gs.lat + gs.dirLat, gs.lon + gs.dirLon]
    ],
    {
      color: "#ffb300",     // Airbus amber GS
      weight: 3,
      opacity: 0.9,
      dashArray: "6 6"
    }
  );

  ap.ilsLayers.push(line);
  line.addTo(map);
}

/****************************************************
 * 4) Runway Centerline — ND Airbus (blanc runway)
 ****************************************************/
function drawRunwayCenterline(ap) {

  // ap.activeRunway est un OBJET, pas un nom
  const active = ap.activeRunway;
  if (!active || !active.name) return;

  const rw = ap.runways.find(r => r.name === active.name);
  if (!rw) return;

  const line = L.polyline(
    [
      [rw.lat1, rw.lon1],
      [rw.lat2, rw.lon2]
    ],
    {
      color: "#ffffff",     // Airbus runway
      weight: 4,
      opacity: 0.85
    }
  );

  ap.ilsLayers.push(line);
  line.addTo(map);
}

/****************************************************
 * 5) HUD Piste Active — Airbus PFD
 ****************************************************/
export function updateRunwayHUD(ap, windDir, windSpd) {

  const hud = document.getElementById(
    ap.icao === "EBCI" ? "runway-ebci" : "runway-eblg"
  );
  if (!hud) return;

  const active = ap.activeRunway;
  const runwayName = active?.name || "??";

  hud.innerHTML = `
    <div class="hud-runway">
      <strong>Piste active :</strong> ${runwayName}<br>
      <strong>Vent :</strong> ${windDir}° / ${windSpd} kt
    </div>
  `;
}

/****************************************************
 * 6) Rafraîchissement complet ILS — ND Airbus
 ****************************************************/
export function refreshILS() {
  Object.values(airports).forEach(ap => {
    clearIlsLayers(ap);
    drawLocalizer(ap);
    drawGlideSlope(ap);
    drawRunwayCenterline(ap);
  });
}
