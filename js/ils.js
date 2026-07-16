/****************************************************
 * ILS — Cockpit IFR PRO+++
 * Version sans IM / MM / OM
 * Localizer + Glide Slope + Runway HUD
 ****************************************************/

import { airports } from "./config.js";
import { map } from "./map.js";

/****************************************************
 * Nettoyage des anciennes couches ILS
 ****************************************************/
function clearIlsLayers(ap) {
  if (ap.ilsLayers) {
    ap.ilsLayers.forEach(layer => map.removeLayer(layer));
  }
  ap.ilsLayers = [];
}

/****************************************************
 * Dessine le localizer (LOC)
 ****************************************************/
function drawLocalizer(ap) {
  const loc = ap.ils.localizer;
  if (!loc) return;

  const line = L.polyline(
    [
      [loc.lat, loc.lon],
      [loc.lat + loc.dirLat, loc.lon + loc.dirLon]
    ],
    {
      color: "#00aaff",
      weight: 3,
      opacity: 0.9
    }
  );

  ap.ilsLayers.push(line);
  line.addTo(map);
}

/****************************************************
 * Dessine le glide slope (GS)
 ****************************************************/
function drawGlideSlope(ap) {
  const gs = ap.ils.glideSlope;
  if (!gs) return;

  const line = L.polyline(
    [
      [gs.lat, gs.lon],
      [gs.lat + gs.dirLat, gs.lon + gs.dirLon]
    ],
    {
      color: "#ffaa00",
      weight: 3,
      opacity: 0.9,
      dashArray: "6 6"
    }
  );

  ap.ilsLayers.push(line);
  line.addTo(map);
}

/****************************************************
 * Dessine la piste active (runway centerline)
 ****************************************************/
function drawRunwayCenterline(ap) {
  const rw = ap.runways.find(r => r.name === ap.activeRunway);
  if (!rw) return;

  const line = L.polyline(
    [
      [rw.lat1, rw.lon1],
      [rw.lat2, rw.lon2]
    ],
    {
      color: "#ffffff",
      weight: 4,
      opacity: 0.8
    }
  );

  ap.ilsLayers.push(line);
  line.addTo(map);
}

/****************************************************
 * Rafraîchissement complet ILS
 ****************************************************/
export function refreshILS() {
  const keys = Object.keys(airports);

  keys.forEach(key => {
    const ap = airports[key];

    // Nettoyage
    clearIlsLayers(ap);

    // Localizer
    drawLocalizer(ap);

    // Glide slope
    drawGlideSlope(ap);

    // Piste active
    drawRunwayCenterline(ap);
  });
}
