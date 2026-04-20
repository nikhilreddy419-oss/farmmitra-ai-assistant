import { useEffect, useRef, useState, useCallback } from "react";

type Lang = "en" | "hi" | "te";

const LOCALE: Record<Lang, string> = {
  en: "en-IN",
  hi: "hi-IN",
  te: "te-IN",
};

type SpeechRecognitionLike = any;

export const isSpeechRecognitionSupported = () => {
  if (typeof window === "undefined") return false;
  return !!(
    (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
  );
};

export const useSpeechRecognition = (lang: Lang) => {
  const [listening, setListening] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [error, setError] = useState<string | null>(null);
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const supported = isSpeechRecognitionSupported();

  useEffect(() => {
    if (!supported) return;
    const SR =
      (window as any).SpeechRecognition ||
      (window as any).webkitSpeechRecognition;
    const r = new SR();
    r.continuous = false;
    r.interimResults = true;
    r.maxAlternatives = 1;
    r.lang = LOCALE[lang];

    r.onresult = (event: any) => {
      let text = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        text += event.results[i][0].transcript;
      }
      setTranscript(text.trim());
    };
    r.onerror = (e: any) => {
      setError(e?.error || "Speech recognition error");
      setListening(false);
    };
    r.onend = () => setListening(false);

    recognitionRef.current = r;
    return () => {
      try { r.abort(); } catch { /* noop */ }
      recognitionRef.current = null;
    };
  }, [lang, supported]);

  const start = useCallback(() => {
    if (!recognitionRef.current) return;
    setError(null);
    setTranscript("");
    try {
      recognitionRef.current.lang = LOCALE[lang];
      recognitionRef.current.start();
      setListening(true);
    } catch (e: any) {
      setError(e?.message || "Could not start microphone");
    }
  }, [lang]);

  const stop = useCallback(() => {
    try { recognitionRef.current?.stop(); } catch { /* noop */ }
    setListening(false);
  }, []);

  return { listening, transcript, error, start, stop, supported };
};
