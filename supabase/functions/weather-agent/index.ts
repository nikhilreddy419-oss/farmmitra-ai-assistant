const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const AGENT_ID = "69d512f45a03069870a516ee";
const LYZR_URL = "https://agent-prod.studio.lyzr.ai/v3/inference/chat/";
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
  // strip markdown fences
  const cleaned = text.replace(/```json\s*/gi, "").replace(/```/g, "").trim();
  // direct parse
  try { return JSON.parse(cleaned); } catch (_) {}
  // extract first {...}
  const s = cleaned.indexOf("{"), e = cleaned.lastIndexOf("}");
  if (s !== -1 && e > s) {
    const slice = cleaned.slice(s, e + 1);
    try { return JSON.parse(slice); } catch (_) {
      try { return JSON.parse(slice.replace(/,\s*}/g, "}").replace(/,\s*]/g, "]")); } catch (_) {}
    }
  }
  return null;
}

async function callLyzr(locality: string): Promise<{ raw: string; status: number }> {
  const LYZR_API_KEY = Deno.env.get("LYZR_API_KEY")!;
  const prompt = `Provide CURRENT weather + a short farming advisory for "${locality}", India. Use the live weather API. Reply ONLY with strict JSON, no prose, no markdown:
{"location":"${locality}","condition":"...","temperature_c":number,"feels_like_c":number,"humidity_pct":number,"wind_kmh":number,"rain_chance_pct":number,"uv_index":number,"advisory":"...","forecast":[{"day":"Today","condition":"...","min_c":number,"max_c":number},{"day":"Tomorrow","condition":"...","min_c":number,"max_c":number},{"day":"Day 3","condition":"...","min_c":number,"max_c":number}]}`;
  const res = await fetch(LYZR_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-api-key": LYZR_API_KEY },
    body: JSON.stringify({
      user_id: "farmmitra@app",
      agent_id: AGENT_ID,
      session_id: `${AGENT_ID}-${crypto.randomUUID()}`,
      message: prompt,
    }),
  });
  const json = await res.json().catch(() => ({}));
  return { raw: String(json?.response ?? ""), status: res.status };
}

async function normalizeWithAI(prose: string, locality: string): Promise<any | null> {
  const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
  if (!LOVABLE_API_KEY) return null;
  try {
    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${LOVABLE_API_KEY}` },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: "Extract weather data into the requested JSON schema. If unknown, infer realistic values for the given Indian city/season. Output ONLY JSON." },
          { role: "user", content: `Location: ${locality}\nAgent text:\n${prose}\n\nReturn JSON exactly:\n{"location":"${locality}","condition":"","temperature_c":0,"feels_like_c":0,"humidity_pct":0,"wind_kmh":0,"rain_chance_pct":0,"uv_index":0,"advisory":"","forecast":[{"day":"Today","condition":"","min_c":0,"max_c":0},{"day":"Tomorrow","condition":"","min_c":0,"max_c":0},{"day":"Day 3","condition":"","min_c":0,"max_c":0}]}` },
        ],
        response_format: { type: "json_object" },
      }),
    });
    if (!res.ok) {
      console.error("AI normalize failed", res.status, await res.text());
      return null;
    }
    const j = await res.json();
    const content = j?.choices?.[0]?.message?.content ?? "";
    return tryParseJson(content);
  } catch (e) {
    console.error("AI normalize error", e);
    return null;
  }
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
    const { raw, status } = await callLyzr(locality);
    console.log("weather-agent lyzr status", status, "raw[0..400]:", raw.slice(0, 400));

    if (status !== 200) {
      if (hit) return ok({ ok: true, cached: true, stale: true, ageMs: Date.now() - hit.at, ...((hit.payload as object) || {}) });
      return ok({ ok: false, fallback: true, error: `agent_${status}`, data: null });
    }

    let parsed = tryParseJson(raw);
    if (!parsed || typeof parsed.temperature_c !== "number") {
      console.log("weather-agent: agent returned prose, normalizing via AI gateway");
      parsed = await normalizeWithAI(raw, locality);
    }

    if (!parsed) {
      if (hit) return ok({ ok: true, cached: true, stale: true, ageMs: Date.now() - hit.at, ...((hit.payload as object) || {}) });
      return ok({ ok: false, fallback: true, error: "unparseable_response", data: null, raw: raw.slice(0, 500) });
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
