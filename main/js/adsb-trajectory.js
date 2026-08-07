/****************************************************
 * ADS-B TRAJECTORY — PRO+++
 * Dégradé vitesse + flèches directionnelles + labels
 * Multi-avions simultanés — Airplanes.live + Leaflet
 ****************************************************/

window.adsbHistory = window.adsbHistory || {};
window.adsbTrajectories = window.adsbTrajectories || {};
window.adsbLabels = window.adsbLabels || {};
window.adsbArrows = window.adsbArrows || {};

/****************************************************
 * Ajout d’un point dans l’historique
 ****************************************************/
export function pushHistory(icao, lat, lon, gsKt, altFt, track) {
  if (!icao || lat == null || lon == null) return;

  const key = String(icao);
  if (!window.adsbHistory[key]) window.adsbHistory[key] = [];

  window.adsbHistory[key].push({
    lat,
    lon,
    gsKt,
    altFt,
    track
  });

  if (window.adsbHistory[key].length > 150) {
    window.adsbHistory[key].shift();
  }
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
 * Lissage trajectoire
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
      gsKt: (p0.gsKt + p1.gsKt + p2.gsKt) / 3,
      altFt: (p0.altFt + p1.altFt + p2.altFt) / 3,
      track: (p0.track + p1.track + p2.track) / 3
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
 * Flèche directionnelle (heading)
 ****************************************************/
function createArrow(lat, lon, track) {
  const size = 0.03; // taille flèche ND Airbus
  const angle = track * Math.PI / 180;

  const dx = size * Math.sin(angle);
  const dy = size * Math.cos(angle);

  return [
    [lat, lon],
    [lat + dy, lon + dx]
  ];
}

/****************************************************
 * Labels vitesse + altitude
 ****************************************************/
function createLabel(lat, lon, gsKt, altFt) {
  return window.L.marker([lat, lon], {
    icon: window.L.divIcon({
      className: "adsb-label",
      html: `
        <div style="
          color:white;
          font-size:10px;
          background:rgba(0,0,0,0.55);
          padding:2px 4px;
          border-radius:3px;
          border:1px solid #00ffff;
        ">
          ${gsKt} kt<br>${altFt} ft
        </div>
      `
    })
  });
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

  // Supprimer ancienne trajectoire de cet avion
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

  // Vecteurs prédictifs (future path)
const future = computeFuturePath(last.lat, last.lon, last.track, last.gsKt);
window.L.polyline(future, {
  color: "#8888ff",
  weight: 2,
  dashArray: "4,4",
  opacity: 0.7
}).addTo(window.ndMap);
  
  /****************************************************
   * Flèche directionnelle (heading)
   ****************************************************/
  const last = pts[pts.length - 1];

  /****************************************************
 * VECTEURS PREDICTIFS — FUTURE PATH (Airbus style)
 ****************************************************/
const future = computeFuturePath(
  last.lat,
  last.lon,
  last.track,
  last.gsKt,
  5,      // minutes de projection
  30      // pas de 30 secondes
);

if (window.adsbFuturePath && window.adsbFuturePath[key]) {
  window.ndMap.removeLayer(window.adsbFuturePath[key]);
}

window.adsbFuturePath = window.adsbFuturePath || {};
window.adsbFuturePath[key] = window.L.polyline(future, {
  color: "#8888ff",
  weight: 2,
  dashArray: "4,4",
  opacity: 0.7
}).addTo(window.ndMap);

  // Polyligne principale (dégradé vitesse)
const poly = window.L.polyline(latlngs, {
  color,
  weight: 3,
  opacity: 0.85
}).addTo(window.ndMap);
window.adsbTrajectories[key] = poly;

  // Flèche directionnelle
  const arrowCoords = createArrow(last.lat, last.lon, last.track);

  if (window.adsbArrows[key]) {
    window.ndMap.removeLayer(window.adsbArrows[key]);
  }

  window.adsbArrows[key] = window.L.polyline(arrowCoords, {
    color: "#ffffff",
    weight: 2,
    opacity: 0.9
  }).addTo(window.ndMap);

  /****************************************************
   * Label vitesse + altitude
   ****************************************************/
  if (window.adsbLabels[key]) {
    window.ndMap.removeLayer(window.adsbLabels[key]);
  }

  window.adsbLabels[key] = createLabel(last.lat, last.lon, last.gsKt, last.altFt);
  window.adsbLabels[key].addTo(window.ndMap);
}
