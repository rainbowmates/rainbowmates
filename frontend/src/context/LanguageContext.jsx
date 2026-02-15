import React, { createContext, useContext, useState, useEffect } from 'react';
import { translations } from '../utils/translations';

const LanguageContext = createContext();

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};

export const LanguageProvider = ({ children }) => {
  const [language, setLanguage] = useState(() => {
    // Get saved language or default to English
    const saved = localStorage.getItem('rainbow_mates_language');
    return saved || 'en';
  });

  useEffect(() => {
    localStorage.setItem('rainbow_mates_language', language);
  }, [language]);

  // Get translation for a key
  const t = (key) => {
    return translations[language]?.[key] || translations['en']?.[key] || key;
  };

  const value = {
    language,
    setLanguage,
    t
  };

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  );
};

export default LanguageContext;
