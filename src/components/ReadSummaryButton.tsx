import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Loader2, Volume2, Square } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/contexts/LanguageContext";

type Props = {
  text: string;
};

const VOICE_LANG: Record<string, string> = {
  en: "en-IN",
  hi: "hi-IN",
  te: "te-IN",
};

const LABELS = {
  en: { read: "Read summary", stop: "Stop", loading: "Summarizing…", noTTS: "Voice playback not supported on this browser" },
  hi: { read: "सारांश सुनें", stop: "रोकें", loading: "सारांश बना रहा है…", noTTS: "इस ब्राउज़र में आवाज़ समर्थित नहीं है" },
  te: { read: "సారాంశం వినండి", stop: "ఆపండి", loading: "సారాంశం తయారవుతోంది…", noTTS: "ఈ బ్రౌజర్‌లో వాయిస్ మద్దతు లేదు" },
};

const ReadSummaryButton = ({ text }: Props) => {
  const { lang } = useLanguage();
  const labels = LABELS[lang];
  const [loading, setLoading] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const utterRef = useRef<SpeechSynthesisUtterance | null>(null);

  useEffect(() => {
    return () => {
      if (typeof window !== "undefined" && window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  const pickVoice = (langCode: string): SpeechSynthesisVoice | null => {
    const voices = window.speechSynthesis.getVoices();
    if (!voices.length) return null;
    const exact = voices.find((v) => v.lang?.toLowerCase() === langCode.toLowerCase());
    if (exact) return exact;
    const base = langCode.split("-")[0].toLowerCase();
    const partial = voices.find((v) => v.lang?.toLowerCase().startsWith(base));
    return partial || null;
  };

  const speak = (summary: string) => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) {
      toast.error(labels.noTTS);
      return;
    }
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(summary);
    const code = VOICE_LANG[lang] || "en-IN";
    u.lang = code;
    const voice = pickVoice(code);
    if (voice) u.voice = voice;
    u.rate = 0.95;
    u.pitch = 1;
    u.onend = () => setSpeaking(false);
    u.onerror = () => setSpeaking(false);
    utterRef.current = u;
    setSpeaking(true);
    window.speechSynthesis.speak(u);
  };

  const handleClick = async () => {
    if (speaking) {
      window.speechSynthesis.cancel();
      setSpeaking(false);
      return;
    }
    setLoading(true);
    try {
      // Ensure voices are loaded (some browsers need this nudge)
      if ("speechSynthesis" in window && window.speechSynthesis.getVoices().length === 0) {
        window.speechSynthesis.getVoices();
      }
      const { data, error } = await supabase.functions.invoke("summarize-recommendation", {
        body: { text, language: lang },
      });
      if (error) throw error;
      if ((data as any)?.error) throw new Error((data as any).error);
      const summary: string = (data as any)?.summary?.trim() || "";
      if (!summary) throw new Error("Empty summary");
      speak(summary);
    } catch (err: any) {
      console.error(err);
      toast.error(err?.message || "Failed to read summary");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      onClick={handleClick}
      disabled={loading || !text}
    >
      {loading ? (
        <><Loader2 className="h-4 w-4 animate-spin" /> {labels.loading}</>
      ) : speaking ? (
        <><Square className="h-4 w-4" /> {labels.stop}</>
      ) : (
        <><Volume2 className="h-4 w-4" /> {labels.read}</>
      )}
    </Button>
  );
};

export default ReadSummaryButton;
