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
  const targetId = airportKey === "EBCI" ? "metar-ebci" : "metar-eblg";
  const el = document.getElementById(targetId);
  if (!el) return;

  el.innerHTML = `
    <div class="metar-block">
      💨 Vent ${metar.wind_dir}° / ${metar.wind_speed} kt<br>
      🌡 Température : ${metar.temperature}°C<br>
      🧭 QNH : ${metar.qnh} hPa<br>
      👁 Visibilité : ${metar.visibility} m<br>
      <pre>${metar.raw}</pre>
    </div>
  `;
}

