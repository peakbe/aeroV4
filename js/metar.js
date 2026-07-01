import { AVWX_API_KEY } from "./config.js";
import { safeSet } from "./utils.js";

export async function fetchMetar(icao) {
  const url = `https://avwx.rest/api/metar/${icao}?token=${AVWX_API_KEY}&format=json`;
  const res = await fetch(url);
  if (!res.ok) throw new Error("METAR error " + icao);
  return res.json();
}

export function updateMetarUI(airportKey, metar) {
  const el = document.getElementById(`metar-${airportKey}`);
  if (!el) return;

  const color = classifyMetar(metar);

  const windDir = metar?.wind_direction?.value ?? "n/a";
  const windSpd = metar?.wind_speed?.value ?? "n/a";
  const temp = metar?.temperature?.value ?? "n/a";
  const qnh = metar?.altimeter?.value ?? "n/a";

  el.innerHTML = `
    <div class="metar-line ${color}">
      Vent: ${windDir}° / ${windSpd} kt — T: ${temp}°C — QNH: ${qnh} hPa
    </div>
    <div class="metar-raw">${metar?.raw_text || "n/a"}</div>
  `;
}


  safeSet(idSummary, `Vent: ${windDir}° / ${windSpeed} kt – T: ${temp}°C – QNH: ${qnh} hPa`);
  safeSet(idRaw, metar?.raw ?? metar?.raw_text ?? "(METAR brut non disponible)");
}
<div id="metar-embed-ebci"></div>
<div id="metar-embed-eblg"></div>

export function updateTafUI(airportKey, taf) {
  const el = document.getElementById("taf-content");
  if (!el) return;

  el.innerHTML = `
    <div class="taf-title">TAF ${airportKey}</div>
    <div class="taf-raw">${taf?.raw_text || "n/a"}</div>
  `;
}

export function injectMetarEmbed(airportKey) {
  let targetId, url, linkText;

  if (airportKey === "EBCI") {
    targetId = "metar-embed-ebci";
    url = "https://metar-taf.com/fr/embed-js/EBCI?qnh=hPa&rh=rh&target=GrcWAfkb";
    linkText = "METAR Brussels South Charleroi Airport";
  } else if (airportKey === "EBLG") {
    targetId = "metar-embed-eblg";
    url = "https://metar-taf.com/fr/embed-js/EBLG?qnh=hPa&rh=rh&target=J0YHElLt";
    linkText = "METAR Liège Airport";
  } else {
    return;
  }

  const container = document.getElementById(targetId);
  if (!container) return;

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

  
  // Nettoyage
  container.innerHTML = "";

  // Ajout du lien
  const a = document.createElement("a");
  a.href = `https://metar-taf.com/fr/metar/${airportKey}`;
  a.id = airportKey === "EBCI" ? "metartaf-GrcWAfkb" : "metartaf-J0YHElLt";
  a.style = "font-size:18px; font-weight:500; color:#000; width:300px; height:435px; display:block";
  a.textContent = linkText;

  container.appendChild(a);

  // Ajout du script dynamique
  const script = document.createElement("script");
  script.src = url;
  script.async = true;
  script.defer = true;
  script.crossOrigin = "anonymous";

  container.appendChild(script);
}
function classifyMetar(metar) {
  if (!metar) return "red";

  const wind = metar.wind_speed?.value || 0;
  const vis = metar.visibility?.value || 0;

  if (wind <= 8 && vis >= 8000) return "green";
  if (wind <= 15 && vis >= 4000) return "orange";
  return "red";
}

// Fonction avionique : classification du vent
function classifyWind(speed) {
  if (speed <= 8) return "lime";      // calme
  if (speed <= 15) return "orange";   // modéré
  return "red";                       // fort
}

// Fonction de rendu de la rose des vents
export function updateWindRose(metar) {
  const container = document.getElementById("wind-rose");
  if (!container) return;

  const windDir = metar?.wind_direction?.value;
  const windSpd = metar?.wind_speed?.value;

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
