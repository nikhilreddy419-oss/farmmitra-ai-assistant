import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Cloud, CloudRain, Sun, Wind, Droplets, TrendingUp, TrendingDown, Minus, RefreshCw, MapPin, Leaf, AlertTriangle, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type WeatherData = {
  location: string;
  condition: string;
  temperature_c: number;
  feels_like_c: number;
  humidity_pct: number;
  wind_kmh: number;
  rain_chance_pct: number;
  uv_index: number;
  advisory: string;
  forecast?: Array<{ day: string; condition: string; min_c: number; max_c: number }>;
};

type CropDemand = { crop: string; trend: "up" | "flat" | "down"; price_inr_per_quintal: number; note: string };
type MarketData = {
  region: string;
  high_demand: CropDemand[];
  medium_demand: CropDemand[];
  low_demand: CropDemand[];
  insight: string;
};

const conditionIcon = (c?: string) => {
  const t = (c || "").toLowerCase();
  if (t.includes("rain") || t.includes("shower") || t.includes("drizzle")) return CloudRain;
  if (t.includes("cloud")) return Cloud;
  return Sun;
};

const trendIcon = (t: string) => (t === "up" ? TrendingUp : t === "down" ? TrendingDown : Minus);

export default function LiveDashboard({ locality = "Hyderabad" }: { locality?: string }) {
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [market, setMarket] = useState<MarketData | null>(null);
  const [loadingW, setLoadingW] = useState(true);
  const [loadingM, setLoadingM] = useState(true);
  const [errW, setErrW] = useState<string | null>(null);
  const [errM, setErrM] = useState<string | null>(null);

  const loadWeather = useCallback(async () => {
    setLoadingW(true); setErrW(null);
    try {
      const { data, error } = await supabase.functions.invoke("weather-agent", { body: { locality } });
      if (error) throw error;
      if (!data?.data) throw new Error("Agent returned no parseable data");
      setWeather(data.data);
    } catch (e: any) { setErrW(e.message || "Failed to load weather"); }
    finally { setLoadingW(false); }
  }, [locality]);

  const loadMarket = useCallback(async () => {
    setLoadingM(true); setErrM(null);
    try {
      const { data, error } = await supabase.functions.invoke("market-agent", { body: { locality } });
      if (error) throw error;
      if (!data?.data) throw new Error("Agent returned no parseable data");
      setMarket(data.data);
    } catch (e: any) { setErrM(e.message || "Failed to load market"); }
    finally { setLoadingM(false); }
  }, [locality]);

  useEffect(() => { loadWeather(); loadMarket(); }, [loadWeather, loadMarket]);

  const WIcon = conditionIcon(weather?.condition);

  return (
    <div className="space-y-6">
      {/* Pills */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="inline-flex items-center gap-2 rounded-full border border-border/60 bg-card/70 backdrop-blur-md px-4 py-2 shadow-soft">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full rounded-full bg-primary-glow opacity-75 animate-ping" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-primary" />
          </span>
          <WIcon className="h-4 w-4 text-primary" />
          <span className="text-sm font-medium text-foreground">
            {weather ? `${Math.round(weather.temperature_c)}°C · ${weather.condition}` : "Loading weather…"}
          </span>
        </div>
        <div className="inline-flex items-center gap-2 rounded-full border border-border/60 bg-card/70 backdrop-blur-md px-4 py-2 shadow-soft">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full rounded-full bg-accent opacity-75 animate-ping" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-accent" />
          </span>
          <Sparkles className="h-4 w-4 text-accent" />
          <span className="text-sm font-medium text-foreground">
            {market ? `${market.high_demand?.length || 0} crops trending up` : "Loading market…"}
          </span>
        </div>
        <div className="ml-auto inline-flex items-center gap-1 text-xs text-muted-foreground">
          <MapPin className="h-3.5 w-3.5" /> {locality}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-5">
        {/* Weather panel */}
        <div className="lg:col-span-2 relative overflow-hidden rounded-3xl border border-border/60 bg-gradient-to-br from-primary/95 via-primary to-primary-glow/90 text-primary-foreground shadow-elegant">
          <div className="absolute -top-16 -right-16 h-56 w-56 rounded-full bg-primary-foreground/10 blur-3xl" />
          <div className="absolute -bottom-20 -left-10 h-56 w-56 rounded-full bg-accent/30 blur-3xl" />
          <div className="relative p-6 space-y-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-semibold uppercase tracking-[0.2em] opacity-80">Live Weather</span>
                <span className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full rounded-full bg-primary-foreground opacity-75 animate-ping" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-primary-foreground" />
                </span>
              </div>
              <Button size="icon" variant="ghost" onClick={loadWeather} className="h-8 w-8 text-primary-foreground hover:bg-primary-foreground/10">
                <RefreshCw className={cn("h-4 w-4", loadingW && "animate-spin")} />
              </Button>
            </div>

            {errW ? (
              <div className="rounded-xl bg-destructive/20 border border-destructive/40 p-4 text-sm flex items-start gap-2">
                <AlertTriangle className="h-4 w-4 mt-0.5" /> <span>{errW}</span>
              </div>
            ) : !weather ? (
              <div className="space-y-3 animate-pulse">
                <div className="h-16 w-32 rounded-lg bg-primary-foreground/15" />
                <div className="h-4 w-40 rounded bg-primary-foreground/15" />
                <div className="grid grid-cols-3 gap-3">
                  {[1,2,3].map(i => <div key={i} className="h-16 rounded-xl bg-primary-foreground/10" />)}
                </div>
              </div>
            ) : (
              <>
                <div className="flex items-end gap-4">
                  <WIcon className="h-16 w-16 opacity-90" strokeWidth={1.5} />
                  <div>
                    <div className="font-display text-6xl font-extrabold leading-none tracking-tight">
                      {Math.round(weather.temperature_c)}°
                    </div>
                    <div className="text-sm opacity-90 mt-1">{weather.condition} · feels {Math.round(weather.feels_like_c)}°</div>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  {[
                    { I: Droplets, l: "Humidity", v: `${weather.humidity_pct}%` },
                    { I: CloudRain, l: "Rain", v: `${weather.rain_chance_pct}%` },
                    { I: Wind, l: "Wind", v: `${weather.wind_kmh} km/h` },
                  ].map(({ I, l, v }) => (
                    <div key={l} className="rounded-xl bg-primary-foreground/10 backdrop-blur-md ring-1 ring-primary-foreground/20 p-3">
                      <I className="h-4 w-4 opacity-80" />
                      <div className="mt-1 text-[11px] opacity-80">{l}</div>
                      <div className="text-base font-semibold">{v}</div>
                    </div>
                  ))}
                </div>

                {weather.forecast?.length ? (
                  <div className="grid grid-cols-3 gap-2">
                    {weather.forecast.slice(0, 3).map((f) => {
                      const FI = conditionIcon(f.condition);
                      return (
                        <div key={f.day} className="rounded-lg bg-primary-foreground/10 ring-1 ring-primary-foreground/15 p-2 text-center">
                          <div className="text-[10px] opacity-75 uppercase tracking-wider">{f.day}</div>
                          <FI className="h-4 w-4 mx-auto my-1 opacity-90" />
                          <div className="text-xs font-semibold">{Math.round(f.min_c)}° / {Math.round(f.max_c)}°</div>
                        </div>
                      );
                    })}
                  </div>
                ) : null}

                <div className="rounded-xl bg-primary-foreground/10 ring-1 ring-primary-foreground/20 p-3 flex items-start gap-2">
                  <Leaf className="h-4 w-4 mt-0.5 shrink-0" />
                  <p className="text-xs leading-relaxed opacity-95">{weather.advisory}</p>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Market panel */}
        <div className="lg:col-span-3 relative overflow-hidden rounded-3xl border border-border/60 bg-card/80 backdrop-blur-xl shadow-elegant">
          <div className="absolute -top-24 -right-24 h-64 w-64 rounded-full bg-accent/20 blur-3xl" />
          <div className="relative p-6 space-y-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">Live Market Demand</span>
                <span className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full rounded-full bg-primary-glow opacity-75 animate-ping" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-primary" />
                </span>
              </div>
              <Button size="icon" variant="ghost" onClick={loadMarket} className="h-8 w-8">
                <RefreshCw className={cn("h-4 w-4", loadingM && "animate-spin")} />
              </Button>
            </div>

            {errM ? (
              <div className="rounded-xl bg-destructive/10 border border-destructive/30 p-4 text-sm flex items-start gap-2 text-destructive">
                <AlertTriangle className="h-4 w-4 mt-0.5" /> <span>{errM}</span>
              </div>
            ) : !market ? (
              <div className="grid gap-3 sm:grid-cols-3 animate-pulse">
                {[1,2,3].map(i => <div key={i} className="h-40 rounded-2xl bg-muted" />)}
              </div>
            ) : (
              <>
                <div className="grid gap-3 sm:grid-cols-3">
                  <DemandColumn title="High Demand" tone="high" items={market.high_demand} />
                  <DemandColumn title="Medium Demand" tone="medium" items={market.medium_demand} />
                  <DemandColumn title="Low Demand" tone="low" items={market.low_demand} />
                </div>
                {market.insight && (
                  <div className="rounded-xl bg-secondary/60 border border-border/50 p-3 flex items-start gap-2">
                    <Sparkles className="h-4 w-4 mt-0.5 text-accent shrink-0" />
                    <p className="text-xs leading-relaxed text-foreground/90">{market.insight}</p>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function DemandColumn({ title, tone, items }: { title: string; tone: "high" | "medium" | "low"; items: CropDemand[] }) {
  const styles = {
    high: {
      wrap: "from-emerald-500/15 to-emerald-500/5 border-emerald-500/30",
      dot: "bg-emerald-500",
      chip: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30",
      label: "text-emerald-700 dark:text-emerald-300",
    },
    medium: {
      wrap: "from-amber-400/15 to-amber-400/5 border-amber-400/30",
      dot: "bg-amber-500",
      chip: "bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30",
      label: "text-amber-700 dark:text-amber-300",
    },
    low: {
      wrap: "from-rose-500/15 to-rose-500/5 border-rose-500/30",
      dot: "bg-rose-500",
      chip: "bg-rose-500/15 text-rose-700 dark:text-rose-300 border-rose-500/30",
      label: "text-rose-700 dark:text-rose-300",
    },
  }[tone];

  return (
    <div className={cn("rounded-2xl border bg-gradient-to-br p-4 transition-smooth hover:-translate-y-0.5 hover:shadow-soft", styles.wrap)}>
      <div className="flex items-center gap-2 mb-3">
        <span className={cn("relative flex h-2 w-2")}>
          <span className={cn("absolute inline-flex h-full w-full rounded-full opacity-75 animate-ping", styles.dot)} />
          <span className={cn("relative inline-flex h-2 w-2 rounded-full", styles.dot)} />
        </span>
        <h4 className={cn("text-xs font-bold uppercase tracking-wider", styles.label)}>{title}</h4>
      </div>
      {items?.length ? (
        <ul className="space-y-2">
          {items.map((it) => {
            const TI = trendIcon(it.trend);
            return (
              <li key={it.crop} className="rounded-xl bg-card/80 backdrop-blur ring-1 ring-border/60 p-3 transition-smooth hover:ring-foreground/20">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-semibold text-sm text-foreground truncate">{it.crop}</span>
                  <span className={cn("inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-semibold", styles.chip)}>
                    <TI className="h-3 w-3" />
                    {it.trend}
                  </span>
                </div>
                <div className="mt-1 flex items-center justify-between text-[11px] text-muted-foreground">
                  <span className="truncate pr-2">{it.note}</span>
                  <span className="font-mono font-semibold text-foreground/90 shrink-0">₹{it.price_inr_per_quintal?.toLocaleString("en-IN")}/q</span>
                </div>
              </li>
            );
          })}
        </ul>
      ) : (
        <p className="text-xs text-muted-foreground">No crops reported.</p>
      )}
    </div>
  );
}
