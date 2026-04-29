const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const LYZR_AGENT_ID = "69d51cf25086335c9785c815";
const LYZR_INFERENCE_URL = "https://agent-prod.studio.lyzr.ai/v3/inference/chat/";
const LYZR_WEBHOOK_URL = "https://scheduler.studio.lyzr.ai/webhook-trigger/69f0df26e35ffb1f44ac41a9";
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

async function callLyzrInference(locality: string): Promise<string | null> {
  const LYZR_API_KEY = Deno.env.get("LYZR_API_KEY");
  if (!LYZR_API_KEY) return null;
  try {
    const prompt = `Live crop market demand snapshot for "${locality}", India. Strict JSON only:
{"region":"${locality}","high_demand":[{"crop":"","trend":"up","price_inr_per_quintal":0,"note":""}],"medium_demand":[{"crop":"","trend":"flat","price_inr_per_quintal":0,"note":""}],"low_demand":[{"crop":"","trend":"down","price_inr_per_quintal":0,"note":""}],"insight":""}`;
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
      console.warn("market-agent: Lyzr inference returned", res.status);
      return null;
    }
    const j = await res.json().catch(() => ({}));
    return String(j?.response ?? "") || null;
  } catch (e) {
    console.warn("market-agent: Lyzr inference threw", e);
    return null;
  }
}

async function triggerLyzrWebhook(locality: string) {
  try {
    await fetch(LYZR_WEBHOOK_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ locality }),
    });
  } catch (_) { /* best effort */ }
}

async function generateMarket(locality: string, lyzrHint: string | null): Promise<any | null> {
  const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
  if (!LOVABLE_API_KEY) return null;
  const sys = "You are an Indian agricultural mandi market analyst. Output ONLY one JSON object matching the schema. Use realistic current INR/quintal mandi prices for the given region. Use real Indian crop names. If hint text from another agent contains crop names or prices, prefer them.";
  const user = `Region: ${locality}, India.
Hint from agent (may be empty/prose):
${lyzrHint || "(none)"}

Return JSON exactly:
{"region":"${locality}","high_demand":[{"crop":"","trend":"up","price_inr_per_quintal":0,"note":"short reason"}],"medium_demand":[{"crop":"","trend":"flat","price_inr_per_quintal":0,"note":"short reason"}],"low_demand":[{"crop":"","trend":"down","price_inr_per_quintal":0,"note":"short reason"}],"insight":"1-2 sentence market opportunity insight"}
Rules: 2-4 crops per category. trend ∈ up|flat|down. Use real crop names: Cotton, Paddy, Maize, Chilli, Groundnut, Turmeric, Tomato, Onion, Soybean, Tur dal, Sugarcane, Banana, Sunflower, etc.`;
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
      console.error("market-agent: AI gateway", res.status, await res.text());
      return null;
    }
    const j = await res.json();
    return tryParseJson(j?.choices?.[0]?.message?.content ?? "");
  } catch (e) {
    console.error("market-agent: AI gateway threw", e);
    return null;
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  let locality = "Telangana";
  let force = false;
  try {
    const body = await req.json();
    if (body?.locality) locality = String(body.locality).slice(0, 80);
    force = !!body?.force;
  } catch (_) {}

  const cacheKey = `m:${locality.toLowerCase()}`;
  const hit = cache.get(cacheKey);
  if (!force && hit && Date.now() - hit.at < TTL_MS) {
    return ok({ ok: true, cached: true, ageMs: Date.now() - hit.at, ...((hit.payload as object) || {}) });
  }

  if (force) triggerLyzrWebhook(locality);

  try {
    const lyzrHint = await callLyzrInference(locality);
    console.log("market-agent lyzr hint length:", lyzrHint?.length ?? 0);
    const parsed = await generateMarket(locality, lyzrHint);

    if (!parsed || !Array.isArray(parsed.high_demand)) {
      if (hit) return ok({ ok: true, cached: true, stale: true, ageMs: Date.now() - hit.at, ...((hit.payload as object) || {}) });
      return ok({ ok: false, fallback: true, error: "ai_generation_failed", data: null });
    }

    const payload = { data: parsed, source: lyzrHint ? "lyzr+ai" : "ai" };
    cache.set(cacheKey, { at: Date.now(), payload });
    return ok({ ok: true, cached: false, ...payload });
  } catch (err) {
    console.error("market-agent error:", err);
    if (hit) return ok({ ok: true, cached: true, stale: true, ageMs: Date.now() - hit.at, ...((hit.payload as object) || {}) });
    return ok({ ok: false, fallback: true, error: err instanceof Error ? err.message : "unknown", data: null });
  }
});
