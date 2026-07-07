/****************************************************
 * ILS / RUNWAY HUD — IFR
 ****************************************************/

/****************************************************
 * 1) MISE À JOUR HUD PISTE
 ****************************************************/
export function updateRunwayHUD(ap, windDir, windSpd) {
  if (!ap) return;

  const id = ap.icao.toLowerCase() === "ebci" ? "runway-ebci" : "runway-eblg";
  const el = document.getElementById(id);
  if (!el) return;

  const rwy = window.activeRunway || "n/a";
  const dir = windDir ?? "n/a";
  const spd = windSpd ?? "n/a";

  el.textContent = `Piste active ${rwy} — Vent ${dir}° / ${spd} kt`;
}

/****************************************************
 * 2) ILS DYNAMIQUE (placeholder)
 ****************************************************/
export function refreshILS() {
  // Ici tu peux ajouter ton dessin ILS (glide, localizer, etc.)
  // Par exemple mettre à jour un canvas ou un SVG dans un div #ils-display
  const el = document.getElementById("ils-display");
  if (!el) return;

  el.textContent = `ILS actif sur piste ${window.activeRunway || "n/a"}`;
}
