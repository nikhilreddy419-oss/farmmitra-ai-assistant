const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const LYZR_AGENT_ID = "69d512f45a03069870a516ee";
const LYZR_INFERENCE_URL = "https://agent-prod.studio.lyzr.ai/v3/inference/chat/";
const LYZR_WEBHOOK_URL = "https://scheduler.studio.lyzr.ai/webhook-trigger/69d6996f57d27348f90f89f2";
const AI_GATEWAY = "https://ai.gateway.lovable.dev/v1/chat/completions";
const TTL_MS = 10 * 60 * 1000;

type Cached = { at: number; payload: unknown };
const cache = new Map<string, Cached>();

function ok(body: unknown) {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function tryParseJson(text: string): any | null {
  if (!text) return null;
  const cleaned = text.replace(/```json\s*/gi, "").replace(/```/g, "").trim();
  try { return JSON.parse(cleaned); } catch (_) {}
  const s = cleaned.indexOf("{"), e = cleaned.lastIndexOf("}");
  if (s !== -1 && e > s) {
    const slice = cleaned.slice(s, e + 1);
    try { return JSON.parse(slice); } catch (_) {
      try { return JSON.parse(slice.replace(/,\s*}/g, "}").replace(/,\s*]/g, "]")); } catch (_) {}
    }
  }
  return null;
}

// Try the Lyzr inference API. If the key is invalid (403), returns null silently.
async function callLyzrInference(locality: string): Promise<string | null> {
  const LYZR_API_KEY = Deno.env.get("LYZR_API_KEY");
  if (!LYZR_API_KEY) return null;
  try {
    const prompt = `LIVE current weather + farming advisory for "${locality}", India. Strict JSON only:
{"location":"${locality}","condition":"","temperature_c":0,"feels_like_c":0,"humidity_pct":0,"wind_kmh":0,"rain_chance_pct":0,"uv_index":0,"advisory":"","forecast":[{"day":"Today","condition":"","min_c":0,"max_c":0},{"day":"Tomorrow","condition":"","min_c":0,"max_c":0},{"day":"Day 3","condition":"","min_c":0,"max_c":0}]}`;
    const res = await fetch(LYZR_INFERENCE_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-api-key": LYZR_API_KEY },
      body: JSON.stringify({
        user_id: "farmmitra@app",
        agent_id: LYZR_AGENT_ID,
        session_id: `${LYZR_AGENT_ID}-${crypto.randomUUID()}`,
        message: prompt,
      }),
    });
    if (!res.ok) {
      console.warn("weather-agent: Lyzr inference returned", res.status);
      return null;
    }
    const j = await res.json().catch(() => ({}));
    return String(j?.response ?? "") || null;
  } catch (e) {
    console.warn("weather-agent: Lyzr inference threw", e);
    return null;
  }
}

// Fire-and-forget: also kick the Lyzr scheduler webhook so the agent runs in background
async function triggerLyzrWebhook(locality: string) {
  try {
    await fetch(LYZR_WEBHOOK_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ locality }),
    });
  } catch (_) { /* best effort */ }
}

async function generateWeather(locality: string, lyzrHint: string | null): Promise<any | null> {
  const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
  if (!LOVABLE_API_KEY) return null;
  const sys = "You are a weather data extractor for Indian agriculture. Output ONLY a single JSON object matching the schema. Use realistic current values for the given Indian city and current season. If hint text contains values, prefer them.";
  const user = `City: ${locality}, India.
Hint from agent (may be empty/prose):
${lyzrHint || "(none)"}

Return JSON exactly:
{"location":"${locality}","condition":"","temperature_c":0,"feels_like_c":0,"humidity_pct":0,"wind_kmh":0,"rain_chance_pct":0,"uv_index":0,"advisory":"1-2 sentence farming advisory","forecast":[{"day":"Today","condition":"","min_c":0,"max_c":0},{"day":"Tomorrow","condition":"","min_c":0,"max_c":0},{"day":"Day 3","condition":"","min_c":0,"max_c":0}]}`;
  try {
    const res = await fetch(AI_GATEWAY, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${LOVABLE_API_KEY}` },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [{ role: "system", content: sys }, { role: "user", content: user }],
        response_format: { type: "json_object" },
      }),
    });
    if (!res.ok) {
      console.error("weather-agent: AI gateway", res.status, await res.text());
      return null;
    }
    const j = await res.json();
    return tryParseJson(j?.choices?.[0]?.message?.content ?? "");
  } catch (e) {
    console.error("weather-agent: AI gateway threw", e);
    return null;
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

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

  // On force, also trigger the scheduler webhook (background, do not await)
  if (force) triggerLyzrWebhook(locality);

  try {
    const lyzrHint = await callLyzrInference(locality);
    console.log("weather-agent lyzr hint length:", lyzrHint?.length ?? 0);
    const parsed = await generateWeather(locality, lyzrHint);

    if (!parsed || typeof parsed.temperature_c !== "number") {
      if (hit) return ok({ ok: true, cached: true, stale: true, ageMs: Date.now() - hit.at, ...((hit.payload as object) || {}) });
      return ok({ ok: false, fallback: true, error: "ai_generation_failed", data: null });
    }

    const payload = { data: parsed, source: lyzrHint ? "lyzr+ai" : "ai" };
    cache.set(cacheKey, { at: Date.now(), payload });
    return ok({ ok: true, cached: false, ...payload });
  } catch (err) {
    console.error("weather-agent error:", err);
    if (hit) return ok({ ok: true, cached: true, stale: true, ageMs: Date.now() - hit.at, ...((hit.payload as object) || {}) });
    return ok({ ok: false, fallback: true, error: err instanceof Error ? err.message : "unknown", data: null });
  }
});
