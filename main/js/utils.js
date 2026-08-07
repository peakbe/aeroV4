/****************************************************
 * Utils.js — Fonctions utilitaires Cockpit IFR PRO+++
 ****************************************************/

/****************************************************
 * 1) Différence angulaire (0–180°) — Airbus ND
 ****************************************************/
export function angleDiff(a, b) {
  let d = Math.abs(a - b) % 360;
  return d > 180 ? 360 - d : d;
}

/****************************************************
 * 2) Sécurise l’écriture dans le DOM — Airbus SD
 ****************************************************/
export function safeSet(id, text) {
  const el = document.getElementById(id);
  if (el) {
    el.textContent = text;
  } else {
    console.warn("⚠️ Élément manquant :", id);
  }
}

/****************************************************
 * 3) DMS → Décimal — IFR (robuste)
 ****************************************************/
export function dmsToDecimal(dms) {
  if (!dms) return null;

  const parts = dms.trim().split(/\s+/);
  if (parts.length < 4) return null;

  const deg = parseFloat(parts[0]);
  const min = parseFloat(parts[1]);
  const sec = parseFloat(parts[2]);
  const dir = parts[3];

  if (isNaN(deg) || isNaN(min) || isNaN(sec)) return null;

  let dec = deg + min / 60 + sec / 3600;
  if (dir === "S" || dir === "W") dec = -dec;

  return dec;
}

/****************************************************
 * 4) Conversion degrés → radians / radians → degrés
 ****************************************************/
export function toRad(deg) {
  return deg * Math.PI / 180;
}

export function toDeg(rad) {
  return rad * 180 / Math.PI;
}

/****************************************************
 * 5) Distance Haversine (mètres) — Airbus ND
 ****************************************************/
export function haversine(lat1, lon1, lat2, lon2) {
  const R = 6371000;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);

  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) *
    Math.cos(toRad(lat2)) *
    Math.sin(dLon / 2) ** 2;

  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/****************************************************
 * 6) Distance NM — Airbus ECAM (renvoie un nombre)
 ****************************************************/
export function distanceNm(lat1, lon1, lat2, lon2) {
  return Math.round((haversine(lat1, lon1, lat2, lon2) / 1852) * 10) / 10;
}

/****************************************************
 * 7) Format cockpit IFR (HH:MM) — robuste
 ****************************************************/
export function fmtTime(t) {
  if (!t) return "n/a";

  try {
    // Format ISO → 2024-12-01T12:00:00Z
    if (t.includes("T")) {
      return t.replace("Z", "").split("T")[1].slice(0, 5);
    }

    // Format compact → 202412011200Z
    if (/^\d{12}Z$/.test(t)) {
      const hh = t.slice(8, 10);
      const mm = t.slice(10, 12);
      return `${hh}:${mm}`;
    }

    return t;
  } catch {
    return "n/a";
  }
}

/****************************************************
 * 8) Clamp — Airbus ND (limite déviation)
 ****************************************************/
export function clamp(val, min, max) {
  return Math.max(min, Math.min(max, val));
}

/****************************************************
 * 9) Arrondi cockpit IFR
 ****************************************************/
export function round(val, decimals = 0) {
  const p = Math.pow(10, decimals);
  return Math.round(val * p) / p;
}
