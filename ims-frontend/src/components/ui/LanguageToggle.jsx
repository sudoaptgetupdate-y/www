// src/components/ui/LanguageToggle.jsx

import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";

export function LanguageToggle() {
  const { i18n } = useTranslation();

  const toggleLanguage = () => {
    const newLang = i18n.language === 'th' ? 'en' : 'th';
    i18n.changeLanguage(newLang);
  };

  return (
    <Button variant="ghost" size="icon" onClick={toggleLanguage} className="h-9 w-9">
      <span className="text-lg">
        {i18n.language === 'th' ? '🇹🇭' : '🇬🇧'}
      </span>
      <span className="sr-only">Toggle language</span>
    </Button>
  );
}