/****************************************************
 * STATION INFO — Open‑Meteo Version PRO+++
 * Airbus SD harmonisé
 ****************************************************/
import { airports } from "./config.js";

/****************************************************
 * 1) FETCH STATION — Open‑Meteo
 ****************************************************/
export async function fetchStationInfo(icao) {
  try {
    const ap = airports[icao];
    if (!ap) return null;

    const url =
      `https://api.open-meteo.com/v1/forecast?latitude=${ap.lat}&longitude=${ap.lon}` +
      `&current=temperature_2m,relative_humidity_2m,pressure_msl`;

    const r = await fetch(url);
    const data = await r.json();

    const c = data.current;

    return {
      temp: c?.temperature_2m ?? null,
      humidity: c?.relative_humidity_2m ?? null,
      pressure: c?.pressure_msl ?? null
    };

  } catch (e) {
    console.error("Station error:", e);
    return null;
  }
}

/****************************************************
 * Historique station — Airbus SD (tendances)
 ****************************************************/
export const stationHistory = {
  EBCI: { temp: null, pressure: null },
  EBLG: { temp: null, pressure: null }
};

function computeTrend(airportKey, station) {
  const hist = stationHistory[airportKey];

  const trend = {
    temp: "stable",
    pressure: "stable"
  };

  if (hist.temp !== null) {
    if (station.temp > hist.temp) trend.temp = "hausse";
    else if (station.temp < hist.temp) trend.temp = "baisse";
  }

  if (hist.pressure !== null) {
    if (station.pressure > hist.pressure) trend.pressure = "hausse";
    else if (station.pressure < hist.pressure) trend.pressure = "baisse";
  }

  hist.temp = station.temp;
  hist.pressure = station.pressure;

  return trend;
}

/****************************************************
 * Wind Chill — Airbus SD
 ****************************************************/
function ktToMs(kt) {
  return (kt * 0.514444).toFixed(1);
}

function computeWindChill(temp, windKt) {
  if (temp === null || windKt === null) return null;

  // VRB ou vent très faible → chill = temp
  if (windKt < 1) return temp;

  const windMs = windKt * 0.514444;

  if (temp > 10 || windMs < 1.3) return temp;

  const wc =
    13.12 +
    0.6215 * temp -
    11.37 * Math.pow(windMs, 0.16) +
    0.3965 * temp * Math.pow(windMs, 0.16);

  return Math.round(wc);
}

/****************************************************
 * AFFICHAGE STATION — Airbus SD PRO+++
 ****************************************************/
export function updateStationUI(airportKey, station, metar) {

  if (window.isSonoTab()) return;

  const id = airportKey === "EBCI" ? "station-ebci" : "station-eblg";
  const el = document.getElementById(id);
  if (!el || !station) return;

  const trend = computeTrend(airportKey, station);
  const windChill = computeWindChill(station.temp, metar?.wind_speed ?? null);
  const windMs = metar?.wind_speed ? ktToMs(metar.wind_speed) : null;

  /****************************************************
   * Classification avionique (Airbus SD)
   ****************************************************/
  const tempColor =
    trend.temp === "hausse" ? "lime" :
    trend.temp === "baisse" ? "orange" :
    "#38bdf8";

  const pressureColor =
    trend.pressure === "hausse" ? "lime" :
    trend.pressure === "baisse" ? "orange" :
    "#38bdf8";

  /****************************************************
   * Rendu cockpit IFR — Airbus SD
   ****************************************************/
  el.innerHTML = `
    <div class="station-block">

      <div class="station-title">
        <span>STATION DATA — ${airportKey}</span>
      </div>

      <div class="station-line">
        Température :
        <span style="color:${tempColor}">
          ${station.temp ?? "n/a"}°C
        </span>
        <span class="trend">${trend.temp}</span>
      </div>

      <div class="station-line">
        Ressentie :
        <span style="color:#5ee7ff">
          ${windChill ?? "n/a"}°C
        </span>
      </div>

      <div class="station-line">
        Humidité :
        <span style="color:#38bdf8">
          ${station.humidity ?? "n/a"}%
        </span>
      </div>

      <div class="station-line">
        Vent :
        <span style="color:#38bdf8">
          ${metar?.wind_speed ?? "n/a"} kt
        </span>
        <span class="wind-ms">
          (${windMs ?? "n/a"} m/s)
        </span>
      </div>

      <div class="station-line">
        Pression :
        <span style="color:${pressureColor}">
          ${station.pressure ?? "n/a"} hPa
        </span>
        <span class="trend">${trend.pressure}</span>
      </div>

    </div>
  `;
}
