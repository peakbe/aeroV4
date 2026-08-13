/****************************************************
 * ND AIRBUS A320 — Cockpit IFR PRO+++
 * Multi‑targets, avion maître, traffic mode, future path,
 * historique ADS‑B, centrage ND, Track‑Up
 ****************************************************/

import { airports } from "./config.js";
import { computeWindComponents } from "./wind-components.js";

/****************************************************
 * 1) Utils géométriques
 ****************************************************/
function toRad(deg) { return deg * Math.PI / 180; }
function toDeg(rad) { return rad * 180 / Math.PI; }

/****************************************************
 * 1bis) Limites vent — Tailwind Airbus PRO+++
 ****************************************************/
function getTailwindLimit(apKey) {
  switch (apKey) {
    case "EBCI":
      return 10;   // Charleroi
    case "EBLG":
      return 15;   // Liège
    default:
      return 10;   // standard Airbus
  }
}

function getCrosswindLimit(apKey) {
  switch (apKey) {
    case "EBCI":
      return 30;   // Charleroi
    case "EBLG":
      return 35;   // Liège cargo
    default:
      return 30;   // standard Airbus
  }
}


/****************************************************
 * 2) Projection ND Track-Up (centré sur avion maître)
 ****************************************************/
function projectNd(masterAc, lat, lon) {
  const rangeNm = 40;
  const rangeM = rangeNm * 1852;

  const dLat = toRad(lat - masterAc.lat);
  const dLon = toRad(lon - masterAc.lon);

  const yNorth = Math.sin(dLat) * 6371000;
  const xEast  = Math.sin(dLon) * Math.cos(toRad(masterAc.lat)) * 6371000;

  const hdgRad = toRad(masterAc.hdg || 0);
  const x =  xEast * Math.cos(hdgRad) + yNorth * Math.sin(hdgRad);
  const y = -xEast * Math.sin(hdgRad) + yNorth * Math.cos(hdgRad);

  const nx = (x / rangeM) * 120;
  const ny = (y / rangeM) * 120;

  return {
    x: 150 + nx,
    y: 150 - ny
  };
}

/****************************************************
 * 3) LOC / GS — Piste active PRO+++
 ****************************************************/
function computeLocDots(ap) {
  const ac = ap.aircraft;
  const rw = ap.activeRunway || ap.runways[0];
  if (!rw || !ac) return 0;

  const rwLat = rw.lat1;
  const rwLon = rw.lon1;

  const dLat = toRad(rwLat - ac.lat);
  const dLon = toRad(rwLon - ac.lon);

  const yNorth =
    Math.sin(dLat) * 6371000;
  const xEast =
    Math.sin(dLon) * Math.cos(toRad(ac.lat)) * 6371000;

  const hdgRad = toRad(rw.heading);
  const x =  xEast * Math.cos(hdgRad) + yNorth * Math.sin(hdgRad);
  const y = -xEast * Math.sin(hdgRad) + yNorth * Math.cos(hdgRad);

  const lateral = x;
  const dot = lateral / 90; // ~90 m par dot

  return Math.max(Math.min(dot, 2.5), -2.5);
}

function computeGsDots(ap) {
  const ac = ap.aircraft;
  const rw = ap.activeRunway || ap.runways[0];
  if (!rw || !ac) return 0;

  const rwLat = rw.lat1;
  const rwLon = rw.lon1;

  const dLat = toRad(rwLat - ac.lat);
  const dLon = toRad(rwLon - ac.lon);

  const yNorth =
    Math.sin(dLat) * 6371000;
  const xEast =
    Math.sin(dLon) * Math.cos(toRad(ac.lat)) * 6371000;

  const hdgRad = toRad(rw.heading);
  const x =  xEast * Math.cos(hdgRad) + yNorth * Math.sin(hdgRad);
  const y = -xEast * Math.sin(hdgRad) + yNorth * Math.cos(hdgRad);

  const distAlong = y;

  const gsAngle = toRad(3);
  const altTheoFt = (distAlong * Math.tan(gsAngle)) * 3.2808;

  const deviationFt = ac.altFt - altTheoFt;
  const dot = deviationFt / 100; // ~100 ft par dot

  return Math.max(Math.min(dot, 2.5), -2.5);
}

