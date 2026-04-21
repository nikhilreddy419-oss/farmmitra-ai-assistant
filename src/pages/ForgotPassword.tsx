import { useState } from "react";
import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Leaf, Loader2, Mail } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/contexts/LanguageContext";

const COPY: Record<string, any> = {
  en: {
    title: "Forgot password", desc: "We'll email you a link to reset your password.",
    email: "Email", send: "Send reset link", sent: "Check your email for the reset link.",
    back: "← Back to sign in",
  },
  hi: {
    title: "पासवर्ड भूल गए?", desc: "हम आपको पासवर्ड रीसेट करने के लिए लिंक भेजेंगे।",
    email: "ईमेल", send: "रीसेट लिंक भेजें", sent: "रीसेट लिंक के लिए अपना ईमेल देखें।",
    back: "← साइन इन पर वापस",
  },
  te: {
    title: "పాస్‌వర్డ్ మర్చిపోయారా?", desc: "మీ పాస్‌వర్డ్ రీసెట్ చేయడానికి మేము లింక్ ఇమెయిల్ పంపుతాము.",
    email: "ఇమెయిల్", send: "రీసెట్ లింక్ పంపండి", sent: "రీసెట్ లింక్ కోసం మీ ఇమెయిల్ చూడండి.",
    back: "← సైన్ ఇన్‌కి తిరిగి",
  },
};

const ForgotPassword = () => {
  const { lang } = useLanguage();
  const c = COPY[lang] ?? COPY.en;
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      if (error) throw error;
      toast.success(c.sent);
    } catch (err: any) {
      toast.error(err?.message || "Request failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/10 via-background to-accent/10 p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-6">
          <div className="inline-flex items-center gap-2 text-primary">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-soft">
              <Leaf className="h-5 w-5" />
            </span>
            <span className="font-display text-2xl font-bold">FarmMitra<span className="text-accent">.Ai</span></span>
          </div>
        </div>

        <Card className="shadow-elegant border-border/60">
          <CardHeader className="text-center">
            <CardTitle className="font-display text-2xl">{c.title}</CardTitle>
            <CardDescription>{c.desc}</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="fp-email" className="flex items-center gap-2">
                  <Mail className="h-4 w-4 text-primary" />{c.email}
                </Label>
                <Input id="fp-email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
              </div>
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : c.send}
              </Button>
            </form>
            <div className="mt-6 text-center">
              <Link to="/auth" className="text-sm text-muted-foreground hover:text-primary transition-smooth">
                {c.back}
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ForgotPassword;
