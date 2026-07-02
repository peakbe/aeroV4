/* global L */
import { airports } from "./config.js";

export let map;
export let planesLayer;

/****************************************************
 * INIT MAP
 ****************************************************/
export function initMap() {
  map = L.map("map").setView([50.5, 4.7], 10);

  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 18
  }).addTo(map);

  // Layer avions
  planesLayer = L.layerGroup().addTo(map);

  // Carte prête
  map.whenReady(() => {
    window._mapReady = true;
  });

  // Markers aéroports
  Object.values(airports).forEach(ap => {
    L.marker([ap.lat, ap.lon])
      .addTo(map)
      .bindPopup(ap.name);
  });
}

/****************************************************
 * RESET MAP VIEW
 ****************************************************/
export function resetMapView(airportKey) {
  if (!map) return;

  const ap = airports[airportKey];
  if (ap) {
    map.setView([ap.lat, ap.lon], 13); // zoom IFR
  }
}

/****************************************************
 * ICONES AVION
 ****************************************************/
export const planeIconApproach = L.icon({
  iconUrl: "img/plane-blue.png",
  iconSize: [32, 32],
  iconAnchor: [16, 16]
});

export const planeIconDeparture = L.icon({
  iconUrl: "img/plane-green.png",
  iconSize: [32, 32],
  iconAnchor: [16, 16]
});
