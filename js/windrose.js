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
 * 2) AFFICHAGE ROSE DES VENTS
 ****************************************************/
export function updateWindRose(metar) {

  const targetId = metar.icao === "EBCI"
    ? "wind-rose-ebci"
    : "wind-rose-eblg";

  const el = document.getElementById(targetId);
  if (!el) return;

  const windColor = classifyWind(metar.wind_speed);

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
  `;
}
