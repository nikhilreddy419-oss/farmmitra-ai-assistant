const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const AGENT_ID = "69d512f45a03069870a516ee";
const LYZR_URL = "https://agent-prod.studio.lyzr.ai/v3/inference/chat/";
const TTL_MS = 10 * 60 * 1000; // 10 min

type Cached = { at: number; payload: unknown };
const cache = new Map<string, Cached>();

function extractJson(text: string): any | null {
  if (!text) return null;
  const fence = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  for (const c of [fence?.[1], text]) {
    if (!c) continue;
    const s = c.indexOf("{"), e = c.lastIndexOf("}");
    if (s === -1 || e === -1) continue;
    try { return JSON.parse(c.slice(s, e + 1)); } catch (_) {}
  }
  return null;
}

function ok(body: unknown) {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const LYZR_API_KEY = Deno.env.get("LYZR_API_KEY");
  let locality = "Hyderabad";
  let force = false;
  try {
    const body = await req.json();
    if (body?.locality) locality = String(body.locality).slice(0, 80);
    force = !!body?.force;
  } catch (_) {}

  const cacheKey = `w:${locality.toLowerCase()}`;
  const hit = cache.get(cacheKey);
  if (!force && hit && Date.now() - hit.at < TTL_MS) {
    return ok({ ok: true, cached: true, ageMs: Date.now() - hit.at, ...((hit.payload as object) || {}) });
  }

  if (!LYZR_API_KEY) {
    return ok({ ok: false, fallback: true, error: "missing_api_key", data: null });
  }

  try {
    const prompt = `Give the LIVE current weather and short farming advisory for "${locality}", India.
Reply ONLY with strict JSON (no prose, no markdown fences) using EXACTLY this shape:
{
  "location": "${locality}",
  "condition": "short label e.g. Clear sky / Light rain",
  "temperature_c": number,
  "feels_like_c": number,
  "humidity_pct": number,
  "wind_kmh": number,
  "rain_chance_pct": number,
  "uv_index": number,
  "advisory": "1-2 sentence farming advisory in English",
  "forecast": [
    {"day":"Today","condition":"...","min_c":number,"max_c":number},
    {"day":"Tomorrow","condition":"...","min_c":number,"max_c":number},
    {"day":"Day 3","condition":"...","min_c":number,"max_c":number}
  ]
}`;

    const lyzrRes = await fetch(LYZR_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-api-key": LYZR_API_KEY },
      body: JSON.stringify({
        user_id: "farmmitra@app",
        agent_id: AGENT_ID,
        session_id: `${AGENT_ID}-${crypto.randomUUID()}`,
        message: prompt,
      }),
    });

    if (!lyzrRes.ok) {
      const t = await lyzrRes.text();
      console.error("Weather agent error", lyzrRes.status, t);
      // serve stale cache if available
      if (hit) return ok({ ok: true, cached: true, stale: true, ageMs: Date.now() - hit.at, ...((hit.payload as object) || {}) });
      return ok({ ok: false, fallback: true, error: `agent_${lyzrRes.status}`, data: null });
    }

    const json = await lyzrRes.json();
    const raw: string = json?.response || "";
    const parsed = extractJson(raw);
    if (!parsed) {
      if (hit) return ok({ ok: true, cached: true, stale: true, ageMs: Date.now() - hit.at, ...((hit.payload as object) || {}) });
      return ok({ ok: false, fallback: true, error: "unparseable_response", data: null, raw });
    }

    const payload = { data: parsed };
    cache.set(cacheKey, { at: Date.now(), payload });
    return ok({ ok: true, cached: false, ...payload });
  } catch (err) {
    console.error("weather-agent error:", err);
    if (hit) return ok({ ok: true, cached: true, stale: true, ageMs: Date.now() - hit.at, ...((hit.payload as object) || {}) });
    return ok({ ok: false, fallback: true, error: err instanceof Error ? err.message : "unknown", data: null });
  }
});
