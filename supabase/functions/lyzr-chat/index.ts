// Lyzr Chat Agent proxy — persists session per user
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const AI_URL = "https://ai.gateway.lovable.dev/v1/chat/completions";
const MODEL = "openai/gpt-5";

function newSessionId() {
  return `chat-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

const LANG_NAME: Record<string, string> = {
  en: "English",
  hi: "Hindi (हिन्दी, Devanagari script)",
  te: "Telugu (తెలుగు script)",
};

function buildSystemPrompt(language: string) {
  const langName = LANG_NAME[language] || "English";
  return `You are FarmMitra.Ai — a friendly, expert agricultural assistant for Indian farmers.

Your expertise:
- Crops, soil, irrigation, fertilizers, pest & disease control
- Weather, seasons, sowing windows, harvest timing
- Government schemes (PM-KISAN, PMFBY, KCC, soil-health card, etc.)
- Mandi prices, market trends, post-harvest, storage, value-addition
- Organic farming, sustainable practices, livestock & dairy basics

Response rules:
- Reply ONLY in ${langName}. Use native script and native farming vocabulary (do not transliterate English words unnecessarily).
- Be concise, practical and farmer-friendly. Prefer short paragraphs and bullet points.
- Use Markdown (headings, bullets, **bold**, tables) when it helps clarity. Use ₹ for money.
- When the user asks for a recommendation, give specific numbers (kg/acre, litres, ₹, days) wherever reasonable.
- If the user's question is unclear, ask ONE short clarifying question.

Exception / out-of-scope handling:
- If the question is NOT related to farming, agriculture, rural livelihoods, weather, or markets, politely steer them back. Reply in ${langName} with one short line acknowledging you are a farming assistant and invite a farming question. Do not answer unrelated topics (politics, medical advice, code, celebrities, etc.).
- If the question is harmful, illegal, or unsafe (e.g. banned pesticides, dangerous self-medication for animals), refuse politely and suggest a safer alternative or recommend consulting the local Krishi Vigyan Kendra (KVK) / veterinarian.
- If you genuinely don't know, say so honestly in ${langName} and suggest who to consult (KVK, agri-extension officer, mandi).
- Never invent prices, scheme deadlines, or laws you are not sure about — say "please verify locally" instead.`;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      return new Response(JSON.stringify({ error: "AI is not configured. Please contact support." }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json().catch(() => ({}));
    const message: string = body?.message ?? "";
    const language: string = body?.language ?? "en";
    const history: Array<{ role: "user" | "assistant"; content: string }> = Array.isArray(body?.history)
      ? body.history
          .filter((m: any) => m && (m.role === "user" || m.role === "assistant") && typeof m.content === "string")
          .slice(-10) // keep last 10 turns
      : [];

    if (!message || typeof message !== "string" || !message.trim()) {
      return new Response(JSON.stringify({ error: "message is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Resolve user (optional) — anonymous users still get a session id, just not persisted
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
    const authHeader = req.headers.get("Authorization") ?? "";

    let userId: string | null = null;
    if (authHeader) {
      try {
        const userClient = createClient(SUPABASE_URL, ANON_KEY, {
          global: { headers: { Authorization: authHeader } },
        });
        const { data: u } = await userClient.auth.getUser();
        if (u?.user) userId = u.user.id;
      } catch (_) { /* ignore */ }
    }

    // Persistent session for logged-in users
    let sessionId: string | null = null;
    if (userId) {
      try {
        const admin = createClient(SUPABASE_URL, SERVICE_KEY);
        const { data: prof } = await admin
          .from("profiles")
          .select("chat_session_id")
          .eq("user_id", userId)
          .maybeSingle();
        sessionId = prof?.chat_session_id ?? null;
        if (!sessionId) {
          sessionId = newSessionId();
          await admin.from("profiles").update({ chat_session_id: sessionId }).eq("user_id", userId);
        }
      } catch (e) {
        console.warn("[chat] session persistence failed:", e);
        sessionId = newSessionId();
      }
    } else {
      sessionId = newSessionId();
    }

    // Call OpenAI GPT-5 via Lovable AI Gateway
    const aiResp = await fetch(AI_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: MODEL,
        messages: [
          { role: "system", content: buildSystemPrompt(language) },
          ...history,
          { role: "user", content: message },
        ],
      }),
    });

    if (!aiResp.ok) {
      const errText = await aiResp.text();
      console.error("[chat] AI gateway error", aiResp.status, errText);

      if (aiResp.status === 429) {
        return new Response(
          JSON.stringify({ error: "Too many requests right now. Please try again in a moment." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
      if (aiResp.status === 402) {
        return new Response(
          JSON.stringify({ error: "AI credits exhausted. Please add credits in Lovable Cloud." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
      return new Response(
        JSON.stringify({ error: "AI service is temporarily unavailable. Please try again." }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const data = await aiResp.json();
    const reply: string =
      data?.choices?.[0]?.message?.content?.trim() ||
      "I couldn't generate a response. Please rephrase your question.";

    return new Response(
      JSON.stringify({ reply, session_id: sessionId }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    console.error("[chat] error", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
