export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    const lamin = url.searchParams.get("lamin");
    const lomin = url.searchParams.get("lomin");
    const lamax = url.searchParams.get("lamax");
    const lomax = url.searchParams.get("lomax");

    if (!lamin || !lomin || !lamax || !lomax) {
      return new Response(JSON.stringify({ error: "Missing parameters" }), {
        status: 400,
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Headers": "*",
          "Access-Control-Allow-Methods": "GET",
          "Content-Type": "application/json"
        }
      });
    }

    const target = `https://opensky-network.org/api/states/all?lamin=${lamin}&lomin=${lomin}&lamax=${lamax}&lomax=${lomax}`;

    // Cache intelligent Cloudflare (60 secondes)
    const cache = caches.default;
    const cacheKey = new Request(target);
    let cached = await cache.match(cacheKey);

    if (cached) {
      return new Response(cached.body, {
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Headers": "*",
          "Access-Control-Allow-Methods": "GET",
          "Content-Type": "application/json"
        }
      });
    }

    try {
      const r = await fetch(target);
      const data = await r.json();

      const response = new Response(JSON.stringify(data), {
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Headers": "*",
          "Access-Control-Allow-Methods": "GET",
          "Content-Type": "application/json"
        }
      });

      ctx.waitUntil(cache.put(cacheKey, response.clone()));

      return response;
    } catch (e) {
      return new Response(JSON.stringify({ error: "OpenSky error", details: e.toString() }), {
        status: 500,
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Headers": "*",
          "Access-Control-Allow-Methods": "GET",
          "Content-Type": "application/json"
        }
      });
    }
  }
};
