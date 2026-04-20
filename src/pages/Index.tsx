import heroImg from "@/assets/hero-farm.jpg";
import FarmForm from "@/components/FarmForm";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import { Button } from "@/components/ui/button";
import { Leaf, Sprout, Sun, ShieldCheck, ArrowRight } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";

const Index = () => {
  const { tr } = useLanguage();
  const scrollToForm = () => document.getElementById("recommend")?.scrollIntoView({ behavior: "smooth" });
  const featureIcons = [Sprout, Sun, ShieldCheck];

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="absolute inset-x-0 top-0 z-20">
        <div className="container flex items-center justify-between py-5">
          <a href="/" className="flex items-center gap-2 text-primary-foreground">
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary-foreground/15 backdrop-blur-sm ring-1 ring-primary-foreground/20">
              <Leaf className="h-5 w-5" />
            </span>
            <span className="font-display text-xl font-bold tracking-tight">FarmMitra<span className="text-accent">.Ai</span></span>
          </a>
          <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-primary-foreground/90">
            <a href="#features" className="hover:text-primary-foreground transition-smooth">{tr.nav.features}</a>
            <a href="#how" className="hover:text-primary-foreground transition-smooth">{tr.nav.how}</a>
            <a href="#recommend" className="hover:text-primary-foreground transition-smooth">{tr.nav.advice}</a>
          </nav>
          <div className="flex items-center gap-2">
            <LanguageSwitcher />
            <Button variant="secondary" size="sm" onClick={scrollToForm} className="hidden sm:inline-flex">{tr.nav.start}</Button>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative isolate overflow-hidden min-h-[92vh] flex items-center">
        <img
          src={heroImg}
          alt="Lush green Indian farmland at golden hour"
          width={1920}
          height={1280}
          className="absolute inset-0 h-full w-full object-cover scale-105"
        />
        <div className="absolute inset-0 bg-gradient-to-br from-primary/85 via-primary/60 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/40 to-transparent" />
        <div className="absolute -top-24 -left-24 h-96 w-96 rounded-full bg-accent/30 blur-3xl" />
        <div className="absolute bottom-10 right-0 h-80 w-80 rounded-full bg-primary-glow/30 blur-3xl" />

        <div className="container relative z-10 pt-32 pb-20 md:pt-40 md:pb-28">
          <div className="grid lg:grid-cols-12 gap-10 items-center">
            <div className="lg:col-span-7 text-primary-foreground animate-fade-up">
              <span className="inline-flex items-center gap-2 rounded-full bg-primary-foreground/10 backdrop-blur-md ring-1 ring-primary-foreground/30 px-4 py-1.5 text-xs font-semibold uppercase tracking-wider shadow-soft">
                <Sprout className="h-3.5 w-3.5" /> {tr.hero.badge}
              </span>
              <h1 className="mt-6 font-display text-5xl md:text-7xl font-extrabold leading-[1.05] tracking-tight">
                {tr.hero.title1}
                <br />
                <span className="bg-gradient-to-r from-accent via-primary-foreground to-accent bg-clip-text text-transparent">
                  {tr.hero.title2}
                </span>
              </h1>
              <p className="mt-6 text-lg md:text-xl text-primary-foreground/90 max-w-2xl leading-relaxed">
                {tr.hero.desc}
              </p>
              <div className="mt-9 flex flex-wrap gap-3">
                <Button variant="hero" size="xl" onClick={scrollToForm} className="shadow-elegant">
                  {tr.hero.cta} <ArrowRight className="h-4 w-4" />
                </Button>
                <Button variant="outline" size="xl" className="bg-primary-foreground/10 text-primary-foreground border-primary-foreground/30 hover:bg-primary-foreground/20 hover:text-primary-foreground backdrop-blur-md" asChild>
                  <a href="#features">{tr.hero.how}</a>
                </Button>
              </div>

              <div className="mt-10 grid grid-cols-3 gap-4 max-w-lg">
                {[
                  { k: "10k+", v: tr.hero.stats.farmers },
                  { k: "50+", v: tr.hero.stats.crops },
                  { k: "24/7", v: tr.hero.stats.guidance },
                ].map((s) => (
                  <div key={s.v} className="rounded-xl bg-primary-foreground/10 backdrop-blur-md ring-1 ring-primary-foreground/20 p-3 text-center">
                    <div className="font-display text-2xl font-bold">{s.k}</div>
                    <div className="text-xs text-primary-foreground/80">{s.v}</div>
                  </div>
                ))}
              </div>
            </div>

            <div className="lg:col-span-5 hidden lg:block animate-fade-up">
              <div className="relative">
                <div className="absolute -inset-4 bg-gradient-to-br from-accent/40 to-primary-glow/30 blur-2xl rounded-3xl" />
                <div className="relative rounded-3xl bg-card/95 backdrop-blur-xl border border-border/60 shadow-elegant p-6 space-y-4">
                  <div className="flex items-center gap-2 text-primary">
                    <Sprout className="h-5 w-5" />
                    <span className="text-xs font-semibold uppercase tracking-wider">{tr.hero.sample}</span>
                  </div>
                  <h3 className="font-display text-xl font-bold text-foreground">{tr.hero.sampleTitle}</h3>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    {[
                      { l: tr.hero.soil, v: "Black loamy" },
                      { l: tr.hero.water, v: "Medium" },
                      { l: tr.hero.season, v: "Rabi" },
                      { l: tr.hero.profit, v: "₹65k / acre" },
                    ].map((i) => (
                      <div key={i.l} className="rounded-lg bg-secondary/60 px-3 py-2">
                        <div className="text-xs text-muted-foreground">{i.l}</div>
                        <div className="font-semibold text-foreground">{i.v}</div>
                      </div>
                    ))}
                  </div>
                  <div className="h-2 rounded-full bg-secondary overflow-hidden">
                    <div className="h-full w-4/5 bg-gradient-leaf" />
                  </div>
                  <p className="text-xs text-muted-foreground">{tr.hero.score}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="container py-20">
        <div className="grid gap-6 md:grid-cols-3">
          {tr.features.items.map((f, i) => {
            const Icon = featureIcons[i];
            return (
              <div key={f.title} className="group rounded-2xl border border-border bg-gradient-card p-7 shadow-soft transition-smooth hover:-translate-y-1 hover:shadow-elegant">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-leaf text-primary-foreground shadow-soft">
                  <Icon className="h-5 w-5" />
                </div>
                <h3 className="mt-5 font-display text-xl font-semibold text-foreground">{f.title}</h3>
                <p className="mt-2 text-muted-foreground leading-relaxed">{f.desc}</p>
              </div>
            );
          })}
        </div>
      </section>

      {/* Form */}
      <section id="how" className="container pb-24">
        <FarmForm />
      </section>

      {/* Footer */}
      <footer className="border-t border-border bg-secondary/30">
        <div className="container py-8 flex flex-col md:flex-row items-center justify-between gap-3 text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <Leaf className="h-4 w-4 text-primary" />
            <span className="font-display font-semibold text-foreground">FarmMitra.Ai</span>
          </div>
          <p>© {new Date().getFullYear()} FarmMitra.Ai — {tr.footer}</p>
        </div>
      </footer>
    </div>
  );
};

export default Index;
