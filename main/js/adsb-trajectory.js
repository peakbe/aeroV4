/****************************************************
 * ADS-B TRAJECTORY — Dégradé vitesse + multi-avions
 * Compatible Airplanes.live + ND Airbus (Leaflet)
 ****************************************************/

// Historique global
window.adsbHistory = window.adsbHistory || {};
window.adsbTrajectories = window.adsbTrajectories || {}; // multi-avions

/****************************************************
 * Ajout d’un point dans l’historique
 ****************************************************/
export function pushHistory(icao, lat, lon, gsKt) {
  if (!icao || lat == null || lon == null) return;

  const key = String(icao);
  if (!window.adsbHistory[key]) window.adsbHistory[key] = [];

  const arr = window.adsbHistory[key];
  arr.push({ lat, lon, gsKt });

  if (arr.length > 150) arr.shift(); // mémoire max
}

/****************************************************
 * Filtrage des points invalides
 ****************************************************/
function filterPoints(points) {
  return points.filter(p =>
    p.lat !== 0 &&
    p.lon !== 0 &&
    Math.abs(p.lat) <= 90 &&
    Math.abs(p.lon) <= 180
  );
}

/****************************************************
 * Lissage trajectoire (Airplanes.live → points irréguliers)
 ****************************************************/
function smoothPoints(points) {
  if (points.length < 3) return points;

  const out = [];
  for (let i = 1; i < points.length - 1; i++) {
    const p0 = points[i - 1];
    const p1 = points[i];
    const p2 = points[i + 1];

    out.push({
      lat: (p0.lat + p1.lat + p2.lat) / 3,
      lon: (p0.lon + p1.lon + p2.lon) / 3,
      gsKt: (p0.gsKt + p1.gsKt + p2.gsKt) / 3
    });
  }
  return out;
}

/****************************************************
 * Dégradé couleur vitesse
 ****************************************************/
function speedColor(gsKt) {
  if (gsKt < 120) return "#00aaff";   // bleu
  if (gsKt < 250) return "#00ffff";   // cyan
  if (gsKt < 350) return "#00ff55";   // vert
  if (gsKt < 450) return "#ffee00";   // jaune
  return "#ff3300";                   // rouge
}

/****************************************************
 * Construction polyligne multi-avions
 ****************************************************/
export function showOptimizedAdsbTrajectory(icao) {
  const key = String(icao);
  const history = window.adsbHistory[key];

  if (!history || history.length < 2) return;

  // Filtrage
  let pts = filterPoints(history);

  // Lissage
  pts = smoothPoints(pts);

  // Conversion Leaflet
  const latlngs = pts.map(p => [p.lat, p.lon]);

  // Couleur selon vitesse moyenne
  const avgSpeed = pts.reduce((a, p) => a + (p.gsKt || 0), 0) / pts.length;
  const color = speedColor(avgSpeed);

  // Supprimer ancienne trajectoire de cet avion uniquement
  if (window.adsbTrajectories[key]) {
    window.ndMap.removeLayer(window.adsbTrajectories[key]);
  }

  // Nouvelle trajectoire
  const poly = window.L.polyline(latlngs, {
    color,
    weight: 3,
    opacity: 0.85
  }).addTo(window.ndMap);

  window.adsbTrajectories[key] = poly;
}
