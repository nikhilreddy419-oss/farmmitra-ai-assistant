import heroImg from "@/assets/hero-farm.jpg";
import FarmForm from "@/components/FarmForm";
import { Button } from "@/components/ui/button";
import { Leaf, Sprout, Sun, ShieldCheck, ArrowRight } from "lucide-react";

const Index = () => {
  const scrollToForm = () => document.getElementById("recommend")?.scrollIntoView({ behavior: "smooth" });

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
            <a href="#features" className="hover:text-primary-foreground transition-smooth">Features</a>
            <a href="#how" className="hover:text-primary-foreground transition-smooth">How it works</a>
            <a href="#recommend" className="hover:text-primary-foreground transition-smooth">Get advice</a>
          </nav>
          <Button variant="secondary" size="sm" onClick={scrollToForm}>Start now</Button>
        </div>
      </header>

      {/* Hero */}
      <section className="relative isolate overflow-hidden">
        <img
          src={heroImg}
          alt="Lush green Indian farmland at golden hour"
          width={1920}
          height={1280}
          className="absolute inset-0 h-full w-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-primary/80 via-primary/55 to-background" />
        <div className="container relative z-10 pt-36 pb-24 md:pt-44 md:pb-32">
          <div className="max-w-3xl text-primary-foreground animate-fade-up">
            <span className="inline-flex items-center gap-2 rounded-full bg-primary-foreground/10 backdrop-blur-sm ring-1 ring-primary-foreground/20 px-3 py-1 text-xs font-semibold uppercase tracking-wider">
              <Sprout className="h-3.5 w-3.5" /> AI-powered farming companion
            </span>
            <h1 className="mt-5 font-display text-4xl md:text-6xl font-extrabold leading-tight tracking-tight">
              Grow smarter with FarmMitra<span className="text-accent">.Ai</span>
            </h1>
            <p className="mt-5 text-lg md:text-xl text-primary-foreground/90 max-w-2xl">
              Personalized crop recommendations and farming guidance based on your land, soil,
              water, budget and rainfall — built for Indian farmers.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Button variant="hero" size="xl" onClick={scrollToForm}>
                Get my recommendation <ArrowRight className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="xl" className="bg-primary-foreground/10 text-primary-foreground border-primary-foreground/30 hover:bg-primary-foreground/20 hover:text-primary-foreground" asChild>
                <a href="#how">How it works</a>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="container py-20">
        <div className="grid gap-6 md:grid-cols-3">
          {[
            { icon: Sprout, title: "Crop suitability", desc: "Best crops matched to your soil, climate and water profile." },
            { icon: Sun, title: "Season-aware", desc: "Tailored to local rainfall and growing seasons." },
            { icon: ShieldCheck, title: "Budget-conscious", desc: "Recommendations that respect your investment range." },
          ].map((f) => (
            <div key={f.title} className="group rounded-2xl border border-border bg-gradient-card p-7 shadow-soft transition-smooth hover:-translate-y-1 hover:shadow-elegant">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-leaf text-primary-foreground shadow-soft">
                <f.icon className="h-5 w-5" />
              </div>
              <h3 className="mt-5 font-display text-xl font-semibold text-foreground">{f.title}</h3>
              <p className="mt-2 text-muted-foreground leading-relaxed">{f.desc}</p>
            </div>
          ))}
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
          <p>© {new Date().getFullYear()} FarmMitra.Ai — Cultivating smarter farms.</p>
        </div>
      </footer>
    </div>
  );
};

export default Index;
