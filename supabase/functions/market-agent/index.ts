const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const AGENT_ID = "69d51cf25086335c9785c815";
const LYZR_URL = "https://agent-prod.studio.lyzr.ai/v3/inference/chat/";

function extractJson(text: string): any | null {
  if (!text) return null;
  const fence = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidates = [fence?.[1], text];
  for (const c of candidates) {
    if (!c) continue;
    const start = c.indexOf("{");
    const end = c.lastIndexOf("}");
    if (start === -1 || end === -1) continue;
    try {
      return JSON.parse(c.slice(start, end + 1));
    } catch (_) {}
  }
  return null;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const LYZR_API_KEY = Deno.env.get("LYZR_API_KEY");
    if (!LYZR_API_KEY) throw new Error("LYZR_API_KEY is not configured");

    const { locality } = await req.json().catch(() => ({}));
    const place = (locality || "Telangana").toString().slice(0, 80);

    const prompt = `Give the LIVE current crop market demand snapshot for "${place}", India.
Reply ONLY with strict JSON (no prose, no markdown fences) using EXACTLY this shape:
{
  "region": "${place}",
  "high_demand": [
    {"crop":"<English crop name>","trend":"up","price_inr_per_quintal":number,"note":"short reason"}
  ],
  "medium_demand": [
    {"crop":"<English crop name>","trend":"flat","price_inr_per_quintal":number,"note":"short reason"}
  ],
  "low_demand": [
    {"crop":"<English crop name>","trend":"down","price_inr_per_quintal":number,"note":"short reason"}
  ],
  "insight": "1-2 sentence market opportunity insight"
}
Rules:
- Use real, regionally-relevant Indian crop names (e.g. Cotton, Paddy, Maize, Chilli, Groundnut, Turmeric, Tomato, Onion, Soybean, Sugarcane, Banana, Tur dal, etc.).
- 2 to 4 crops per category. trend must be one of: "up","flat","down".
- price_inr_per_quintal must be a realistic current mandi price.
- Do NOT include any text outside the JSON object.`;

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
      console.error("Market agent error", lyzrRes.status, t);
      return new Response(JSON.stringify({ error: "agent_error", status: lyzrRes.status }), {
        status: 502,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await lyzrRes.json();
    const responseText: string = data?.response || "";
    const parsed = extractJson(responseText);

    return new Response(
      JSON.stringify({ ok: true, data: parsed, raw: responseText }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    console.error("market-agent error:", err);
    return new Response(JSON.stringify({ error: err instanceof Error ? err.message : "Unknown" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
