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
 * 3) AFFICHAGE ROSE DES VENTS
 ****************************************************/
export function updateWindRose(metar) {

  const targetId = metar.icao === "EBCI"
    ? "wind-rose-ebci"
    : "wind-rose-eblg";

  const el = document.getElementById(targetId);
  if (!el) return;

  const windColor = classifyWind(metar.wind_speed);

  // Récupération piste active depuis airports[]
  const ap = airports[metar.icao];
  const runway = ap?.activeRunway || "??";

  const runwayColor = classifyRunway(runway, metar.wind_dir);

  el.innerHTML = `
    <div class="wind-rose-container">
      <div class="wind-rose-circle"></div>

      <div class="wind-rose-arrow"
           style="transform: rotate(${metar.wind_dir}deg);
                  background-color: ${windColor};">
      </div>
    </div>

    <div class="wind-rose-value">
      ${metar.wind_dir}° / ${metar.wind_speed} kt
    </div>

    <div class="wind-runway-label"
         style="color:${runwayColor}">
      Piste active : ${runway}
    </div>
  `;
}
