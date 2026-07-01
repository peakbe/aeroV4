import { AVWX_API_KEY } from "./config.js";
import { safeSet } from "./utils.js";

export async function fetchMetar(icao) {
  const url = `https://avwx.rest/api/metar/${icao}?token=${AVWX_API_KEY}&format=json`;
  const res = await fetch(url);
  if (!res.ok) throw new Error("METAR error " + icao);
  return res.json();
}

export function updateMetarUI(airportKey, metar) {
  const idSummary = airportKey === "EBCI" ? "meteo-ebci-summary" : "meteo-eblg-summary";
  const idRaw = airportKey === "EBCI" ? "meteo-ebci-raw" : "meteo-eblg-raw";

  const windDir = metar?.wind_direction?.value ?? metar?.wind?.direction?.degrees ?? "n/a";
  const windSpeed = metar?.wind_speed?.value ?? metar?.wind?.speed_kt ?? "n/a";
  const temp = metar?.temperature?.value ?? metar?.temperature?.celsius ?? "n/a";
  const qnh = metar?.altimeter?.value ?? metar?.qnh?.hpa ?? "n/a";

  safeSet(idSummary, `Vent: ${windDir}° / ${windSpeed} kt – T: ${temp}°C – QNH: ${qnh} hPa`);
  safeSet(idRaw, metar?.raw ?? metar?.raw_text ?? "(METAR brut non disponible)");
}
<div id="metar-embed-ebci"></div>
<div id="metar-embed-eblg"></div>

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

