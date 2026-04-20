import { useEffect, useState } from "react";
import { useNavigate, useLocation, Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Leaf, Loader2, Mail, Lock } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";

const COPY: Record<string, any> = {
  en: {
    title: "Welcome to FarmMitra.Ai", desc: "Sign in to sync your recommendations across devices.",
    signIn: "Sign in", signUp: "Sign up", email: "Email", password: "Password",
    google: "Continue with Google", or: "or",
    signInBtn: "Sign in", signUpBtn: "Create account",
    signedIn: "Signed in!", signedUp: "Account created!",
    backHome: "← Back to home",
  },
  hi: {
    title: "FarmMitra.Ai में आपका स्वागत है", desc: "अपनी सिफ़ारिशें सभी डिवाइस पर सिंक करने के लिए साइन इन करें।",
    signIn: "साइन इन", signUp: "साइन अप", email: "ईमेल", password: "पासवर्ड",
    google: "Google से जारी रखें", or: "या",
    signInBtn: "साइन इन करें", signUpBtn: "खाता बनाएँ",
    signedIn: "साइन इन हो गया!", signedUp: "खाता बन गया!",
    backHome: "← होम पर वापस जाएँ",
  },
  te: {
    title: "FarmMitra.Ai కి స్వాగతం", desc: "మీ సిఫారసులను అన్ని పరికరాలలో సింక్ చేయడానికి సైన్ ఇన్ చేయండి.",
    signIn: "సైన్ ఇన్", signUp: "సైన్ అప్", email: "ఇమెయిల్", password: "పాస్‌వర్డ్",
    google: "Google తో కొనసాగించండి", or: "లేదా",
    signInBtn: "సైన్ ఇన్ చేయండి", signUpBtn: "ఖాతా సృష్టించండి",
    signedIn: "సైన్ ఇన్ అయింది!", signedUp: "ఖాతా సృష్టించబడింది!",
    backHome: "← హోమ్‌కి తిరిగి",
  },
};

const Auth = () => {
  const { lang } = useLanguage();
  const c = COPY[lang] ?? COPY.en;
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as any)?.from || "/";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (user) navigate(from, { replace: true });
  }, [user, from, navigate]);

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      toast.success(c.signedIn);
    } catch (err: any) {
      toast.error(err?.message || "Sign in failed");
    } finally {
      setLoading(false);
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: { emailRedirectTo: `${window.location.origin}/` },
      });
      if (error) throw error;
      toast.success(c.signedUp);
    } catch (err: any) {
      toast.error(err?.message || "Sign up failed");
    } finally {
      setLoading(false);
    }
  };

  const handleGoogle = async () => {
    setLoading(true);
    try {
      const result = await lovable.auth.signInWithOAuth("google", {
        redirect_uri: window.location.origin,
      });
      if (result.error) {
        toast.error((result.error as Error).message || "Google sign-in failed");
        setLoading(false);
        return;
      }
      // result.redirected: browser will navigate; otherwise tokens were set inline
    } catch (err: any) {
      toast.error(err?.message || "Google sign-in failed");
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/10 via-background to-accent/10 p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-6">
          <div className="inline-flex items-center gap-2 mb-3 text-primary">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-soft">
              <Leaf className="h-5 w-5" />
            </span>
            <span className="font-display text-2xl font-bold">FarmMitra<span className="text-accent">.Ai</span></span>
          </div>
        </div>

        <Card className="shadow-elegant border-border/60">
          <CardHeader className="text-center space-y-1">
            <CardTitle className="font-display text-2xl">{c.title}</CardTitle>
            <CardDescription>{c.desc}</CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              type="button"
              variant="outline"
              className="w-full mb-4"
              onClick={handleGoogle}
              disabled={loading}
            >
              <svg className="h-4 w-4" viewBox="0 0 24 24" aria-hidden="true">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.99.66-2.25 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.1A6.97 6.97 0 0 1 5.47 12c0-.73.13-1.44.36-2.1V7.07H2.18A11 11 0 0 0 1 12c0 1.78.43 3.46 1.18 4.93l3.66-2.83z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.83C6.71 7.31 9.14 5.38 12 5.38z"/>
              </svg>
              {c.google}
            </Button>

            <div className="relative my-4">
              <div className="absolute inset-0 flex items-center"><span className="w-full border-t border-border" /></div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-card px-2 text-muted-foreground">{c.or}</span>
              </div>
            </div>

            <Tabs defaultValue="signin">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="signin">{c.signIn}</TabsTrigger>
                <TabsTrigger value="signup">{c.signUp}</TabsTrigger>
              </TabsList>

              <TabsContent value="signin">
                <form onSubmit={handleSignIn} className="space-y-4 mt-4">
                  <div className="space-y-2">
                    <Label htmlFor="si-email" className="flex items-center gap-2"><Mail className="h-4 w-4 text-primary" />{c.email}</Label>
                    <Input id="si-email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="si-pw" className="flex items-center gap-2"><Lock className="h-4 w-4 text-primary" />{c.password}</Label>
                    <Input id="si-pw" type="password" required value={password} onChange={(e) => setPassword(e.target.value)} />
                  </div>
                  <Button type="submit" className="w-full" disabled={loading}>
                    {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : c.signInBtn}
                  </Button>
                </form>
              </TabsContent>

              <TabsContent value="signup">
                <form onSubmit={handleSignUp} className="space-y-4 mt-4">
                  <div className="space-y-2">
                    <Label htmlFor="su-email" className="flex items-center gap-2"><Mail className="h-4 w-4 text-primary" />{c.email}</Label>
                    <Input id="su-email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="su-pw" className="flex items-center gap-2"><Lock className="h-4 w-4 text-primary" />{c.password}</Label>
                    <Input id="su-pw" type="password" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} />
                  </div>
                  <Button type="submit" className="w-full" disabled={loading}>
                    {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : c.signUpBtn}
                  </Button>
                </form>
              </TabsContent>
            </Tabs>

            <div className="mt-6 text-center">
              <Link to="/" className="text-sm text-muted-foreground hover:text-primary transition-smooth">
                {c.backHome}
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Auth;
