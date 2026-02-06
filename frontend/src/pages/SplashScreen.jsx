import React from 'react';

const LOGO_URL = "https://customer-assets.emergentagent.com/job_rainbow-mates-2/artifacts/rlkesgfm_logo.png";

export default function SplashScreen() {
  return (
    <div className="app-container gradient-mesh flex items-center justify-center">
      <div className="text-center space-y-6 p-8">
        <div className="animate-float">
          <img 
            src={LOGO_URL} 
            alt="Rainbow Mates Logo" 
            className="w-32 h-32 mx-auto animate-pulse-glow object-contain"
          />
        </div>
        <h1 className="text-5xl font-bold text-dark-purple" style={{ fontFamily: 'Nunito, sans-serif' }}>
          Rainbow Mates
        </h1>
        <p className="text-xl text-dark-purple/70">Your Virtual Best Friend</p>
      </div>
    </div>
  );
}