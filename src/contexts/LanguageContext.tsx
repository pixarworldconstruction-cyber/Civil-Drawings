import React, { createContext, useContext, useState, useEffect } from 'react';
import { Language, translations } from '../translations';

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: keyof typeof translations['en'], params?: Record<string, string | number>) => string;
  formatNumber: (num: number | string) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguageState] = useState<Language>(() => {
    const saved = localStorage.getItem('language');
    return (saved as Language) || 'en';
  });

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    localStorage.setItem('language', lang);
  };

  const t = (key: keyof typeof translations['en'], params?: Record<string, string | number>) => {
    let text = translations[language][key] || translations['en'][key] || key;
    if (params) {
      Object.entries(params).forEach(([k, v]) => {
        text = text.replace(`{${k}}`, String(v));
      });
    }
    return text;
  };

  const formatNumber = (num: number | string) => {
    const n = typeof num === 'string' ? parseFloat(num.replace(/[^0-9.-]+/g, "")) : num;
    if (isNaN(n)) return String(num);

    const locale = language === 'en' ? 'en-IN' : language === 'gu' ? 'gu-IN' : 'hi-IN';
    
    // For digits translation, we might need a manual map if Intl doesn't do it
    const standardDigits = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9'];
    const guDigits = ['૦', '૧', '૨', '૩', '૪', '૫', '૬', '૭', '૮', '૯'];
    const hiDigits = ['०', '१', '२', '३', '४', '५', '६', '७', '८', '९'];

    let formatted = new Intl.NumberFormat(locale).format(n);

    if (language === 'gu') {
      return formatted.split('').map(char => {
        const index = standardDigits.indexOf(char);
        return index !== -1 ? guDigits[index] : char;
      }).join('');
    }
    if (language === 'hi') {
      return formatted.split('').map(char => {
        const index = standardDigits.indexOf(char);
        return index !== -1 ? hiDigits[index] : char;
      }).join('');
    }

    return formatted;
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t, formatNumber }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
}
