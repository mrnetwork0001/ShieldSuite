// ─── OKX DEX Proxy — Cloudflare Worker ──────────────────────────────────────
// Proxies OKX API calls with HMAC-SHA256 signing from Cloudflare's edge,
// bypassing geo-blocking on Railway/US servers.
//
// Secrets (set via `wrangler secret put`):
//   OKX_API_KEY, OKX_SECRET_KEY, OKX_PASSPHRASE

export default {
  async fetch(request, env) {
    // Handle CORS preflight
    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: corsHeaders(request) });
    }

    const url = new URL(request.url);
    const okxPath = url.pathname;

    // Only proxy OKX API paths
    if (!okxPath.startsWith("/api/")) {
      return jsonResponse({ error: "Invalid path — must start with /api/" }, 400, request);
    }

    // Build OKX URL
    const okxUrl = `https://web3.okx.com${okxPath}${url.search}`;

    // Sign the request using Web Crypto (Cloudflare Workers API)
    const timestamp = new Date().toISOString();
    const method = request.method.toUpperCase();
    const bodyStr = method === "POST" ? await request.clone().text() : "";
    const signPath = method === "GET" ? `${okxPath}${url.search}` : okxPath;

    const message = timestamp + method + signPath + bodyStr;
    const encoder = new TextEncoder();

    const key = await crypto.subtle.importKey(
      "raw",
      encoder.encode(env.OKX_SECRET_KEY),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign"]
    );

    const signatureBuffer = await crypto.subtle.sign("HMAC", key, encoder.encode(message));
    const sign = btoa(String.fromCharCode(...new Uint8Array(signatureBuffer)));

    // Forward to OKX
    try {
      const okxResponse = await fetch(okxUrl, {
        method,
        headers: {
          "Content-Type": "application/json",
          "OK-ACCESS-KEY": env.OKX_API_KEY,
          "OK-ACCESS-SIGN": sign,
          "OK-ACCESS-TIMESTAMP": timestamp,
          "OK-ACCESS-PASSPHRASE": env.OKX_PASSPHRASE,
        },
        body: method === "POST" ? bodyStr : undefined,
      });

      const responseBody = await okxResponse.text();

      return new Response(responseBody, {
        status: okxResponse.status,
        headers: {
          "Content-Type": "application/json",
          ...corsHeaders(request),
        },
      });
    } catch (err) {
      return jsonResponse({ error: `OKX proxy error: ${err.message}` }, 502, request);
    }
  },
};

function corsHeaders(request) {
  return {
    "Access-Control-Allow-Origin": request.headers.get("Origin") || "*",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Access-Control-Max-Age": "86400",
  };
}

function jsonResponse(data, status, request) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json", ...corsHeaders(request) },
  });
}
