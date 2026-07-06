import { AIRLABS_API_KEY } from "./config.js";

/****************************************************
 * 1) FETCH METAR — AirLabs (ICAO correct)
 ****************************************************/
export async function fetchMetar(icao) {
  try {
    const url = `https://airlabs.co/api/v9/metar?icao=${icao}&api_key=${AIRLABS_API_KEY}`;
    const res = await fetch(url);
    const data = await res.json();
    return data?.response?.[0] || null;
  } catch (e) {
    console.error("Erreur METAR:", e);
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
 * 3) AFFICHAGE METAR
 ****************************************************/
export function updateMetarUI(airportKey, metar) {
  const el = document.getElementById(`metar-${airportKey}`);
  if (!el) return;

  if (!metar) {
    el.innerHTML = `<div class="metar-line red">METAR indisponible</div>`;
    return;
  }

  const color = classifyMetar(metar);

  const windDir = metar.wind_dir || "n/a";
  const windSpd = metar.wind_speed || "n/a";
  const temp = metar.temp || "n/a";
  const qnh = metar.pressure_hpa || "n/a";   // ⭐ correction

  el.innerHTML = `
    <div class="metar-line ${color}">
      Vent: ${windDir}° / ${windSpd} kt — T: ${temp}°C — QNH: ${qnh} hPa
    </div>
    <div class="metar-raw">${metar.raw_text || "n/a"}</div>
  `;
}

/****************************************************
 * 4) FETCH TAF — AirLabs (ICAO correct)
 ****************************************************/
export async function fetchTaf(icao) {
  try {
    const url = `https://airlabs.co/api/v9/taf?icao=${icao}&api_key=${AIRLABS_API_KEY}`;
    const res = await fetch(url);
    const data = await res.json();
    return data?.response?.[0] || null;
  } catch (e) {
    console.error("Erreur TAF:", e);
    return null;
  }
}

/****************************************************
 * 5) AFFICHAGE TAF
 ****************************************************/
export function updateTafUI(airportKey, taf) {
  const el = document.getElementById("taf-content");
  if (!el) return;

  el.innerHTML = `
    <div class="taf-title">TAF ${airportKey}</div>
    <div class="taf-raw">${taf?.raw_text || "n/a"}</div>
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
 * 7) EMBED METAR-TAF.COM
 ****************************************************/
export function injectMetarEmbed(airportKey) {
  // inchangé
}

/****************************************************
 * 8) ROSE DES VENTS
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
