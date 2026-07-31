/****************************************************
 * ND AIRBUS A320 — Cockpit IFR PRO+++
 * Track-Up, LOC/GS, trajectoire cyan, Mini-PFD
 ****************************************************/

import { airports } from "./config.js";

/****************************************************
 * Utils géométriques
 ****************************************************/
function toRad(deg) { return deg * Math.PI / 180; }
function toDeg(rad) { return rad * 180 / Math.PI; }

function haversine(lat1, lon1, lat2, lon2) {
  const R = 6371000;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat/2)**2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLon/2)**2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
}

/****************************************************
 * Projection ND Track-Up
 ****************************************************/
function projectNd(ap, lat, lon) {
  const ac = ap.aircraft;
  const rangeNm = 40;          // rayon ND
  const rangeM = rangeNm * 1852;

  const dLat = toRad(lat - ac.lat);
  const dLon = toRad(lon - ac.lon);

  const yNorth =
    Math.sin(dLat) * 6371000;
  const xEast =
    Math.sin(dLon) * Math.cos(toRad(ac.lat)) * 6371000;

  // rotation Track-Up
  const hdgRad = toRad(ac.hdg);
  const x =  xEast * Math.cos(hdgRad) + yNorth * Math.sin(hdgRad);
  const y = -xEast * Math.sin(hdgRad) + yNorth * Math.cos(hdgRad);

  const norm = rangeM;
  const nx = (x / norm) * 120;
  const ny = (y / norm) * 120;

  return {
    x: 150 + nx,
    y: 150 - ny
  };
}

/****************************************************
 * Déviation LOC/GS simplifiée (Airbus-style)
 ****************************************************/
function computeLocDots(ap) {
  const ac = ap.aircraft;
  const rw = ap.runways[0]; // piste principale
  const rwLat = ap.lat;
  const rwLon = ap.lon;

  const dLat = toRad(rwLat - ac.lat);
  const dLon = toRad(rwLon - ac.lon);

  const yNorth =
    Math.sin(dLat) * 6371000;
  const xEast =
    Math.sin(dLon) * Math.cos(toRad(ac.lat)) * 6371000;

  const hdgRad = toRad(rw.heading);
  const x =  xEast * Math.cos(hdgRad) + yNorth * Math.sin(hdgRad);
  const y = -xEast * Math.sin(hdgRad) + yNorth * Math.cos(hdgRad);

  // écart latéral en m
  const lateral = x;
  const dot = lateral / 90; // ~90 m par dot

  return Math.max(Math.min(dot, 2.5), -2.5);
}

function computeGsDots(ap) {
  const ac = ap.aircraft;
  const rwLat = ap.lat;
  const rwLon = ap.lon;
  const rw = ap.runways[0];

  const dLat = toRad(rwLat - ac.lat);
  const dLon = toRad(rwLon - ac.lon);

  const yNorth =
    Math.sin(dLat) * 6371000;
  const xEast =
    Math.sin(dLon) * Math.cos(toRad(ac.lat)) * 6371000;

  const hdgRad = toRad(rw.heading);
  const x =  xEast * Math.cos(hdgRad) + yNorth * Math.sin(hdgRad);
  const y = -xEast * Math.sin(hdgRad) + yNorth * Math.cos(hdgRad);

  const distAlong = y; // le long de l’axe piste
  const gsAngle = toRad(3);
  const altTheoFt = (distAlong * Math.tan(gsAngle)) * 3.2808;

  const deviationFt = ac.altFt - altTheoFt;
  const dot = deviationFt / 100; // ~100 ft par dot

  return Math.max(Math.min(dot, 2.5), -2.5);
}

/****************************************************
 * ND Airbus A320 (SVG)
 ****************************************************/
function ktToMs(kt) {
  return (kt * 0.514444).toFixed(1);
}

