import React from 'react';

const LOGO_URL = "https://customer-assets.emergentagent.com/job_rainbow-mates-2/artifacts/ye9ehtif_logo.png?v=2";

const INTRO_IMAGES = [
  { 
    url: 'https://customer-assets.emergentagent.com/job_rainbow-mates-2/artifacts/fg8hrzqq_chatting%20in%20bed.png',
    label: 'Text and Talk'
  },
  { 
    url: 'https://customer-assets.emergentagent.com/job_rainbow-mates-2/artifacts/j247vldb_Go%20shopping.png',
    label: 'Shopping advice'
  },
  { 
    url: 'https://customer-assets.emergentagent.com/job_rainbow-mates-2/artifacts/1j3c6xv8_Sing-a-long.png',
    label: 'Chill time'
  },
  { 
    url: 'https://customer-assets.emergentagent.com/job_rainbow-mates-2/artifacts/guxu8us3_Have%20a%20laugh.png',
    label: 'Relationship advice'
  }
];

function ImageCard({ image }) {
  return (
    <div className="flex flex-col items-center">
      <div className="w-full aspect-square rounded-2xl overflow-hidden shadow-lg border-2 border-white/50">
        <img src={image.url} alt={image.label} className="w-full h-full object-cover" />
      </div>
      <span className="mt-2 text-sm font-semibold text-dark-purple bg-white/80 px-3 py-1 rounded-full shadow-sm">
        {image.label}
      </span>
    </div>
  );
}

export default function IntroScreen({ onNext }) {
  return (
    <div className="app-container gradient-mesh min-h-screen flex flex-col">
      <div className="text-center pt-8 pb-4 px-6">
        <img src={LOGO_URL} alt="Rainbow Mates" className="w-20 h-20 mx-auto object-contain mb-2" style={{ background: 'transparent' }} />
        <h1 className="text-2xl font-bold text-dark-purple" style={{ fontFamily: 'Nunito, sans-serif' }}>
          Introducing Rainbow Mates
        </h1>
        <p className="text-dark-purple/70 text-sm mt-1">Girls, Make Your Gay Best Mate here</p>
      </div>

      <div className="flex-1 mx-4 rounded-3xl bg-white/30 backdrop-blur-sm border border-white/50 p-4">
        <div className="grid grid-cols-2 gap-4 h-full">
          {INTRO_IMAGES.map((image, index) => (
            <ImageCard key={index} image={image} />
          ))}
        </div>
      </div>

      <div className="p-6">
        <button 
          data-testid="intro-next-button" 
          onClick={onNext} 
          className="w-full py-4 rounded-full text-white font-bold text-lg transition-all shadow-lg"
          style={{ backgroundColor: '#E989EA' }}
        >
          Next
        </button>
      </div>
    </div>
  );
}
