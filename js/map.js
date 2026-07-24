/* global L */
import { airports } from "./config.js";

export let map;
export let planesLayer;
export let ilsLayer;
export let ilsLabelsLayer;

/****************************************************
 * INIT MAP
 ****************************************************/
export function initMap() {
  if (map) return;

  map = L.map("map").setView([50.5, 4.7], 10);

  ilsLayer = L.layerGroup().addTo(map);
  ilsLabelsLayer = L.layerGroup().addTo(map);
  planesLayer = L.layerGroup().addTo(map);

   L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 18
  }).addTo(map);

  map.whenReady(() => {
    window._mapReady = true;
  });

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
  if (ap) map.setView([ap.lat, ap.lon], 13);
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

/****************************************************
 * ILS — LOC + Glidepath + OM/MM/IM + Label
 ****************************************************/
export function drawILS(airportKey, runwayName) {
  const ap = airports[airportKey];
  if (!ap) return;

  const rw = ap.runways.find(r => r.name === runwayName);
  if (!rw) return;

  const lat = rw.lat;
  const lon = rw.lon;
  const heading = rw.heading;

  const lengthKm = 15;
  const kmToDeg = lengthKm / 111;

  const rad = heading * Math.PI / 180;

  const endLat = lat + kmToDeg * Math.cos(rad);
  const endLon = lon + kmToDeg * Math.sin(rad);

  const leftRad = (heading - 3) * Math.PI / 180;
  const rightRad = (heading + 3) * Math.PI / 180;

  const leftLat = lat + kmToDeg * Math.cos(leftRad);
  const leftLon = lon + kmToDeg * Math.sin(leftRad);

  const rightLat = lat + kmToDeg * Math.cos(rightRad);
  const rightLon = lon + kmToDeg * Math.sin(rightRad);

  /****************************************************
   * 1) LOC — Cône horizontal
   ****************************************************/
  const locCone = L.polygon([
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

  /****************************************************
   * 2) Glidepath 3° — Ligne verticale
   ****************************************************/
  const glideLengthKm = 10;
  const glideKmToDeg = glideLengthKm / 111;

  const glideEndLat = lat + glideKmToDeg * Math.cos(rad);
  const glideEndLon = lon + glideKmToDeg * Math.sin(rad);

  const glidePath = L.polyline([
    [lat, lon],
    [glideEndLat, glideEndLon]
  ], {
    color: "orange",
    weight: 3,
    dashArray: "6,6"
  });

  /****************************************************
   * 3) OM / MM / IM — Markers IFR
   ****************************************************/
  const markers = [];

  const OMdist = 7 / 111;
  const MMdist = 1 / 111;
  const IMdist = 0.5 / 111;

  const OMlat = lat + OMdist * Math.cos(rad);
  const OMlon = lon + OMdist * Math.sin(rad);

  const MMlat = lat + MMdist * Math.cos(rad);
  const MMlon = lon + MMdist * Math.sin(rad);

  const IMlat = lat + IMdist * Math.cos(rad);
  const IMlon = lon + IMdist * Math.sin(rad);

  markers.push(L.circleMarker([OMlat, OMlon], {
    radius: 6,
    color: "blue",
    fillColor: "blue",
    fillOpacity: 0.9
  }).bindPopup("OM — Outer Marker"));

  markers.push(L.circleMarker([MMlat, MMlon], {
    radius: 6,
    color: "yellow",
    fillColor: "yellow",
    fillOpacity: 0.9
  }).bindPopup("MM — Middle Marker"));

  markers.push(L.circleMarker([IMlat, IMlon], {
    radius: 6,
    color: "white",
    fillColor: "white",
    fillOpacity: 0.9
  }).bindPopup("IM — Inner Marker"));

  /****************************************************
   * 4) Label piste active
   ****************************************************/
  const activeRunway = window.activeRunway;

  if (runwayName === activeRunway) {
    locCone.setStyle({ color: "lime", weight: 3 });
    glidePath.setStyle({ color: "lime", weight: 4 });

    const label = L.marker([lat, lon], {
      icon: L.divIcon({
        className: "ils-label",
        html: `<div style="color:lime; font-weight:bold; font-size:18px;">RWY ${runwayName} ACTIVE</div>`
      }),
      interactive: false
    });

    ilsLabelsLayer.addLayer(label);
  }

  ilsLayer.addLayer(locCone);
  ilsLayer.addLayer(glidePath);
  markers.forEach(m => ilsLayer.addLayer(m));
}

/****************************************************
 * Redessiner tous les ILS
 ****************************************************/
export function refreshILS() {
  if (!ilsLayer) return;
  ilsLayer.clearLayers();
  ilsLabelsLayer.clearLayers();

  drawILS("EBCI", "24");
  drawILS("EBCI", "06");
  drawILS("EBLG", "22");
  drawILS("EBLG", "04");
}

/****************************************************
 * Trajectoire complète AirLabs — Polyline PRO+++
 ****************************************************/
export function showFullFlightPath(points) {
  if (window.fullFlightPath) {
    map.removeLayer(window.fullFlightPath);
  }

  window.fullFlightPath = L.polyline(
    points.map(p => [p.lat, p.lng]),
    { color: "yellow", weight: 3 }
  ).addTo(map);

  map.fitBounds(window.fullFlightPath.getBounds(), { padding: [50, 50] });
}
