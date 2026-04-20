const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const LYZR_API_KEY = Deno.env.get("LYZR_API_KEY");
    if (!LYZR_API_KEY) {
      throw new Error("LYZR_API_KEY is not configured");
    }

    const body = await req.json();
    const {
      locality,
      areaAcres,
      soilType,
      waterAvailability,
      budget,
      rainfall,
      season,
      userId,
    } = body ?? {};

    if (!locality || !areaAcres || !soilType || !waterAvailability || !budget || !rainfall || !season) {
      return new Response(
        JSON.stringify({ error: "Missing required farm input fields." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const message = `You are FarmMitra.Ai, a friendly expert agricultural advisor for Indian farmers.

Farmer's profile:
- Locality: ${locality}
- Area size: ${areaAcres} acres
- Soil type: ${soilType}
- Water availability: ${waterAvailability}
- Budget: ₹${budget}
- Rainfall level: ${rainfall}
- Current season: ${season}

Respond in **well-structured GitHub-flavored Markdown** so it renders beautifully. Use this exact structure:

# 🌾 Your Personalized Farm Plan

## 🌱 Recommended Crops
A short intro line, then a markdown **table** with columns: Crop | Why it fits | Expected Yield (per acre) | Approx. Market Price.

## 💧 Water & Irrigation
- Bullet points with practical irrigation tips suited to the water level and season.

## 🧪 Soil & Fertilizer Plan
- Bullet points: organic + chemical fertilizer schedule, soil prep tips.

## 📅 Seasonal Calendar
A small table: Stage | Timeline | Action.

## 💰 Cost vs Profit (for ${areaAcres} acres)
A markdown table: Item | Estimated Cost (₹) | Notes. End with a **bold** estimated net profit range.

## ⚠️ Risks & Tips
- 3-5 concise risk-mitigation bullets.

## ✅ Quick Summary
2-3 sentence recap a farmer can act on today.

Keep tone warm, confident, and practical. Use emojis sparingly in headings only. Use **bold** for key numbers. Do NOT wrap the whole reply in a code block.`;

    const sessionId = `69e59daebf7ea7a61d8e5245-${crypto.randomUUID()}`;

    const lyzrRes = await fetch(
      "https://agent-prod.studio.lyzr.ai/v3/inference/chat/",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": LYZR_API_KEY,
        },
        body: JSON.stringify({
          user_id: userId || "25r21a6665@mlrit.ac.in",
          agent_id: "69e59daebf7ea7a61d8e5245",
          session_id: sessionId,
          message,
        }),
      },
    );

    const text = await lyzrRes.text();
    if (!lyzrRes.ok) {
      console.error("Lyzr error:", lyzrRes.status, text);
      return new Response(
        JSON.stringify({ error: `Lyzr API error [${lyzrRes.status}]: ${text}` }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    let parsed: any = {};
    try { parsed = JSON.parse(text); } catch { parsed = { response: text }; }

    const recommendation =
      parsed.response ??
      parsed.message ??
      parsed.output ??
      (typeof parsed === "string" ? parsed : JSON.stringify(parsed));

    return new Response(
      JSON.stringify({ recommendation }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    console.error("farm-recommend error:", err);
    const msg = err instanceof Error ? err.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: msg }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
