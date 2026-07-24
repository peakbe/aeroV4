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

/****************************************************
 * AFFICHAGE STATION — Compatible cockpit IFR
 ****************************************************/
export function updateStationUI(airportKey, station) {
  if (window.isSonoTab()) return;

  const id = airportKey === "EBCI" ? "station-ebci" : "station-eblg";
  const el = document.getElementById(id);
  if (!el || !station) return;

  el.innerHTML = `
    <div class="station-line">Température : ${station.temp ?? "n/a"}°C</div>
    <div class="station-line">Humidité : ${station.humidity ?? "n/a"}%</div>
    <div class="station-line">Pression : ${station.pressure ?? "n/a"} hPa</div>
  `;
}
