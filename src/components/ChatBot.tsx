import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MessageCircle, X, Send, Loader2, Sprout, Mic, MicOff } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { toast } from "sonner";
import { useLanguage } from "@/contexts/LanguageContext";
import { supabase } from "@/integrations/supabase/client";

type Msg = { role: "user" | "assistant"; content: string };

const COPY: Record<string, { title: string; sub: string; ph: string; greet: string; open: string; listening: string; voiceUnsupported: string }> = {
  en: {
    title: "Ask FarmMitra",
    sub: "Your farming assistant",
    ph: "Ask anything about your farm…",
    greet: "👋 Hi! I'm FarmMitra. Ask me about crops, soil, irrigation, fertilizers, pests, or market prices.",
    open: "Chat with FarmMitra",
    listening: "Listening…",
    voiceUnsupported: "Voice input not supported in this browser.",
  },
  hi: {
    title: "FarmMitra से पूछें",
    sub: "आपका कृषि सहायक",
    ph: "अपने खेत के बारे में कुछ भी पूछें…",
    greet: "👋 नमस्ते! मैं FarmMitra हूँ। फसल, मिट्टी, सिंचाई, उर्वरक, कीट या बाज़ार भाव के बारे में पूछें।",
    open: "FarmMitra से बात करें",
    listening: "सुन रहा हूँ…",
    voiceUnsupported: "इस ब्राउज़र में वॉइस इनपुट समर्थित नहीं है।",
  },
  te: {
    title: "FarmMitra ని అడగండి",
    sub: "మీ వ్యవసాయ సహాయకుడు",
    ph: "మీ పొలం గురించి ఏదైనా అడగండి…",
    greet: "👋 నమస్కారం! నేను FarmMitra. పంటలు, నేల, నీటిపారుదల, ఎరువులు, పురుగులు లేదా మార్కెట్ ధరల గురించి అడగండి.",
    open: "FarmMitra తో చాట్ చేయండి",
    listening: "వింటున్నాను…",
    voiceUnsupported: "ఈ బ్రౌజర్‌లో వాయిస్ ఇన్‌పుట్ మద్దతు లేదు.",
  },
};

const LANG_MAP: Record<string, string> = { en: "en-IN", hi: "hi-IN", te: "te-IN" };

