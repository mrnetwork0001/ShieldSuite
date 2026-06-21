import React, { createContext, useContext, useState } from "react";
import { en, zh } from "../data/translations";

export type Language = "en" | "zh";

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [language, setLanguageState] = useState<Language>(() => {
    try {
      const saved = localStorage.getItem("shieldsuite_lang");
      if (saved === "zh" || saved === "en") return saved;
    } catch (e) {
      // localStorage might be unavailable or disabled
    }
    
    // Autodetect browser language if possible
    if (typeof navigator !== "undefined" && navigator.language && navigator.language.startsWith("zh")) {
      return "zh";
    }
    return "en";
  });

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    try {
      localStorage.setItem("shieldsuite_lang", lang);
    } catch (e) {
      // LocalStorage access could be restricted
    }
  };

  const t = (key: string): string => {
    const dict = language === "zh" ? zh : en;
    const value = (dict as any)[key];
    if (value !== undefined) return value;
    
    // Fallback to English dictionary
    const fallback = (en as any)[key];
    return fallback !== undefined ? fallback : key;
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error("useLanguage must be used within a LanguageProvider");
  }
  return context;
};
