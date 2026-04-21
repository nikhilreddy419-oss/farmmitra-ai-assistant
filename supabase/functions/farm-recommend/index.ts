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
      language,
      userId,
    } = body ?? {};

    if (!locality || !areaAcres || !soilType || !waterAvailability || !budget || !rainfall || !season) {
      return new Response(
        JSON.stringify({ error: "Missing required farm input fields." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const langMap: Record<string, string> = {
      en: "English",
      hi: "Hindi (हिन्दी)",
      te: "Telugu (తెలుగు)",
    };
    const responseLanguage = langMap[language] || "English";

    const langRules: Record<string, string> = {
      en: "",
      hi: `
TRANSLATION RULES (CRITICAL):
- Write EVERY word in pure Hindi (Devanagari script). Do NOT transliterate English words.
- Translate ALL crop names, farming terms, units and section names to native Hindi:
  • Tomato → टमाटर, Onion → प्याज़, Rice → चावल, Wheat → गेहूँ, Cotton → कपास, Maize → मक्का, Sugarcane → गन्ना, Groundnut → मूँगफली, Chilli → मिर्च, Brinjal → बैंगन, Marigold → गेंदा, Turmeric → हल्दी, Soybean → सोयाबीन, Pulses → दालें
  • Crop → फसल, Yield → उपज, Market Price → बाज़ार मूल्य, Cost → लागत, Profit → लाभ, Notes → टिप्पणी, Stage → चरण, Timeline → समय-सीमा, Action → कार्य, Item → मद
  • Irrigation → सिंचाई, Drip irrigation → ड्रिप सिंचाई, Sprinkler → फव्वारा सिंचाई, Fertilizer → उर्वरक, Compost → खाद, Manure → गोबर खाद, Pesticide → कीटनाशक, Soil → मिट्टी, Seed → बीज, Sowing → बुवाई, Harvest → कटाई
  • Acre → एकड़, per acre → प्रति एकड़, Quintal → क्विंटल, Kilogram → किलोग्राम, Liter → लीटर, Month → माह, Week → सप्ताह, Day → दिन
  • Summer → ग्रीष्म, Winter → शीत, Monsoon → मानसून, Kharif → खरीफ, Rabi → रबी, Zaid → ज़ायद
- Keep ONLY: numbers (1, 2, 50000), the rupee symbol (₹), and emojis as-is.
- If a brand-name fertilizer or pesticide has no Hindi name, write it in Devanagari spelling (e.g. यूरिया, डीएपी).
- Section headings must also be in Hindi (e.g. "🌱 अनुशंसित फसलें", "💧 जल और सिंचाई", "🧪 मिट्टी और उर्वरक योजना", "📅 मौसमी कैलेंडर", "💰 लागत बनाम लाभ", "⚠️ जोखिम और सुझाव", "✅ संक्षिप्त सारांश").`,
      te: `
TRANSLATION RULES (CRITICAL):
- Write EVERY word in pure Telugu (తెలుగు script). Do NOT transliterate English words into Telugu letters.
- Translate ALL crop names, farming terms, units and section names to native Telugu:
  • Tomato → టమోటా, Onion → ఉల్లిపాయ, Rice/Paddy → వరి, Wheat → గోధుమ, Cotton → ప్రత్తి, Maize → మొక్కజొన్న, Sugarcane → చెరకు, Groundnut → వేరుశెనగ, Chilli → మిరప, Brinjal → వంకాయ, Marigold → బంతిపూవు, Turmeric → పసుపు, Soybean → సోయాబీన్, Pulses → పప్పుధాన్యాలు
  • Crop → పంట, Yield → దిగుబడి, Market Price → మార్కెట్ ధర, Cost → ఖర్చు, Profit → లాభం, Notes → గమనికలు, Stage → దశ, Timeline → కాల వ్యవధి, Action → చర్య, Item → వస్తువు
  • Irrigation → నీటిపారుదల, Drip irrigation → బిందు సేద్యం, Sprinkler → స్ప్రింక్లర్ నీటిపారుదల, Fertilizer → ఎరువు, Compost → కంపోస్టు, Manure → పశువుల ఎరువు, Pesticide → పురుగుమందు, Soil → నేల, Seed → విత్తనం, Sowing → విత్తడం, Harvest → కోత
  • Acre → ఎకరం, per acre → ఎకరానికి, Quintal → క్వింటాల్, Kilogram → కిలోగ్రాము, Liter → లీటరు, Month → నెల, Week → వారం, Day → రోజు
  • Summer → వేసవి, Winter → శీతాకాలం, Monsoon → వర్షాకాలం, Kharif → ఖరీఫ్, Rabi → రబీ, Zaid → జైద్
- Keep ONLY: numbers (1, 2, 50000), the rupee symbol (₹), and emojis as-is.
- If a brand-name fertilizer or pesticide has no Telugu name, write it in Telugu script (e.g. యూరియా, డీఏపీ).
- Section headings must also be in Telugu (e.g. "🌱 సిఫారసు చేసిన పంటలు", "💧 నీరు మరియు నీటిపారుదల", "🧪 నేల మరియు ఎరువుల ప్రణాళిక", "📅 సీజనల్ క్యాలెండర్", "💰 ఖర్చు vs లాభం", "⚠️ ప్రమాదాలు మరియు చిట్కాలు", "✅ క్విక్ సారాంశం").`,
    };

    const message = `You are FarmMitra.Ai, a friendly expert agricultural advisor for Indian farmers.

IMPORTANT: Respond ENTIRELY in ${responseLanguage}. Every single word — including crop names, farming terms, fertilizer names, units (acre, quintal, kg), and section headings — must be the NATIVE word in ${responseLanguage}, NOT an English word written in the local script. Do NOT transliterate (e.g. do NOT write "टोमेटो" — use "टमाटर"; do NOT write "టొమాటో" — use "టమోటా").
${langRules[language] || ""}

CROP SELECTION RULES (VERY IMPORTANT — STRICTLY ENFORCE):
- You MUST recommend a BALANCED, DIVERSE mix of EXACTLY 4–5 crops drawn from AT LEAST 3 DIFFERENT categories below. Never recommend 3+ crops from the same category. Never recommend only millets and pulses.
- Categories to choose from:
  1. Cereals: Rice/Paddy, Wheat, Maize, Sorghum (Jowar), Pearl Millet (Bajra), Finger Millet (Ragi), Barley.
  2. Pulses: Chickpea (Chana), Pigeon Pea (Tur/Arhar), Black Gram (Urad), Green Gram (Moong), Lentil (Masoor).
  3. Oilseeds: Groundnut, Mustard, Soybean, Sunflower, Sesame, Castor.
  4. Cash crops: Sugarcane, Cotton, Tobacco, Jute.
  5. Vegetables: Tomato, Onion, Potato, Brinjal, Okra (Bhindi), Cabbage, Cauliflower, Chilli, Cucumber, Pumpkin, Bottle gourd, Spinach.
  6. Fruits: Banana, Mango, Papaya, Guava, Pomegranate, Watermelon, Grapes, Citrus.
  7. Spices & commercial: Turmeric, Ginger, Coriander, Cumin, Cardamom, Black pepper.
  8. Floriculture: Marigold, Rose, Jasmine.

MANDATORY MIX RULES:
- ALWAYS include AT LEAST 1 cereal (Rice / Wheat / Maize / Sorghum / Bajra / Ragi) appropriate to the season.
- ALWAYS include AT LEAST 1 vegetable OR 1 cash crop (Sugarcane / Cotton / Tomato / Onion / Chilli / Potato etc.) for income diversification.
- ALWAYS include AT LEAST 1 pulse OR oilseed for soil health and rotation.
- Optionally add 1 fruit / spice / floriculture crop if the inputs (water, budget, soil) support it.
- Millets (Bajra, Jowar, Ragi) should ONLY dominate when ALL of: low water + low rainfall + low budget + arid/sandy soil are true. Otherwise treat them as just one option among many.

INPUT-AWARE DEFAULTS:
- High water + good budget + fertile (loamy/alluvial/black) soil → lead with Rice, Sugarcane, Banana, Tomato/Onion, plus 1 pulse for rotation.
- Medium water + medium budget → Maize + Cotton/Soybean + a vegetable + a pulse.
- Low water + low rainfall + arid soil → Bajra/Jowar/Ragi + Pigeon Pea/Moong + Groundnut/Castor + drought-tolerant vegetable.
- Kharif season → Rice, Maize, Cotton, Soybean, Pigeon Pea, Groundnut, Bajra, Chilli, Turmeric.
- Rabi season → Wheat, Mustard, Chickpea, Barley, Potato, Onion, Tomato, Coriander.
- Zaid/Summer → Watermelon, Cucumber, Moong, Okra, leafy vegetables.

Before writing the table, internally check: "Do my 4–5 crops span at least 3 different categories AND include at least one cereal AND at least one vegetable/cash crop?" If not, REVISE before responding.

Farmer's profile:
- Locality: ${locality}
- Area size: ${areaAcres} acres
- Soil type: ${soilType}
- Water availability: ${waterAvailability}
- Budget: ₹${budget}
- Rainfall level: ${rainfall}
- Current season: ${season}

Respond in **well-structured GitHub-flavored Markdown** so it renders beautifully. Use this structure, but translate ALL section headings and contents into ${responseLanguage}:

# 🌾 [Title in ${responseLanguage}]

## 🌱 [Recommended Crops — in ${responseLanguage}]
A short intro line, then a markdown **table** with columns (translate column names): Crop | Why it fits | Expected Yield (per acre) | Approx. Market Price.
Include a DIVERSE mix of 3–5 crops from different categories (cereal, pulse/oilseed, vegetable or cash crop) appropriate to the inputs.

## 💧 [Water & Irrigation — in ${responseLanguage}]
- Bullet points with practical irrigation tips suited to the water level and season.

## 🧪 [Soil & Fertilizer Plan — in ${responseLanguage}]
- Bullet points: organic + chemical fertilizer schedule, soil prep tips.

## 📅 [Seasonal Calendar — in ${responseLanguage}]
A small table: Stage | Timeline | Action.

## 💰 [Cost vs Profit (for ${areaAcres} acres) — in ${responseLanguage}]
A markdown table: Item | Estimated Cost (₹) | Notes. End with a **bold** estimated net profit range.

## ⚠️ [Risks & Tips — in ${responseLanguage}]
- 3-5 concise risk-mitigation bullets.

## ✅ [Quick Summary — in ${responseLanguage}]
2-3 sentence recap a farmer can act on today.

Tone: warm, confident, practical. Use emojis only in headings. Use **bold** for key numbers. Do NOT wrap the whole reply in a code block. Remember: every word must be authentic ${responseLanguage} — no English transliterations.`;

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
