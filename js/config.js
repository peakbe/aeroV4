/****************************************************
 * CONFIG — Cockpit IFR PRO+++
 ****************************************************/

export const AVWX_API_KEY = "ersegQzkf2Dfal-o26B4b5uzMrXBeHK2jOpOaY7nffc";

 
export const airports = {
  EBCI: {
    icao: "EBCI",
    name: "Brussels South Charleroi",
    lat: 50.459,
    lon: 4.453,
    runways: [
      { name: "24", heading: 240, lat: 50.459, lon: 4.453 },
      { name: "06", heading: 60,  lat: 50.459, lon: 4.453 }
    ]
  },

  EBLG: {
    icao: "EBLG",
    name: "Liège Airport",
    lat: 50.637,
    lon: 5.443,
    runways: [
      { name: "22", heading: 220, lat: 50.637, lon: 5.443 },
      { name: "04", heading: 40,  lat: 50.637, lon: 5.443 }
    ]
  }
};

