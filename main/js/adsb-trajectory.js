/****************************************************
 * ADS-B TRAJECTORY — PRO+++ (Airbus ND, safe, fallback-ready)
 ****************************************************/

import { airports } from "./config.js";

export const adsbHistory = {};
export const adsbTrajectories = {};
export const adsbLabels = {};
export const adsbArrows = {};
export const adsbFuturePath = {};

/****************************************************
 * Ajout d’un point dans l’historique (anti-NaN, anti-trash)
 ****************************************************/
export function pushHistory(icao, lat, lon, gsKt, altFt, track) {
  if (!icao) return;

  // Filtre dur sur la position
  if (
    lat == null || lon == null ||
    isNaN(lat) || isNaN(lon) ||
    Math.abs(lat) > 90 || Math.abs(lon) > 180
  ) {
    return;
  }

  const key = String(icao);
  if (!adsbHistory[key]) adsbHistory[key] = [];

  adsbHistory[key].push({
    lat,
    lon,
    gsKt: Number(gsKt || 0),
    altFt: Number(altFt || 0),
    track: Number(track || 0)
  });

  if (adsbHistory[key].length > 150) {
    adsbHistory[key].shift();
  }
}

/****************************************************
 * Filtrage des points invalides
 ****************************************************/
function filterPoints(points) {
  return points.filter(p =>
    p.lat != null &&
    p.lon != null &&
    !isNaN(p.lat) &&
    !isNaN(p.lon) &&
    Math.abs(p.lat) <= 90 &&
    Math.abs(p.lon) <= 180
  );
}

/****************************************************
 * Lissage trajectoire
 ****************************************************/
function smoothPoints(points) {
  if (points.length < 3) return points;

  const out = [];
  for (let i = 1; i < points.length - 1; i++) {
    const p0 = points[i - 1];
    const p1 = points[i];
    const p2 = points[i + 1];

    out.push({
      lat: (p0.lat + p1.lat + p2.lat) / 3,
      lon: (p0.lon + p1.lon + p2.lon) / 3,
      gsKt: (p0.gsKt + p1.gsKt + p2.gsKt) / 3,
      altFt: (p0.altFt + p1.altFt + p2.altFt) / 3,
      track: (p0.track + p1.track + p2.track) / 3
    });
  }
  return out;
}

/****************************************************
 * Dégradé couleur vitesse
 ****************************************************/
function speedColor(gsKt) {
  if (gsKt < 120) return "#00aaff";
  if (gsKt < 250) return "#00ffff";
  if (gsKt < 350) return "#00ff55";
  if (gsKt < 450) return "#ffee00";
  return "#ff3300";
}

/****************************************************
 * Flèche directionnelle
 ****************************************************/
function createArrow(lat, lon, track) {
  if (
    lat == null || lon == null || track == null ||
    isNaN(lat) || isNaN(lon) || isNaN(track)
  ) {
    return null;
  }

  const size = 0.03;
  const angle = track * Math.PI / 180;

  const dx = size * Math.sin(angle);
  const dy = size * Math.cos(angle);

  return [
    [lat, lon],
    [lat + dy, lon + dx]
  ];
}

/****************************************************
 * Label vitesse + altitude
 ****************************************************/
function createLabel(lat, lon, gsKt, altFt) {
  if (
    lat == null || lon == null ||
    isNaN(lat) || isNaN(lon)
  ) {
    return null;
  }

  return L.marker([lat, lon], {
    icon: L.divIcon({
      className: "adsb-label",
      html: `
        <div style="
          color:white;
          font-size:10px;
          background:rgba(0,0,0,0.55);
          padding:2px 4px;
          border-radius:3px;
          border:1px solid #00ffff;
        ">
          ${Math.round(gsKt || 0)} kt<br>${Math.round(altFt || 0)} ft
        </div>
      `
    })
  });
}

/****************************************************
 * Future path Airbus (anti-NaN)
 ****************************************************/
function computeFuturePath(lat, lon, trackDeg, gsKt, minutes = 5, stepSec = 30) {
  if (
    lat == null || lon == null ||
    isNaN(lat) || isNaN(lon) ||
    trackDeg == null || gsKt == null ||
    isNaN(trackDeg) || isNaN(gsKt)
  ) {
    return [];
  }

  const R = 6371000;
  const track = trackDeg * Math.PI / 180;
  const gsMs = gsKt * 0.514444;

  const points = [];
  for (let t = stepSec; t <= minutes * 60; t += stepSec) {
    const d = gsMs * t;
    const dByR = d / R;

    const latRad = lat * Math.PI / 180;
    const lonRad = lon * Math.PI / 180;

    const lat2 = Math.asin(
      Math.sin(latRad) * Math.cos(dByR) +
      Math.cos(latRad) * Math.sin(dByR) * Math.cos(track)
    );
    const lon2 = lonRad + Math.atan2(
      Math.sin(track) * Math.sin(dByR) * Math.cos(latRad),
      Math.cos(dByR) - Math.sin(latRad) * Math.sin(lat2)
    );

    const latDeg = lat2 * 180 / Math.PI;
    const lonDeg = lon2 * 180 / Math.PI;

    if (!isNaN(latDeg) && !isNaN(lonDeg)) {
      points.push([latDeg, lonDeg]);
    }
  }
  return points;
}

