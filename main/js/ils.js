/****************************************************
 * ILS — Legacy module (cleaned)
 * This module is now deprecated in favor of ils-nd.js
 ****************************************************/

import { airports } from "./config.js";
import { map } from "./map.js";

/****************************************************
 * 1) Nettoyage des couches ILS (legacy)
 ****************************************************/
function clearIlsLayers(ap) {
  if (!ap.ilsLayers) ap.ilsLayers = [];
  ap.ilsLayers.forEach(layer => map.removeLayer(layer));
  ap.ilsLayers = [];
}

/****************************************************
 * 2) Localizer — (legacy, simple line)
 ****************************************************/
function drawLocalizer(ap) {
  const loc = ap.ils?.localizer;
  if (!loc) return;

  // heading → vecteur direction
  const headingRad = (loc.heading * Math.PI) / 180;
  const dLat = Math.cos(headingRad) * 0.02;
  const dLon = Math.sin(headingRad) * 0.02;

  const line = L.polyline(
    [
      [loc.lat, loc.lon],
      [loc.lat + dLat, loc.lon + dLon]
    ],
    {
      color: "#00e5ff",
      weight: 2,
      opacity: 0.8
    }
  );

  ap.ilsLayers.push(line);
  line.addTo(map);
}

/****************************************************
 * 3) Glide Slope — (legacy, simple line)
 ****************************************************/
function drawGlideSlope(ap) {
  const gs = ap.ils?.glideSlope;
  if (!gs) return;

  const angleRad = (gs.angle * Math.PI) / 180;
  const dLat = Math.cos(angleRad) * 0.02;
  const dLon = Math.sin(angleRad) * 0.02;

  const line = L.polyline(
    [
      [gs.lat, gs.lon],
      [gs.lat + dLat, gs.lon + dLon]
    ],
    {
      color: "#ffb300",
      weight: 2,
      opacity: 0.8,
      dashArray: "6 6"
    }
  );

  ap.ilsLayers.push(line);
  line.addTo(map);
}

/****************************************************
 * 4) Runway Centerline — (legacy)
 ****************************************************/
function drawRunwayCenterline(ap) {
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
      color: "#ffffff",
      weight: 3,
      opacity: 0.85
    }
  );

  ap.ilsLayers.push(line);
  line.addTo(map);
}

/****************************************************
 * 5) Rafraîchissement complet ILS (legacy)
 * NOTE: ils-nd.js is the official ND Airbus module.
 ****************************************************/
export function refreshILS() {
  Object.values(airports).forEach(ap => {
    clearIlsLayers(ap);
    drawLocalizer(ap);
    drawGlideSlope(ap);
    drawRunwayCenterline(ap);
  });
}
