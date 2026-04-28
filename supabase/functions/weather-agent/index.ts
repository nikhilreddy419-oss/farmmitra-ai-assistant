const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const AGENT_ID = "69d512f45a03069870a516ee";
const LYZR_URL = "https://agent-prod.studio.lyzr.ai/v3/inference/chat/";

function extractJson(text: string): any | null {
  if (!text) return null;
  // try fenced
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
    const place = (locality || "Hyderabad").toString().slice(0, 80);

    const prompt = `Give the LIVE current weather and short farming advisory for "${place}", India.
Reply ONLY with strict JSON (no prose, no markdown fences) using EXACTLY this shape:
{
  "location": "${place}",
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
    console.error("weather-agent error:", err);
    return new Response(JSON.stringify({ error: err instanceof Error ? err.message : "Unknown" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
