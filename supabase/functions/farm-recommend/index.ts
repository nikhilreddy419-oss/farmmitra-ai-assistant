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
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
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
A short intro line, then a markdown **table** with columns (translate column names): Crop | Category | Why it fits | Expected Yield (per acre) | Approx. Market Price.
The table MUST contain 4–5 rows spanning at least 3 different categories (e.g. one Cereal, one Vegetable/Cash crop, one Pulse/Oilseed, optionally one Fruit/Spice). Show the category name in the Category column so the diversity is visible.

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

    const models = ["openai/gpt-5", "google/gemini-2.5-flash", "google/gemini-2.5-flash-lite"];
    let recommendation: string | null = null;
    let lastStatus = 0;

    for (const model of models) {
      try {
        const aiRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${LOVABLE_API_KEY}`,
          },
          body: JSON.stringify({
            model,
            messages: [
              {
                role: "system",
                content: `You are FarmMitra.Ai — an expert agricultural advisor for Indian farmers. Always reply in ${responseLanguage} only, in well-structured GitHub-flavored Markdown.`,
              },
              { role: "user", content: message },
            ],
          }),
        });
        const text = await aiRes.text();
        if (!aiRes.ok) {
          lastStatus = aiRes.status;
          console.error("AI gateway error:", model, aiRes.status, text.slice(0, 300));
          continue;
        }
        const parsed = JSON.parse(text);
        const content = parsed?.choices?.[0]?.message?.content;
        if (content && String(content).trim().length > 50) {
          recommendation = String(content);
          break;
        }
      } catch (e) {
        console.error("model call failed:", model, e);
      }
    }

    if (!recommendation) {
      console.warn("All AI models failed (last status " + lastStatus + ") — using offline plan");
      recommendation = offlinePlan({
        locality, areaAcres, soilType, waterAvailability, budget, rainfall, season, language,
      });
    }

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

// ---------- Deterministic fallback plan (used when AI gateway is unavailable) ----------
type PlanInput = {
  locality: string; areaAcres: string; soilType: string; waterAvailability: string;
  budget: string; rainfall: string; season: string; language?: string;
};

function offlinePlan(i: PlanInput): string {
  const lang = (i.language === "hi" || i.language === "te") ? i.language : "en";
  const acres = Math.max(0.1, Number(i.areaAcres) || 1);
  const budget = Math.max(0, Number(i.budget) || 0);
  const water = String(i.waterAvailability || "").toLowerCase();
  const rain = String(i.rainfall || "").toLowerCase();
  const season = String(i.season || "").toLowerCase();
  const lowWater = water.includes("low") || rain.includes("low");
  const highWater = water.includes("high") || rain.includes("high");

  type Crop = { en: string; hi: string; te: string; cat: number; yield: string; price: string };
  const C = (en: string, hi: string, te: string, cat: number, y: string, p: string): Crop =>
    ({ en, hi, te, cat, yield: y, price: p });

  const rabi = [
    C("Wheat", "गेहूँ", "గోధుమ", 0, "18-22 q", "₹2,300/q"),
    C("Chickpea", "चना", "శనగ", 1, "8-10 q", "₹5,600/q"),
    C("Mustard", "सरसों", "ఆవాలు", 2, "7-9 q", "₹5,400/q"),
    C("Onion", "प्याज़", "ఉల్లిపాయ", 4, "90-120 q", "₹1,600/q"),
    C("Coriander", "धनिया", "కొత్తిమీర", 6, "6-8 q", "₹7,000/q"),
  ];
  const kharif = [
    C("Rice (Paddy)", "धान", "వరి", 0, "22-26 q", "₹2,200/q"),
    C("Cotton", "कपास", "ప్రత్తి", 3, "8-10 q", "₹7,300/q"),
    C("Pigeon Pea", "अरहर", "కందులు", 1, "6-8 q", "₹7,500/q"),
    C("Chilli", "मिर्च", "మిరప", 4, "18-22 q", "₹12,000/q"),
    C("Turmeric", "हल्दी", "పసుపు", 6, "20-25 q", "₹9,000/q"),
  ];
  const summer = [
    C("Maize", "मक्का", "మొక్కజొన్న", 0, "20-24 q", "₹2,250/q"),
    C("Green Gram", "मूँग", "పెసలు", 1, "4-6 q", "₹8,200/q"),
    C("Groundnut", "मूँगफली", "వేరుశెనగ", 2, "10-12 q", "₹6,300/q"),
    C("Watermelon", "तरबूज़", "పుచ్చకాయ", 5, "150-200 q", "₹900/q"),
    C("Okra", "भिंडी", "బెండ", 4, "45-60 q", "₹2,400/q"),
  ];
  const dry = [
    C("Pearl Millet (Bajra)", "बाजरा", "సజ్జలు", 0, "8-10 q", "₹2,500/q"),
    C("Sorghum (Jowar)", "ज्वार", "జొన్న", 0, "9-11 q", "₹3,200/q"),
    C("Pigeon Pea", "अरहर", "కందులు", 1, "5-7 q", "₹7,500/q"),
    C("Castor", "अरंडी", "ఆముదం", 2, "7-9 q", "₹6,400/q"),
    C("Cluster Bean", "ग्वार", "గోరుచిక్కుడు", 4, "6-8 q", "₹5,000/q"),
  ];
  const wet = [
    C("Rice (Paddy)", "धान", "వరి", 0, "24-28 q", "₹2,200/q"),
    C("Sugarcane", "गन्ना", "చెరకు", 3, "350-420 q", "₹340/q"),
    C("Banana", "केला", "అరటి", 5, "300-350 q", "₹1,400/q"),
    C("Tomato", "टमाटर", "టమోటా", 4, "180-220 q", "₹1,500/q"),
    C("Black Gram", "उड़द", "మినుములు", 1, "5-7 q", "₹7,000/q"),
  ];

  let crops = kharif;
  if (season.includes("rabi") || season.includes("winter")) crops = rabi;
  else if (season.includes("zaid") || season.includes("summer")) crops = summer;
  if (lowWater) crops = dry;
  else if (highWater && budget >= 50000) crops = wet;

  const cats = {
    en: ["Cereal", "Pulse", "Oilseed", "Cash crop", "Vegetable", "Fruit", "Spice"],
    hi: ["अनाज", "दलहन", "तिलहन", "नकदी फसल", "सब्ज़ी", "फल", "मसाला"],
    te: ["ధాన్యం", "పప్పుధాన్యం", "నూనెగింజ", "వాణిజ్య పంట", "కూరగాయ", "పండు", "మసాలా"],
  }[lang];

  const perAcre = Math.round((budget / acres) || 0);
  const seedCost = Math.round(acres * 6000);
  const fertCost = Math.round(acres * 9000);
  const laborCost = Math.round(acres * 12000);
  const otherCost = Math.round(acres * 5000);
  const total = seedCost + fertCost + laborCost + otherCost;
  const profitLow = Math.round(total * 0.8);
  const profitHigh = Math.round(total * 1.6);
  const inr = (n: number) => "₹" + n.toLocaleString("en-IN");

  const t = {
    en: {
      title: `🌾 Farm Plan for ${i.locality}`,
      intro: `Based on **${acres} acres**, **${i.soilType}** soil, **${i.waterAvailability}** water, **${i.rainfall}** rainfall and a **${inr(budget)}** budget for the **${i.season}** season, here is a balanced crop plan.`,
      h1: "🌱 Recommended Crops", cols: ["Crop", "Category", "Why it fits", "Expected Yield (per acre)", "Approx. Market Price"],
      why: "Suited to your soil, water and season",
      h2: "💧 Water & Irrigation",
      w: lowWater
        ? ["Use drip irrigation or alternate-furrow watering to save 30-40% water.", "Mulch with crop residue to cut evaporation.", "Irrigate early morning or evening only.", "Build a farm pond / recharge pit to store rainwater."]
        : ["Schedule irrigation at critical stages: sowing, flowering and grain filling.", "Avoid waterlogging — keep field drains open during heavy rain.", "Drip/sprinkler gives better yield per litre than flood irrigation.", "Check soil moisture 5 cm deep before every irrigation."],
      h3: "🧪 Soil & Fertilizer Plan",
      f: ["Apply 2-3 tonnes of well-decomposed farmyard manure per acre before sowing.", "Get a soil test done; correct pH with gypsum (alkaline) or lime (acidic).", "Basal dose: DAP + potash at sowing; top-dress urea in 2 splits.", "Add biofertilizers (Rhizobium/Azospirillum) to cut chemical fertilizer use."],
      h4: "📅 Seasonal Calendar", ccols: ["Stage", "Timeline", "Action"],
      cal: [["Land preparation", "Week 1-2", "Ploughing, levelling, manure application"], ["Sowing", "Week 3", "Treated seed, correct spacing"], ["Vegetative growth", "Week 4-8", "First top-dressing, weeding, irrigation"], ["Flowering", "Week 9-12", "Second top-dressing, pest scouting"], ["Harvest", "Week 13-18", "Harvest at right moisture, grade and sell"]],
      h5: `💰 Cost vs Profit (for ${acres} acres)`, mcols: ["Item", "Estimated Cost (₹)", "Notes"],
      cost: [["Seed", seedCost, "Certified/treated seed"], ["Fertilizer & manure", fertCost, "Organic + chemical"], ["Labour & machinery", laborCost, "Ploughing to harvest"], ["Pesticide, irrigation & misc.", otherCost, "Includes contingency"]],
      totalRow: "Total", net: `**Estimated net profit: ${inr(profitLow)} – ${inr(profitHigh)}** across the season (market dependent).`,
      h6: "⚠️ Risks & Tips",
      risks: ["Do not put all land under one crop — split it across 2-3 of the crops above.", "Insure the crop under PMFBY before the cut-off date.", "Watch mandi rates weekly; stagger your selling instead of selling all at once.", "Scout for pests every 3-4 days; act early with neem-based sprays.", `Your budget works out to about ${inr(perAcre)} per acre — keep 10% aside as reserve.`],
      h7: "✅ Quick Summary",
      sum: `Grow a mix of ${crops.slice(0, 3).map((c) => c.en).join(", ")} on your ${acres} acres, invest around ${inr(total)}, and target a net profit of ${inr(profitLow)}–${inr(profitHigh)}. Start with land preparation and a soil test this week.`,
      offline: "_Note: generated using FarmMitra's built-in agronomy engine._",
    },
    hi: {
      title: `🌾 ${i.locality} के लिए खेती योजना`,
      intro: `**${acres} एकड़**, **${i.soilType}** मिट्टी, **${i.waterAvailability}** पानी, **${i.rainfall}** वर्षा और **${inr(budget)}** बजट (**${i.season}** मौसम) के आधार पर संतुलित फसल योजना।`,
      h1: "🌱 अनुशंसित फसलें", cols: ["फसल", "श्रेणी", "क्यों उपयुक्त", "अपेक्षित उपज (प्रति एकड़)", "अनुमानित बाज़ार मूल्य"],
      why: "आपकी मिट्टी, पानी और मौसम के अनुकूल",
      h2: "💧 जल और सिंचाई",
      w: lowWater
        ? ["ड्रिप सिंचाई अपनाएँ — 30-40% पानी की बचत होगी।", "फसल अवशेष से पलवार (मल्चिंग) करें।", "सिंचाई सुबह जल्दी या शाम को ही करें।", "वर्षा जल संचयन के लिए खेत तालाब बनाएँ।"]
        : ["बुवाई, फूल और दाना भरने की अवस्था पर सिंचाई ज़रूर करें।", "जलभराव से बचें — भारी वर्षा में नालियाँ खुली रखें।", "ड्रिप/फव्वारा सिंचाई से प्रति लीटर उपज अधिक मिलती है।", "हर सिंचाई से पहले 5 सेमी गहराई की नमी जाँचें।"],
      h3: "🧪 मिट्टी और उर्वरक योजना",
      f: ["बुवाई से पहले प्रति एकड़ 2-3 टन सड़ी गोबर खाद डालें।", "मिट्टी परीक्षण कराएँ; क्षारीय में जिप्सम, अम्लीय में चूना डालें।", "आधार मात्रा: डीएपी + पोटाश बुवाई पर; यूरिया दो बार में।", "जैव उर्वरक (राइज़ोबियम/एज़ोस्पिरिलम) से रासायनिक खाद घटाएँ।"],
      h4: "📅 मौसमी कैलेंडर", ccols: ["चरण", "समय-सीमा", "कार्य"],
      cal: [["खेत की तैयारी", "सप्ताह 1-2", "जुताई, समतलीकरण, खाद"], ["बुवाई", "सप्ताह 3", "उपचारित बीज, सही दूरी"], ["वानस्पतिक वृद्धि", "सप्ताह 4-8", "पहली टॉप-ड्रेसिंग, निराई, सिंचाई"], ["फूल अवस्था", "सप्ताह 9-12", "दूसरी टॉप-ड्रेसिंग, कीट निगरानी"], ["कटाई", "सप्ताह 13-18", "सही नमी पर कटाई, छँटाई और बिक्री"]],
      h5: `💰 लागत बनाम लाभ (${acres} एकड़ के लिए)`, mcols: ["मद", "अनुमानित लागत (₹)", "टिप्पणी"],
      cost: [["बीज", seedCost, "प्रमाणित/उपचारित बीज"], ["उर्वरक और खाद", fertCost, "जैविक + रासायनिक"], ["मज़दूरी और मशीन", laborCost, "जुताई से कटाई तक"], ["कीटनाशक, सिंचाई व अन्य", otherCost, "आकस्मिक खर्च सहित"]],
      totalRow: "कुल", net: `**अनुमानित शुद्ध लाभ: ${inr(profitLow)} – ${inr(profitHigh)}** (बाज़ार भाव पर निर्भर)।`,
      h6: "⚠️ जोखिम और सुझाव",
      risks: ["पूरी ज़मीन एक ही फसल में न लगाएँ — 2-3 फसलों में बाँटें।", "अंतिम तिथि से पहले पीएमएफबीवाई बीमा कराएँ।", "मंडी भाव साप्ताहिक देखें; एक साथ पूरी उपज न बेचें।", "हर 3-4 दिन में कीट निगरानी करें; नीम आधारित छिड़काव जल्दी करें।", `आपका बजट लगभग ${inr(perAcre)} प्रति एकड़ बैठता है — 10% आरक्षित रखें।`],
      h7: "✅ संक्षिप्त सारांश",
      sum: `${crops.slice(0, 3).map((c) => c.hi).join(", ")} का मिश्रण ${acres} एकड़ में लगाएँ, लगभग ${inr(total)} निवेश करें और ${inr(profitLow)}–${inr(profitHigh)} शुद्ध लाभ का लक्ष्य रखें। इस सप्ताह खेत की तैयारी और मिट्टी परीक्षण से शुरुआत करें।`,
      offline: "_सूचना: यह योजना FarmMitra के अंतर्निहित कृषि इंजन से बनाई गई है।_",
    },
    te: {
      title: `🌾 ${i.locality} కోసం సాగు ప్రణాళిక`,
      intro: `**${acres} ఎకరాలు**, **${i.soilType}** నేల, **${i.waterAvailability}** నీరు, **${i.rainfall}** వర్షపాతం, **${inr(budget)}** బడ్జెట్ (**${i.season}** సీజన్) ఆధారంగా సమతుల్య పంట ప్రణాళిక.`,
      h1: "🌱 సిఫారసు చేసిన పంటలు", cols: ["పంట", "వర్గం", "ఎందుకు సరిపోతుంది", "అంచనా దిగుబడి (ఎకరానికి)", "సుమారు మార్కెట్ ధర"],
      why: "మీ నేల, నీరు మరియు సీజన్‌కు అనుకూలం",
      h2: "💧 నీరు మరియు నీటిపారుదల",
      w: lowWater
        ? ["బిందు సేద్యం వాడండి — 30-40% నీరు ఆదా అవుతుంది.", "పంట అవశేషాలతో మల్చింగ్ చేయండి.", "ఉదయం లేదా సాయంత్రం మాత్రమే నీరు పెట్టండి.", "వర్షపు నీటి కోసం ఫారం పాండ్ నిర్మించండి."]
        : ["విత్తడం, పూత, గింజ నిండే దశల్లో తప్పక నీరు పెట్టండి.", "నీరు నిలవకుండా కాలువలు తెరిచి ఉంచండి.", "బిందు/స్ప్రింక్లర్ సేద్యంతో లీటరుకు దిగుబడి ఎక్కువ.", "ప్రతి తడికి ముందు 5 సెం.మీ. లోతు తేమ చూడండి."],
      h3: "🧪 నేల మరియు ఎరువుల ప్రణాళిక",
      f: ["విత్తే ముందు ఎకరానికి 2-3 టన్నుల పశువుల ఎరువు వేయండి.", "నేల పరీక్ష చేయించండి; క్షార నేలకు జిప్సం, ఆమ్ల నేలకు సున్నం.", "ఆధార మోతాదు: విత్తనప్పుడు డీఏపీ + పొటాష్; యూరియా రెండు దఫాలుగా.", "జీవ ఎరువులతో (రైజోబియం/అజోస్పిరిల్లం) రసాయన ఎరువులు తగ్గించండి."],
      h4: "📅 సీజనల్ క్యాలెండర్", ccols: ["దశ", "కాల వ్యవధి", "చర్య"],
      cal: [["భూమి తయారీ", "వారం 1-2", "దుక్కి, చదును, ఎరువు"], ["విత్తడం", "వారం 3", "శుద్ధి చేసిన విత్తనం, సరైన దూరం"], ["ఎదుగుదల", "వారం 4-8", "మొదటి టాప్-డ్రెస్సింగ్, కలుపు, నీరు"], ["పూత దశ", "వారం 9-12", "రెండో టాప్-డ్రెస్సింగ్, పురుగు పరిశీలన"], ["కోత", "వారం 13-18", "సరైన తేమలో కోత, గ్రేడింగ్, అమ్మకం"]],
      h5: `💰 ఖర్చు vs లాభం (${acres} ఎకరాలకు)`, mcols: ["వస్తువు", "అంచనా ఖర్చు (₹)", "గమనికలు"],
      cost: [["విత్తనం", seedCost, "ధృవీకరించిన విత్తనం"], ["ఎరువులు", fertCost, "సేంద్రియ + రసాయన"], ["కూలీ, యంత్రాలు", laborCost, "దుక్కి నుండి కోత వరకు"], ["పురుగుమందు, నీరు, ఇతర", otherCost, "అత్యవసర ఖర్చుతో సహా"]],
      totalRow: "మొత్తం", net: `**అంచనా నికర లాభం: ${inr(profitLow)} – ${inr(profitHigh)}** (మార్కెట్ ధరపై ఆధారపడి).`,
      h6: "⚠️ ప్రమాదాలు మరియు చిట్కాలు",
      risks: ["మొత్తం భూమిని ఒకే పంటకు వాడకండి — 2-3 పంటలుగా విభజించండి.", "గడువు లోపు పీఎంఎఫ్‌బీవై బీమా చేయించండి.", "వారానికోసారి మార్కెట్ ధరలు చూడండి; ఒకేసారి అమ్మకండి.", "ప్రతి 3-4 రోజులకు పురుగులు పరిశీలించండి; వేప ఆధారిత మందు త్వరగా వాడండి.", `మీ బడ్జెట్ ఎకరానికి సుమారు ${inr(perAcre)} — 10% రిజర్వ్‌గా ఉంచండి.`],
      h7: "✅ క్విక్ సారాంశం",
      sum: `${crops.slice(0, 3).map((c) => c.te).join(", ")} కలయికను ${acres} ఎకరాల్లో సాగు చేయండి, సుమారు ${inr(total)} పెట్టుబడితో ${inr(profitLow)}–${inr(profitHigh)} నికర లాభం లక్ష్యంగా పెట్టుకోండి. ఈ వారం భూమి తయారీ, నేల పరీక్షతో ప్రారంభించండి.`,
      offline: "_గమనిక: ఈ ప్రణాళిక FarmMitra అంతర్గత వ్యవసాయ ఇంజిన్ ద్వారా రూపొందించబడింది._",
    },
  }[lang];

  const name = (c: Crop) => (lang === "hi" ? c.hi : lang === "te" ? c.te : c.en);
  const row = (cells: (string | number)[]) => `| ${cells.join(" | ")} |`;
  const head = (cols: string[]) => `${row(cols)}\n|${cols.map(() => " --- ").join("|")}|`;

  return [
    `# ${t.title}`,
    "",
    t.intro,
    "",
    `## ${t.h1}`,
    head(t.cols),
    ...crops.map((c) => row([name(c), cats[c.cat], t.why, c.yield, c.price])),
    "",
    `## ${t.h2}`,
    ...t.w.map((x) => `- ${x}`),
    "",
    `## ${t.h3}`,
    ...t.f.map((x) => `- ${x}`),
    "",
    `## ${t.h4}`,
    head(t.ccols),
    ...t.cal.map((r) => row(r)),
    "",
    `## ${t.h5}`,
    head(t.mcols),
    ...t.cost.map(([a, b, c]) => row([a as string, inr(b as number), c as string])),
    row([`**${t.totalRow}**`, `**${inr(total)}**`, "—"]),
    "",
    t.net,
    "",
    `## ${t.h6}`,
    ...t.risks.map((x) => `- ${x}`),
    "",
    `## ${t.h7}`,
    t.sum,
    "",
    t.offline,
  ].join("\n");
}
