const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

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

// Deterministic seasonal baseline so the dashboard always shows useful data
// even when AI generation is unavailable. Prices are indicative INR/quintal.
function baselineMarket(locality: string) {
  const m = new Date().getMonth(); // 0-11
  const season = m >= 5 && m <= 9 ? "kharif" : m >= 10 || m <= 1 ? "rabi" : "summer";

  const seed = [...locality.toLowerCase()].reduce((a, c) => a + c.charCodeAt(0), 0);
  const jitter = (base: number, pct = 0.06) => {
    const f = ((seed % 13) / 13 - 0.5) * 2 * pct;
    return Math.round((base * (1 + f)) / 10) * 10;
  };

  const sets: Record<string, any> = {
    kharif: {
      high: [
        { crop: "Cotton", price: 7400, note: "Strong ginning mill demand" },
        { crop: "Maize", price: 2300, note: "Poultry feed offtake rising" },
        { crop: "Soybean", price: 4700, note: "Crushers buying steadily" },
      ],
      medium: [
        { crop: "Paddy", price: 2300, note: "Steady MSP-linked procurement" },
        { crop: "Tur dal", price: 8200, note: "Balanced arrivals" },
        { crop: "Groundnut", price: 6300, note: "Oil mills at normal pace" },
      ],
      low: [
        { crop: "Tomato", price: 1200, note: "Heavy arrivals pressuring rates" },
        { crop: "Onion", price: 1500, note: "Stored stock still in market" },
      ],
      insight: "Kharif fibre and feed crops are commanding the best margins; avoid glut-prone vegetables this month.",
    },
    rabi: {
      high: [
        { crop: "Chilli", price: 16500, note: "Export enquiries firm" },
        { crop: "Turmeric", price: 14200, note: "Low carry-over stocks" },
        { crop: "Wheat", price: 2600, note: "Flour mills restocking" },
      ],
      medium: [
        { crop: "Bengal gram", price: 5800, note: "Stable dal mill demand" },
        { crop: "Sunflower", price: 6600, note: "Edible oil demand normal" },
        { crop: "Sugarcane", price: 350, note: "Mill contracts fixed" },
      ],
      low: [
        { crop: "Potato", price: 1100, note: "Cold store releases weighing on price" },
        { crop: "Cabbage", price: 800, note: "Peak winter supply" },
      ],
      insight: "Spice crops are the standout rabi earners; cereals stay dependable while winter vegetables stay oversupplied.",
    },
    summer: {
      high: [
        { crop: "Watermelon", price: 1400, note: "Peak summer consumption" },
        { crop: "Green gram", price: 8100, note: "Short summer crop, tight supply" },
        { crop: "Banana", price: 2200, note: "Festival and export demand" },
      ],
      medium: [
        { crop: "Maize", price: 2250, note: "Feed demand steady" },
        { crop: "Groundnut", price: 6200, note: "Regular oil mill buying" },
        { crop: "Paddy", price: 2280, note: "Rabi harvest arrivals" },
      ],
      low: [
        { crop: "Tomato", price: 1000, note: "Summer glut in nearby mandis" },
        { crop: "Onion", price: 1400, note: "Large stored volumes" },
      ],
      insight: "Short-duration summer crops and fruit are paying best; hold back on tomato and onion plantings.",
    },
  };

  const s = sets[season];
  const map = (arr: any[], trend: string) =>
    arr.map((x) => ({ crop: x.crop, trend, price_inr_per_quintal: jitter(x.price), note: x.note }));

  return {
    region: locality,
    high_demand: map(s.high, "up"),
    medium_demand: map(s.medium, "flat"),
    low_demand: map(s.low, "down"),
    insight: s.insight,
  };
}

async function generateMarket(locality: string): Promise<any | null> {
  const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
  if (!LOVABLE_API_KEY) return null;
  const sys = "You are an Indian agricultural mandi market analyst. Output ONLY one JSON object matching the schema. Use realistic current INR/quintal mandi prices for the given region and current season.";
  const user = `Region: ${locality}, India. Today: ${new Date().toISOString().slice(0, 10)}.
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
      console.warn("market-agent: AI gateway", res.status, "- using baseline market data");
      return null;
    }
    const j = await res.json();
    return tryParseJson(j?.choices?.[0]?.message?.content ?? "");
  } catch (e) {
    console.warn("market-agent: AI gateway threw, using baseline", e);
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

  try {
    const parsed = await generateMarket(locality);
    const usable = parsed && Array.isArray(parsed.high_demand) && parsed.high_demand.length > 0;
    const data = usable ? parsed : baselineMarket(locality);
    const payload = { data, source: usable ? "ai" : "seasonal-baseline" };
    cache.set(cacheKey, { at: Date.now(), payload });
    return ok({ ok: true, cached: false, ...payload });
  } catch (err) {
    console.error("market-agent error:", err);
    const payload = { data: baselineMarket(locality), source: "seasonal-baseline" };
    return ok({ ok: true, cached: false, ...payload });
  }
});
