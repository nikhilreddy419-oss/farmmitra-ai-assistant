import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Sprout, MapPin, Ruler, Layers, Droplets, Wallet, CloudRain, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

export type FarmInput = {
  locality: string;
  areaAcres: string;
  soilType: string;
  waterAvailability: string;
  budget: string;
  rainfall: string;
};

const initial: FarmInput = {
  locality: "",
  areaAcres: "",
  soilType: "",
  waterAvailability: "",
  budget: "",
  rainfall: "",
};

const FarmForm = () => {
  const [data, setData] = useState<FarmInput>(initial);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<string | null>(null);

  const update = (k: keyof FarmInput, v: string) => setData((d) => ({ ...d, [k]: v }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!data.locality || !data.areaAcres || !data.soilType || !data.waterAvailability || !data.budget || !data.rainfall) {
      toast.error("Please fill in all fields");
      return;
    }
    setLoading(true);
    setResult(null);
    try {
      const { data: res, error } = await supabase.functions.invoke("farm-recommend", {
        body: data,
      });
      if (error) throw error;
      if ((res as any)?.error) throw new Error((res as any).error);
      setResult((res as any)?.recommendation ?? "No recommendation returned.");
      toast.success("Recommendations ready!");
    } catch (err: any) {
      console.error(err);
      toast.error(err?.message || "Failed to get recommendations");
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
          <span className="text-sm font-semibold uppercase tracking-wider">Smart Farm Advisor</span>
        </div>
        <CardTitle className="font-display text-3xl md:text-4xl text-foreground">
          Tell us about your farm
        </CardTitle>
        <CardDescription className="text-base">
          Share a few details and FarmMitra.Ai will suggest the best crops and practices for you.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="grid gap-5 md:grid-cols-2">
          <Field icon={<MapPin className="h-4 w-4" />} label="Locality" htmlFor="locality">
            <Input
              id="locality"
              placeholder="e.g. Pune, Maharashtra"
              value={data.locality}
              onChange={(e) => update("locality", e.target.value)}
            />
          </Field>

          <Field icon={<Ruler className="h-4 w-4" />} label="Area size (acres)" htmlFor="area">
            <Input
              id="area"
              type="number"
              min="0"
              step="0.1"
              placeholder="e.g. 2.5"
              value={data.areaAcres}
              onChange={(e) => update("areaAcres", e.target.value)}
            />
          </Field>

          <Field icon={<Layers className="h-4 w-4" />} label="Soil type" htmlFor="soil">
            <Select value={data.soilType} onValueChange={(v) => update("soilType", v)}>
              <SelectTrigger id="soil"><SelectValue placeholder="Select soil type" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="alluvial">Alluvial</SelectItem>
                <SelectItem value="black">Black (Regur)</SelectItem>
                <SelectItem value="red">Red</SelectItem>
                <SelectItem value="laterite">Laterite</SelectItem>
                <SelectItem value="sandy">Sandy</SelectItem>
                <SelectItem value="clay">Clay</SelectItem>
                <SelectItem value="loamy">Loamy</SelectItem>
              </SelectContent>
            </Select>
          </Field>

          <Field icon={<Droplets className="h-4 w-4" />} label="Water availability" htmlFor="water">
            <Select value={data.waterAvailability} onValueChange={(v) => update("waterAvailability", v)}>
              <SelectTrigger id="water"><SelectValue placeholder="Select water availability" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="low">Low (rainfed only)</SelectItem>
                <SelectItem value="medium">Medium (seasonal source)</SelectItem>
                <SelectItem value="high">High (canal / borewell)</SelectItem>
              </SelectContent>
            </Select>
          </Field>

          <Field icon={<Wallet className="h-4 w-4" />} label="Budget (₹)" htmlFor="budget">
            <Input
              id="budget"
              type="number"
              min="0"
              placeholder="e.g. 50000"
              value={data.budget}
              onChange={(e) => update("budget", e.target.value)}
            />
          </Field>

          <Field icon={<CloudRain className="h-4 w-4" />} label="Rainfall (mm/year)" htmlFor="rain">
            <Input
              id="rain"
              type="number"
              min="0"
              placeholder="e.g. 800"
              value={data.rainfall}
              onChange={(e) => update("rainfall", e.target.value)}
            />
          </Field>

          <div className="md:col-span-2 flex flex-col sm:flex-row gap-3 pt-2">
            <Button type="submit" variant="hero" size="xl" className="flex-1" disabled={loading}>
              {loading ? (
                <><Loader2 className="h-4 w-4 animate-spin" /> Analyzing…</>
              ) : (
                <><Sprout className="h-4 w-4" /> Get Recommendations</>
              )}
            </Button>
            <Button type="button" variant="outline" size="xl" onClick={() => { setData(initial); setResult(null); }}>
              Reset
            </Button>
          </div>
        </form>

        {result && (
          <div className="mt-8 rounded-xl border border-border bg-secondary/40 p-6 animate-fade-up">
            <h3 className="font-display text-lg font-semibold text-foreground mb-2">Recommendations</h3>
            <p className="text-muted-foreground leading-relaxed">{result}</p>
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
