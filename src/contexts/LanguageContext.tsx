import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { Lang, t } from "@/lib/i18n";

type Ctx = {
  lang: Lang;
  setLang: (l: Lang) => void;
  tr: (typeof t)[Lang];
};

const LanguageContext = createContext<Ctx | undefined>(undefined);

export const LanguageProvider = ({ children }: { children: ReactNode }) => {
  const [lang, setLangState] = useState<Lang>(() => {
    const saved = typeof window !== "undefined" ? (localStorage.getItem("fm-lang") as Lang | null) : null;
    return saved && ["en", "hi", "te"].includes(saved) ? saved : "en";
  });

  useEffect(() => {
    localStorage.setItem("fm-lang", lang);
    document.documentElement.lang = lang;
  }, [lang]);

  return (
    <LanguageContext.Provider value={{ lang, setLang: setLangState, tr: t[lang] }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error("useLanguage must be used within LanguageProvider");
  return ctx;
};
