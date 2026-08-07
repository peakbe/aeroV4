/****************************************************
 * ADS-B TRAJECTORY — PRO+++
 * Dégradé vitesse + flèches directionnelles + labels
 * Future path Airbus + multi-avions simultanés
 ****************************************************/

window.adsbHistory = window.adsbHistory || {};
window.adsbTrajectories = window.adsbTrajectories || {};
window.adsbLabels = window.adsbLabels || {};
window.adsbArrows = window.adsbArrows || {};
window.adsbFuturePath = window.adsbFuturePath || {};

/****************************************************
 * Ajout d’un point dans l’historique
 ****************************************************/
export function pushHistory(icao, lat, lon, gsKt, altFt, track) {
  if (!icao || lat == null || lon == null) return;

  const key = String(icao);
  if (!window.adsbHistory[key]) window.adsbHistory[key] = [];

  window.adsbHistory[key].push({ lat, lon, gsKt, altFt, track });

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
  const size = 0.03;
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
 * Future path Airbus (vecteurs prédictifs)
 ****************************************************/
function computeFuturePath(lat, lon, trackDeg, gsKt, minutes = 5, stepSec = 30) {
  const R = 6371000;
  const track = trackDeg * Math.PI / 180;
  const gsMs = gsKt * 0.514444;

  const points = [];
  for (let t = stepSec; t <= minutes * 60; t += stepSec) {
    const d = gsMs * t;
    const dByR = d / R;

    const lat2 = Math.asin(
      Math.sin(lat * Math.PI/180) * Math.cos(dByR) +
      Math.cos(lat * Math.PI/180) * Math.sin(dByR) * Math.cos(track)
    );
    const lon2 = lon * Math.PI/180 + Math.atan2(
      Math.sin(track) * Math.sin(dByR) * Math.cos(lat * Math.PI/180),
      Math.cos(dByR) - Math.sin(lat * Math.PI/180) * Math.sin(lat2)
    );

    points.push([lat2 * 180/Math.PI, lon2 * 180/Math.PI]);
  }
  return points;
}

/****************************************************
 * Construction polyligne multi-avions
 ****************************************************/
export function showOptimizedAdsbTrajectory(icao) {
  const key = String(icao);
  const history = window.adsbHistory[key];

  if (!history || history.length < 2) return;

  let pts = smoothPoints(filterPoints(history));
  const latlngs = pts.map(p => [p.lat, p.lon]);

  const last = pts[pts.length - 1];
  const avgSpeed = pts.reduce((a, p) => a + (p.gsKt || 0), 0) / pts.length;
  const color = speedColor(avgSpeed);

  /****************************************************
   * Future path Airbus
   ****************************************************/
  const futurePath = computeFuturePath(last.lat, last.lon, last.track, last.gsKt);

  if (window.adsbFuturePath[key]) {
    window.ndMap.removeLayer(window.adsbFuturePath[key]);
  }

  window.adsbFuturePath[key] = window.L.polyline(futurePath, {
    color: "#8888ff",
    weight: 2,
    dashArray: "4,4",
    opacity: 0.7
  }).addTo(window.ndMap);

  /****************************************************
   * Trajectoire principale (dégradé vitesse)
   ****************************************************/
  if (window.adsbTrajectories[key]) {
    window.ndMap.removeLayer(window.adsbTrajectories[key]);
  }

  window.adsbTrajectories[key] = window.L.polyline(latlngs, {
    color,
    weight: 3,
    opacity: 0.85
  }).addTo(window.ndMap);

  /****************************************************
   * Flèche directionnelle
   ****************************************************/
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
 * ND AIRBUS — Vecteur de vent (METAR AVWX)
 ****************************************************/
export function drawWindOnNd(airportKey, metar) {
  if (!window.ndMap || !window.L || !metar) return;

  const ap = airports[airportKey];
  const dir = metar.wind_dir === "VRB" ? null : Number(metar.wind_dir);
  const speed = Number(metar.wind_speed || 0);

  if (!dir || !speed) return;

  // Taille du vecteur vent sur ND Airbus
  const len = 0.08; // plus long que la flèche avion
  const angle = dir * Math.PI / 180;

  const dx = len * Math.sin(angle);
  const dy = len * Math.cos(angle);

  const start = [ap.lat, ap.lon];
  const end = [ap.lat + dy, ap.lon + dx];

  // Supprimer ancien vecteur vent
  window.ndWindVector = window.ndWindVector || {};
  if (window.ndWindVector[airportKey]) {
    window.ndMap.removeLayer(window.ndWindVector[airportKey]);
  }

  // Dessiner le vecteur vent
  window.ndWindVector[airportKey] = window.L.polyline([start, end], {
    color: "#ffcc00",   // jaune Airbus
    weight: 4,
    opacity: 0.9
  }).addTo(window.ndMap);

  // Label vent (direction + vitesse)
  const labelHtml = `
    <div style="
      color:white;
      font-size:11px;
      background:rgba(0,0,0,0.55);
      padding:3px 5px;
      border-radius:3px;
      border:1px solid #ffaa00;
    ">
      WIND ${dir}° / ${speed} kt
    </div>
  `;

  // Supprimer ancien label
  window.ndWindLabel = window.ndWindLabel || {};
  if (window.ndWindLabel[airportKey]) {
    window.ndMap.removeLayer(window.ndWindLabel[airportKey]);
  }

  // Ajouter label
  window.ndWindLabel[airportKey] = window.L.marker(start, {
    icon: window.L.divIcon({
      className: "nd-wind-label",
      html: labelHtml
    })
  }).addTo(window.ndMap);
}

  /****************************************************
   * Label vitesse + altitude
   ****************************************************/
  if (window.adsbLabels[key]) {
    window.ndMap.removeLayer(window.adsbLabels[key]);
  }

  window.adsbLabels[key] = createLabel(last.lat, last.lon, last.gsKt, last.altFt);
  window.adsbLabels[key].addTo(window.ndMap);
}
