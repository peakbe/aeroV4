/****************************************************
 * CONFIG — Cockpit IFR PRO+++
 ****************************************************/

export const AIRLABS_KEY = "04cb1c09-8abb-468a-95fa-ee90c3c2b651";

export const airports = {
  EBCI: {
    icao: "EBCI",
    name: "Brussels South Charleroi",
    runways: [
      { name: "24", heading: 240, lat: 50.459, lon: 4.453 },
      { name: "06", heading: 60,  lat: 50.459, lon: 4.453 }
    ]
  },

  EBLG: {
    icao: "EBLG",
    name: "Liège Airport",
    runways: [
      { name: "22", heading: 220, lat: 50.637, lon: 5.443 },
      { name: "04", heading: 40,  lat: 50.637, lon: 5.443 }
    ]
  }
};
