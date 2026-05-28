// ─── OKX DEX Proxy — Cloudflare Worker ──────────────────────────────────────
// Deploy this to Cloudflare Workers (free tier) to proxy OKX API calls
// from Railway servers that are geo-blocked by OKX.
//
// Setup:
//   1. npx wrangler init okx-proxy
//   2. Replace src/index.ts with this file
//   3. Set secrets: wrangler secret put OKX_API_KEY / OKX_SECRET_KEY / OKX_PASSPHRASE
//   4. npx wrangler deploy
//   5. Set RAILWAY env: OKX_PROXY_URL=https://okx-proxy.<your-subdomain>.workers.dev

export default {
  async fetch(request, env) {
    // Only allow requests from your backend (add your Railway domain)
    const allowedOrigins = [
      "https://shieldsuite-production.up.railway.app",
      "http://localhost:3402",
    ];

    // Handle CORS preflight
    if (request.method === "OPTIONS") {
      return new Response(null, {
        headers: corsHeaders(request, allowedOrigins),
      });
    }

    // Only proxy GET/POST to OKX API paths
    const url = new URL(request.url);
    const okxPath = url.pathname; // e.g., /api/v6/dex/aggregator/quote

    if (!okxPath.startsWith("/api/")) {
      return new Response(JSON.stringify({ error: "Invalid path" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Build OKX URL
    const okxUrl = `https://web3.okx.com${okxPath}${url.search}`;

    // Sign the request
    const timestamp = new Date().toISOString();
    const method = request.method.toUpperCase();
    const bodyStr = method === "POST" ? await request.text() : "";
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

    const signature = await crypto.subtle.sign("HMAC", key, encoder.encode(message));
    const sign = btoa(String.fromCharCode(...new Uint8Array(signature)));

    // Forward to OKX
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
        ...corsHeaders(request, allowedOrigins),
      },
    });
  },
};

function corsHeaders(request, allowedOrigins) {
  const origin = request.headers.get("Origin") || "";
  const headers = {
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Access-Control-Max-Age": "86400",
  };

  if (allowedOrigins.some((o) => origin.startsWith(o)) || origin.includes("localhost")) {
    headers["Access-Control-Allow-Origin"] = origin;
  }

  return headers;
}
