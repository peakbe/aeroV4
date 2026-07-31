/****************************************************
 * ILS ND — Airbus-style PRO+++
 * Cône LOC + pente GS + avion + déviation
 ****************************************************/

import { airports } from "./config.js";
import { map } from "./map.js";

/****************************************************
 * Utilitaires géométriques
 ****************************************************/
function toRad(deg) { return deg * Math.PI / 180; }
function toDeg(rad) { return rad * 180 / Math.PI; }

function haversineDistance(lat1, lon1, lat2, lon2) {
  const R = 6371000; // m
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/****************************************************
 * 1) Cône LOC — Airbus ND (cyan)
 ****************************************************/
function drawLocCone(ap) {

  const loc = ap.ils?.localizer;
  const active = ap.activeRunway;
  if (!loc || !active) return;

  const rw = ap.runways.find(r => r.name === active.name);
  if (!rw) return;

  const heading = rw.heading;
  const coneLengthNm = 10;
  const coneHalfWidthDeg = 2.5;

  const lengthM = coneLengthNm * 1852;

  const bearingRad = toRad(heading);
  const dLat = (lengthM * Math.cos(bearingRad)) / 111320;
  const dLon = (lengthM * Math.sin(bearingRad)) /
               (111320 * Math.cos(toRad(loc.lat)));

  const axisEndLat = loc.lat + dLat;
  const axisEndLon = loc.lon + dLon;

  const leftBearing = toRad(heading - coneHalfWidthDeg);
  const rightBearing = toRad(heading + coneHalfWidthDeg);

  const dLatLeft = (lengthM * Math.cos(leftBearing)) / 111320;
  const dLonLeft = (lengthM * Math.sin(leftBearing)) /
                   (111320 * Math.cos(toRad(loc.lat)));

  const dLatRight = (lengthM * Math.cos(rightBearing)) / 111320;
  const dLonRight = (lengthM * Math.sin(rightBearing)) /
                    (111320 * Math.cos(toRad(loc.lat)));

  const cone = L.polygon(
    [
      [loc.lat, loc.lon],
      [loc.lat + dLatLeft, loc.lon + dLonLeft],
      [axisEndLat, axisEndLon],
      [loc.lat + dLatRight, loc.lon + dLonRight]
    ],
    {
      color: "#00e5ff",      // Airbus cyan LOC
      weight: 1,
      fillColor: "#003366",
      fillOpacity: 0.25
    }
  );

  ap.ndLayers.push(cone);
  cone.addTo(map);
}

/****************************************************
 * 2) Glide Slope — Airbus ND (amber)
 ****************************************************/
function drawGsLine(ap) {

  const gs = ap.ils?.glideSlope;
  const active = ap.activeRunway;
  if (!gs || !active) return;

  const rw = ap.runways.find(r => r.name === active.name);
  if (!rw) return;

  const gsAngleDeg = 3;
  const gsLengthNm = 10;
  const lengthM = gsLengthNm * 1852;

  const bearingRad = toRad(rw.heading);

  const dLat = (lengthM * Math.cos(bearingRad)) / 111320;
  const dLon = (lengthM * Math.sin(bearingRad)) /
               (111320 * Math.cos(toRad(gs.lat)));

  const line = L.polyline(
    [
      [gs.lat, gs.lon],
      [gs.lat + dLat, gs.lon + dLon]
    ],
    {
      color: "#ffb300",      // Airbus amber GS
      weight: 2,
      dashArray: "4 4",
      opacity: 0.9
    }
  );

  ap.ndLayers.push(line);
  line.addTo(map);
}

/****************************************************
 * 3) Avion + déviation LOC / GS — Airbus ND
 ****************************************************/
function drawAircraftAndDeviation(ap) {

  const ac = ap.aircraft;
  const active = ap.activeRunway;
  const loc = ap.ils?.localizer;
  const gs = ap.ils?.glideSlope;

  if (!ac || !active || !loc || !gs) return;

  const rw = ap.runways.find(r => r.name === active.name);
  if (!rw) return;

  // Avion ND
  const icon = L.circleMarker([ac.lat, ac.lon], {
    radius: 5,
    color: "#00ff00",
    fillColor: "#00ff00",
    fillOpacity: 0.9
  });

  ap.ndLayers.push(icon);
  icon.addTo(map);

  // Déviation LOC (approx)
  const distToLocAxisM = haversineDistance(ac.lat, ac.lon, loc.lat, loc.lon);

  // Déviation GS
  const distAlongGsM = haversineDistance(ac.lat, ac.lon, gs.lat, gs.lon);
  const gsAngleRad = toRad(3);
  const altTheoreticalFt = (distAlongGsM * Math.tan(gsAngleRad)) * 3.2808;
  const altDeviationFt = ac.altFt - altTheoreticalFt;

  const popupHtml = `
    <div class="nd-popup">
      <strong>ND ILS — ${ap.icao}</strong><br>
      Déviation LOC : ${distToLocAxisM.toFixed(0)} m<br>
      GS théorique : ${altTheoreticalFt.toFixed(0)} ft<br>
      Déviation GS : ${altDeviationFt.toFixed(0)} ft
    </div>
  `;

  icon.bindPopup(popupHtml);
}

/****************************************************
 * 4) Rafraîchissement ND Airbus
 ****************************************************/
export function refreshIlsNd() {
  Object.values(airports).forEach(ap => {

    if (!ap.ndLayers) ap.ndLayers = [];
    ap.ndLayers.forEach(l => map.removeLayer(l));
    ap.ndLayers = [];

    drawLocCone(ap);
    drawGsLine(ap);
    drawAircraftAndDeviation(ap);
  });
}
