/****************************************************
 * ADS-B TRAJECTORY — Optimisé Airplanes.live
 * Historique ICAO → polyligne ND Airbus
 ****************************************************/

// Historique global (déjà créé dans fids-adsb.js)
window.adsbHistory = window.adsbHistory || {};

/****************************************************
 * Ajout d’un point dans l’historique
 ****************************************************/
export function pushHistory(icao, lat, lon) {
  if (!icao || lat == null || lon == null) return;

  const key = String(icao);
  if (!window.adsbHistory[key]) window.adsbHistory[key] = [];

  const arr = window.adsbHistory[key];

  // Ajout du point
  arr.push({ lat, lon });

  // Limite mémoire
  if (arr.length > 120) arr.shift();
}

/****************************************************
 * Lissage trajectoire (Airplanes.live → points irréguliers)
 ****************************************************/
function smoothTrajectory(points) {
  if (points.length < 3) return points;

  const smoothed = [];

  for (let i = 1; i < points.length - 1; i++) {
    const p0 = points[i - 1];
    const p1 = points[i];
    const p2 = points[i + 1];

    smoothed.push({
      lat: (p0.lat + p1.lat + p2.lat) / 3,
      lon: (p0.lon + p1.lon + p2.lon) / 3
    });
  }

  return smoothed;
}

/****************************************************
 * Filtrage des sauts ADS-B (Airplanes.live → parfois 0,0 ou jump)
 ****************************************************/
function filterTrajectory(points) {
  return points.filter(p =>
    p.lat !== 0 &&
    p.lon !== 0 &&
    Math.abs(p.lat) <= 90 &&
    Math.abs(p.lon) <= 180
  );
}

/****************************************************
 * Construction polyligne optimisée
 ****************************************************/
export function showOptimizedAdsbTrajectory(icao) {
  const key = String(icao);
  const history = window.adsbHistory[key];

  if (!history || history.length < 2) return [];

  // Filtrage des points invalides
  let pts = filterTrajectory(history);

  // Lissage
  pts = smoothTrajectory(pts);

  // Conversion pour ND Airbus (Leaflet ou canvas)
  const polyline = pts.map(p => ({
    lat: p.lat,
    lon: p.lon
  }));

  // Si tu utilises Leaflet :
  if (window.ndMap && window.L) {
    // Supprimer ancienne trajectoire
    if (window.currentTrajectory) {
      window.ndMap.removeLayer(window.currentTrajectory);
    }

    window.currentTrajectory = window.L.polyline(
      polyline.map(p => [p.lat, p.lon]),
      {
        color: "#00ffff",
        weight: 2,
        opacity: 0.8
      }
    ).addTo(window.ndMap);
  }

  return polyline;
}
