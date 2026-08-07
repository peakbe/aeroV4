/* global L */
import { airports } from "./config.js";

export let map;
export let ndIlsLayer;
export let ndAircraftLayer;
export let ndTrackLayer;

export let mapReady = false;   // 🔥 remplace window._mapReady

/****************************************************
 * INIT MAP — Airbus ND PRO+++
 ****************************************************/
export function initMap() {
  if (map) return;

  map = L.map("map", {
    zoomControl: false,
    attributionControl: false
  }).setView([50.55, 5.0], 10);

  // Couches ND
  ndIlsLayer = L.layerGroup().addTo(map);
  ndAircraftLayer = L.layerGroup().addTo(map);
  ndTrackLayer = L.layerGroup().addTo(map);

  // Fond de carte IFR
  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 18
  }).addTo(map);

  map.whenReady(() => {
    mapReady = true;   // 🔥 ES Modules friendly
  });

  // Marqueurs aéroports
  Object.values(airports).forEach(ap => {
    L.circleMarker([ap.lat, ap.lon], {
      radius: 6,
      color: "#5ee7ff",
      fillColor: "#5ee7ff",
      fillOpacity: 0.9
    })
    .addTo(map)
    .bindPopup(`<strong>${ap.name}</strong>`);
  });
}

/****************************************************
 * RESET MAP VIEW — Airbus ND (centrage runway)
 ****************************************************/
export function resetMapView(airportKey) {
  if (!map) return;

  const ap = airports[airportKey];
  if (!ap || !ap.activeRunway) return;

  const rw = ap.runways.find(r => r.name === ap.activeRunway.name);
  if (!rw) return;

  const midLat = (rw.lat1 + rw.lat2) / 2;
  const midLon = (rw.lon1 + rw.lon2) / 2;

  map.setView([midLat, midLon], 13);
}

/****************************************************
 * ICONES AVION — Airbus ND
 ****************************************************/
export const planeIconND = L.icon({
  iconUrl: "img/plane-nd.png",
  iconSize: [34, 34],
  iconAnchor: [17, 17]
});

/****************************************************
 * AFFICHAGE AVION — ND Airbus
 ****************************************************/
export function drawNdAircraft(airportKey) {
  const ap = airports[airportKey];
  if (!ap || !ap.aircraft) return;

  ndAircraftLayer.clearLayers();

  const ac = ap.aircraft;

  const marker = L.marker([ac.lat, ac.lon], {
    icon: planeIconND,
    rotationAngle: ac.hdg || 0,      // ⚠ nécessite leaflet-rotatedmarker
    rotationOrigin: "center"
  });

  marker.addTo(ndAircraftLayer);
}

/****************************************************
 * TRAJECTOIRE COMPLETE — ND Airbus PRO+++
 ****************************************************/
export function showFullFlightPath(points) {
  ndTrackLayer.clearLayers();

  const poly = L.polyline(
    points.map(p => [p.lat, p.lon]),   // 🔥 correction lon
    {
      color: "#ffb300",
      weight: 3,
      opacity: 0.9
    }
  );

  poly.addTo(ndTrackLayer);

  map.fitBounds(poly.getBounds(), { padding: [50, 50] });
}

/****************************************************
 * ILS ND — délégué à ils-nd.js
 ****************************************************/
export function clearNdIls() {
  ndIlsLayer.clearLayers();
}
