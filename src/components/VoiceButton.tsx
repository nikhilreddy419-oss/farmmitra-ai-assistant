import { useEffect, useState } from "react";
import { Mic, MicOff, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useSpeechRecognition } from "@/hooks/useSpeechRecognition";
import { useLanguage } from "@/contexts/LanguageContext";
import { toast } from "sonner";

type Props = {
  onTranscript: (text: string) => void;
  /** If true, submit number-only (digits) extracted from spoken text */
  numeric?: boolean;
};

const VOICE_TIPS: Record<string, string> = {
  en: "Tap and speak",
  hi: "बोलने के लिए दबाएँ",
  te: "మాట్లాడటానికి నొక్కండి",
};

const NOT_SUPPORTED: Record<string, string> = {
  en: "Voice input not supported in this browser. Try Chrome.",
  hi: "इस ब्राउज़र में आवाज़ इनपुट समर्थित नहीं है। Chrome आज़माएँ।",
  te: "ఈ బ్రౌజర్‌లో వాయిస్ ఇన్‌పుట్ మద్దతు లేదు. Chrome ప్రయత్నించండి.",
};

const extractNumber = (s: string) => {
  // grab first number-like sequence; convert hindi/telugu digits to ascii
  const map: Record<string, string> = {
    "०":"0","१":"1","२":"2","३":"3","४":"4","५":"5","६":"6","७":"7","८":"8","९":"9",
    "౦":"0","౧":"1","౨":"2","౩":"3","౪":"4","౫":"5","౬":"6","౭":"7","౮":"8","౯":"9",
  };
  const normalized = s.replace(/[०-९౦-౯]/g, (c) => map[c] ?? c);
  const m = normalized.match(/(\d+(?:\.\d+)?)/);
  return m ? m[1] : "";
};

const VoiceButton = ({ onTranscript, numeric }: Props) => {
  const { lang } = useLanguage();
  const { listening, transcript, error, start, stop, supported } = useSpeechRecognition(lang);
  const [lastSent, setLastSent] = useState("");

  // Live-stream the transcript to the parent input
  useEffect(() => {
    if (!transcript) return;
    const value = numeric ? extractNumber(transcript) : transcript;
    if (value && value !== lastSent) {
      onTranscript(value);
      setLastSent(value);
    }
  }, [transcript, numeric, onTranscript, lastSent]);

  useEffect(() => {
    if (error) toast.error(`🎤 ${error}`);
  }, [error]);

  const handleClick = async () => {
    if (!supported) {
      toast.error(NOT_SUPPORTED[lang]);
      return;
    }
    if (listening) {
      stop();
      return;
    }
    try {
      await navigator.mediaDevices.getUserMedia({ audio: true });
      setLastSent("");
      start();
    } catch {
      toast.error("🎤 Microphone permission denied");
    }
  };

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          type="button"
          size="icon"
          variant={listening ? "default" : "outline"}
          onClick={handleClick}
          aria-label="Voice input"
          className={
            listening
              ? "h-10 w-10 shrink-0 bg-primary text-primary-foreground hover:bg-primary/90 animate-pulse shadow-soft"
              : "h-10 w-10 shrink-0"
          }
        >
          {listening ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : supported ? (
            <Mic className="h-4 w-4" />
          ) : (
            <MicOff className="h-4 w-4" />
          )}
        </Button>
      </TooltipTrigger>
      <TooltipContent side="top">
        {listening ? "🎙️ Listening…" : VOICE_TIPS[lang]}
      </TooltipContent>
    </Tooltip>
  );
};

export default VoiceButton;
