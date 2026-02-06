import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, MessageCircle, Mic, Music, ShoppingBag, Heart } from 'lucide-react';

export default function PlayScreen({ user }) {
  const navigate = useNavigate();

  const features = [
    { icon: MessageCircle, title: 'Chat', description: 'Text with your bestie', path: '/chat', color: 'from-neon-pink to-purple-400' },
    { icon: Mic, title: 'Voice Chat', description: 'Talk to your bestie', path: '/voice', color: 'from-soft-blue to-neon-pink' },
    { icon: Music, title: 'Karaoke', description: 'Sing together', path: '/karaoke', color: 'from-soft-yellow to-neon-pink' },
    { icon: Music, title: 'Play Music', description: 'Listen & dance together', path: '/dance', color: 'from-purple-400 to-neon-pink' },
    { icon: Heart, title: 'Date or Just Mates', description: 'Get relationship advice', path: '/date-or-mate', color: 'from-red-400 to-neon-pink' },
    { icon: ShoppingBag, title: 'Shopping', description: 'Get fashion advice', path: '/shopping', color: 'from-neon-pink to-soft-yellow' }
  ];

  return (
    <div className="app-container gradient-mesh min-h-screen overflow-y-auto">
      <div className="p-6 space-y-6">
        <div className="flex items-center gap-4">
          <button
            data-testid="back-button"
            onClick={() => navigate('/dashboard')}
            className="p-2 rounded-full bg-white border border-border hover:bg-muted transition-all"
          >
            <ArrowLeft className="w-6 h-6 text-dark-purple" />
          </button>
          <h1 className="text-3xl font-bold text-dark-purple" style={{ fontFamily: 'Nunito, sans-serif' }}>
            Let's Play!
          </h1>
        </div>

        <div className="space-y-4">
          {features.map((feature, idx) => (
            <button
              key={idx}
              data-testid={`play-${feature.title.toLowerCase().replace(' ', '-')}`}
              onClick={() => navigate(feature.path)}
              className="w-full card-soft p-6 hover:scale-[1.02] transition-all cursor-pointer"
            >
              <div className="flex items-center gap-4">
                <div className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${feature.color} flex items-center justify-center`}>
                  <feature.icon className="w-8 h-8 text-white" />
                </div>
                <div className="flex-1 text-left">
                  <h3 className="text-xl font-bold text-dark-purple">{feature.title}</h3>
                  <p className="text-sm text-dark-purple/70">{feature.description}</p>
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}