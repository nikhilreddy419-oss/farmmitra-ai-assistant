import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { History, Loader2, Eye, Trash2, RefreshCw } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { toast } from "sonner";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

const LABELS: Record<string, {
  title: string; empty: string; view: string; refresh: string;
  loading: string; lang: string; clear: string; cleared: string;
}> = {
  en: { title: "Past Recommendations", empty: "No past recommendations yet.", view: "View", refresh: "Refresh", loading: "Loading…", lang: "Language", clear: "Clear history", cleared: "History cleared" },
  hi: { title: "पिछली सिफ़ारिशें", empty: "अभी कोई पिछली सिफ़ारिश नहीं है।", view: "देखें", refresh: "रिफ्रेश", loading: "लोड हो रहा है…", lang: "भाषा", clear: "इतिहास हटाएँ", cleared: "इतिहास हटाया गया" },
  te: { title: "గత సిఫారసులు", empty: "ఇంకా గత సిఫారసులు లేవు.", view: "చూడండి", refresh: "రిఫ్రెష్", loading: "లోడ్ అవుతోంది…", lang: "భాష", clear: "చరిత్రను తొలగించండి", cleared: "చరిత్ర తొలగించబడింది" },
};

const LANG_BADGE: Record<string, string> = { en: "EN", hi: "HI", te: "TE" };

type Row = {
  id: string;
  created_at: string;
  locality: string;
  area_acres: string;
  soil_type: string;
  budget: string;
  season: string;
  language: string;
  recommendation: string;
};

type Props = { refreshKey: number };

const RecommendationHistory = ({ refreshKey }: Props) => {
  const { lang } = useLanguage();
  const { user } = useAuth();
  const labels = LABELS[lang] ?? LABELS.en;
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState<Row | null>(null);

  const load = async () => {
    if (!user) { setRows([]); return; }
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("recommendations")
        .select("id, created_at, locality, area_acres, soil_type, budget, season, language, recommendation")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      setRows((data as Row[]) || []);
    } catch (err: any) {
      console.error(err);
      toast.error(err?.message || "Failed to load history");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [refreshKey, user?.id]);

  const clearLocal = async () => {
    if (!user) return;
    try {
      const { error } = await supabase.from("recommendations").delete().eq("user_id", user.id);
      if (error) throw error;
      setRows([]);
      toast.success(labels.cleared);
    } catch (err: any) {
      toast.error(err?.message || "Failed to clear history");
    }
  };

  return (
    <>
      <Card className="bg-gradient-card shadow-soft border-border/60">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
          <CardTitle className="flex items-center gap-2 text-lg font-display">
            <History className="h-5 w-5 text-primary" /> {labels.title}
          </CardTitle>
          <div className="flex items-center gap-2">
            <Button size="sm" variant="ghost" onClick={load} disabled={loading} className="gap-2">
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
              {labels.refresh}
            </Button>
            {rows.length > 0 && (
              <Button size="sm" variant="ghost" onClick={clearLocal} className="gap-2 text-destructive hover:text-destructive">
                <Trash2 className="h-4 w-4" /> {labels.clear}
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-sm text-muted-foreground">{labels.loading}</p>
          ) : rows.length === 0 ? (
            <p className="text-sm text-muted-foreground italic">{labels.empty}</p>
          ) : (
            <ul className="divide-y divide-border">
              {rows.map((r) => (
                <li key={r.id} className="py-3 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium text-foreground truncate">{r.locality}</span>
                      <Badge variant="secondary" className="text-[10px]">{LANG_BADGE[r.language] || r.language.toUpperCase()}</Badge>
                      <span className="text-xs text-muted-foreground">
                        {r.area_acres} ac · ₹{r.budget} · {r.season}
                      </span>
                    </div>
                    <div className="text-xs text-muted-foreground mt-0.5">
                      {new Date(r.created_at).toLocaleString()}
                    </div>
                  </div>
                  <Button size="sm" variant="outline" onClick={() => setOpen(r)} className="gap-2 shrink-0">
                    <Eye className="h-4 w-4" /> {labels.view}
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <Dialog open={!!open} onOpenChange={(v) => !v && setOpen(null)}>
        <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-display">
              {open?.locality} · {open?.season}
            </DialogTitle>
          </DialogHeader>
          {open && (
            <article className="prose prose-green max-w-none
              prose-headings:font-display prose-headings:text-foreground
              prose-h1:text-2xl prose-h2:text-lg
              prose-p:text-muted-foreground
              prose-strong:text-foreground
              prose-li:text-muted-foreground prose-li:marker:text-primary
              prose-table:border prose-table:border-border
              prose-th:bg-secondary prose-th:p-2 prose-th:text-left
              prose-td:p-2 prose-td:border-t prose-td:border-border">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>{open.recommendation}</ReactMarkdown>
            </article>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
};

export default RecommendationHistory;
