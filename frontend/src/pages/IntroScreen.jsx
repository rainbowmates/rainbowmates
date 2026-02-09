import React from 'react';

const LOGO_URL = "https://customer-assets.emergentagent.com/job_rainbow-mates-2/artifacts/ye9ehtif_logo.png?v=2";

export default function IntroScreen({ onNext }) {
  return (
    <div className="app-container gradient-mesh min-h-screen flex flex-col">
      {/* Main Content Area - will be filled with images/messages later */}
      <div className="flex-1 flex flex-col items-center justify-center p-6">
        <img 
          src={LOGO_URL} 
          alt="Rainbow Mates" 
          className="w-32 h-32 object-contain mb-6"
        />
        <h1 
          className="text-3xl font-bold text-dark-purple text-center mb-4"
          style={{ fontFamily: 'Nunito, sans-serif' }}
        >
          Introducing Rainbow Mates
        </h1>
        <p className="text-dark-purple/70 text-center">
          {/* Placeholder for intro content */}
        </p>
      </div>

      {/* Next Button */}
      <div className="p-6">
        <button
          data-testid="intro-next-button"
          onClick={onNext}
          className="w-full py-4 rounded-full bg-neon-pink text-white font-bold text-lg hover:bg-[#D670D7] transition-all"
        >
          Next
        </button>
      </div>
    </div>
  );
}
