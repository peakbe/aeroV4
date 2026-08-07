/****************************************************
 * WIND COMPONENTS — Airbus PRO+++
 * Calcule headwind, crosswind et angle relatif
 * runwayHeading : heading piste (°)
 * windDir       : direction du vent (°) ou null si VRB
 * windSpeed     : vitesse du vent (kt)
 ****************************************************/

export function computeWindComponents(runwayHeading, windDir, windSpeed) {

  // Vent variable → composantes nulles
  if (windDir === null || windSpeed === 0) {
    return {
      headwind: 0,
      crosswind: 0,
      angle: 0
    };
  }

  // Angle relatif vent/piste
  // Exemple : RWY 24 = 240°, vent 210° → angle = -30° (vent venant de la gauche)
  let angle = windDir - runwayHeading;

  // Normalisation -180° → +180°
  angle = ((angle + 540) % 360) - 180;

  // Composantes
  const rad = angle * Math.PI / 180;

  const headwind = Math.round(windSpeed * Math.cos(rad));
  const crosswind = Math.round(windSpeed * Math.sin(rad));

  return {
    headwind,
    crosswind,
    angle: Math.round(angle)
  };
}
