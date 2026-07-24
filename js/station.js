/****************************************************
 * STATION INFO — Open‑Meteo Version PRO+++
 ****************************************************/
export async function fetchStationInfo(icao) {
  try {
    // Coordonnées de tes aéroports
    const coords = {
      EBCI: { lat: 50.459, lon: 4.453 },
      EBLG: { lat: 50.637, lon: 5.443 }
    };

    const { lat, lon } = coords[icao];

    const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,pressure_msl`;

    const r = await fetch(url);
    const data = await r.json();

    const c = data.current;

    return {
      temp: c.temperature_2m ?? null,
      humidity: c.relative_humidity_2m ?? null,
      pressure: c.pressure_msl ?? null
    };

  } catch (e) {
    console.error("Station error:", e);
    return null;
  }
}

// Historique station pour tendance
window.stationHistory = window.stationHistory || {
  EBCI: { temp: null, pressure: null },
  EBLG: { temp: null, pressure: null }
};

function computeTrend(airportKey, station) {
  const hist = window.stationHistory[airportKey];

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

  // Mise à jour historique
  hist.temp = station.temp;
  hist.pressure = station.pressure;

  return trend;
}

//  fonction wind chill

function computeWindChill(temp, windKt) {
  if (temp === null || windKt === null) return null;

  const windMs = windKt * 0.514444; // conversion kt → m/s

  if (temp > 10 || windMs < 1.3) return temp; // pas de wind chill au-dessus de 10°C

  const wc =
    13.12 +
    0.6215 * temp -
    11.37 * Math.pow(windMs, 0.16) +
    0.3965 * temp * Math.pow(windMs, 0.16);

  return Math.round(wc);
}

/****************************************************
 * AFFICHAGE STATION — Compatible cockpit IFR
 ****************************************************/
export function updateStationUI(airportKey, station) {
  if (window.isSonoTab()) return;

  const id = airportKey === "EBCI" ? "station-ebci" : "station-eblg";
  const el = document.getElementById(id);
  if (!el || !station) return;

  // Tendance
  const trend = computeTrend(airportKey, station);

  // Wind chill (température ressentie)
  const metar = window.airports[airportKey].lastMetar || {};
  const windChill = computeWindChill(station.temp, metar.wind_speed);

  el.innerHTML = `
    <div class="station-line">
      Température : ${station.temp ?? "n/a"}°C
      <span class="trend">${trend.temp}</span>
    </div>

    <div class="station-line">
      Ressentie : ${windChill ?? "n/a"}°C
    </div>

    <div class="station-line">
      Humidité : ${station.humidity ?? "n/a"}%
    </div>

    <div class="station-line">
      Pression : ${station.pressure ?? "n/a"} hPa
      <span class="trend">${trend.pressure}</span>
    </div>
  `;
}

