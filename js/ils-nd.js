/****************************************************
 * ILS ND — Airbus-style PRO+++
 * Cône LOC + pente GS 3D + déviation + avion
 ****************************************************/

import { airports } from "./config.js";
import { map } from "./map.js";

/****************************************************
 * Utilitaires géométriques
 ****************************************************/
function toRad(deg) {
  return deg * Math.PI / 180;
}

function toDeg(rad) {
  return rad * 180 / Math.PI;
}

function haversineDistance(lat1, lon1, lat2, lon2) {
  const R = 6371000; // m
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLon / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/****************************************************
 * Cône LOC (Airbus ND style)
 ****************************************************/
function drawLocCone(ap) {
  const loc = ap.ils?.localizer;
  if (!loc) return;

  const rw = ap.runways.find(r => r.name === ap.activeRunway);
  if (!rw) return;

  const heading = rw.heading;
  const coneLengthNm = 10;      // longueur du cône
  const coneHalfWidthDeg = 2.5; // ouverture latérale

  const lengthM = coneLengthNm * 1852;

  // Point sur l’axe LOC
  const bearingRad = toRad(heading);
  const dLat = (lengthM * Math.cos(bearingRad)) / 111320;
  const dLon = (lengthM * Math.sin(bearingRad)) /
               (111320 * Math.cos(toRad(loc.lat)));

  const axisEndLat = loc.lat + dLat;
  const axisEndLon = loc.lon + dLon;

  // Bords du cône (gauche / droite)
  const leftBearing = toRad(heading - coneHalfWidthDeg);
  const rightBearing = toRad(heading + coneHalfWidthDeg);

  const dLatLeft = (lengthM * Math.cos(leftBearing)) / 111320;
  const dLonLeft = (lengthM * Math.sin(leftBearing)) /
                   (111320 * Math.cos(toRad(loc.lat)));

  const dLatRight = (lengthM * Math.cos(rightBearing)) / 111320;
  const dLonRight = (lengthM * Math.sin(rightBearing)) /
                    (111320 * Math.cos(toRad(loc.lat)));

  const leftEndLat = loc.lat + dLatLeft;
  const leftEndLon = loc.lon + dLonLeft;

  const rightEndLat = loc.lat + dLatRight;
  const rightEndLon = loc.lon + dLonRight;

  const cone = L.polygon(
    [
      [loc.lat, loc.lon],
      [leftEndLat, leftEndLon],
      [axisEndLat, axisEndLon],
      [rightEndLat, rightEndLon]
    ],
    {
      color: "#00aaff",
      weight: 1,
      fillColor: "#003366",
      fillOpacity: 0.25
    }
  );

  ap.ndLayers.push(cone);
  cone.addTo(map);
}

/****************************************************
 * Pente GS 3D (projection au sol)
 ****************************************************/
function drawGsLine(ap) {
  const gs = ap.ils?.glideSlope;
  if (!gs) return;

  const rw = ap.runways.find(r => r.name === ap.activeRunway);
  if (!rw) return;

  const gsAngleDeg = 3; // pente standard
  const gsLengthNm = 10;
  const lengthM = gsLengthNm * 1852;

  const heading = rw.heading;
  const bearingRad = toRad(heading);

  const dLat = (lengthM * Math.cos(bearingRad)) / 111320;
  const dLon = (lengthM * Math.sin(bearingRad)) /
               (111320 * Math.cos(toRad(gs.lat)));

  const endLat = gs.lat + dLat;
  const endLon = gs.lon + dLon;

  const line = L.polyline(
    [
      [gs.lat, gs.lon],
      [endLat, endLon]
    ],
    {
      color: "#ffaa00",
      weight: 2,
      dashArray: "4 4",
      opacity: 0.9
    }
  );

  ap.ndLayers.push(line);
  line.addTo(map);
}

/****************************************************
 * Avion + déviation LOC / GS
 ****************************************************/
function drawAircraftAndDeviation(ap) {
  const ac = ap.aircraft; // à alimenter depuis ton tracking
  const rw = ap.runways.find(r => r.name === ap.activeRunway);
  const loc = ap.ils?.localizer;
  const gs = ap.ils?.glideSlope;

  if (!ac || !rw || !loc || !gs) return;

  // Avion
  const icon = L.circleMarker([ac.lat, ac.lon], {
    radius: 5,
    color: "#00ff00",
    fillColor: "#00ff00",
    fillOpacity: 0.9
  });

  ap.ndLayers.push(icon);
  icon.addTo(map);

  // Déviation LOC : distance latérale par rapport à l’axe
  const distToLocAxisM = haversineDistance(ac.lat, ac.lon, loc.lat, loc.lon);
  // simplifié : on considère l’axe comme passant par loc → runway
  // pour un vrai ND, il faudrait projeter orthogonalement

  // Déviation GS : altitude vs pente théorique
  const distAlongGsM = haversineDistance(ac.lat, ac.lon, gs.lat, gs.lon);
  const gsAngleRad = toRad(3);
  const altTheoreticalFt = (distAlongGsM * Math.tan(gsAngleRad)) * 3.2808;
  const altDeviationFt = ac.altFt - altTheoreticalFt;

  const popupHtml = `
    <div class="nd-popup">
      <strong>ND ILS — ${ap.icao}</strong><br>
      Dist LOC (approx) : ${distToLocAxisM.toFixed(0)} m<br>
      GS théorique : ${altTheoreticalFt.toFixed(0)} ft<br>
      Déviation GS : ${altDeviationFt.toFixed(0)} ft
    </div>
  `;

  icon.bindPopup(popupHtml);
}

/****************************************************
 * Rafraîchissement ND Airbus
 ****************************************************/
export function refreshIlsNd() {
  Object.values(airports).forEach(ap => {
    // init container ND
    if (!ap.ndLayers) ap.ndLayers = [];
    ap.ndLayers.forEach(l => map.removeLayer(l));
    ap.ndLayers = [];

    drawLocCone(ap);
    drawGsLine(ap);
    drawAircraftAndDeviation(ap);
  });
}
