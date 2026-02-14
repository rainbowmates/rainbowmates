import React, { useState, useEffect, useRef } from 'react';

const LOGO_URL = "https://customer-assets.emergentagent.com/job_rainbow-mates-2/artifacts/ye9ehtif_logo.png?v=2";

const INTRO_IMAGES = [
  { 
    url: 'https://customer-assets.emergentagent.com/job_rainbow-mates-2/artifacts/fg8hrzqq_chatting%20in%20bed.png',
    label: 'Chatting in bed'
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

function BouncingImage({ image, index, containerRef }) {
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const velocityRef = useRef({ x: 0, y: 0 });
  const imageSize = 140;

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const maxX = container.clientWidth - imageSize;
    const maxY = container.clientHeight - imageSize - 30;

    const startPositions = [
      { x: 20, y: 20 },
      { x: maxX - 20, y: 20 },
      { x: 20, y: maxY - 20 },
      { x: maxX - 20, y: maxY - 20 }
    ];

    const startPos = startPositions[index % 4];
    setPosition({ 
      x: Math.min(Math.max(startPos.x, 0), maxX),
      y: Math.min(Math.max(startPos.y, 0), maxY)
    });

    const speeds = [
      { x: 1.5, y: 1.2 },
      { x: -1.3, y: 1.4 },
      { x: 1.4, y: -1.3 },
      { x: -1.2, y: -1.5 }
    ];
    velocityRef.current = speeds[index % 4];
  }, [index, containerRef]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const animate = () => {
      setPosition(prev => {
        const maxX = container.clientWidth - imageSize;
        const maxY = container.clientHeight - imageSize - 30;

        let newX = prev.x + velocityRef.current.x;
        let newY = prev.y + velocityRef.current.y;

        if (newX <= 0 || newX >= maxX) {
          velocityRef.current.x = -velocityRef.current.x;
          newX = newX <= 0 ? 0 : maxX;
        }
        if (newY <= 0 || newY >= maxY) {
          velocityRef.current.y = -velocityRef.current.y;
          newY = newY <= 0 ? 0 : maxY;
        }

        return { x: newX, y: newY };
      });
    };

    const intervalId = setInterval(animate, 16);
    return () => clearInterval(intervalId);
  }, [containerRef]);

  return (
    <div
      className="absolute flex flex-col items-center"
      style={{ left: position.x, top: position.y }}
    >
      <div className="w-32 h-32 rounded-2xl overflow-hidden shadow-lg border-2 border-white/50">
        <img src={image.url} alt={image.label} className="w-full h-full object-cover" />
      </div>
      <span className="mt-2 text-sm font-semibold text-dark-purple bg-white/80 px-3 py-1 rounded-full shadow-sm">
        {image.label}
      </span>
    </div>
  );
}

export default function IntroScreen({ onNext }) {
  const containerRef = useRef(null);

  return (
    <div className="app-container gradient-mesh min-h-screen flex flex-col">
      <div className="text-center pt-8 pb-4 px-6">
        <img src={LOGO_URL} alt="Rainbow Mates" className="w-20 h-20 mx-auto object-contain mb-2" style={{ background: 'transparent' }} />
        <h1 className="text-2xl font-bold text-dark-purple" style={{ fontFamily: 'Nunito, sans-serif' }}>
          Introducing Rainbow Mates
        </h1>
        <p className="text-dark-purple/70 text-sm mt-1">Girls, Make Your Gay Best Mate here</p>
      </div>

      <div ref={containerRef} className="flex-1 relative overflow-hidden mx-4 rounded-3xl bg-white/30 backdrop-blur-sm border border-white/50" style={{ minHeight: '400px' }}>
        {INTRO_IMAGES.map((image, index) => (
          <BouncingImage key={index} image={image} index={index} containerRef={containerRef} />
        ))}
      </div>

      <div className="p-6">
        <button data-testid="intro-next-button" onClick={onNext} className="w-full py-4 rounded-full bg-neon-pink text-white font-bold text-lg hover:bg-[#D670D7] transition-all shadow-lg">
          Next
        </button>
      </div>
    </div>
  );
}
