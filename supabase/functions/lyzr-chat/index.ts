// Lyzr Chat Agent proxy — persists session per user
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const LYZR_AGENT_ID = "69d227ac17b0bded0cb5983a";
const LYZR_URL = "https://agent-prod.studio.lyzr.ai/v3/inference/chat/";

function newSessionId() {
  return `${LYZR_AGENT_ID}-${Math.random().toString(36).slice(2, 14)}`;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const LYZR_API_KEY = Deno.env.get("LYZR_API_KEY");
    if (!LYZR_API_KEY) {
      return new Response(JSON.stringify({ error: "LYZR_API_KEY not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { message } = await req.json().catch(() => ({}));
    if (!message || typeof message !== "string" || !message.trim()) {
      return new Response(JSON.stringify({ error: "message is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const authHeader = req.headers.get("Authorization") ?? "";

    // Resolve user (optional — anonymous users get an ephemeral session)
    let userId: string | null = null;
    let userEmail = "anonymous@farmmitra.ai";
    if (authHeader) {
      const userClient = createClient(SUPABASE_URL, Deno.env.get("SUPABASE_ANON_KEY")!, {
        global: { headers: { Authorization: authHeader } },
      });
      const { data: u } = await userClient.auth.getUser();
      if (u?.user) {
        userId = u.user.id;
        userEmail = u.user.email ?? userEmail;
      }
    }

    const admin = createClient(SUPABASE_URL, SERVICE_KEY);

    // Load or create persistent session
    let sessionId: string | null = null;
    if (userId) {
      const { data: prof } = await admin
        .from("profiles")
        .select("chat_session_id")
        .eq("user_id", userId)
        .maybeSingle();
      sessionId = prof?.chat_session_id ?? null;
      if (!sessionId) {
        sessionId = newSessionId();
        await admin
          .from("profiles")
          .update({ chat_session_id: sessionId })
          .eq("user_id", userId);
      }
    } else {
      sessionId = newSessionId();
    }

    const lyzrResp = await fetch(LYZR_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": LYZR_API_KEY,
      },
      body: JSON.stringify({
        user_id: userEmail,
        agent_id: LYZR_AGENT_ID,
        session_id: sessionId,
        message,
      }),
    });

    const raw = await lyzrResp.text();
    console.log("[lyzr-chat]", lyzrResp.status, raw.slice(0, 500));

    if (!lyzrResp.ok) {
      return new Response(
        JSON.stringify({
          error: "Lyzr agent error",
          status: lyzrResp.status,
          detail: raw.slice(0, 500),
        }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    let parsed: any = {};
    try { parsed = JSON.parse(raw); } catch { /* ignore */ }
    const reply: string =
      parsed?.response ??
      parsed?.message ??
      parsed?.answer ??
      (typeof parsed === "string" ? parsed : raw);

    return new Response(
      JSON.stringify({ reply, session_id: sessionId }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    console.error("[lyzr-chat] error", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
