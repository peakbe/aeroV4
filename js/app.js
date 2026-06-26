import { airports } from "./config.js";
import { initMap } from "./map.js";
import { fetchMetar, updateMetarUI } from "./metar.js";
import { updateSonoListUI } from "./sono.js";
import { updateRunwayHUD, updateFlightsUI } from "./fids.js";
import { initTabs } from "./tabs.js";

document.addEventListener("DOMContentLoaded", async () => {

  initTabs();
  initMap();


async function processAirport(airportKey) {
  const ap = airports[airportKey];

  const metar = await fetchMetar(ap.icao);
  updateMetarUI(airportKey, metar);

  const windDir = metar?.wind_direction?.value;
  const activeRunway = computeRunway(ap, windDir);

  updateRunwayHUD(ap, windDir);

  updateSono(airportKey, activeRunway);
}


  await Promise.all([
    processAirport("EBCI"),
    processAirport("EBLG")
  ]);
});
