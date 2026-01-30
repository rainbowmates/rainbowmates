import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Sparkles, User, Heart, Play, Settings } from 'lucide-react';
import { toast } from 'sonner';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

export default function Dashboard({ user, onLogout }) {
  const navigate = useNavigate();
  const [bestie, setBestie] = useState(null);
  const [subscription, setSubscription] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      // Fetch bestie
      try {
        const bestieRes = await axios.get(`${API}/bestie/${user.id}`);
        setBestie(bestieRes.data);
      } catch (err) {
        // No bestie yet
      }

      // Fetch subscription
      try {
        const subRes = await axios.get(`${API}/subscription/${user.id}`);
        setSubscription(subRes.data);
      } catch (err) {
        // No subscription
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="app-container gradient-mesh min-h-screen overflow-y-auto">
      <div className="p-4 pb-8 space-y-4">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-dark-purple" style={{ fontFamily: 'Nunito, sans-serif' }}>
              Welcome, {user.first_name}!
            </h1>
            <p className="text-dark-purple/70">Ready for some fun?</p>
          </div>
          <button
            data-testid="settings-button"
            onClick={() => navigate('/settings')}
            className="p-3 rounded-full bg-white border border-border hover:bg-muted transition-all"
          >
            <Settings className="w-6 h-6 text-dark-purple" />
          </button>
        </div>

        {/* Dancing Together Section - shown when both avatar and bestie exist */}
        {user.avatar_url && bestie ? (
          <div className="card-soft p-6 overflow-hidden" data-testid="dancing-together-card">
            <div className="text-center mb-4">
              <h3 className="text-xl font-bold text-dark-purple">You & {bestie.name}</h3>
              <p className="text-sm text-dark-purple/70">Best friends forever!</p>
            </div>
            
            {/* Dancing animation container */}
            <div className="relative flex justify-center items-end gap-2 py-4">
              {/* Floating decorations */}
              <div className="absolute top-0 left-1/4 text-2xl animate-bounce" style={{ animationDelay: '0s', animationDuration: '2s' }}>✨</div>
              <div className="absolute top-2 right-1/4 text-2xl animate-bounce" style={{ animationDelay: '0.5s', animationDuration: '2.5s' }}>💖</div>
              <div className="absolute top-4 left-1/3 text-xl animate-bounce" style={{ animationDelay: '1s', animationDuration: '2s' }}>🎵</div>
              <div className="absolute top-0 right-1/3 text-xl animate-bounce" style={{ animationDelay: '0.3s', animationDuration: '2.2s' }}>🎶</div>
              <div className="absolute bottom-0 left-1/5 text-lg animate-pulse">💫</div>
              <div className="absolute bottom-0 right-1/5 text-lg animate-pulse" style={{ animationDelay: '0.5s' }}>💫</div>
              
              {/* User Avatar - dancing */}
              <div 
                className="relative cursor-pointer group"
                onClick={() => navigate('/create-avatar')}
                style={{ animation: 'dance-left 1s ease-in-out infinite' }}
              >
                <div className="w-28 h-36 rounded-2xl overflow-hidden border-4 border-neon-pink shadow-lg transform hover:scale-105 transition-transform">
                  <img 
                    src={user.avatar_url} 
                    alt="You" 
                    className="w-full h-full object-cover object-top"
                  />
                </div>
                <div className="absolute -bottom-2 left-1/2 transform -translate-x-1/2 bg-neon-pink text-white text-xs px-3 py-1 rounded-full font-semibold shadow-md">
                  You
                </div>
              </div>
              
              {/* Heart in the middle */}
              <div className="text-3xl mx-1" style={{ animation: 'pulse-heart 1s ease-in-out infinite' }}>
                💕
              </div>
              
              {/* Bestie Avatar - dancing */}
              <div 
                className="relative cursor-pointer group"
                onClick={() => navigate('/create-bestie')}
                style={{ animation: 'dance-right 1s ease-in-out infinite' }}
              >
                <div className="w-28 h-36 rounded-2xl overflow-hidden border-4 border-soft-yellow shadow-lg transform hover:scale-105 transition-transform">
                  <img 
                    src={bestie.image_url} 
                    alt={bestie.name} 
                    className="w-full h-full object-cover object-top"
                  />
                </div>
                <div className="absolute -bottom-2 left-1/2 transform -translate-x-1/2 bg-soft-yellow text-dark-purple text-xs px-3 py-1 rounded-full font-semibold shadow-md">
                  {bestie.name}
                </div>
              </div>
            </div>
            
            {/* Edit buttons */}
            <div className="flex justify-center gap-3 mt-6">
              <button
                data-testid="edit-avatar-button"
                onClick={() => navigate('/create-avatar')}
                className="px-4 py-2 rounded-full bg-gradient-to-r from-neon-pink/20 to-neon-pink/10 text-dark-purple font-semibold text-sm border border-neon-pink/30 hover:border-neon-pink transition-all flex items-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                </svg>
                Edit You
              </button>
              <button
                data-testid="edit-bestie-button"
                onClick={() => navigate('/create-bestie')}
                className="px-4 py-2 rounded-full bg-gradient-to-r from-soft-yellow/20 to-soft-yellow/10 text-dark-purple font-semibold text-sm border border-soft-yellow/30 hover:border-soft-yellow transition-all flex items-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                </svg>
                Edit {bestie.name}
              </button>
            </div>
            
            {/* CSS for dance animations */}
            <style>{`
              @keyframes dance-left {
                0%, 100% { transform: translateY(0) rotate(-3deg); }
                50% { transform: translateY(-8px) rotate(3deg); }
              }
              @keyframes dance-right {
                0%, 100% { transform: translateY(-8px) rotate(3deg); }
                50% { transform: translateY(0) rotate(-3deg); }
              }
              @keyframes pulse-heart {
                0%, 100% { transform: scale(1); }
                50% { transform: scale(1.2); }
              }
            `}</style>
          </div>
        ) : (
          <>
            {/* User Avatar Card - shown separately when no bestie */}
            {user.avatar_url ? (
              <div 
                className="card-soft p-4 cursor-pointer hover:shadow-lg transition-all"
                data-testid="user-avatar-card"
                onClick={() => navigate('/create-avatar')}
              >
                <div className="flex items-center gap-4">
                  <div className="w-24 h-32 rounded-2xl overflow-hidden border-4 border-neon-pink shadow-md">
                    <img 
                      src={user.avatar_url} 
                      alt="Your Avatar" 
                      className="w-full h-full object-cover object-top"
                    />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-xl font-bold text-dark-purple">Your Avatar</h3>
                    <p className="text-sm text-dark-purple/70 mb-3">Looking fabulous!</p>
                    <button
                      data-testid="edit-avatar-button"
                      className="px-4 py-2 rounded-full bg-gradient-to-r from-neon-pink/20 to-soft-blue/20 text-dark-purple font-semibold text-sm border border-neon-pink/30 hover:border-neon-pink transition-all flex items-center gap-2"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                      </svg>
                      Edit Avatar
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div 
                className="card-soft p-6"
                data-testid="user-avatar-card"
              >
                <div className="flex items-center gap-4">
                  <div className="w-20 h-20 rounded-full bg-gradient-to-br from-neon-pink to-soft-blue flex items-center justify-center overflow-hidden">
                    <User className="w-10 h-10 text-white" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-xl font-bold text-dark-purple">Your Avatar</h3>
                    <p className="text-sm text-dark-purple/70">Create your avatar</p>
                  </div>
                  <button
                    data-testid="create-avatar-button"
                    onClick={() => navigate('/create-avatar')}
                    className="px-6 py-2 rounded-full bg-neon-pink text-white font-semibold hover:bg-[#D670D7] transition-all"
                  >
                    Create
                  </button>
                </div>
              </div>
            )}

            {/* Bestie Card - shown separately when avatar exists but no bestie */}
            <div className="card-soft p-6" data-testid="bestie-card">
              <div className="flex items-center gap-4">
                <div className="w-20 h-20 rounded-full bg-gradient-to-br from-soft-yellow to-neon-pink flex items-center justify-center overflow-hidden">
                  <Heart className="w-10 h-10 text-white" />
                </div>
                <div className="flex-1">
                  <h3 className="text-xl font-bold text-dark-purple">Your Bestie</h3>
                  <p className="text-sm text-dark-purple/70">Choose your virtual best friend</p>
                </div>
                <button
                  data-testid="create-bestie-button"
                  onClick={() => navigate('/create-bestie')}
                  className="px-6 py-2 rounded-full bg-neon-pink text-white font-semibold hover:bg-[#D670D7] transition-all"
                >
                  Choose
                </button>
              </div>
            </div>
          </>
        )}

        {/* Play Button */}
        {bestie && (
          <button
            data-testid="lets-play-button"
            onClick={() => {
              if (subscription?.has_subscription) {
                navigate('/play');
              } else {
                navigate('/subscription');
              }
            }}
            className="w-full py-6 rounded-3xl bg-gradient-to-r from-neon-pink to-soft-blue text-white font-bold text-2xl shadow-lg hover:shadow-xl transition-all animate-pulse-glow"
          >
            <div className="flex items-center justify-center gap-3">
              <Play className="w-8 h-8" fill="currentColor" />
              <span>Let's Play!</span>
            </div>
          </button>
        )}

        {/* Subscription Status */}
        {subscription?.has_subscription ? (
          <div className="card-soft p-4 bg-gradient-to-r from-soft-yellow/20 to-neon-pink/20" data-testid="subscription-status">
            <div className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-neon-pink" />
              <p className="text-sm font-medium text-dark-purple">
                Premium Active • {subscription.subscription.plan.replace('_', ' ')}
              </p>
            </div>
          </div>
        ) : (
          <div className="card-soft p-4" data-testid="subscribe-prompt">
            <p className="text-center text-dark-purple/70 text-sm">
              Subscribe to unlock all features!
            </p>
          </div>
        )}
      </div>
    </div>
  );
}