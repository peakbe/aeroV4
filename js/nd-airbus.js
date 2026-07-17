/****************************************************
 * ND AIRBUS A320 — Cockpit IFR PRO+++
 * Déviation LOC/GS en dots + Mini-PFD + ND SVG
 ****************************************************/

import { airports } from "./config.js";

/****************************************************
 * Utils géométriques
 ****************************************************/
function toRad(deg) { return deg * Math.PI / 180; }

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
 * Déviation LOC en dots (Airbus)
 ****************************************************/
function computeLocDots(ap) {
  const ac = ap.aircraft;
  const loc = ap.ils.localizer;

  const dist = haversine(ac.lat, ac.lon, loc.lat, loc.lon);

  // 1 dot ≈ 90 m à 10 NM
  const dot = dist / 90;

  return Math.max(Math.min(dot, 2.5), -2.5);
}

/****************************************************
 * Déviation GS en dots (Airbus)
 ****************************************************/
function computeGsDots(ap) {
  const ac = ap.aircraft;
  const gs = ap.ils.glideSlope;

  const distAlong = haversine(ac.lat, ac.lon, gs.lat, gs.lon);

  const gsAngle = toRad(3);
  const altTheoFt = (distAlong * Math.tan(gsAngle)) * 3.2808;

  const deviationFt = ac.altFt - altTheoFt;

  // 1 dot GS ≈ 100 ft
  const dot = deviationFt / 100;

  return Math.max(Math.min(dot, 2.5), -2.5);
}

/****************************************************
 * ND Airbus A320 (SVG)
 ****************************************************/
function generateNdSvg(ap) {
  const locDots = computeLocDots(ap);
  const gsDots = computeGsDots(ap);

  const hdg = ap.aircraft.hdg;
  const gs = ap.aircraft.gs;
  const alt = ap.aircraft.altFt;
  const rw = ap.activeRunway;

  return `
  <svg width="300" height="300" viewBox="0 0 300 300">

    <!-- Fond ND -->
    <circle cx="150" cy="150" r="140" fill="#111" stroke="#444" stroke-width="4"/>

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

    <!-- LOC bar -->
    <rect x="140" y="100" width="20" height="100" fill="#222"/>
    <rect x="140" y="${150 + locDots * 20}" width="20" height="5" fill="#0af"/>

    <!-- GS bar -->
    <rect x="100" y="140" width="100" height="20" fill="#222"/>
    <rect x="${150 + gsDots * 20}" y="140" width="5" height="20" fill="#ffaa00"/>

    <!-- Avion -->
    <polygon points="150,120 145,140 155,140" fill="#fff"/>

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
function generatePfdSvg(ap) {
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
 * Mise à jour ND Airbus
 ****************************************************/
export function updateNdAirbus(apKey) {
  const ap = airports[apKey];

  const ndDiv = document.getElementById(`nd-${apKey}`);
  const pfdDiv = document.getElementById(`pfd-${apKey}`);

  if (!ndDiv || !pfdDiv) return;

  ndDiv.innerHTML = generateNdSvg(ap);
  pfdDiv.innerHTML = generatePfdSvg(ap);
}