/****************************************************
 * 4) ND Airbus A320 — SVG harmonisé PRO+++
 ****************************************************/
function generateNdSvg(apKey) {
  const ap = airports[apKey];
  const ac = ap.aircraft;
  const rw = ap.activeRunway || ap.runways[0];

  if (!ac || !rw) return "";

  const hdg = ac.hdg || 0;
  const gs  = ac.gs  || 0;
  const alt = ac.altFt || 0;

  const windDirRaw = ap.metar?.wind_dir ?? "VRB";
  const windSpd = ap.metar?.wind_speed ?? 0;
  const windDir = windDirRaw === "VRB" ? null : Number(windDirRaw);
  const windMs  = (windSpd * 0.514444).toFixed(1);

  const locDots = computeLocDots(ap);
  const gsDots  = computeGsDots(ap);

  const { headwind, crosswind, angle } =
    computeWindComponents(rw.heading, windDir, windSpd);

  const tailwind = headwind < 0 ? Math.abs(headwind) : 0;
  const tailwindLimit = getTailwindLimit(apKey);
  const tailwindWarning = tailwind >= tailwindLimit;

  const crosswindAbs = Math.abs(crosswind);
  const crosswindLimit = getCrosswindLimit(apKey);
  const crosswindWarning = crosswindAbs >= crosswindLimit;

  const xwSide = crosswind > 0 ? "RIGHT" : "LEFT";

  let windColor = "#00e5ff";
  if (tailwindWarning) windColor = "#ff4444";
  else if (crosswindWarning) windColor = "#ffaa00";

  let windArrow = "";
  if (windDir !== null) {
    const rad = toRad(windDir);
    const x1 = 150 + 80 * Math.sin(rad);
    const y1 = 150 - 80 * Math.cos(rad);
    const x2 = 150 + 110 * Math.sin(rad);
    const y2 = 150 - 110 * Math.cos(rad);

    windArrow = `
      <line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}"
            stroke="${windColor}" stroke-width="2"/>
      <circle cx="${x2}" cy="${y2}" r="3" fill="${windColor}"/>
    `;
  }

  return `
  <svg width="300" height="300" viewBox="0 0 300 300">

    <!-- Fond ND -->
    <circle cx="150" cy="150" r="140" fill="#111" stroke="#444" stroke-width="4"/>

    <!-- Rose ND -->
    <circle cx="150" cy="150" r="120" fill="none" stroke="#333" stroke-width="1"/>
    ${[0,30,60,90,120,150,180,210,240,270,300,330].map(a => {
      const rad = toRad(a);
      const x1 = 150 + 110 * Math.sin(rad);
      const y1 = 150 - 110 * Math.cos(rad);
      const x2 = 150 + 120 * Math.sin(rad);
      const y2 = 150 - 120 * Math.cos(rad);
      return `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="#555" stroke-width="1"/>`;
    }).join("")}

    <!-- Flèche vent ND -->
    ${windArrow}

    <!-- Heading -->
    <text x="150" y="40" fill="#00e5ff" font-size="22" text-anchor="middle">
      HDG ${hdg.toFixed(0)}
    </text>

    <!-- GS -->
    <text x="40" y="150" fill="#00e5ff" font-size="18" text-anchor="middle">
      GS ${gs.toFixed(0)}
    </text>

    <!-- ALT -->
    <text x="260" y="150" fill="#00e5ff" font-size="18" text-anchor="middle">
      ALT ${alt.toFixed(0)}
    </text>

    <!-- Vent brut -->
    <text x="150" y="80" fill="#00e5ff" font-size="16" text-anchor="middle">
      WIND ${windDirRaw}° / ${windSpd} kt (${windMs} m/s)
    </text>

    <!-- Composantes vent -->
    <text x="150" y="100" fill="#00e5ff" font-size="14" text-anchor="middle">
      HW ${headwind} kt  CW ${crosswind} kt  ANG ${angle}°
    </text>

    <!-- Crosswind side -->
    <text x="150" y="120" fill="#00e5ff" font-size="14" text-anchor="middle">
      XW ${xwSide}
    </text>

    <!-- Crosswind warning -->
    ${crosswindWarning ? `
      <text x="150" y="140" fill="#ffaa00" font-size="14" text-anchor="middle">
        CROSSWIND ${crosswindAbs} kt (LIMIT ${crosswindLimit})
      </text>
    ` : ""}

    <!-- Tailwind warning -->
    ${tailwindWarning ? `
      <text x="150" y="160" fill="#ff4444" font-size="14" text-anchor="middle">
        TAILWIND ${tailwind} kt (LIMIT ${tailwindLimit})
      </text>
    ` : ""}

    <!-- LOC bar -->
    <rect x="140" y="180" width="20" height="100" fill="#222"/>
    <rect x="140" y="${230 + locDots * 10}" width="20" height="5" fill="#00e5ff"/>

    <!-- GS bar -->
    <rect x="100" y="220" width="100" height="20" fill="#222"/>
    <rect x="${150 + gsDots * 10}" y="220" width="5" height="20" fill="#ffaa00"/>

    <!-- Avion maître -->
    <polygon points="150,130 145,150 155,150" fill="#ffffff"/>

    <!-- Runway -->
    <text x="150" y="280" fill="#ffffff" font-size="20" text-anchor="middle">
      RWY ${rw.name}
    </text>

  </svg>
  `;
}

