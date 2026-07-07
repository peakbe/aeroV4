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
  const container = document.getElementById("wind-rose");
  if (!container) return;

  const windDir = metar?.wind_dir;
  const windSpd = metar?.wind_speed;

  if (!windDir || !windSpd) {
    container.innerHTML = "<div style='color:#888'>Vent: n/a</div>";
    return;
  }

  const color = classifyWind(windSpd);

  container.innerHTML = `
    <div class="wind-rose">
      <div class="wind-arrow" style="border-bottom-color:${color}; transform: rotate(${windDir}deg);"></div>
    </div>
    <div style="text-align:center; color:${color}; font-family:monospace;">
      ${windDir}° / ${windSpd} kt
    </div>
  `;
}
