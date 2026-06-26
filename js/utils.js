export function angleDiff(a, b) {
  let d = Math.abs(a - b) % 360;
  return d > 180 ? 360 - d : d;
}

export function safeSet(id, text) {
  const el = document.getElementById(id);
  if (el) el.textContent = text;
 else {
  console.warn(`⚠️ Élément DOM introuvable : #${id}`);
  const logs = document.getElementById("logs-console");
  if (logs) logs.innerHTML += `\n⚠️ Élément DOM introuvable : #${id}`;
}