/****************************************************
 * ND AIRBUS — Vent METAR
 ****************************************************/
export function drawWindOnNd(airportKey, metar) {
  if (!window.ndMap || !window.L || !metar) return;

  const ap = airports[airportKey];
  if (!ap) return;

  const dir = metar.wind_dir === "VRB" ? null : Number(metar.wind_dir);
  const speed = Number(metar.wind_speed || 0);

  if (!dir || isNaN(dir) || !speed || isNaN(speed)) return;

  const len = 0.08;
  const angle = dir * Math.PI / 180;

  const dx = len * Math.sin(angle);
  const dy = len * Math.cos(angle);

  const start = [ap.lat, ap.lon];
  const end = [ap.lat + dy, ap.lon + dx];

  window.ndWindVector = window.ndWindVector || {};
  if (window.ndWindVector[airportKey]) {
    window.ndMap.removeLayer(window.ndWindVector[airportKey]);
  }

  window.ndWindVector[airportKey] = L.polyline([start, end], {
    color: "#ffcc00",
    weight: 4,
    opacity: 0.9
  }).addTo(window.ndMap);

  const labelHtml = `
    <div style="
      color:white;
      font-size:11px;
      background:rgba(0,0,0,0.55);
      padding:3px 5px;
      border-radius:3px;
      border:1px solid #ffaa00;
    ">
      WIND ${dir}° / ${speed} kt
    </div>
  `;

  window.ndWindLabel = window.ndWindLabel || {};
  if (window.ndWindLabel[airportKey]) {
    window.ndMap.removeLayer(window.ndWindLabel[airportKey]);
  }

  window.ndWindLabel[airportKey] = L.marker(start, {
    icon: L.divIcon({
      className: "nd-wind-label",
      html: labelHtml
    })
  }).addTo(window.ndMap);
}

/****************************************************
 * Trajectoire ADS-B — ND Airbus
 ****************************************************/
export function showOptimizedAdsbTrajectory(icao) {
  if (!window.ndMap || !window.L) return;

  const key = String(icao);
  const history = adsbHistory[key];

  if (!history || history.length < 2) return;

  let pts = smoothPoints(filterPoints(history));

  // Anti-NaN post-lissage
  pts = pts.filter(p =>
    p.lat != null &&
    p.lon != null &&
    !isNaN(p.lat) &&
    !isNaN(p.lon) &&
    Math.abs(p.lat) <= 90 &&
    Math.abs(p.lon) <= 180
  );

  if (pts.length < 2) return;

  const latlngs = pts.map(p => [p.lat, p.lon]);

  const last = pts[pts.length - 1];
  const avgSpeed = pts.reduce((a, p) => a + (p.gsKt || 0), 0) / pts.length;
  const color = speedColor(avgSpeed);

  const futurePath = computeFuturePath(last.lat, last.lon, last.track, last.gsKt);

  if (adsbFuturePath[key]) {
    window.ndMap.removeLayer(adsbFuturePath[key]);
  }

  if (futurePath.length > 0) {
    adsbFuturePath[key] = L.polyline(futurePath, {
      color: "#8888ff",
      weight: 2,
      dashArray: "4,4",
      opacity: 0.7
    }).addTo(window.ndMap);
  }

  if (adsbTrajectories[key]) {
    window.ndMap.removeLayer(adsbTrajectories[key]);
  }

  adsbTrajectories[key] = L.polyline(latlngs, {
    color,
    weight: 3,
    opacity: 0.85
  }).addTo(window.ndMap);

  const arrowCoords = createArrow(last.lat, last.lon, last.track);
  if (adsbArrows[key]) {
    window.ndMap.removeLayer(adsbArrows[key]);
  }

  if (arrowCoords) {
    adsbArrows[key] = L.polyline(arrowCoords, {
      color: "#ffffff",
      weight: 2,
      opacity: 0.9
    }).addTo(window.ndMap);
  }

  if (adsbLabels[key]) {
    window.ndMap.removeLayer(adsbLabels[key]);
  }

  const label = createLabel(last.lat, last.lon, last.gsKt, last.altFt);
  if (label) {
    adsbLabels[key] = label;
    adsbLabels[key].addTo(window.ndMap);
  }
}
