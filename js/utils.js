/****************************************************
 * Utils.js — Fonctions utilitaires Cockpit IFR PRO+++
 ****************************************************/
export function dmsToDecimal(dms) {
  const parts = dms.split(" ");
  const deg = parseFloat(parts[0]);
  const min = parseFloat(parts[1]);
  const sec = parseFloat(parts[2]);
  const dir = parts[3];

  let dec = deg + min / 60 + sec / 3600;
  if (dir === "S" || dir === "W") dec = -dec;

  return dec;
}

// Différence angulaire (0–180°)
export function angleDiff(a, b) {
  let d = Math.abs(a - b) % 360;
  return d > 180 ? 360 - d : d;
}

// Sécurise l’écriture dans le DOM
export function safeSet(id, text) {
  const el = document.getElementById(id);
  if (el) {
    el.textContent = text;
  } else {
    console.warn("⚠️ Élément manquant :", id);
  }
}
