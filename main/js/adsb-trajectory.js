/****************************************************
 * TRAJECTOIRE ADSBexchange — Optimisée PRO+++
 * Utilise window.adsbHistory (fids-adsb.js)
 ****************************************************/

import { map } from "./map.js";

/****************************************************
 * Affichage trajectoire optimisée
 * - lisse les points
 * - centre la carte
 * - adapte le zoom
 ****************************************************/
export function showOptimizedAdsbTrajectory(icao) {
  const key = String(icao);
  const hist = (window.adsbHistory && window.adsbHistory[key]) || [];

  if (!hist.length) return;

  // 1) filtrage simple (on garde 1 point sur 2)
  const filtered = hist.filter((_, idx) => idx % 2 === 0);

  // 2) création du polyline
  const latlngs = filtered.map(p => [p.lat, p.lng]);

  // 3) nettoyage ancien trajet
  if (window.currentAdsbPolyline) {
    window.currentAdsbPolyline.remove();
  }

  window.currentAdsbPolyline = L.polyline(latlngs, {
    color: "#00ffff",
    weight: 3,
    opacity: 0.8
  }).addTo(map);

  // 4) ajuster la vue sur la trajectoire
  const bounds = window.currentAdsbPolyline.getBounds();
  map.fitBounds(bounds, { padding: [40, 40] });
}
