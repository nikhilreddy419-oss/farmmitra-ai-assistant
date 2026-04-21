import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Sprout, MapPin, Ruler, Layers, Droplets, Wallet, CloudRain, Loader2, CalendarDays, Sparkles, LocateFixed } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { useLanguage } from "@/contexts/LanguageContext";
import PdfDownloadButton from "@/components/PdfDownloadButton";
import { getSessionId } from "@/lib/session";
import { useAuth } from "@/contexts/AuthContext";

export type FarmInput = {
  locality: string;
  areaAcres: string;
  soilType: string;
  waterAvailability: string;
  budget: string;
  rainfall: string;
  season: string;
};

const initial: FarmInput = {
  locality: "",
  areaAcres: "",
  soilType: "",
  waterAvailability: "",
  budget: "",
  rainfall: "",
  season: "",
};

type Props = { onSaved?: () => void };

const FarmForm = ({ onSaved }: Props) => {
  const { tr, lang } = useLanguage();
  const { user } = useAuth();
  const [data, setData] = useState<FarmInput>(initial);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [locating, setLocating] = useState(false);

  const update = (k: keyof FarmInput, v: string) => setData((d) => ({ ...d, [k]: v }));

  const detectLocation = () => {
    if (!("geolocation" in navigator)) {
      toast.error("Geolocation is not supported on this device");
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      async ({ coords }) => {
        try {
          const { latitude, longitude } = coords;
          const acceptLang = lang === "hi" ? "hi" : lang === "te" ? "te" : "en";
          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=12&accept-language=${acceptLang}`,
            { headers: { Accept: "application/json" } }
          );
          if (!res.ok) throw new Error("Reverse geocoding failed");
          const json = await res.json();
          const a = json.address || {};
          const place = a.village || a.town || a.city || a.suburb || a.county || a.state_district || a.state || "";
          const region = a.state || a.country || "";
          const locality = [place, region].filter(Boolean).join(", ") || json.display_name || `${latitude.toFixed(3)}, ${longitude.toFixed(3)}`;
          update("locality", locality);
          toast.success("Location detected");
        } catch (err: any) {
          console.warn(err);
          toast.error(err?.message || "Could not detect location");
        } finally {
          setLocating(false);
        }
      },
      (err) => {
        setLocating(false);
        const msg =
          err.code === err.PERMISSION_DENIED ? "Location permission denied"
          : err.code === err.POSITION_UNAVAILABLE ? "Location unavailable"
          : "Could not get location";
        toast.error(msg);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!data.locality || !data.areaAcres || !data.soilType || !data.waterAvailability || !data.budget || !data.rainfall || !data.season) {
      toast.error(tr.form.fillAll);
      return;
    }
    setLoading(true);
    setResult(null);
    try {
      const { data: res, error } = await supabase.functions.invoke("farm-recommend", {
        body: { ...data, language: lang },
      });
      if (error) throw error;
      if ((res as any)?.error) throw new Error((res as any).error);
      const recommendation: string = (res as any)?.recommendation ?? "No recommendation returned.";
      setResult(recommendation);
      toast.success(tr.form.ready);

      // Save to history (best-effort, non-blocking for UX)
      try {
        const { error: insertErr } = await supabase.from("recommendations").insert({
          session_id: getSessionId(),
          user_id: user?.id ?? null,
          locality: data.locality,
          area_acres: data.areaAcres,
          soil_type: data.soilType,
          water_availability: data.waterAvailability,
          budget: data.budget,
          rainfall: data.rainfall,
          season: data.season,
          language: lang,
          recommendation,
        });
        if (insertErr) console.warn("save history failed:", insertErr);
        else onSaved?.();
      } catch (saveErr) {
        console.warn("save history failed:", saveErr);
      }
    } catch (err: any) {
      console.error(err);
      toast.error(err?.message || tr.form.failed);
      setResult(null);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card id="recommend" className="bg-gradient-card shadow-elegant border-border/60 backdrop-blur">
      <CardHeader className="space-y-2">
        <div className="flex items-center gap-2 text-primary">
          <Sprout className="h-5 w-5" />
          <span className="text-sm font-semibold uppercase tracking-wider">{tr.form.eyebrow}</span>
        </div>
        <CardTitle className="font-display text-3xl md:text-4xl text-foreground">
          {tr.form.title}
        </CardTitle>
        <CardDescription className="text-base">
          {tr.form.desc}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="grid gap-5 md:grid-cols-2">
          <Field icon={<MapPin className="h-4 w-4" />} label={tr.form.locality} htmlFor="locality">
            <div className="flex gap-2">
              <Input
                id="locality"
                placeholder={tr.form.localityPh}
                value={data.locality}
                onChange={(e) => update("locality", e.target.value)}
              />
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={detectLocation}
                disabled={locating}
                title="Use my location"
                aria-label="Use my location"
              >
                {locating ? <Loader2 className="h-4 w-4 animate-spin" /> : <LocateFixed className="h-4 w-4" />}
              </Button>
              <VoiceButton onTranscript={(t) => update("locality", t)} />
            </div>
          </Field>

          <Field icon={<Ruler className="h-4 w-4" />} label={tr.form.area} htmlFor="area">
            <div className="flex gap-2">
              <Input
                id="area"
                type="number"
                min="0"
                step="0.1"
                placeholder={tr.form.areaPh}
                value={data.areaAcres}
                onChange={(e) => update("areaAcres", e.target.value)}
              />
              <VoiceButton numeric onTranscript={(t) => update("areaAcres", t)} />
            </div>
          </Field>

          <Field icon={<Layers className="h-4 w-4" />} label={tr.form.soil} htmlFor="soil">
            <Select value={data.soilType} onValueChange={(v) => update("soilType", v)}>
              <SelectTrigger id="soil"><SelectValue placeholder={tr.form.soilPh} /></SelectTrigger>
              <SelectContent>
                {Object.entries(tr.form.soilOptions).map(([k, v]) => (
                  <SelectItem key={k} value={k}>{v}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>

          <Field icon={<Droplets className="h-4 w-4" />} label={tr.form.water} htmlFor="water">
            <Select value={data.waterAvailability} onValueChange={(v) => update("waterAvailability", v)}>
              <SelectTrigger id="water"><SelectValue placeholder={tr.form.waterPh} /></SelectTrigger>
              <SelectContent>
                {Object.entries(tr.form.waterOptions).map(([k, v]) => (
                  <SelectItem key={k} value={k}>{v}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>

          <Field icon={<Wallet className="h-4 w-4" />} label={tr.form.budget} htmlFor="budget">
            <div className="flex gap-2">
              <Input
                id="budget"
                type="number"
                min="0"
                placeholder={tr.form.budgetPh}
                value={data.budget}
                onChange={(e) => update("budget", e.target.value)}
              />
              <VoiceButton numeric onTranscript={(t) => update("budget", t)} />
            </div>
          </Field>

          <Field icon={<CloudRain className="h-4 w-4" />} label={tr.form.rainfall} htmlFor="rain">
            <Select value={data.rainfall} onValueChange={(v) => update("rainfall", v)}>
              <SelectTrigger id="rain"><SelectValue placeholder={tr.form.rainfallPh} /></SelectTrigger>
              <SelectContent>
                {Object.entries(tr.form.rainfallOptions).map(([k, v]) => (
                  <SelectItem key={k} value={k}>{v}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>

          <Field icon={<CalendarDays className="h-4 w-4" />} label={tr.form.season} htmlFor="season">
            <Select value={data.season} onValueChange={(v) => update("season", v)}>
              <SelectTrigger id="season"><SelectValue placeholder={tr.form.seasonPh} /></SelectTrigger>
              <SelectContent>
                {Object.entries(tr.form.seasonOptions).map(([k, v]) => (
                  <SelectItem key={k} value={k}>{v}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>

          <div className="md:col-span-2 flex flex-col sm:flex-row gap-3 pt-2">
            <Button type="submit" variant="hero" size="xl" className="flex-1" disabled={loading}>
              {loading ? (
                <><Loader2 className="h-4 w-4 animate-spin" /> {tr.form.analyzing}</>
              ) : (
                <><Sprout className="h-4 w-4" /> {tr.form.submit}</>
              )}
            </Button>
            <Button type="button" variant="outline" size="xl" onClick={() => { setData(initial); setResult(null); }}>
              {tr.form.reset}
            </Button>
          </div>
        </form>

        {result && (
          <div className="mt-8 rounded-2xl border border-border bg-gradient-card p-6 md:p-8 shadow-soft animate-fade-up">
            <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
              <div className="flex items-center gap-2 text-primary">
                <Sparkles className="h-5 w-5" />
                <span className="text-sm font-semibold uppercase tracking-wider">{tr.form.resultLabel}</span>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <SpeakButton text={result} />
                <PdfDownloadButton
                  targetId="recommendation-printable"
                  fileBaseName={`FarmMitra-${data.locality || "plan"}`.replace(/[^\w\-]+/g, "_")}
                />
              </div>
            </div>
            <article id="recommendation-printable" className="prose prose-green max-w-none bg-card p-2
              prose-headings:font-display prose-headings:text-foreground
              prose-h1:text-3xl prose-h1:mb-4
              prose-h2:text-xl prose-h2:mt-6 prose-h2:mb-3 prose-h2:flex prose-h2:items-center prose-h2:gap-2
              prose-p:text-muted-foreground prose-p:leading-relaxed
              prose-strong:text-foreground
              prose-li:text-muted-foreground prose-li:marker:text-primary
              prose-table:border prose-table:border-border prose-table:rounded-lg prose-table:overflow-hidden
              prose-th:bg-secondary prose-th:text-foreground prose-th:p-3 prose-th:text-left
              prose-td:p-3 prose-td:border-t prose-td:border-border prose-td:text-muted-foreground
              prose-a:text-primary">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>{result}</ReactMarkdown>
            </article>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

const Field = ({
  icon, label, htmlFor, children,
}: { icon: React.ReactNode; label: string; htmlFor: string; children: React.ReactNode }) => (
  <div className="space-y-2">
    <Label htmlFor={htmlFor} className="flex items-center gap-2 text-sm font-medium text-foreground">
      <span className="text-primary">{icon}</span>{label}
    </Label>
    {children}
  </div>
);

export default FarmForm;
