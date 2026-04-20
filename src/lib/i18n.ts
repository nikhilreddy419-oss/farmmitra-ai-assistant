export type Lang = "en" | "hi" | "te";

export const LANG_LABELS: Record<Lang, string> = {
  en: "English",
  hi: "हिन्दी",
  te: "తెలుగు",
};

export const LANG_NAME_FOR_AI: Record<Lang, string> = {
  en: "English",
  hi: "Hindi (हिन्दी)",
  te: "Telugu (తెలుగు)",
};

type Dict = {
  nav: { features: string; how: string; advice: string; start: string };
  hero: {
    badge: string;
    title1: string;
    title2: string;
    desc: string;
    cta: string;
    how: string;
    stats: { farmers: string; crops: string; guidance: string };
    sample: string;
    sampleTitle: string;
    soil: string;
    water: string;
    season: string;
    profit: string;
    score: string;
  };
  features: { title: string; items: { title: string; desc: string }[] };
  form: {
    eyebrow: string;
    title: string;
    desc: string;
    locality: string;
    localityPh: string;
    area: string;
    areaPh: string;
    soil: string;
    soilPh: string;
    water: string;
    waterPh: string;
    budget: string;
    budgetPh: string;
    rainfall: string;
    rainfallPh: string;
    season: string;
    seasonPh: string;
    language: string;
    submit: string;
    analyzing: string;
    reset: string;
    fillAll: string;
    ready: string;
    failed: string;
    resultLabel: string;
    soilOptions: Record<string, string>;
    waterOptions: Record<string, string>;
    rainfallOptions: Record<string, string>;
    seasonOptions: Record<string, string>;
  };
  footer: string;
};

