import React from 'react';
import { useLanguage } from '../context/LanguageContext';
import { languageNames, languageFlags } from '../utils/translations';
import { Check } from 'lucide-react';

export default function LanguageSelector({ onClose }) {
  const { language, setLanguage, t } = useLanguage();
  
  const languages = [
    { code: 'en', name: languageNames.en, flag: languageFlags.en },
    { code: 'fr', name: languageNames.fr, flag: languageFlags.fr },
    { code: 'it', name: languageNames.it, flag: languageFlags.it },
    { code: 'de', name: languageNames.de, flag: languageFlags.de },
    { code: 'es', name: languageNames.es, flag: languageFlags.es },
    { code: 'pt', name: languageNames.pt, flag: languageFlags.pt },
  ];

  const handleSelect = (code) => {
    setLanguage(code);
    if (onClose) onClose();
  };

  return (
    <div className="space-y-2">
      <h3 className="text-lg font-bold text-dark-purple mb-4">{t('selectLanguage')}</h3>
      {languages.map((lang) => (
        <button
          key={lang.code}
          onClick={() => handleSelect(lang.code)}
          className={`w-full flex items-center justify-between p-4 rounded-xl border transition-all ${
            language === lang.code
              ? 'border-neon-pink bg-neon-pink/10'
              : 'border-border hover:border-neon-pink/50 hover:bg-muted'
          }`}
        >
          <div className="flex items-center gap-3">
            <span className="text-2xl">{lang.flag}</span>
            <span className="font-medium text-dark-purple">{lang.name}</span>
          </div>
          {language === lang.code && (
            <Check className="w-5 h-5 text-neon-pink" />
          )}
        </button>
      ))}
    </div>
  );
}
