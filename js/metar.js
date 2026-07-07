/****************************************************
 * 1) FETCH METAR — avwx (ICAO + fallback EBBR)
 ****************************************************/
/****************************************************
 * METAR / TAF — AVWX Version PRO+++
 ****************************************************/

export async function fetchMetar(icao) {
  try {
    const url = `https://avwx.rest/api/metar/${icao}?format=json&token=${AVWX_API_KEY}`;
    const r = await fetch(url);
    if (!r.ok) return null;

    const data = await r.json();

    return {
      raw: data.raw || null,
      wind_dir: data.wind_direction?.value || null,
      wind_speed: data.wind_speed?.value || null,
      temperature: data.temperature?.value || null,
      dewpoint: data.dewpoint?.value || null,
      visibility: data.visibility?.value || null,
      qnh: data.altimeter?.value || null
    };
  } catch (e) {
    console.error("METAR AVWX error:", e);
    return null;
  }
}





/****************************************************
 * 2) CLASSIFICATION METAR (vert/orange/rouge)
 ****************************************************/
function classifyMetar(metar) {
  if (!metar) return "red";

  const wind = metar.wind_speed || 0;
  const vis = metar.visibility || 0;

  if (wind <= 8 && vis >= 8000) return "green";
  if (wind <= 15 && vis >= 4000) return "orange";
  return "red";
}

/****************************************************
 * 3) AFFICHAGE METAR — Compatible avec TON HTML
 ****************************************************/
export function updateMetarUI(airportKey, metar) {
  const key = airportKey.toLowerCase();

  const summary = document.getElementById(`meteo-${key}-summary`);
  const raw = document.getElementById(`meteo-${key}-raw`);

  if (!summary || !raw) {
    console.warn("IDs METAR manquants pour", airportKey);
    return;
  }

  if (!metar) {
    summary.textContent = "METAR indisponible";
    raw.textContent = "n/a";
    return;
  }

  const color = classifyMetar(metar);

  const windDir = metar.wind_dir || "n/a";
  const windSpd = metar.wind_speed || "n/a";
  const temp = metar.temp || "n/a";
  const qnh = metar.pressure_hpa || "n/a";

  summary.innerHTML = `
    <span class="${color}">
      Vent ${windDir}° / ${windSpd} kt — T: ${temp}°C — QNH: ${qnh} hPa
    </span>
  `;

  raw.textContent = metar.raw_text || "n/a";
}

/****************************************************
 * 4) FETCH TAF — avwx (ICAO correct)
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
 * 5) AFFICHAGE TAF — Compatible avec TON HTML
 ****************************************************/
export function updateTafUI(airportKey, taf) {
  const el = document.getElementById("taf-content");
  if (!el) return;

  el.innerHTML = `
    <div class="taf-title">TAF ${airportKey}</div>
    <div class="taf-raw">${taf?.raw_text || "n/a"}</div>
  `;
}

/****************************************************
 * 6) SWITCH METAR / TAF
 ****************************************************/
export function initMetarSwitch() {
  const btnMetar = document.getElementById("btn-metar");
  const btnTaf = document.getElementById("btn-taf");
  const metarContent = document.getElementById("metar-content");
  const tafContent = document.getElementById("taf-content");

  if (!btnMetar || !btnTaf) return;

  btnMetar.addEventListener("click", () => {
    metarContent.style.display = "block";
    tafContent.style.display = "none";
  });

  btnTaf.addEventListener("click", () => {
    metarContent.style.display = "none";
    tafContent.style.display = "block";
  });
}

/****************************************************
 * 7) EMBED METAR-TAF.COM (inchangé)
 ****************************************************/
export function injectMetarEmbed(airportKey) {
  let targetId, url, linkText;

  if (airportKey === "EBCI") {
    targetId = "metar-embed-ebci";
    url = "https://metar-taf.com/fr/embed-js/EBCI?qnh=hPa&rh=rh&target=GrcWAfkb";
    linkText = "METAR Brussels South Charleroi Airport";
  } else if (airportKey === "EBLG") {
    targetId = "metar-embed-eblg";
    url = "https://metar-taf.com/fr/embed-js/EBLG?qnh=hPa&rh=rh&target=J0YHElLt";
    linkText = "METAR Liège Airport";
  } else {
    return;
  }

  const container = document.getElementById(targetId);
  if (!container) return;

  container.innerHTML = "";

  const a = document.createElement("a");
  a.href = `https://metar-taf.com/fr/metar/${airportKey}`;
  a.id = airportKey === "EBCI" ? "metartaf-GrcWAfkb" : "metartaf-J0YHElLt";
  a.style = "font-size:18px; font-weight:500; color:#000; width:300px; height:435px; display:block";
  a.textContent = linkText;

  container.appendChild(a);

  const script = document.createElement("script");
  script.src = url;
  script.async = true;
  script.defer = true;
  script.crossOrigin = "anonymous";

  container.appendChild(script);
}

/****************************************************
 * 8) ROSE DES VENTS
 ****************************************************/
function classifyWind(speed) {
  if (speed <= 8) return "lime";
  if (speed <= 15) return "orange";
  return "red";
}

export function updateWindRose(metar) {
  const container = document.getElementById("wind-rose");
  if (!container) return;

  const windDir = metar?.wind_dir;
  const windSpd = metar?.wind_speed;

  if (!windDir || !windSpd) {
    container.innerHTML = "<div style='color:#888'>Vent: n/a</div>";
    return;
  }

  const color = classifyWind(windSpd);

  container.innerHTML = `
    <div class="wind-rose">
      <div class="wind-arrow" style="border-bottom-color:${color}; transform: rotate(${windDir}deg);"></div>
    </div>
    <div style="text-align:center; color:${color}; font-family:monospace;">
      ${windDir}° / ${windSpd} kt
    </div>
  `;
}
