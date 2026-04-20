import { useEffect, useRef, useState } from "react";
import { Play, Pause, Square, Volume2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/contexts/LanguageContext";

const LOCALE: Record<string, string> = {
  en: "en-IN",
  hi: "hi-IN",
  te: "te-IN",
};

const LABELS: Record<string, { listen: string; pause: string; resume: string; stop: string; unsupported: string }> = {
  en: { listen: "Listen", pause: "Pause", resume: "Resume", stop: "Stop", unsupported: "Text-to-speech not supported in this browser." },
  hi: { listen: "सुनें", pause: "रोकें", resume: "फिर शुरू करें", stop: "बंद करें", unsupported: "इस ब्राउज़र में टेक्स्ट-टू-स्पीच समर्थित नहीं है।" },
  te: { listen: "వినండి", pause: "ఆపండి", resume: "మళ్ళీ ప్రారంభించండి", stop: "ఆపివేయండి", unsupported: "ఈ బ్రౌజర్‌లో టెక్స్ట్-టు-స్పీచ్ మద్దతు లేదు." },
};

/** Strip markdown to plain prose suitable for speech */
const stripMarkdown = (md: string): string => {
  return md
    .replace(/```[\s\S]*?```/g, " ")          // code blocks
    .replace(/`([^`]+)`/g, "$1")              // inline code
    .replace(/!\[[^\]]*\]\([^)]+\)/g, " ")    // images
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")  // links -> text
    .replace(/^\s{0,3}#{1,6}\s+/gm, "")       // headings
    .replace(/^\s*[-*+]\s+/gm, "• ")          // bullets
    .replace(/^\s*\d+\.\s+/gm, "")            // numbered list
    .replace(/[*_~]+/g, "")                   // bold/italic/strike
    .replace(/^\s*>\s?/gm, "")                // blockquote
    .replace(/^\s*\|.*\|\s*$/gm, (line) =>    // table rows -> commas
      line.replace(/\|/g, ",").replace(/^,|,$/g, "").trim(),
    )
    .replace(/^[\s,-]*$/gm, "")               // table separator rows
    .replace(/[#]/g, "")
    .replace(/\n{2,}/g, ". ")
    .replace(/\s+/g, " ")
    .trim();
};

const pickVoice = (locale: string): SpeechSynthesisVoice | undefined => {
  const voices = window.speechSynthesis.getVoices();
  if (!voices.length) return undefined;
  const exact = voices.find((v) => v.lang.toLowerCase() === locale.toLowerCase());
  if (exact) return exact;
  const prefix = locale.split("-")[0].toLowerCase();
  return voices.find((v) => v.lang.toLowerCase().startsWith(prefix));
};

type Props = { text: string };

const SpeakButton = ({ text }: Props) => {
  const { lang } = useLanguage();
  const labels = LABELS[lang] ?? LABELS.en;
  const supported = typeof window !== "undefined" && "speechSynthesis" in window;

  const [state, setState] = useState<"idle" | "speaking" | "paused">("idle");
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

  // Ensure voices load (Chrome loads them async)
  useEffect(() => {
    if (!supported) return;
    const onVoices = () => { /* trigger re-evaluation */ };
    window.speechSynthesis.addEventListener?.("voiceschanged", onVoices);
    window.speechSynthesis.getVoices();
    return () => window.speechSynthesis.removeEventListener?.("voiceschanged", onVoices);
  }, [supported]);

  // Stop any ongoing speech if text or language changes, or on unmount
  useEffect(() => {
    return () => {
      if (supported) window.speechSynthesis.cancel();
    };
  }, [supported]);

  useEffect(() => {
    if (!supported) return;
    window.speechSynthesis.cancel();
    setState("idle");
  }, [text, lang, supported]);

  const handlePlay = () => {
    if (!supported) return;
    const synth = window.speechSynthesis;

    if (state === "paused") {
      synth.resume();
      setState("speaking");
      return;
    }

    synth.cancel();
    const plain = stripMarkdown(text);
    if (!plain) return;

    const locale = LOCALE[lang] ?? "en-IN";
    const utter = new SpeechSynthesisUtterance(plain);
    utter.lang = locale;
    const voice = pickVoice(locale);
    if (voice) utter.voice = voice;
    utter.rate = 0.95;
    utter.pitch = 1;
    utter.onend = () => setState("idle");
    utter.onerror = () => setState("idle");
    utteranceRef.current = utter;
    synth.speak(utter);
    setState("speaking");
  };

  const handlePause = () => {
    if (!supported) return;
    window.speechSynthesis.pause();
    setState("paused");
  };

  const handleStop = () => {
    if (!supported) return;
    window.speechSynthesis.cancel();
    setState("idle");
  };

  if (!supported) {
    return (
      <p className="text-xs text-muted-foreground italic">{labels.unsupported}</p>
    );
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
          className="gap-2"
        >
          {state === "paused" ? <Play className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
          {state === "paused" ? labels.resume : labels.listen}
        </Button>
      )}
      {state !== "idle" && (
        <Button type="button" size="sm" variant="ghost" onClick={handleStop} className="gap-2">
          <Square className="h-4 w-4" /> {labels.stop}
        </Button>
      )}
      {state === "speaking" && (
        <span className="flex items-center gap-1 text-xs text-primary">
          <span className="h-2 w-2 rounded-full bg-primary animate-pulse" />
          {LOCALE[lang]?.toUpperCase()}
        </span>
      )}
    </div>
  );
};

export default SpeakButton;