function generateNdSvg(apKey) {
  const ap = airports[apKey];
  const ac = ap.aircraft;

  const locDots = computeLocDots(ap);
  const gsDots = computeGsDots(ap);

  const hdg = ac.hdg || 0;
  const gs = ac.gs || 0;
  const alt = ac.altFt || 0;

  const rw = ap.runways[0]?.name || "XX";

  const windDir = ap.metar?.wind_dir ?? "VRB";
  const windSpd = ap.metar?.wind_speed ?? 0;
  const windMs = ktToMs(windSpd);

  return `
  <svg width="300" height="300" viewBox="0 0 300 300">

    <!-- Fond ND -->
    <circle cx="150" cy="150" r="140" fill="#111" stroke="#444" stroke-width="4"/>

    <!-- Rose -->
    <circle cx="150" cy="150" r="120" fill="none" stroke="#333" stroke-width="1"/>
    ${[0,30,60,90,120,150,180,210,240,270,300,330].map(a => {
      const rad = toRad(a);
      const x1 = 150 + 110 * Math.sin(rad);
      const y1 = 150 - 110 * Math.cos(rad);
      const x2 = 150 + 120 * Math.sin(rad);
      const y2 = 150 - 120 * Math.cos(rad);
      return `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="#555" stroke-width="1"/>`;
    }).join("")}

    <!-- Heading -->
    <text x="150" y="40" fill="#0af" font-size="22" text-anchor="middle">
      HDG ${hdg.toFixed(0)}
    </text>

    <!-- GS -->
    <text x="40" y="150" fill="#0af" font-size="18" text-anchor="middle">
      GS ${gs.toFixed(0)}
    </text>

    <!-- ALT -->
    <text x="260" y="150" fill="#0af" font-size="18" text-anchor="middle">
      ALT ${alt.toFixed(0)}
    </text>
    
    <!-- WIND -->
    <text x="150" y="80" fill="#0af" font-size="18" text-anchor="middle">
      WIND ${windDir}° / ${windSpd} kt (${windMs} m/s)
    </text>

    <!-- LOC bar -->
    <rect x="140" y="100" width="20" height="100" fill="#222"/>
    <rect x="140" y="${150 + locDots * 10}" width="20" height="5" fill="#0af"/>

    <!-- GS bar -->
    <rect x="100" y="140" width="100" height="20" fill="#222"/>
    <rect x="${150 + gsDots * 10}" y="140" width="5" height="20" fill="#ffaa00"/>

    <!-- Avion -->
    <polygon points="150,130 145,150 155,150" fill="#fff"/>

    <!-- Runway -->
    <text x="150" y="280" fill="#fff" font-size="20" text-anchor="middle">
      RWY ${rw}
    </text>

  </svg>
  `;
}

/****************************************************
 * Mini-PFD Airbus (horizon artificiel)
 ****************************************************/
function generatePfdSvg(apKey) {
  return `
  <svg width="300" height="200" viewBox="0 0 300 200">
    <rect width="300" height="100" fill="#003366"/>
    <rect y="100" width="300" height="100" fill="#663300"/>
    <line x1="0" y1="100" x2="300" y2="100" stroke="#fff" stroke-width="2"/>
    <polygon points="150,90 140,110 160,110" fill="#fff"/>
  </svg>
  `;
}

/****************************************************
 * Trajectoire cyan Airbus (canvas ND)
 ****************************************************/
function ensureNdCanvas(apKey) {
  const ndDiv = document.getElementById(`nd-${apKey}`);
  if (!ndDiv) return null;

  let canvas = ndDiv.querySelector("canvas");
  if (!canvas) {
    canvas = document.createElement("canvas");
    canvas.width = 300;
    canvas.height = 300;
    canvas.style.position = "absolute";
    canvas.style.left = "0";
    canvas.style.top = "0";
    canvas.style.pointerEvents = "none";
    ndDiv.style.position = "relative";
    ndDiv.appendChild(canvas);
  }
  return canvas.getContext("2d");
}

function drawNdTrajectory(apKey) {
  const ap = airports[apKey];
  const ac = ap.aircraft;
  const icao = ac.icao;
  if (!icao) return;

  const key = String(icao);
  const hist = (window.adsbHistory && window.adsbHistory[key]) || [];
  if (!hist.length) return;

  const ctx = ensureNdCanvas(apKey);
  if (!ctx) return;

  ctx.clearRect(0, 0, 300, 300);
  ctx.save();

  ctx.strokeStyle = "#00ffff";
  ctx.lineWidth = 2;
  ctx.beginPath();

  hist.forEach((p, idx) => {
    const xy = projectNd(ap, p.lat, p.lng);
    if (idx === 0) ctx.moveTo(xy.x, xy.y);
    else ctx.lineTo(xy.x, xy.y);
  });

  ctx.stroke();
  ctx.restore();
}

/****************************************************
 * Mise à jour ND Airbus
 ****************************************************/
export function updateNdAirbus(apKey) {
  const ap = airports[apKey];

  const ndDiv = document.getElementById(`nd-${apKey}`);
  const pfdDiv = document.getElementById(`pfd-${apKey}`);

  if (!ndDiv || !pfdDiv) return;

  // ND SVG
  ndDiv.innerHTML = generateNdSvg(apKey);

  // Canvas trajectoire cyan superposé
  drawNdTrajectory(apKey);

  // Mini-PFD
  pfdDiv.innerHTML = generatePfdSvg(apKey);
}
