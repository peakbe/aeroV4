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

// Fonction PRO+++ pour dessiner un cône ILS
export function drawILS(airportKey, runwayName) {
  const ap = airports[airportKey];
  if (!ap) return;

  const rw = ap.runways.find(r => r.name === runwayName);
  if (!rw) return;

  const lat = rw.lat;
  const lon = rw.lon;
  const heading = rw.heading;

  const lengthKm = 15;     // longueur du cône
  const angleDeg = 3;      // ouverture ±3°

  // Convertir km → degrés approximatifs
   const kmToDeg = lengthKm / 111;

  // Calcul du point central du cône
  const rad = heading * Math.PI / 180;
  const endLat = lat + kmToDeg * Math.cos(rad);
  const endLon = lon + kmToDeg * Math.sin(rad);

  // Calcul des bords du cône
  const leftRad = (heading - angleDeg) * Math.PI / 180;
  const rightRad = (heading + angleDeg) * Math.PI / 180;

  const leftLat = lat + kmToDeg * Math.cos(leftRad);
  const leftLon = lon + kmToDeg * Math.sin(leftRad);

  const rightLat = lat + kmToDeg * Math.cos(rightRad);
  const rightLon = lon + kmToDeg * Math.sin(rightRad);

  // Polygone du cône ILS
   const ilsCone = L.polygon([
    [lat, lon],
    [leftLat, leftLon],
    [endLat, endLon],
    [rightLat, rightLon]
  ], {
    color: "cyan",
    weight: 2,
    opacity: 0.8,
    fillOpacity: 0.1
  });
  
// couleur dynamique selon vent / piste active
const activeRunway = window.activeRunway;

if (runwayName === activeRunway) {
  ilsCone.setStyle({ color: "lime", weight: 3 });
}


  
  ilsCone.addTo(map);
  return ilsCone;
}