/****************************************************
 * 5) Canvas ND
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
  return canvas;
}

/****************************************************
 * 6) Symbole avion maître / traffic
 ****************************************************/
function drawAircraftSymbol(apKey, masterAc, ac, isMaster) {
  const ndDiv = document.getElementById(`nd-${apKey}`);
  if (!ndDiv) return;

  const color = isMaster ? "#00e5ff" : "#ffffff";
  const size  = isMaster ? 14 : 10;

  const pos = projectNd(masterAc, ac.lat, ac.lon);

  const el = document.createElement("div");
  el.style.position = "absolute";
  el.style.left = `${pos.x - size/2}px`;
  el.style.top  = `${pos.y - size/2}px`;
  el.innerHTML = `
    <svg width="${size}" height="${size}" viewBox="0 0 24 24"
         fill="${color}" stroke="${color}" stroke-width="1.5">
      <path d="M12 2 L14 10 L22 12 L14 14 L12 22 L10 14 L2 12 L10 10 Z"/>
    </svg>
  `;
  ndDiv.appendChild(el);
}

/****************************************************
 * 7) Future path maître / traffic
 ****************************************************/
function drawFuturePath(apKey, masterAc, ac, isMaster) {
  const canvas = ensureNdCanvas(apKey);
  if (!canvas) return;

  const ctx = canvas.getContext("2d");

  const color = isMaster ? "#00e5ff" : "#ffffff";
  const opacity = isMaster ? 0.9 : 0.5;

  const gs = ac.gs || 0;
  const hdg = ac.hdg || 0;

  const distanceNm = gs / 60;
  const distanceMeters = distanceNm * 1852;

  const bearingRad = toRad(hdg);
  const dLat = (distanceMeters / 6371000) * Math.cos(bearingRad);
  const dLon = (distanceMeters / 6371000) * Math.sin(bearingRad);

  const lat2 = ac.lat + (dLat * 180 / Math.PI);
  const lon2 = ac.lon + (dLon * 180 / Math.PI);

  const p1 = projectNd(masterAc, ac.lat, ac.lon);
  const p2 = projectNd(masterAc, lat2, lon2);

  ctx.strokeStyle = color;
  ctx.lineWidth = isMaster ? 3 : 2;
  ctx.globalAlpha = opacity;

  ctx.beginPath();
  ctx.moveTo(p1.x, p1.y);
  ctx.lineTo(p2.x, p2.y);
  ctx.stroke();

  ctx.globalAlpha = 1;
}

/****************************************************
 * 8) Historique ADS‑B (toujours blanc)
 ****************************************************/
