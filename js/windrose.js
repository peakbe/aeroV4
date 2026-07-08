import { airports } from "./config.js";

/****************************************************
 * ROSE DES VENTS — IFR
 ****************************************************/


/****************************************************
 * 1) CLASSIFICATION VENT
 ****************************************************/
function classifyWind(speed) {
  if (speed <= 8) return "lime";
  if (speed <= 15) return "orange";
  return "red";
}

/****************************************************
 * 2) PISTE ACTIVE
 ****************************************************/

function classifyRunway(runway, windDir) {
  // Exemple : RWY 25 → direction 250°
  const rwyDir = parseInt(runway) * 10;

  const diff = Math.abs(rwyDir - windDir);

  if (diff <= 30) return "lime";     // vent de face
  if (diff <= 90) return "orange";   // vent travers
  return "red";                      // vent arrière
}
/****************************************************
 * 3) AFFICHAGE ROSE DES VENTS — Version PRO+++
 ****************************************************/
export function updateWindRose(metar) {

  // 1) Sécurité : METAR valide ?
  if (!metar || !metar.icao) return;

  // 2) Règle IFR : ne rien afficher dans l’onglet SONO
  if (isSonoTab()) return;

  // 3) Détermination du conteneur
  const targetId = metar.icao === "EBCI"
    ? "wind-rose-ebci"
    : "wind-rose-eblg";

  const el = document.getElementById(targetId);
  if (!el) return; // Sécurité DOM

  // 4) Sécurité : aéroport valide ?
  const ap = airports[metar.icao];
  if (!ap) return;

  // 5) Piste active sécurisée
  const runway = ap.activeRunway || "??";

  // 6) Sécurité : valeurs METAR
  const windDir = Number(metar.wind_dir) || 0;
  const windSpd = Number(metar.wind_speed) || 0;

  // 7) Classification cockpit IFR
  const windColor = classifyWind(windSpd);
  const runwayColor = classifyRunway(runway, windDir);

  // 8) Affichage cockpit IFR
  el.innerHTML = `
    <div class="wind-rose-container">
      <div class="wind-rose-circle"></div>

      <div class="wind-rose-arrow"
           style="transform: rotate(${windDir}deg);
                  background-color: ${windColor};">
      </div>
    </div>

    <div class="wind-rose-value">
      ${windDir}° / ${windSpd} kt
    </div>

    <div class="wind-runway-label"
         style="color:${runwayColor}">
      Piste active : ${runway}
    </div>
  `;
}
