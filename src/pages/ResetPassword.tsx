import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Leaf, Loader2, Lock } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/contexts/LanguageContext";

const COPY: Record<string, any> = {
  en: {
    title: "Set a new password", desc: "Enter your new password below.",
    newPw: "New password", confirmPw: "Confirm password",
    update: "Update password", updated: "Password updated!",
    mismatch: "Passwords don't match", short: "Password must be at least 6 characters",
    invalidLink: "Invalid or expired reset link.",
  },
  hi: {
    title: "नया पासवर्ड सेट करें", desc: "नीचे अपना नया पासवर्ड दर्ज करें।",
    newPw: "नया पासवर्ड", confirmPw: "पासवर्ड की पुष्टि करें",
    update: "पासवर्ड अपडेट करें", updated: "पासवर्ड अपडेट हो गया!",
    mismatch: "पासवर्ड मेल नहीं खाते", short: "पासवर्ड कम से कम 6 अक्षर का हो",
    invalidLink: "अमान्य या समाप्त रीसेट लिंक।",
  },
  te: {
    title: "కొత్త పాస్‌వర్డ్ సెట్ చేయండి", desc: "క్రింద మీ కొత్త పాస్‌వర్డ్‌ని నమోదు చేయండి.",
    newPw: "కొత్త పాస్‌వర్డ్", confirmPw: "పాస్‌వర్డ్ నిర్ధారించండి",
    update: "పాస్‌వర్డ్ నవీకరించండి", updated: "పాస్‌వర్డ్ నవీకరించబడింది!",
    mismatch: "పాస్‌వర్డ్‌లు సరిపోలడం లేదు", short: "పాస్‌వర్డ్ కనీసం 6 అక్షరాలు ఉండాలి",
    invalidLink: "చెల్లని లేదా గడువు ముగిసిన రీసెట్ లింక్.",
  },
};

const ResetPassword = () => {
  const { lang } = useLanguage();
  const c = COPY[lang] ?? COPY.en;
  const navigate = useNavigate();
  const [pw, setPw] = useState("");
  const [pw2, setPw2] = useState("");
  const [loading, setLoading] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    // Supabase auto-handles the recovery hash and emits a PASSWORD_RECOVERY event.
    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY" || event === "SIGNED_IN") setReady(true);
    });
    // Also check existing session (link already processed)
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) setReady(true);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (pw.length < 6) return toast.error(c.short);
    if (pw !== pw2) return toast.error(c.mismatch);
    if (!ready) return toast.error(c.invalidLink);

    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: pw });
      if (error) throw error;
      toast.success(c.updated);
      navigate("/", { replace: true });
    } catch (err: any) {
      toast.error(err?.message || "Update failed");
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
                <Label htmlFor="np" className="flex items-center gap-2"><Lock className="h-4 w-4 text-primary" />{c.newPw}</Label>
                <Input id="np" type="password" required minLength={6} value={pw} onChange={(e) => setPw(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="np2" className="flex items-center gap-2"><Lock className="h-4 w-4 text-primary" />{c.confirmPw}</Label>
                <Input id="np2" type="password" required minLength={6} value={pw2} onChange={(e) => setPw2(e.target.value)} />
              </div>
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : c.update}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ResetPassword;
