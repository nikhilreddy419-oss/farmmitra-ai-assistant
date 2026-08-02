const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const TTL_MS = 10 * 60 * 1000;

type Cached = { at: number; payload: unknown };
const cache = new Map<string, Cached>();

function ok(body: unknown) {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

// WMO weather codes -> human condition
function wmo(code: number): string {
  if (code === 0) return "Clear sky";
  if (code === 1) return "Mainly clear";
  if (code === 2) return "Partly cloudy";
  if (code === 3) return "Overcast";
  if (code === 45 || code === 48) return "Fog";
  if (code >= 51 && code <= 57) return "Drizzle";
  if (code >= 61 && code <= 67) return "Rain";
  if (code >= 71 && code <= 77) return "Snow";
  if (code >= 80 && code <= 82) return "Rain showers";
  if (code >= 85 && code <= 86) return "Snow showers";
  if (code >= 95) return "Thunderstorm";
  return "Cloudy";
}

function advisoryFor(cond: string, temp: number, rain: number, humidity: number, wind: number): string {
  const parts: string[] = [];
  if (rain >= 60) parts.push("High chance of rain — postpone spraying, harvesting and fertiliser application, and check field drainage.");
  else if (rain >= 30) parts.push("Scattered showers possible — plan irrigation and spraying for a dry window.");
  else parts.push("Mostly dry conditions — good window for spraying, weeding and harvesting.");
  if (temp >= 36) parts.push("Heat stress risk: irrigate early morning or late evening and mulch to hold soil moisture.");
  else if (temp <= 14) parts.push("Cool spell: protect nurseries and young seedlings overnight.");
  if (humidity >= 80) parts.push("High humidity raises fungal disease risk — scout for blight and mildew.");
  if (wind >= 25) parts.push("Windy — avoid pesticide spraying to prevent drift.");
  return parts.slice(0, 3).join(" ");
}

async function geocode(locality: string): Promise<{ lat: number; lon: number; name: string } | null> {
  try {
    const url = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(locality)}&count=1&language=en&format=json&country=IN`;
    const r = await fetch(url);
    if (!r.ok) return null;
    const j = await r.json();
    const hit = j?.results?.[0];
    if (!hit) return null;
    return { lat: hit.latitude, lon: hit.longitude, name: hit.name ?? locality };
  } catch (_) {
    return null;
  }
}

async function fetchWeather(locality: string): Promise<any | null> {
  const geo = (await geocode(locality)) ?? { lat: 17.385, lon: 78.4867, name: locality };
  const url =
    `https://api.open-meteo.com/v1/forecast?latitude=${geo.lat}&longitude=${geo.lon}` +
    `&current=temperature_2m,apparent_temperature,relative_humidity_2m,precipitation,weather_code,wind_speed_10m` +
    `&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max,uv_index_max` +
    `&timezone=auto&forecast_days=3`;
  const r = await fetch(url);
  if (!r.ok) return null;
  const j = await r.json();
  const c = j?.current;
  const d = j?.daily;
  if (!c || typeof c.temperature_2m !== "number") return null;

  const condition = wmo(Number(c.weather_code));
  const rainChance = Number(d?.precipitation_probability_max?.[0] ?? 0);
  const humidity = Math.round(Number(c.relative_humidity_2m ?? 0));
  const wind = Math.round(Number(c.wind_speed_10m ?? 0));
  const temp = Number(c.temperature_2m);

  const labels = ["Today", "Tomorrow", "Day 3"];
  const forecast = (d?.time ?? []).slice(0, 3).map((_: string, i: number) => ({
    day: labels[i] ?? `Day ${i + 1}`,
    condition: wmo(Number(d.weather_code?.[i])),
    min_c: Number(d.temperature_2m_min?.[i] ?? 0),
    max_c: Number(d.temperature_2m_max?.[i] ?? 0),
  }));

  return {
    location: locality,
    condition,
    temperature_c: temp,
    feels_like_c: Number(c.apparent_temperature ?? temp),
    humidity_pct: humidity,
    wind_kmh: wind,
    rain_chance_pct: rainChance,
    uv_index: Math.round(Number(d?.uv_index_max?.[0] ?? 0)),
    advisory: advisoryFor(condition, temp, rainChance, humidity, wind),
    forecast,
  };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  let locality = "Hyderabad";
  let force = false;
  try {
    const body = await req.json();
    if (body?.locality) locality = String(body.locality).slice(0, 80);
    force = !!body?.force;
  } catch (_) {}

  const cacheKey = `w:${locality.toLowerCase()}`;
  const hit = cache.get(cacheKey);
  if (!force && hit && Date.now() - hit.at < TTL_MS) {
    return ok({ ok: true, cached: true, ageMs: Date.now() - hit.at, ...((hit.payload as object) || {}) });
  }

  try {
    const data = await fetchWeather(locality);
    if (!data) {
      if (hit) return ok({ ok: true, cached: true, stale: true, ...((hit.payload as object) || {}) });
      return ok({ ok: false, fallback: true, error: "weather_unavailable", data: null });
    }
    const payload = { data, source: "open-meteo" };
    cache.set(cacheKey, { at: Date.now(), payload });
    return ok({ ok: true, cached: false, ...payload });
  } catch (err) {
    console.error("weather-agent error:", err);
    if (hit) return ok({ ok: true, cached: true, stale: true, ...((hit.payload as object) || {}) });
    return ok({ ok: false, fallback: true, error: err instanceof Error ? err.message : "unknown", data: null });
  }
});
