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
  if (!metar) return;

  // Ne rien afficher dans l’onglet SONO
  if (window.isSonoTab?.()) return;

  // ICAO fiable
  const icao = metar.icao || metar.station || "EBCI";

  // Sélection du conteneur
  const targetId = icao === "EBCI"
    ? "wind-rose-ebci"
    : "wind-rose-eblg";

  const el = document.getElementById(targetId);
  if (!el) return;

  // Aéroport valide ?
  const ap = airports[icao];
  if (!ap) return;

  // Piste active (déjà calculée dans processAirport)
  const runway = ap.activeRunway?.name || "n/a";

  // Valeurs METAR
  let windDir = metar.wind_dir;
  const windSpd = Number(metar.wind_speed) || 0;

  // Gestion VRB
  let windColor = classifyWind(windSpd);
  let arrowRotation = 0;

  if (windDir === "VRB" || windDir === null || windDir === undefined) {
    windDir = "VRB";
    arrowRotation = 0;          // flèche neutre
    windColor = "#999999";      // gris neutre
  } else {
    arrowRotation = Number(windDir) || 0;
  }

  /****************************************************
   * Rendu Airbus ND — PRO+++
   ****************************************************/
  el.innerHTML = `
    <div class="wind-rose-container">

      <div class="wind-rose-circle"></div>

      <div class="wind-rose-arrow"
           style="transform: rotate(${arrowRotation}deg);
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
