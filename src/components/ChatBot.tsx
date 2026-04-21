import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MessageCircle, X, Send, Loader2, Sprout } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { toast } from "sonner";
import { useLanguage } from "@/contexts/LanguageContext";

type Msg = { role: "user" | "assistant"; content: string };

const COPY: Record<string, { title: string; sub: string; ph: string; greet: string; open: string }> = {
  en: {
    title: "Ask FarmMitra",
    sub: "Your farming assistant",
    ph: "Ask anything about your farm…",
    greet: "👋 Hi! I'm FarmMitra. Ask me about crops, soil, irrigation, fertilizers, pests, or market prices.",
    open: "Chat with FarmMitra",
  },
  hi: {
    title: "FarmMitra से पूछें",
    sub: "आपका कृषि सहायक",
    ph: "अपने खेत के बारे में कुछ भी पूछें…",
    greet: "👋 नमस्ते! मैं FarmMitra हूँ। फसल, मिट्टी, सिंचाई, उर्वरक, कीट या बाज़ार भाव के बारे में पूछें।",
    open: "FarmMitra से बात करें",
  },
  te: {
    title: "FarmMitra ని అడగండి",
    sub: "మీ వ్యవసాయ సహాయకుడు",
    ph: "మీ పొలం గురించి ఏదైనా అడగండి…",
    greet: "👋 నమస్కారం! నేను FarmMitra. పంటలు, నేల, నీటిపారుదల, ఎరువులు, పురుగులు లేదా మార్కెట్ ధరల గురించి అడగండి.",
    open: "FarmMitra తో చాట్ చేయండి",
  },
};

const ChatBot = () => {
  const { lang } = useLanguage();
  const c = COPY[lang] ?? COPY.en;

  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState<Msg[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Reset greeting when language changes
  useEffect(() => {
    setMessages([{ role: "assistant", content: c.greet }]);
  }, [lang]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, loading]);

  const send = async () => {
    const text = input.trim();
    if (!text || loading) return;
    setInput("");

    const userMsg: Msg = { role: "user", content: text };
    const history = [...messages, userMsg];
    setMessages(history);
    setLoading(true);

    // Strip greeting (it's UI-only) before sending
    const sendable = history.filter((m, i) => !(i === 0 && m.role === "assistant" && m.content === c.greet));

    const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/farm-chat`;

    let assistantSoFar = "";
    const upsert = (chunk: string) => {
      assistantSoFar += chunk;
      setMessages((prev) => {
        const last = prev[prev.length - 1];
        if (last?.role === "assistant" && last.content !== c.greet) {
          return prev.map((m, i) => (i === prev.length - 1 ? { ...m, content: assistantSoFar } : m));
        }
        return [...prev, { role: "assistant", content: assistantSoFar }];
      });
    };

    try {
      const resp = await fetch(CHAT_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({ messages: sendable, language: lang }),
      });

      if (resp.status === 429) {
        toast.error("Too many requests. Please wait a moment.");
        setLoading(false);
        return;
      }
      if (resp.status === 402) {
        toast.error("AI credits exhausted. Add funds in workspace settings.");
        setLoading(false);
        return;
      }
      if (!resp.ok || !resp.body) {
        toast.error("Chat failed. Please try again.");
        setLoading(false);
        return;
      }

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let buf = "";
      let done = false;

      while (!done) {
        const { done: rd, value } = await reader.read();
        if (rd) break;
        buf += decoder.decode(value, { stream: true });

        let nl: number;
        while ((nl = buf.indexOf("\n")) !== -1) {
          let line = buf.slice(0, nl);
          buf = buf.slice(nl + 1);
          if (line.endsWith("\r")) line = line.slice(0, -1);
          if (line.startsWith(":") || line.trim() === "") continue;
          if (!line.startsWith("data: ")) continue;

          const json = line.slice(6).trim();
          if (json === "[DONE]") { done = true; break; }

          try {
            const parsed = JSON.parse(json);
            const delta = parsed.choices?.[0]?.delta?.content as string | undefined;
            if (delta) upsert(delta);
          } catch {
            buf = line + "\n" + buf;
            break;
          }
        }
      }
    } catch (e: any) {
      console.error(e);
      toast.error(e?.message || "Chat failed");
    } finally {
      setLoading(false);
    }
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send();
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
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  …
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
              placeholder={c.ph}
              disabled={loading}
              className="border-0 focus-visible:ring-0 focus-visible:ring-offset-0"
            />
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
