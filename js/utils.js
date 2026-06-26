/****************************************************
 * Utils.js — Fonctions utilitaires Cockpit IFR PRO+++
 ****************************************************/

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
