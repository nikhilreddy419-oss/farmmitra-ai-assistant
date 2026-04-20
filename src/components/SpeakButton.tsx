import { useEffect, useRef, useState } from "react";
import { Play, Pause, Square, Volume2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/contexts/LanguageContext";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

const LOCALE: Record<string, string> = {
  en: "en-IN",
  hi: "hi-IN",
  te: "te-IN",
};

const LABELS: Record<
  string,
  { listen: string; pause: string; resume: string; stop: string; unsupported: string; noVoice: string }
> = {
  en: {
    listen: "Listen",
    pause: "Pause",
    resume: "Resume",
    stop: "Stop",
    unsupported: "Text-to-speech not supported in this browser.",
    noVoice: "No English voice installed on this device.",
  },
  hi: {
    listen: "सुनें",
    pause: "रोकें",
    resume: "फिर शुरू करें",
    stop: "बंद करें",
    unsupported: "इस ब्राउज़र में टेक्स्ट-टू-स्पीच समर्थित नहीं है।",
    noVoice: "इस डिवाइस में हिंदी आवाज़ इंस्टॉल नहीं है। कृपया Chrome या Android आज़माएँ।",
  },
  te: {
    listen: "వినండి",
    pause: "ఆపండి",
    resume: "మళ్ళీ ప్రారంభించండి",
    stop: "ఆపివేయండి",
    unsupported: "ఈ బ్రౌజర్‌లో టెక్స్ట్-టు-స్పీచ్ మద్దతు లేదు.",
    noVoice: "ఈ పరికరంలో తెలుగు వాయిస్ లేదు. దయచేసి Chrome లేదా Android ప్రయత్నించండి.",
  },
};

const stripMarkdown = (md: string): string =>
  md
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/!\[[^\]]*\]\([^)]+\)/g, " ")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/^\s{0,3}#{1,6}\s+/gm, "")
    .replace(/^\s*[-*+]\s+/gm, "• ")
    .replace(/^\s*\d+\.\s+/gm, "")
    .replace(/[*_~]+/g, "")
    .replace(/^\s*>\s?/gm, "")
    .replace(/^\s*\|.*\|\s*$/gm, (line) =>
      line.replace(/\|/g, ", ").replace(/^,\s*|,\s*$/g, "").trim(),
    )
    .replace(/^[\s,|:-]*$/gm, "")
    .replace(/[#]/g, "")
    .replace(/[\p{Extended_Pictographic}]/gu, "") // strip emojis (often spoken in EN)
    .replace(/\n{2,}/g, ". ")
    .replace(/\s+/g, " ")
    .trim();

/** Wait until the browser has loaded its voice list (Chrome loads it async). */
const waitForVoices = (): Promise<SpeechSynthesisVoice[]> =>
  new Promise((resolve) => {
    const synth = window.speechSynthesis;
    const existing = synth.getVoices();
    if (existing.length) return resolve(existing);
    let done = false;
    const finish = () => {
      if (done) return;
      done = true;
      resolve(synth.getVoices());
    };
    synth.addEventListener?.("voiceschanged", finish, { once: true });
    // Safety net — some browsers never fire the event
    setTimeout(finish, 1500);
  });

const pickVoice = (
  voices: SpeechSynthesisVoice[],
  locale: string,
): SpeechSynthesisVoice | undefined => {
  if (!voices.length) return undefined;
  const lc = locale.toLowerCase();
  const prefix = lc.split("-")[0];

  // 1. exact locale match (e.g. hi-IN)
  const exact = voices.find((v) => v.lang.toLowerCase() === lc);
  if (exact) return exact;

  // 2. same language, any region (e.g. hi-*)
  const sameLang = voices.find((v) => v.lang.toLowerCase().startsWith(prefix + "-"));
  if (sameLang) return sameLang;

  // 3. bare language code (e.g. "hi")
  const bare = voices.find((v) => v.lang.toLowerCase() === prefix);
  if (bare) return bare;

  // 4. Google voices often name themselves (e.g. "Google हिन्दी")
  const named = voices.find((v) =>
    v.name.toLowerCase().includes(
      prefix === "hi" ? "hindi" : prefix === "te" ? "telugu" : "english",
    ),
  );
  return named;
};

/** Split into chunks small enough that Chrome won't truncate (~200 chars). */
const chunkText = (text: string, maxLen = 200): string[] => {
  const sentences = text.split(/(?<=[.!?。!?])\s+/);
  const chunks: string[] = [];
  let cur = "";
  for (const s of sentences) {
    if ((cur + " " + s).trim().length <= maxLen) {
      cur = (cur ? cur + " " : "") + s;
    } else {
      if (cur) chunks.push(cur);
      if (s.length <= maxLen) {
        cur = s;
      } else {
        // very long sentence — split by commas / spaces
        const parts = s.match(new RegExp(`.{1,${maxLen}}(\\s|,|$)`, "g")) ?? [s];
        parts.forEach((p) => chunks.push(p.trim()));
        cur = "";
      }
    }
  }
  if (cur) chunks.push(cur);
  return chunks.filter(Boolean);
};

type Props = { text: string };

const SpeakButton = ({ text }: Props) => {
  const { lang } = useLanguage();
  const labels = LABELS[lang] ?? LABELS.en;
  const supported = typeof window !== "undefined" && "speechSynthesis" in window;

  const [state, setState] = useState<"idle" | "loading" | "speaking" | "paused">("idle");
  const queueRef = useRef<SpeechSynthesisUtterance[]>([]);
  const cancelledRef = useRef(false);
  const summaryCacheRef = useRef<{ key: string; summary: string } | null>(null);

  // Stop on unmount / when text or language changes
  useEffect(() => {
    return () => {
      if (supported) window.speechSynthesis.cancel();
    };
  }, [supported]);

  useEffect(() => {
    if (!supported) return;
    cancelledRef.current = true;
    window.speechSynthesis.cancel();
    queueRef.current = [];
    setState("idle");
  }, [text, lang, supported]);

  const fetchSummary = async (): Promise<string> => {
    const key = `${lang}::${text}`;
    if (summaryCacheRef.current?.key === key) {
      return summaryCacheRef.current.summary;
    }
    const { data, error } = await supabase.functions.invoke("summarize-recommendation", {
      body: { text, language: lang },
    });
    if (error) throw error;
    if ((data as any)?.error) throw new Error((data as any).error);
    const summary: string = (data as any)?.summary?.trim() || "";
    if (!summary) throw new Error("Empty summary");
    summaryCacheRef.current = { key, summary };
    return summary;
  };

  const handlePlay = async () => {
    if (!supported) return;
    const synth = window.speechSynthesis;

    if (state === "paused") {
      synth.resume();
      setState("speaking");
      return;
    }

    setState("loading");
    cancelledRef.current = false;
    synth.cancel();

    let summary = "";
    try {
      summary = await fetchSummary();
    } catch (err: any) {
      console.error("summary failed, falling back to full text:", err);
      toast.error(err?.message || "Could not generate summary, reading full text");
      summary = stripMarkdown(text);
    }
    if (cancelledRef.current) return;

    const voices = await waitForVoices();
    if (cancelledRef.current) return;

    const locale = LOCALE[lang] ?? "en-IN";
    const voice = pickVoice(voices, locale);

    if (!voice) {
      setState("idle");
      toast.error(labels.noVoice);
      return;
    }

    const plain = stripMarkdown(summary);
    if (!plain) {
      setState("idle");
      return;
    }

    const chunks = chunkText(plain);
    const utterances: SpeechSynthesisUtterance[] = chunks.map((chunk, i) => {
      const u = new SpeechSynthesisUtterance(chunk);
      u.voice = voice;
      u.lang = voice.lang || locale;
      u.rate = 0.95;
      u.pitch = 1;
      u.onend = () => {
        if (i === chunks.length - 1 && !cancelledRef.current) {
          setState("idle");
        }
      };
      u.onerror = () => {
        if (!cancelledRef.current) setState("idle");
      };
      return u;
    });

    queueRef.current = utterances;
    setState("speaking");
    utterances.forEach((u) => synth.speak(u));
  };

  const handlePause = () => {
    if (!supported) return;
    window.speechSynthesis.pause();
    setState("paused");
  };

  const handleStop = () => {
    if (!supported) return;
    cancelledRef.current = true;
    window.speechSynthesis.cancel();
    queueRef.current = [];
    setState("idle");
  };

  if (!supported) {
    return <p className="text-xs text-muted-foreground italic">{labels.unsupported}</p>;
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      {state === "speaking" ? (
        <Button type="button" size="sm" variant="outline" onClick={handlePause} className="gap-2">
          <Pause className="h-4 w-4" /> {labels.pause}
        </Button>
      ) : (
        <Button
          type="button"
          size="sm"
          variant="default"
          onClick={handlePlay}
          disabled={state === "loading"}
          className="gap-2"
        >
          {state === "paused" ? (
            <Play className="h-4 w-4" />
          ) : (
            <Volume2 className={`h-4 w-4 ${state === "loading" ? "animate-pulse" : ""}`} />
          )}
          {state === "paused" ? labels.resume : labels.listen}
        </Button>
      )}
      {(state === "speaking" || state === "paused") && (
        <Button type="button" size="sm" variant="ghost" onClick={handleStop} className="gap-2">
          <Square className="h-4 w-4" /> {labels.stop}
        </Button>
      )}
      {state === "speaking" && (
        <span className="flex items-center gap-1 text-xs text-primary">
          <span className="h-2 w-2 rounded-full bg-primary animate-pulse" />
          {(LOCALE[lang] ?? "").toUpperCase()}
        </span>
      )}
    </div>
  );
};

export default SpeakButton;
