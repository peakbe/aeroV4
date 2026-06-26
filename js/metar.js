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
