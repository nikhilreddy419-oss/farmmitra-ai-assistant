import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Leaf, Loader2, ArrowLeft, User as UserIcon } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";

const COPY: Record<string, any> = {
  en: {
    title: "Your profile", desc: "Update your farmer profile details.",
    displayName: "Display name", farmName: "Farm name", location: "Location", avatarUrl: "Avatar URL",
    save: "Save changes", saved: "Profile updated!", back: "← Back",
    email: "Email",
  },
  hi: {
    title: "आपकी प्रोफ़ाइल", desc: "अपनी किसान प्रोफ़ाइल अपडेट करें।",
    displayName: "प्रदर्शन नाम", farmName: "खेत का नाम", location: "स्थान", avatarUrl: "अवतार URL",
    save: "बदलाव सहेजें", saved: "प्रोफ़ाइल अपडेट हो गई!", back: "← वापस",
    email: "ईमेल",
  },
  te: {
    title: "మీ ప్రొఫైల్", desc: "మీ రైతు ప్రొఫైల్ వివరాలను నవీకరించండి.",
    displayName: "ప్రదర్శన పేరు", farmName: "పొలం పేరు", location: "ప్రాంతం", avatarUrl: "అవతార్ URL",
    save: "మార్పులు సేవ్ చేయండి", saved: "ప్రొఫైల్ నవీకరించబడింది!", back: "← వెనుకకు",
    email: "ఇమెయిల్",
  },
};

const Profile = () => {
  const { user } = useAuth();
  const { lang } = useLanguage();
  const c = COPY[lang] ?? COPY.en;
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [displayName, setDisplayName] = useState("");
  const [farmName, setFarmName] = useState("");
  const [location, setLocation] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("display_name, farm_name, location, avatar_url")
        .eq("user_id", user.id)
        .maybeSingle();
      if (error) {
        console.warn(error);
      } else if (data) {
        setDisplayName(data.display_name ?? "");
        setFarmName(data.farm_name ?? "");
        setLocation(data.location ?? "");
        setAvatarUrl(data.avatar_url ?? "");
      }
      setLoading(false);
    })();
  }, [user]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setSaving(true);
    try {
      const { error } = await supabase
        .from("profiles")
        .upsert(
          {
            user_id: user.id,
            display_name: displayName || null,
            farm_name: farmName || null,
            location: location || null,
            avatar_url: avatarUrl || null,
          },
          { onConflict: "user_id" }
        );
      if (error) throw error;
      toast.success(c.saved);
    } catch (err: any) {
      toast.error(err?.message || "Save failed");
    } finally {
      setSaving(false);
    }
  };

  const initials = (displayName || user?.email || "U").slice(0, 2).toUpperCase();

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/10 via-background to-accent/10 p-4">
      <div className="max-w-2xl mx-auto pt-8">
        <div className="flex items-center justify-between mb-6">
          <Link to="/" className="inline-flex items-center gap-2 text-primary">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-soft">
              <Leaf className="h-5 w-5" />
            </span>
            <span className="font-display text-2xl font-bold">FarmMitra<span className="text-accent">.Ai</span></span>
          </Link>
          <Button variant="ghost" size="sm" onClick={() => navigate("/")}>
            <ArrowLeft className="h-4 w-4 mr-1" /> {c.back}
          </Button>
        </div>

        <Card className="shadow-elegant border-border/60">
          <CardHeader>
            <CardTitle className="font-display text-2xl flex items-center gap-2">
              <UserIcon className="h-5 w-5 text-primary" /> {c.title}
            </CardTitle>
            <CardDescription>{c.desc}</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
            ) : (
              <form onSubmit={handleSave} className="space-y-5">
                <div className="flex items-center gap-4">
                  <Avatar className="h-16 w-16">
                    {avatarUrl && <AvatarImage src={avatarUrl} alt={displayName} />}
                    <AvatarFallback className="bg-primary text-primary-foreground">{initials}</AvatarFallback>
                  </Avatar>
                  <div className="text-sm text-muted-foreground">
                    <div className="font-medium text-foreground">{c.email}</div>
                    <div className="truncate">{user?.email}</div>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="dn">{c.displayName}</Label>
                  <Input id="dn" value={displayName} onChange={(e) => setDisplayName(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="fn">{c.farmName}</Label>
                  <Input id="fn" value={farmName} onChange={(e) => setFarmName(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="loc">{c.location}</Label>
                  <Input id="loc" value={location} onChange={(e) => setLocation(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="av">{c.avatarUrl}</Label>
                  <Input id="av" type="url" placeholder="https://..." value={avatarUrl} onChange={(e) => setAvatarUrl(e.target.value)} />
                </div>

                <Button type="submit" className="w-full" disabled={saving}>
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : c.save}
                </Button>
              </form>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Profile;
