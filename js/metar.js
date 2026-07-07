/****************************************************
 * AVWX API KEY
 ****************************************************/
import { AVWX_API_KEY } from "./config.js";

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
      wind_dir: data.wind_direction?.value || null,
      wind_speed: data.wind_speed?.value || null,
      temperature: data.temperature?.value || null,
      dewpoint: data.dewpoint?.value || null,
      visibility: data.visibility?.value || null,
      qnh: data.altimeter?.value || null
    };
  } catch (e) {
    console.error("METAR AVWX error:", e);
    return null;
  }
}

/****************************************************
 * 2) CLASSIFICATION METAR
 ****************************************************/
function classifyMetar(metar) {
  if (!metar) return "red";

  const wind = metar.wind_speed || 0;
  const vis = metar.visibility || 0;

  if (wind <= 8 && vis >= 8000) return "green";
  if (wind <= 15 && vis >= 4000) return "orange";
  return "red";
}

/****************************************************
 * 3) AFFICHAGE METAR — AVWX harmonisé
 ****************************************************/
export function updateMetarUI(airportKey, metar) {
  const key = airportKey.toLowerCase();

  const summary = document.getElementById(`meteo-${key}-summary`);
  const raw = document.getElementById(`meteo-${key}-raw`);

  if (!summary || !raw) {
    console.warn("IDs METAR manquants pour", airportKey);
    return;
  }

  if (!metar) {
    summary.textContent = "METAR indisponible";
    raw.textContent = "n/a";
    return;
  }

  const color = classifyMetar(metar);

  const windDir = metar.wind_dir ?? "n/a";
  const windSpd = metar.wind_speed ?? "n/a";
  const temp = metar.temperature ?? "n/a";
  const qnh = metar.qnh ?? "n/a";

 summary.innerHTML = `
  <div class="metar-line">
    <svg class="metar-icon"><use href="#icon-wind"></use></svg>
    Vent ${windDir}° / ${windSpd} kt
  </div>

  <div class="metar-line">
    <svg class="metar-icon"><use href="#icon-temp"></use></svg>
    Température : ${temp}°C
  </div>

  <div class="metar-line">
    <svg class="metar-icon"><use href="#icon-qnh"></use></svg>
    QNH : ${qnh} hPa
  </div>

  <div class="metar-line">
    <svg class="metar-icon"><use href="#icon-vis"></use></svg>
    Visibilité : ${metar.visibility ?? "n/a"} m
  </div>
`;


  raw.innerHTML = `
  <div class="metar-line">
    <svg class="metar-icon"><use href="#icon-metar"></use></svg>
    ${metar.raw}
  </div>
`;


/****************************************************
 * 4) FETCH TAF — AVWX
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
 * 5) AFFICHAGE TAF — AVWX harmonisé
 ****************************************************/
export function updateTafUI(airportKey, taf) {
  const el = document.getElementById("taf-content");
  if (!el) return;

  el.innerHTML = `
    <div class="taf-title">TAF ${airportKey}</div>
    <div class="taf-raw">${taf?.raw || "n/a"}</div>
  `;
}

/****************************************************
 * 6) SWITCH METAR / TAF
 ****************************************************/
export function initMetarSwitch() {
  const btnMetar = document.getElementById("btn-metar");
  const btnTaf = document.getElementById("btn-taf");
  const metarContent = document.getElementById("metar-content");
  const tafContent = document.getElementById("taf-content");

  if (!btnMetar || !btnTaf) return;

  btnMetar.addEventListener("click", () => {
    metarContent.style.display = "block";
    tafContent.style.display = "none";
  });

  btnTaf.addEventListener("click", () => {
    metarContent.style.display = "none";
    tafContent.style.display = "block";
  });
}

/****************************************************
 * 7) ROSE DES VENTS
 ****************************************************/
function classifyWind(speed) {
  if (speed <= 8) return "lime";
  if (speed <= 15) return "orange";
  return "red";
}

export function updateWindRose(metar) {
  const container = document.getElementById("wind-rose");
  if (!container) return;

  const windDir = metar?.wind_dir;
  const windSpd = metar?.wind_speed;

  if (!windDir || !windSpd) {
    container.innerHTML = "<div style='color:#888'>Vent: n/a</div>";
    return;
  }

  const color = classifyWind(windSpd);

  container.innerHTML = `
    <div class="wind-rose">
      <div class="wind-arrow" style="border-bottom-color:${color}; transform: rotate(${windDir}deg);"></div>
    </div>
    <div style="text-align:center; color:${color}; font-family:monospace;">
      ${windDir}° / ${windSpd} kt
    </div>
  `;
}
