/* global L */
import { airports } from "./config.js";

export let map;
export let planesLayer;   // ← exporté proprement

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

  /********************************************
   * CRÉATION DU LAYER AVIONS APRÈS initMap()
   ********************************************/
  planesLayer = L.layerGroup().addTo(map);
}

/********************************************
 * Icônes avion approche / départ
 ********************************************/
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
