/****************************************************
 * HUD Piste Active — Airbus PFD / ND PRO+++
 ****************************************************/
export function updateRunwayHUD(ap, windDir, windSpd) {

  // Fallback ICAO
  const airportKey = ap.icao || ap.code || ap.name || "EBCI";

  const hud = document.getElementById(
    airportKey === "EBCI" ? "runway-ebci" : "runway-eblg"
  );
  if (!hud) return;

  const active = ap.activeRunway;

  // Si pas de piste active → affichage minimal
  if (!active) {
    hud.innerHTML = `
      <div class="hud-runway-block">
        <div class="hud-title">RUNWAY n/a</div>
        <div class="hud-wind">METAR incomplete</div>
      </div>
    `;
    return;
  }

  const runwayName = active.name ?? "n/a";
  const headwind = active.headwind ?? 0;
  const crosswind = active.crosswind ?? 0;
  const angle = active.angle ?? 0;

  // Fallback METAR
  const wDir = windDir ?? "VRB";
  const wSpd = windSpd ?? 0;

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
          ${wDir}° / ${wSpd} kt
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
