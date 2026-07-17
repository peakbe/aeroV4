/****************************************************
 * CONFIG — Cockpit IFR PRO+++
 ****************************************************/

export const AVWX_API_KEY = "ersegQzkf2Dfal-o26B4b5uzMrXBeHK2jOpOaY7nffc";

export const airports = {

  /****************************************************
   * EBCI — Charleroi
   ****************************************************/
  EBCI: {
    icao: "EBCI",
    name: "Brussels South Charleroi",
    lat: 50.459,
    lon: 4.453,

    aircraft: {
      lat: 50.4600,
      lon: 4.4600,
      altFt: 3000,
      hdg: 240,
      gs: 140
    },

    runways: [
      {
        name: "24",
        heading: 240,
        lat1: 50.461030, lon1: 4.453980,
        lat2: 50.456430, lon2: 4.468300
      },
      {
        name: "06",
        heading: 60,
        lat1: 50.456430, lon1: 4.468300,
        lat2: 50.461030, lon2: 4.453980
      }
    ],

    ils: {
      localizer: {
        lat: 50.456430, lon: 4.468300,
        dirLat: 0.0100, dirLon: -0.0300
      },
      glideSlope: {
        lat: 50.456430, lon: 4.468300,
        dirLat: 0.0050, dirLon: -0.0150
      }
    }
  },

  /****************************************************
   * EBLG — Liège
   ****************************************************/
  EBLG: {
    icao: "EBLG",
    name: "Liège Airport",
    lat: 50.637,
    lon: 5.443,

    aircraft: {
      lat: 50.6400,
      lon: 5.4500,
      altFt: 2800,
      hdg: 220,
      gs: 150
    },

    runways: [
      {
        name: "22",
        heading: 220,
        lat1: 50.644850, lon1: 5.460300,
        lat2: 50.631900, lon2: 5.438200
      },
      {
        name: "04",
        heading: 40,
        lat1: 50.631900, lon1: 5.438200,
        lat2: 50.644850, lon2: 5.460300
      }
    ],

    ils: {
      localizer: {
        lat: 50.631900, lon: 5.438200,
        dirLat: 0.0150, dirLon: 0.0300
      },
      glideSlope: {
        lat: 50.631900, lon: 5.438200,
        dirLat: 0.0070, dirLon: 0.0150
      }
    }
  }
};
