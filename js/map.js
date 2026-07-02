/* global L */
import { airports } from "./config.js";

export let map;

export function initMap() {
  map = L.map("map").setView([50.5, 4.7], 10);

  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 18
  }).addTo(map);

  // Signaler que la carte est prête
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

export function resetMapView(airportKey) {
  if (!map) return;

  // Vue centrée sur l'aéroport actif
  const ap = airports[airportKey];
  if (ap) {
    map.setView([ap.lat, ap.lon], 13); // zoom IFR
  }
}

// Ajouter une icône avion PRO+++
export const planeDot = L.circleMarker([0,0], {
  radius: 6,
  color: "#00eaff",
  fillColor: "#00eaff",
  fillOpacity: 0.9
});

// Ajouter un layer pour les avions
export const planesLayer = L.layerGroup();
planesLayer.addTo(map);

// Deux icônes avion (approche / départ)
export const planeIconApproach = L.icon({
  iconUrl: "img/plane-blue.png",   // avion bleu = approche
  iconSize: [32, 32],
  iconAnchor: [16, 16]
});

export const planeIconDeparture = L.icon({
  iconUrl: "img/plane-green.png",  // avion vert = départ
  iconSize: [32, 32],
  iconAnchor: [16, 16]
});

