import { angleDiff, safeSet } from "./utils.js";

export function updateRunwayHUD(airport, windDir) {
  if (!windDir) return;

  let best = null, bestDiff = 999;

  airport.runways.forEach(rw => {
    const diff = angleDiff(windDir, rw.heading);
    if (diff < bestDiff) { bestDiff = diff; best = rw; }
  });

  const id = airport.icao === "EBCI" ? "runway-ebci" : "runway-eblg";
  safeSet(id, best ? `Piste ${best.name}` : "n/a");
}

export function updateFlightsUI(airportKey, flights) {
  const id = airportKey === "EBCI" ? "flights-ebci" : "flights-eblg";
  const el = document.getElementById(id);
  if (!el) return;

  el.innerHTML = flights
    .slice(0, 10)
    .map(f => `${f.flight_iata || f.flight_icao || "?"} — ${f.aircraft_icao || "?"}`)
    .join("\n");
}

// Liste des sonomètres
export async function updateFidsList(airportKey) {
  const id = airportKey === "EBCI" ? "sonos-ebci" : "sonos-eblg";
  const el = document.getElementById(id);
  if (!el) return;

  el.textContent = "Chargement...";

  try {
    const res = await fetch(`/api/fids/${airportKey}/sonos`);
    const data = await res.json();

    el.innerHTML = data.map(s => `${s.name} — ${s.value} dB`).join("<br>");
  } catch (e) {
    el.textContent = "Erreur FIDS";
  }
}

// Liste des vols
export async function updateFidsFlights(airportKey) {
  const id = airportKey === "EBCI" ? "fids-ebci" : "fids-eblg";
  const tbody = document.getElementById(id);
  if (!tbody) return;

  tbody.innerHTML = "<tr><td colspan='7'>Chargement...</td></tr>";

  const icao = airportKey;
  const url = `https://airlabs.co/api/v9/flights?arr_icao=${icao}&api_key=04cb1c09-8abb-468a-95fa-ee90c3c2b651`;

  try {
    const res = await fetch(url);
    const json = await res.json();
    const flights = json.response || [];

    tbody.innerHTML = "";

    flights.slice(0, 20).forEach(f => {
      const tr = document.createElement("tr");

      const time = f.arr_time || f.dep_time || "n/a";
      const flight = f.flight_iata || f.flight_icao || "n/a";
      const company = f.airline_iata || f.airline_icao || "n/a";
      const type = f.aircraft_icao || "n/a";
      const origin = f.dep_iata || f.dep_icao || "n/a";
      const dest = f.arr_iata || f.arr_icao || "n/a";
      const status = f.status || "n/a";

      tr.innerHTML = `
        <td>${time}</td>
        <td>${flight}</td>
        <td>${company}</td>
        <td>${type}</td>
        <td>${origin}</td>
        <td>${dest}</td>
        <td>${status}</td>
      `;

      tbody.appendChild(tr);
    });

  } catch (err) {
    tbody.innerHTML = "<tr><td colspan='7'>Erreur API AirLabs</td></tr>";
  }
}


// Vols confirmés
export async function updateFidsConfirmed() {
  const el = document.getElementById("fids-confirmed");
  if (!el) return;

  el.textContent = "Chargement...";

  try {
    const res = await fetch(`/api/fids/confirmed`);
    const data = await res.json();

    el.innerHTML = data.map(v => `${v.flight} — ${v.status}`).join("<br>");
  } catch (e) {
    el.textContent = "Erreur confirmés";
  }
}
