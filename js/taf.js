/****************************************************
 * TAF — AVWX Version PRO+++
 ****************************************************/
import { AVWX_API_KEY } from "./config.js";

/****************************************************
 * 1) FETCH TAF — AVWX
 ****************************************************/
export async function fetchTaf(icao) {
  try {
    const url = `https://avwx.rest/api/taf/${icao}?format=json&token=${AVWX_API_KEY}`;
    const r = await fetch(url);
    if (!r.ok) return null;

    const data = await r.json();

    return {
      raw: data.raw || null,
      forecast: data.forecast || []
    };
  } catch (e) {
    console.error("TAF AVWX error:", e);
    return null;
  }
}

/****************************************************
 * 2) AFFICHAGE TAF — IFR simple
 ****************************************************/
export function updateTafUI(airportKey, taf) {
  const el = document.getElementById("taf-content");
  if (!el) return;

  if (!taf) {
    el.innerHTML = "<div class='taf-line'>TAF indisponible</div>";
    return;
  }

  el.innerHTML = `
    <div class="taf-title">TAF ${airportKey}</div>
    <div class="taf-raw">${taf.raw || "n/a"}</div>
  `;
}

/****************************************************
 * 3) SWITCH METAR / TAF
 ****************************************************/
export function initMetarSwitch() {
  const btnMetar = document.getElementById("btn-metar");
  const btnTaf = document.getElementById("btn-taf");
  const metarContent = document.getElementById("metar-content");
  const tafContent = document.getElementById("taf-content");

  if (!btnMetar || !btnTaf || !metarContent || !tafContent) return;

  btnMetar.addEventListener("click", () => {
    metarContent.style.display = "block";
    tafContent.style.display = "none";
  });

  btnTaf.addEventListener("click", () => {
    metarContent.style.display = "none";
    tafContent.style.display = "block";
  });
}
