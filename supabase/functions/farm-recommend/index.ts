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
      userId,
    } = body ?? {};

    if (!locality || !areaAcres || !soilType || !waterAvailability || !budget || !rainfall) {
      return new Response(
        JSON.stringify({ error: "Missing required farm input fields." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const message = `I am a farmer seeking crop and farming recommendations.
- Locality: ${locality}
- Area size: ${areaAcres} acres
- Soil type: ${soilType}
- Water availability: ${waterAvailability}
- Budget: ₹${budget}
- Annual rainfall: ${rainfall} mm

Please suggest the most suitable crops, expected yield, water/fertilizer practices, and an estimated cost-vs-profit breakdown for my conditions. Keep it concise, practical, and structured.`;

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
