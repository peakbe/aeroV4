export default {
  async fetch(request) {
    const url = new URL(request.url);

    // On récupère les paramètres lamin, lomin, lamax, lomax
    const lamin = url.searchParams.get("lamin");
    const lomin = url.searchParams.get("lomin");
    const lamax = url.searchParams.get("lamax");
    const lomax = url.searchParams.get("lomax");

    if (!lamin || !lomin || !lamax || !lomax) {
      return new Response(JSON.stringify({ error: "Missing parameters" }), {
        status: 400,
        headers: { "Content-Type": "application/json" }
      });
    }

    const target = `https://opensky-network.org/api/states/all?lamin=${lamin}&lomin=${lomin}&lamax=${lamax}&lomax=${lomax}`;

    try {
      const r = await fetch(target);
      const data = await r.json();

      return new Response(JSON.stringify(data), {
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Headers": "*",
          "Access-Control-Allow-Methods": "GET",
          "Content-Type": "application/json"
        }
      });
    } catch (e) {
      return new Response(JSON.stringify({ error: "OpenSky error", details: e.toString() }), {
        status: 500,
        headers: { "Content-Type": "application/json" }
      });
    }
  }
};