const ChatBot = () => {
  const { lang } = useLanguage();
  const c = COPY[lang] ?? COPY.en;

  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [listening, setListening] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<any>(null);
  const autoSendRef = useRef(false);

  // Reset greeting when language changes
  useEffect(() => {
    setMessages([{ role: "assistant", content: c.greet }]);
  }, [lang]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, loading]);

  const sendText = async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || loading) return;
    setInput("");

    const userMsg: Msg = { role: "user", content: trimmed };
    setMessages((prev) => [...prev, userMsg]);
    setLoading(true);

    try {
      // Send last few turns as history for context (exclude the greeting)
      const history = messages
        .filter((m, i) => !(i === 0 && m.role === "assistant"))
        .slice(-8)
        .map((m) => ({ role: m.role, content: m.content }));

      const { data, error } = await supabase.functions.invoke("lyzr-chat", {
        body: { message: trimmed, language: lang, history },
      });

      if (error) {
        console.error(error);
        const msg = (error as any)?.message || "Chat failed. Please try again.";
        toast.error(msg);
        setMessages((prev) => [
          ...prev,
          { role: "assistant", content: `⚠️ ${msg}` },
        ]);
        setLoading(false);
        return;
      }

      const errMsg = (data as any)?.error;
      if (errMsg) {
        toast.error(errMsg);
        setMessages((prev) => [
          ...prev,
          { role: "assistant", content: `⚠️ ${errMsg}` },
        ]);
        setLoading(false);
        return;
      }

      const reply = (data as any)?.reply ?? "Sorry, I couldn't get a response.";
      setMessages((prev) => [...prev, { role: "assistant", content: reply }]);
    } catch (e: any) {
      console.error(e);
      const msg = e?.message || "Chat failed";
      toast.error(msg);
      setMessages((prev) => [...prev, { role: "assistant", content: `⚠️ ${msg}` }]);
    } finally {
      setLoading(false);
    }
  };

  const send = () => sendText(input);

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  };

  // Voice-to-text via Web Speech API
  const toggleVoice = () => {
    const SpeechRecognition: any =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      toast.error(c.voiceUnsupported);
      return;
    }

    if (listening) {
      recognitionRef.current?.stop();
      return;
    }

    const recog = new SpeechRecognition();
    recog.lang = LANG_MAP[lang] ?? "en-IN";
    recog.interimResults = true;
    recog.continuous = false;
    autoSendRef.current = false;

    let finalTranscript = "";

    recog.onstart = () => setListening(true);
    recog.onresult = (event: any) => {
      let interim = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          finalTranscript += transcript;
          autoSendRef.current = true;
        } else {
          interim += transcript;
        }
      }
      setInput((finalTranscript + interim).trim());
    };
    recog.onerror = (e: any) => {
      console.error("Speech error", e);
      setListening(false);
      if (e.error && e.error !== "no-speech" && e.error !== "aborted") {
        toast.error(`Voice error: ${e.error}`);
      }
    };
    recog.onend = () => {
      setListening(false);
      const text = finalTranscript.trim();
      if (autoSendRef.current && text) {
        sendText(text);
      }
    };

    recognitionRef.current = recog;
    try {
      recog.start();
    } catch (e) {
      console.error(e);
      setListening(false);
    }
  };

  return (
    <>
      {/* Floating launcher */}
      {!open && (
        <button
          onClick={() => setOpen(true)}
          aria-label={c.open}
          className="fixed bottom-5 right-5 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-elegant ring-4 ring-primary/20 hover:scale-105 transition-smooth"
        >
          <MessageCircle className="h-6 w-6" />
        </button>
      )}

      {/* Panel */}
      {open && (
        <div className="fixed bottom-5 right-5 z-50 w-[min(380px,calc(100vw-2.5rem))] h-[min(560px,calc(100vh-2.5rem))] flex flex-col rounded-2xl border border-border bg-card shadow-elegant overflow-hidden animate-fade-up">
          {/* Header */}
          <div className="flex items-center justify-between gap-2 px-4 py-3 bg-gradient-leaf text-primary-foreground">
            <div className="flex items-center gap-2">
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-primary-foreground/20 ring-1 ring-primary-foreground/30">
                <Sprout className="h-4 w-4" />
              </span>
              <div className="leading-tight">
                <div className="font-display font-semibold">{c.title}</div>
                <div className="text-xs text-primary-foreground/80">{c.sub}</div>
              </div>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setOpen(false)}
              className="text-primary-foreground hover:bg-primary-foreground/15 hover:text-primary-foreground h-8 w-8"
              aria-label="Close chat"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>

          {/* Messages */}
          <div ref={scrollRef} className="flex-1 overflow-y-auto px-3 py-4 space-y-3 bg-background">
            {messages.map((m, i) => (
              <div
                key={i}
                className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[85%] rounded-2xl px-3 py-2 text-sm shadow-soft ${
                    m.role === "user"
                      ? "bg-primary text-primary-foreground rounded-br-sm"
                      : "bg-secondary text-foreground rounded-bl-sm"
                  }`}
                >
                  {m.role === "assistant" ? (
                    <div className="prose prose-sm max-w-none prose-p:my-1 prose-ul:my-1 prose-ol:my-1 prose-headings:my-2 prose-headings:font-display">
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>{m.content}</ReactMarkdown>
                    </div>
                  ) : (
                    <span className="whitespace-pre-wrap">{m.content}</span>
                  )}
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex justify-start">
                <div className="rounded-2xl rounded-bl-sm bg-secondary px-3 py-2 text-sm text-muted-foreground flex items-center gap-2 shadow-soft">
                  <span className="flex gap-1">
                    <span className="h-2 w-2 rounded-full bg-primary/60 animate-pulse" style={{ animationDelay: "0ms" }} />
                    <span className="h-2 w-2 rounded-full bg-primary/60 animate-pulse" style={{ animationDelay: "150ms" }} />
                    <span className="h-2 w-2 rounded-full bg-primary/60 animate-pulse" style={{ animationDelay: "300ms" }} />
                  </span>
                </div>
              </div>
            )}
            {listening && (
              <div className="flex justify-end">
                <div className="rounded-full bg-destructive/10 text-destructive px-3 py-1 text-xs flex items-center gap-2">
                  <span className="relative flex h-2 w-2">
                    <span className="absolute inline-flex h-full w-full rounded-full bg-destructive opacity-75 animate-ping" />
                    <span className="relative inline-flex h-2 w-2 rounded-full bg-destructive" />
                  </span>
                  {c.listening}
                </div>
              </div>
            )}
          </div>

          {/* Input */}
          <div className="border-t border-border bg-card p-2 flex items-center gap-2">
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={onKeyDown}
              placeholder={listening ? c.listening : c.ph}
              disabled={loading}
              className="border-0 focus-visible:ring-0 focus-visible:ring-offset-0"
            />
            <Button
              size="icon"
              variant={listening ? "destructive" : "ghost"}
              onClick={toggleVoice}
              disabled={loading}
              aria-label={listening ? "Stop voice input" : "Start voice input"}
              className={listening ? "animate-pulse" : ""}
            >
              {listening ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
            </Button>
            <Button
              size="icon"
              onClick={send}
              disabled={loading || !input.trim()}
              aria-label="Send"
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            </Button>
          </div>
        </div>
      )}
    </>
  );
};

export default ChatBot;
