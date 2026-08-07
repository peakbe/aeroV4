/****************************************************
 * CONFIG — Cockpit IFR Airbus PRO+++
 ****************************************************/

export const AIRLABS_API_KEY = "04cb1c09-8abb-468a-95fa-ee90c3c2b651";
export const AVWX_API_KEY = "ersegQzkf2Dfal-o26B4b5uzMrXBeHK2jOpOaY7nffc";

export const airports = {

  /****************************************************
   * EBCI — Brussels South Charleroi
   ****************************************************/
  EBCI: {
    icao: "EBCI",
    name: "Brussels South Charleroi",
    lat: 50.459,
    lon: 4.453,

    aircraft: {
      lat: 50.459,
      lon: 4.453,
      altFt: 0,
      hdg: 0,
      gs: 0
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
        lat: 50.456430,
        lon: 4.468300
      },
      glideSlope: {
        lat: 50.456430,
        lon: 4.468300
      }
    }
  },

  /****************************************************
   * EBLG — Liège Airport
   ****************************************************/
  EBLG: {
    icao: "EBLG",
    name: "Liège Airport",
    lat: 50.637,
    lon: 5.443,

    aircraft: {
      lat: 50.637,
      lon: 5.443,
      altFt: 0,
      hdg: 0,
      gs: 0
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
        lat: 50.631900,
        lon: 5.438200
      },
      glideSlope: {
        lat: 50.631900,
        lon: 5.438200
      }
    }
  }
};
