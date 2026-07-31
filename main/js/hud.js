/****************************************************
 * HUD Piste Active — Airbus PFD / ND PRO+++
 ****************************************************/
export function updateRunwayHUD(ap, windDir, windSpd) {

  const hud = document.getElementById(
    ap.icao === "EBCI" ? "runway-ebci" : "runway-eblg"
  );
  if (!hud) return;

  const active = ap.activeRunway;
  if (!active) return;

  const runwayName = active.name;
  const headwind = active.headwind;
  const crosswind = active.crosswind;
  const angle = active.angle;

  /****************************************************
   * Classification avionique (Airbus)
   ****************************************************/
  let windColor = "cyan";
  if (crosswind > 10) windColor = "orange";
  if (crosswind > 20) windColor = "red";

  /****************************************************
   * Rendu cockpit IFR — Airbus PFD
   ****************************************************/
  hud.innerHTML = `
    <div class="hud-runway-block">

      <div class="hud-title">
        RUNWAY ${runwayName}
      </div>

      <div class="hud-wind">
        <span class="hud-label">WIND</span>
        <span class="hud-value" style="color:${windColor}">
          ${windDir}° / ${windSpd} kt
        </span>
      </div>

      <div class="hud-components">
        <div class="hud-line">
          <span class="hud-label">HEADWIND</span>
          <span class="hud-value">${headwind} kt</span>
        </div>

        <div class="hud-line">
          <span class="hud-label">CROSSWIND</span>
          <span class="hud-value" style="color:${windColor}">
            ${crosswind} kt
          </span>
        </div>

        <div class="hud-line">
          <span class="hud-label">ANGLE</span>
          <span class="hud-value">${angle}°</span>
        </div>
      </div>

    </div>
  `;
}