export const t: Record<Lang, Dict> = {
  en: {
    nav: { features: "Features", how: "How it works", advice: "Get advice", start: "Start now" },
    hero: {
      badge: "AI-powered farming companion",
      title1: "Grow smarter.",
      title2: "Harvest better.",
      desc: "FarmMitra.Ai turns your land, soil, water and budget into a personalized crop & farming plan — crafted for Indian farmers.",
      cta: "Get my recommendation",
      how: "How it works",
      stats: { farmers: "Farmers helped", crops: "Crop varieties", guidance: "AI guidance" },
      sample: "Sample plan",
      sampleTitle: "🌾 Tomato + Marigold intercrop",
      soil: "Soil",
      water: "Water",
      season: "Season",
      profit: "Profit",
      score: "Suitability score · 82%",
    },
    features: {
      title: "Features",
      items: [
        { title: "Crop suitability", desc: "Best crops matched to your soil, climate and water profile." },
        { title: "Season-aware", desc: "Tailored to local rainfall and growing seasons." },
        { title: "Budget-conscious", desc: "Recommendations that respect your investment range." },
      ],
    },
    form: {
      eyebrow: "Smart Farm Advisor",
      title: "Tell us about your farm",
      desc: "Share a few details and FarmMitra.Ai will suggest the best crops and practices for you.",
      locality: "Locality",
      localityPh: "e.g. Pune, Maharashtra",
      area: "Area size (acres)",
      areaPh: "e.g. 2.5",
      soil: "Soil type",
      soilPh: "Select soil type",
      water: "Water availability",
      waterPh: "Select water availability",
      budget: "Budget (₹)",
      budgetPh: "e.g. 50000",
      rainfall: "Rainfall",
      rainfallPh: "Select rainfall level",
      season: "Season",
      seasonPh: "Select current season",
      language: "Language",
      submit: "Get Recommendations",
      analyzing: "Analyzing…",
      reset: "Reset",
      fillAll: "Please fill in all fields",
      ready: "Recommendations ready!",
      failed: "Failed to get recommendations",
      resultLabel: "AI Recommendation",
      soilOptions: {
        alluvial: "Alluvial",
        black: "Black (Regur)",
        red: "Red",
        laterite: "Laterite",
        sandy: "Sandy",
        clay: "Clay",
        loamy: "Loamy",
      },
      waterOptions: {
        low: "Low (rainfed only)",
        medium: "Medium (seasonal source)",
        high: "High (canal / borewell)",
      },
      rainfallOptions: { low: "Low", medium: "Medium", high: "High" },
      seasonOptions: {
        summer: "Summer",
        monsoon: "Monsoon (Kharif)",
        "post-monsoon": "Post-Monsoon",
        winter: "Winter (Rabi)",
        spring: "Spring (Zaid)",
      },
    },
    footer: "Cultivating smarter farms.",
  },
  hi: {
    nav: { features: "विशेषताएँ", how: "यह कैसे काम करता है", advice: "सलाह लें", start: "अभी शुरू करें" },
    hero: {
      badge: "AI-संचालित कृषि साथी",
      title1: "समझदारी से उगाएँ।",
      title2: "बेहतर फसल पाएँ।",
      desc: "FarmMitra.Ai आपकी ज़मीन, मिट्टी, पानी और बजट को एक व्यक्तिगत फसल और खेती योजना में बदलता है — भारतीय किसानों के लिए।",
      cta: "मेरी सिफ़ारिश पाएँ",
      how: "यह कैसे काम करता है",
      stats: { farmers: "किसानों की मदद", crops: "फसल किस्में", guidance: "AI मार्गदर्शन" },
      sample: "नमूना योजना",
      sampleTitle: "🌾 टमाटर + गेंदा अंतर-फसल",
      soil: "मिट्टी",
      water: "पानी",
      season: "मौसम",
      profit: "लाभ",
      score: "उपयुक्तता स्कोर · 82%",
    },
    features: {
      title: "विशेषताएँ",
      items: [
        { title: "फसल उपयुक्तता", desc: "आपकी मिट्टी, जलवायु और पानी के अनुसार सर्वोत्तम फसलें।" },
        { title: "मौसम के अनुकूल", desc: "स्थानीय वर्षा और बढ़ते मौसम के अनुसार।" },
        { title: "बजट-अनुकूल", desc: "आपके निवेश के अनुसार सिफ़ारिशें।" },
      ],
    },
    form: {
      eyebrow: "स्मार्ट फार्म सलाहकार",
      title: "अपने खेत के बारे में बताएँ",
      desc: "कुछ विवरण साझा करें और FarmMitra.Ai आपको सर्वोत्तम फसल और विधियाँ सुझाएगा।",
      locality: "क्षेत्र",
      localityPh: "जैसे पुणे, महाराष्ट्र",
      area: "क्षेत्रफल (एकड़)",
      areaPh: "जैसे 2.5",
      soil: "मिट्टी का प्रकार",
      soilPh: "मिट्टी चुनें",
      water: "पानी की उपलब्धता",
      waterPh: "पानी की उपलब्धता चुनें",
      budget: "बजट (₹)",
      budgetPh: "जैसे 50000",
      rainfall: "वर्षा",
      rainfallPh: "वर्षा स्तर चुनें",
      season: "मौसम",
      seasonPh: "वर्तमान मौसम चुनें",
      language: "भाषा",
      submit: "सिफ़ारिशें पाएँ",
      analyzing: "विश्लेषण हो रहा है…",
      reset: "रीसेट",
      fillAll: "कृपया सभी फ़ील्ड भरें",
      ready: "सिफ़ारिशें तैयार हैं!",
      failed: "सिफ़ारिशें प्राप्त करने में विफल",
      resultLabel: "AI सिफ़ारिश",
      soilOptions: {
        alluvial: "जलोढ़",
        black: "काली (रेगुर)",
        red: "लाल",
        laterite: "लैटेराइट",
        sandy: "रेतीली",
        clay: "चिकनी",
        loamy: "दोमट",
      },
      waterOptions: {
        low: "कम (केवल वर्षा आधारित)",
        medium: "मध्यम (मौसमी स्रोत)",
        high: "अधिक (नहर / बोरवेल)",
      },
      rainfallOptions: { low: "कम", medium: "मध्यम", high: "अधिक" },
      seasonOptions: {
        summer: "ग्रीष्म",
        monsoon: "मानसून (खरीफ)",
        "post-monsoon": "मानसून के बाद",
        winter: "शीत (रबी)",
        spring: "वसंत (ज़ायद)",
      },
    },
    footer: "होशियार खेती की ओर।",
  },
  te: {
    nav: { features: "ఫీచర్లు", how: "ఎలా పనిచేస్తుంది", advice: "సలహా పొందండి", start: "ఇప్పుడే ప్రారంభించండి" },
    hero: {
      badge: "AI ఆధారిత వ్యవసాయ సహచరుడు",
      title1: "తెలివిగా పండించండి.",
      title2: "మంచి పంట పొందండి.",
      desc: "FarmMitra.Ai మీ భూమి, నేల, నీరు మరియు బడ్జెట్‌ను వ్యక్తిగత పంట & వ్యవసాయ ప్రణాళికగా మారుస్తుంది — భారతీయ రైతుల కోసం.",
      cta: "నా సిఫారసు పొందండి",
      how: "ఎలా పనిచేస్తుంది",
      stats: { farmers: "సహాయం పొందిన రైతులు", crops: "పంట రకాలు", guidance: "AI మార్గదర్శకత్వం" },
      sample: "నమూనా ప్రణాళిక",
      sampleTitle: "🌾 టమోటా + బంతిపూవు అంతర పంట",
      soil: "నేల",
      water: "నీరు",
      season: "సీజన్",
      profit: "లాభం",
      score: "అనుకూలత స్కోర్ · 82%",
    },
    features: {
      title: "ఫీచర్లు",
      items: [
        { title: "పంట అనుకూలత", desc: "మీ నేల, వాతావరణం మరియు నీటికి తగిన ఉత్తమ పంటలు." },
        { title: "సీజన్‌కు తగినట్లు", desc: "స్థానిక వర్షపాతం మరియు పంట సీజన్‌లకు అనుగుణంగా." },
        { title: "బడ్జెట్ స్నేహపూర్వకం", desc: "మీ పెట్టుబడి పరిధికి తగిన సిఫారసులు." },
      ],
    },
    form: {
      eyebrow: "స్మార్ట్ ఫామ్ సలహాదారు",
      title: "మీ పొలం గురించి చెప్పండి",
      desc: "కొన్ని వివరాలు పంచుకోండి, FarmMitra.Ai మీకు ఉత్తమ పంటలు & పద్ధతులను సూచిస్తుంది.",
      locality: "ప్రాంతం",
      localityPh: "ఉదా. హైదరాబాద్, తెలంగాణ",
      area: "విస్తీర్ణం (ఎకరాలు)",
      areaPh: "ఉదా. 2.5",
      soil: "నేల రకం",
      soilPh: "నేలను ఎంచుకోండి",
      water: "నీటి లభ్యత",
      waterPh: "నీటి లభ్యతను ఎంచుకోండి",
      budget: "బడ్జెట్ (₹)",
      budgetPh: "ఉదా. 50000",
      rainfall: "వర్షపాతం",
      rainfallPh: "వర్షపాత స్థాయిని ఎంచుకోండి",
      season: "సీజన్",
      seasonPh: "ప్రస్తుత సీజన్‌ను ఎంచుకోండి",
      language: "భాష",
      submit: "సిఫారసులు పొందండి",
      analyzing: "విశ్లేషిస్తోంది…",
      reset: "రీసెట్",
      fillAll: "దయచేసి అన్ని ఫీల్డ్‌లను నింపండి",
      ready: "సిఫారసులు సిద్ధంగా ఉన్నాయి!",
      failed: "సిఫారసులు పొందడంలో విఫలమైంది",
      resultLabel: "AI సిఫారసు",
      soilOptions: {
        alluvial: "ఒండ్రు నేల",
        black: "నల్ల నేల (రేగుర్)",
        red: "ఎర్ర నేల",
        laterite: "లేటరైట్",
        sandy: "ఇసుక నేల",
        clay: "బంక నేల",
        loamy: "లోమీ",
      },
      waterOptions: {
        low: "తక్కువ (వర్షాధారం మాత్రమే)",
        medium: "మధ్యస్థం (సీజనల్ వనరు)",
        high: "ఎక్కువ (కాలువ / బోరు)",
      },
      rainfallOptions: { low: "తక్కువ", medium: "మధ్యస్థం", high: "ఎక్కువ" },
      seasonOptions: {
        summer: "వేసవి",
        monsoon: "వర్షాకాలం (ఖరీఫ్)",
        "post-monsoon": "వర్షాకాలం తర్వాత",
        winter: "శీతాకాలం (రబీ)",
        spring: "వసంతం (జైద్)",
      },
    },
    footer: "తెలివైన వ్యవసాయం వైపు.",
  },
};
