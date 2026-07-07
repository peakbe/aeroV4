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
