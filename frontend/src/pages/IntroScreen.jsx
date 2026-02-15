import React from 'react';
import { useLanguage } from '../context/LanguageContext';

const LOGO_URL = "https://customer-assets.emergentagent.com/job_rainbow-mates-2/artifacts/ye9ehtif_logo.png?v=2";

const INTRO_IMAGES = [
  { 
    url: 'https://customer-assets.emergentagent.com/job_rainbow-mates-2/artifacts/fg8hrzqq_chatting%20in%20bed.png',
    labelKey: 'textAndTalk'
  },
  { 
    url: 'https://customer-assets.emergentagent.com/job_rainbow-mates-2/artifacts/j247vldb_Go%20shopping.png',
    labelKey: 'shoppingAdvice'
  },
  { 
    url: 'https://customer-assets.emergentagent.com/job_rainbow-mates-2/artifacts/1j3c6xv8_Sing-a-long.png',
    labelKey: 'chillTime'
  },
  { 
    url: 'https://customer-assets.emergentagent.com/job_rainbow-mates-2/artifacts/guxu8us3_Have%20a%20laugh.png',
    labelKey: 'relationshipAdvice'
  }
];

function ImageCard({ image, t }) {
  return (
    <div className="flex flex-col items-center">
      <div className="w-full aspect-square rounded-2xl overflow-hidden shadow-lg border-2 border-white/50">
        <img src={image.url} alt={t(image.labelKey)} className="w-full h-full object-cover" />
      </div>
      <span className="mt-2 text-sm font-semibold text-dark-purple bg-white/80 px-3 py-1 rounded-full shadow-sm">
        {t(image.labelKey)}
      </span>
    </div>
  );
}

export default function IntroScreen({ onNext }) {
  const { t } = useLanguage();
  
  return (
    <div className="app-container gradient-mesh min-h-screen flex flex-col">
      <div className="text-center pt-8 pb-4 px-6">
        <img src={LOGO_URL} alt={t('appName')} className="w-20 h-20 mx-auto object-contain mb-2" style={{ background: 'transparent' }} />
        <h1 className="text-2xl font-bold text-dark-purple" style={{ fontFamily: 'Nunito, sans-serif' }}>
          {t('appName')}
        </h1>
        <p className="text-dark-purple/70 text-sm mt-1">{t('introTitle')}</p>
      </div>

      <div className="flex-1 mx-4 rounded-3xl bg-white/30 backdrop-blur-sm border border-white/50 p-4">
        <div className="grid grid-cols-2 gap-4 h-full">
          {INTRO_IMAGES.map((image, index) => (
            <ImageCard key={index} image={image} t={t} />
          ))}
        </div>
      </div>

      <div className="p-6">
        <button 
          data-testid="intro-next-button" 
          onClick={onNext} 
          className="w-full py-4 rounded-full bg-neon-pink text-white font-bold text-lg hover:opacity-90 transition-all shadow-lg"
        >
          {t('next')}
        </button>
      </div>
    </div>
  );
}
