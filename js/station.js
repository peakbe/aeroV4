/****************************************************
 * STATION INFO — AVWX Version PRO+++
 ****************************************************/
import { AVWX_API_KEY } from "./config.js";

export async function fetchStationInfo(icao) {
  try {
    const url = `https://avwx.rest/api/station/${icao}?format=json&token=${AVWX_API_KEY}`;
    const r = await fetch(url);
    if (!r.ok) return null;

    const data = await r.json();

    return {
      icao: data.icao || null,
      name: data.name || null,
      city: data.city || null,
      country: data.country || null,
      elevation: data.elevation_ft || null,
      latitude: data.latitude || null,
      longitude: data.longitude || null,
      type: data.type || null
    };
  } catch (e) {
    console.error("Station AVWX error:", e);
    return null;
  }
}

/****************************************************
 * AFFICHAGE STATION — Compatible cockpit IFR
 ****************************************************/
export function updateStationUI(airportKey, station) {
  const key = airportKey.toLowerCase();
  const el = document.getElementById(`station-${key}`);

  if (!el) return;

  if (!station) {
    el.innerHTML = "<div class='station-error'>Station indisponible</div>";
    return;
  }

  el.innerHTML = `
    <div class="station-block">
      <div class="station-title">
        <svg class="station-icon">
          <use href="#icon-station"></use>
        </svg>
        ${station.name}
      </div>

      <div class="station-line">${station.city}, ${station.country}</div>
      <div class="station-line">Altitude : ${station.elevation} ft</div>
      <div class="station-line">Lat/Lon : ${station.latitude}, ${station.longitude}</div>
      <div class="station-line">Type : ${station.type}</div>
    </div>
  `;
}

