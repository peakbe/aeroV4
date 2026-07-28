import { airports } from "./config.js";

/****************************************************
 * 1) CLASSIFICATION VENT — Airbus ND
 ****************************************************/
function classifyWind(speed) {
  if (speed <= 8) return "lime";      // calme
  if (speed <= 15) return "orange";   // modéré
  return "red";                       // fort
}

/****************************************************
 * 2) AFFICHAGE ROSE DES VENTS — Airbus ND
 ****************************************************/
export function updateWindRose(metar) {

  // Sécurité METAR
  if (!metar || !metar.icao) return;

  // Ne rien afficher dans l’onglet SONO
  if (window.isSonoTab()) return;

  // Sélection du conteneur
  const targetId = metar.icao === "EBCI"
    ? "wind-rose-ebci"
    : "wind-rose-eblg";

  const el = document.getElementById(targetId);
  if (!el) return;

  // Aéroport valide ?
  const ap = airports[metar.icao];
  if (!ap) return;

  // Piste active (déjà calculée dans processAirport)
  const runway = ap.activeRunway?.name || "??";

  // Valeurs METAR
  const windDir = Number(metar.wind_dir) || 0;
  const windSpd = Number(metar.wind_speed) || 0;

  // Classification avionique
  const windColor = classifyWind(windSpd);

  /****************************************************
   * Rendu Airbus ND — PRO+++
   * - Flèche fine (6px)
   * - Longueur cockpit (26px)
   * - Rotation propre
   * - Pas de background inline
   ****************************************************/
  el.innerHTML = `
    <div class="wind-rose-container">

      <div class="wind-rose-circle"></div>

      <div class="wind-rose-arrow"
           style="transform: rotate(${windDir}deg);
                  border-bottom-color:${windColor};">
      </div>

    </div>

    <div class="wind-rose-value">
      ${windDir}° / ${windSpd} kt
    </div>

    <div class="wind-runway-label">
      Piste active : ${runway}
    </div>
  `;
}
