export function updateSonoListUI(airportKey, list) {
  const id = airportKey === "EBCI" ? "sono-list-ebci" : "sono-list-eblg";
  const el = document.getElementById(id);

  if (!el) return console.warn("⚠️ SONO manquant :", id);

  el.innerHTML = list
    .map(s => `${s.id} — ${s.address}`)
    .join("\n");
}
