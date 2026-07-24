/****************************************************
 * METAR — AVWX Version PRO+++
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

      // Vent moyen
      wind_dir: data.wind_direction?.value ?? "VRB",
      wind_speed: data.wind_speed?.value ?? 0,

      // Rafales
      wind_gust: data.wind_gust?.value ?? null,

      // Variation direction (ex: 180V240)
      wind_var_from: data.wind_variable_direction?.value?.from ?? null,
      wind_var_to: data.wind_variable_direction?.value?.to ?? null,

      // Temp / Dew / Vis / QNH
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
 * fonction couleur GUST
 ****************************************************/
function gustColor(gust) {
  if (!gust) return "";
  if (gust <= 10) return "metar-green";
  if (gust <= 20) return "metar-orange";
  return "metar-red";
}

/****************************************************
 * 3) AFFICHAGE METAR — AVWX harmonisé
 ****************************************************/
export function updateMetarUI(airportKey, metar, targetId) {
  if (window.isSonoTab()) return;

  const el = document.getElementById(targetId);
  if (!el) return;

  el.innerHTML = `
   <div class="metar-line">
  Vent ${metar.wind_dir}° / ${metar.wind_speed} kt
  ${metar.wind_gust ? `(G${metar.wind_gust})` : ""}
</div>

    <div class="metar-line">Température : ${metar.temp ?? "n/a"}°C</div>
    <div class="metar-line">QNH : ${metar.qnh ?? "n/a"} hPa</div>
    <div class="metar-line">Visibilité : ${metar.visib ?? "n/a"} m</div>
    <div class="metar-raw">${metar.raw}</div>
  `;
}