function drawAdsbHistory(apKey, masterAc, ac) {
  const canvas = ensureNdCanvas(apKey);
  if (!canvas) return;

  const ctx = canvas.getContext("2d");

  const hist = window.adsbHistory?.[ac.icao] || [];
  if (hist.length < 2) return;

  ctx.strokeStyle = "#ffffff";
  ctx.lineWidth = 1.5;
  ctx.globalAlpha = 0.6;

  ctx.beginPath();

  hist.forEach((p, idx) => {
    const xy = projectNd(masterAc, p.lat, p.lng);
    if (idx === 0) ctx.moveTo(xy.x, xy.y);
    else ctx.lineTo(xy.x, xy.y);
  });

  ctx.stroke();
  ctx.globalAlpha = 1;
}

/****************************************************
 * 9) Nettoyage ND
 ****************************************************/
function clearNd(apKey) {
  const ndDiv = document.getElementById(`nd-${apKey}`);
  if (!ndDiv) return;

  ndDiv.innerHTML = "";
}

/****************************************************
 * 10) ND Airbus — Multi‑targets PRO+++
 ****************************************************/
export function updateNdAirbus(input, selectedIcao = null, apKey = "EBCI") {

  const aircraftList = Array.isArray(input)
    ? input
    : input ? [input] : [];

  if (!aircraftList.length) return;

  const ap = airports[apKey];
  if (!ap) return;

  // Avion maître
  let master = selectedIcao
    ? aircraftList.find(a => a.icao === selectedIcao) || aircraftList[0]
    : aircraftList[0];

  const fp = predictFuturePosition(ac, 30);

drawVector(ac.lat, ac.lon, future.lat, future.lon, "yellow");

  
  // Synchronise ap.aircraft avec l’avion maître
// Synchronise ap.aircraft avec l’avion maître
ap.aircraft = {
    lat: master.lat,
    lon: master.lon,
    altFt: Number(master.altFt || 0),
    hdg: Number(master.track || master.hdg || 0),
    gs: Number(master.gsKt || master.gs || 0),
    icao: master.icao,
    degraded: master.degraded || false
};

// Mode dégradé ND Airbus
const ndStatus = document.getElementById(`nd-status-${apKey}`);
if (ndStatus) {
    if (ap.aircraft.degraded) {
        ndStatus.innerText = "ND Airbus – Mode dégradé (fallback)";
        ndStatus.style.color = "orange";
    } else {
        ndStatus.innerText = "ND Airbus – Mode normal";
        ndStatus.style.color = "lightgreen";
    }
}

  clearNd(apKey);

  const ndDiv = document.getElementById(`nd-${apKey}`);
  if (!ndDiv) return;

  // ND Airbus SVG (fond instrument)
  ndDiv.innerHTML = generateNdSvg(apKey);

  // Canvas ND pour trajectoires / future path / historique
  const canvas = ensureNdCanvas(apKey);
  if (!canvas) return;
  const ctx = canvas.getContext("2d");
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // Dessin multi‑targets
  aircraftList.forEach(ac => {
    const isMaster = ac.icao === master.icao;

    drawAircraftSymbol(apKey, ap.aircraft, ac, isMaster);
    drawFuturePath(apKey, ap.aircraft, ac, isMaster);
    drawAdsbHistory(apKey, ap.aircraft, ac);
  });
}

// predictFuturePosition — ND Airbus
function predictFuturePosition(ac, secondsAhead = 30) {
  const R = 6371e3; // rayon Terre
  const speedMs = ac.gsKt * 0.514444; // kt → m/s
  const distance = speedMs * secondsAhead;

  const lat1 = ac.lat * Math.PI / 180;
  const lon1 = ac.lon * Math.PI / 180;
  const bearing = ac.track * Math.PI / 180;

  const lat2 = Math.asin(
    Math.sin(lat1) * Math.cos(distance / R) +
    Math.cos(lat1) * Math.sin(distance / R) * Math.cos(bearing)
  );

  const lon2 = lon1 + Math.atan2(
    Math.sin(bearing) * Math.sin(distance / R) * Math.cos(lat1),
    Math.cos(distance / R) - Math.sin(lat1) * Math.sin(lat2)
  );

  return {
    lat: lat2 * 180 / Math.PI,
    lon: lon2 * 180 / Math.PI
  };
}
