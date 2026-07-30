/****************************************************
 * METAR — AVWX Version Airbus MCDU PRO+++
 ****************************************************/
import { AVWX_API_KEY } from "./config.js";
import { airports } from "./config.js";

/****************************************************
 * 1) FETCH METAR — AVWX
 ****************************************************/
export async function fetchMetar(icao) {
  try {
    const url = `https://avwx.rest/api/metar/${icao}?format=json&token=${AVWX_API_KEY}`;
    const r = await fetch(url);
    if (!r.ok) return null;

    const data = await r.json();

    return {
      raw: data.raw || null,

      wind_dir: data.wind_direction?.value ?? "VRB",
      wind_speed: data.wind_speed?.value ?? 0,
      wind_gust: data.wind_gust?.value ?? null,

      wind_var_from: data.wind_variable_direction?.value?.from ?? null,
      wind_var_to: data.wind_variable_direction?.value?.to ?? null,

      temp: data.temperature?.value ?? null,
      dew: data.dewpoint?.value ?? null,
      visib: data.visibility?.value ?? null,
      qnh: data.altimeter?.value ?? null
    };

  } catch (e) {
    console.error("METAR AVWX error:", e);
    return null;
  }
}

/****************************************************
 * 2) CLASSIFICATION METAR — Airbus
 ****************************************************/
function classifyWind(speed) {
  if (speed <= 8) return "cyan";
  if (speed <= 15) return "orange";
  return "red";
}

function classifyGust(gust) {
  if (!gust) return "cyan";
  if (gust <= 10) return "cyan";
  if (gust <= 20) return "orange";
  return "red";
}

function classifyVis(vis) {
  if (vis >= 8000) return "cyan";
  if (vis >= 4000) return "orange";
  return "red";
}

/****************************************************
 * 3) AFFICHAGE METAR — Airbus MCDU PRO+++
 ****************************************************/
function ktToMs(kt) {
  return (kt * 0.514444).toFixed(1);
}

export function updateMetarUI(airportKey, metar, targetId) {

  if (window.isSonoTab()) return;

  const el = document.getElementById(targetId);
  if (!el || !metar) return;

  const rw = airports[airportKey].activeRunway;

  const windColor = classifyWind(metar.wind_speed);
  const gustColor = classifyGust(metar.wind_gust);
  const visColor = classifyVis(metar.visib);
  const windMs = ktToMs(metar.wind_speed || 0);
  const gustMs = ktToMs(metar.wind_gust || 0);


  /****************************************************
   * Rendu cockpit IFR — Airbus MCDU
   ****************************************************/
  el.innerHTML = `
    <div class="metar-block">

      <div class="metar-title">
        METAR — ${airportKey}
      </div>

     <div class="metar-line">
  <span class="metar-label">WIND</span>
  <span class="metar-value" style="color:${windColor}">
    ${metar.wind_dir}° / ${metar.wind_speed} kt 
    <span class="wind-ms">(${windMs} m/s)</span>
  </span>

  ${metar.wind_gust ? `
    <span class="metar-value" style="color:${gustColor}">
      G${metar.wind_gust} kt 
      <span class="wind-ms">(${gustMs} m/s)</span>
    </span>` : ""}
</div>

      ${metar.wind_var_from && metar.wind_var_to ? `
      <div class="metar-line">
        <span class="metar-label">VAR</span>
        <span class="metar-value">
          ${metar.wind_var_from}V${metar.wind_var_to}
        </span>
      </div>` : ""}

      <div class="metar-line">
        <span class="metar-label">TEMP</span>
        <span class="metar-value">${metar.temp ?? "n/a"}°C</span>
      </div>

      <div class="metar-line">
        <span class="metar-label">DEW</span>
        <span class="metar-value">${metar.dew ?? "n/a"}°C</span>
      </div>

      <div class="metar-line">
        <span class="metar-label">QNH</span>
        <span class="metar-value">${metar.qnh ?? "n/a"} hPa</span>
      </div>

      <div class="metar-line">
        <span class="metar-label">VIS</span>
        <span class="metar-value" style="color:${visColor}">
          ${metar.visib ?? "n/a"} m
        </span>
      </div>

      <div class="metar-line runway-active">
        <span class="metar-label">RWY</span>
        <span class="metar-value">${rw?.name ?? "n/a"}</span>
      </div>

      <div class="metar-raw">
        ${metar.raw}
      </div>

    </div>
  `;
}
