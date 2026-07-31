/****************************************************
 * TAF — AVWX Version Airbus MCDU PRO+++
 ****************************************************/
import { AVWX_API_KEY } from "./config.js";

/****************************************************
 * 1) FETCH TAF — AVWX
 ****************************************************/
export async function fetchTaf(icao) {
  try {
    const url = `https://avwx.rest/api/taf/${icao}?format=json&token=${AVWX_API_KEY}`;
    const r = await fetch(url);
    if (!r.ok) return null;

    const data = await r.json();

    return {
      raw: data.raw || null,
      forecast: data.forecast || []
    };

  } catch (e) {
    console.error("TAF AVWX error:", e);
    return null;
  }
}

/****************************************************
 * 2) Format cockpit IFR
 ****************************************************/
function fmt(val, unit = "") {
  return val !== null && val !== undefined ? `${val}${unit}` : "n/a";
}

function fmtTime(t) {
  if (!t) return "n/a";
  try {
    return t.replace("T", " ").replace("Z", "");
  } catch {
    return "n/a";
  }
}

/****************************************************
 * 3) Classification avionique (Airbus)
 ****************************************************/
function colorWind(speed) {
  if (speed <= 8) return "cyan";
  if (speed <= 15) return "orange";
  return "red";
}

function colorVis(vis) {
  if (vis >= 8000) return "cyan";
  if (vis >= 4000) return "orange";
  return "red";
}

/****************************************************
 * 4) AFFICHAGE TAF — Airbus MCDU PRO+++
 ****************************************************/
export function updateTafUI(airportKey, taf) {

  const el = document.getElementById("taf-content");
  if (!el) return;

  if (!taf) {
    el.innerHTML = `
      <div class="taf-block">
        <div class="taf-title">TAF ${airportKey}</div>
        <div class="taf-line">TAF indisponible</div>
      </div>
    `;
    return;
  }

  /****************************************************
   * Construction cockpit IFR
   ****************************************************/
  let html = `
    <div class="taf-block">
      <div class="taf-title">TAF — ${airportKey}</div>
      <div class="taf-raw">${taf.raw}</div>
      <div class="taf-subtitle">FORECAST</div>
  `;

  taf.forecast.forEach(f => {

    const windDir = f.wind_direction?.value ?? "VRB";
    const windSpd = f.wind_speed?.value ?? 0;
    const vis = f.visibility?.value ?? null;

    const windColor = colorWind(windSpd);
    const visColor = colorVis(vis);

    html += `
      <div class="taf-forecast-block">

        <div class="taf-line">
          <span class="taf-label">PERIOD</span>
          <span class="taf-value">
            ${fmtTime(f.start)} → ${fmtTime(f.end)}
          </span>
        </div>

        <div class="taf-line">
          <span class="taf-label">WIND</span>
          <span class="taf-value" style="color:${windColor}">
            ${windDir}° / ${windSpd} kt
          </span>
        </div>

        <div class="taf-line">
          <span class="taf-label">VIS</span>
          <span class="taf-value" style="color:${visColor}">
            ${fmt(vis, " m")}
          </span>
        </div>

        ${f.weather?.length ? `
        <div class="taf-line">
          <span class="taf-label">WX</span>
          <span class="taf-value">${f.weather.join(" ")}</span>
        </div>` : ""}

        ${f.clouds?.length ? `
        <div class="taf-line">
          <span class="taf-label">CLOUDS</span>
          <span class="taf-value">
            ${f.clouds.map(c => `${c.type}${fmt(c.base, " ft")}`).join(", ")}
          </span>
        </div>` : ""}

      </div>
    `;
  });

  html += `</div>`;
  el.innerHTML = html;
}

/****************************************************
 * 5) SWITCH METAR / TAF — Airbus MCDU
 ****************************************************/
export function initMetarSwitch() {
  const btnMetar = document.getElementById("btn-metar");
  const btnTaf = document.getElementById("btn-taf");
  const metarContent = document.getElementById("metar-content");
  const tafContent = document.getElementById("taf-content");

  if (!btnMetar || !btnTaf || !metarContent || !tafContent) return;

  btnMetar.addEventListener("click", () => {
    metarContent.style.display = "block";
    tafContent.style.display = "none";
  });

  btnTaf.addEventListener("click", () => {
    metarContent.style.display = "none";
    tafContent.style.display = "block";
  });
}
