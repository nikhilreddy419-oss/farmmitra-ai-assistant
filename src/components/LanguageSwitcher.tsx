import { Languages } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { Lang, LANG_LABELS } from "@/lib/i18n";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";

const LanguageSwitcher = ({ variant = "ghost" }: { variant?: "ghost" | "outline" }) => {
  const { lang, setLang } = useLanguage();
  const langs: Lang[] = ["en", "hi", "te"];

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant={variant}
          size="sm"
          aria-label="Change language"
          className="gap-2 bg-primary-foreground/10 text-primary-foreground hover:bg-primary-foreground/20 hover:text-primary-foreground border border-primary-foreground/20 backdrop-blur-md"
        >
          <Languages className="h-4 w-4" />
          <span className="font-medium">{LANG_LABELS[lang]}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-[140px]">
        {langs.map((l) => (
          <DropdownMenuItem
            key={l}
            onClick={() => setLang(l)}
            className={lang === l ? "bg-secondary font-semibold" : ""}
          >
            {LANG_LABELS[l]}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default LanguageSwitcher;
