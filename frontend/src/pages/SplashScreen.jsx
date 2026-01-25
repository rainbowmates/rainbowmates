import React from 'react';
import { Sparkles } from 'lucide-react';

export default function SplashScreen() {
  return (
    <div className="app-container gradient-mesh flex items-center justify-center">
      <div className="text-center space-y-6 p-8">
        <div className="animate-float">
          <Sparkles className="w-24 h-24 mx-auto text-neon-pink animate-pulse-glow" />
        </div>
        <h1 className="text-5xl font-bold text-dark-purple" style={{ fontFamily: 'Nunito, sans-serif' }}>
          Rainbow Mates
        </h1>
        <p className="text-xl text-dark-purple/70">Your Virtual Best Friend</p>
      </div>
    </div>
  );
}