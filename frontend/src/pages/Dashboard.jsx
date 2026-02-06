import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Sparkles, User, Heart, Play, Settings, Pencil } from 'lucide-react';
import { toast } from 'sonner';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

export default function Dashboard({ user, onLogout }) {
  const navigate = useNavigate();
  // Initialize bestie from localStorage for immediate display
  const [bestie, setBestie] = useState(() => {
    const saved = localStorage.getItem('rainbow_mates_bestie');
    return saved ? JSON.parse(saved) : null;
  });
  const [subscription, setSubscription] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      // Fetch bestie (will update if changed on server)
      try {
        const bestieRes = await axios.get(`${API}/bestie/${user.id}`);
        setBestie(bestieRes.data);
        localStorage.setItem('rainbow_mates_bestie', JSON.stringify(bestieRes.data));
      } catch (err) {
        // No bestie yet - clear localStorage if server has none
        localStorage.removeItem('rainbow_mates_bestie');
        setBestie(null);
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

  const handleLetsPlay = () => {
    // Check for free pilot subscription
    const freeSubscription = localStorage.getItem('rainbow_mates_free_subscription');
    const hasFreeSubscription = freeSubscription && JSON.parse(freeSubscription).is_active;
    
    if (hasFreeSubscription || (subscription?.has_subscription && subscription?.subscription?.is_active)) {
      navigate('/play');
    } else {
      navigate('/subscription');
    }
  };

  // Check if user has completed setup (avatar + bestie)
  const hasCompletedSetup = user.avatar_url && bestie;

  return (
    <div className="app-container gradient-mesh min-h-screen overflow-y-auto">
      <div className="p-4 pb-8 space-y-5">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-dark-purple" style={{ fontFamily: 'Nunito, sans-serif' }}>
              Welcome, {user.first_name || user.name?.split(' ')[0] || 'Friend'}!
            </h1>
            <p className="text-dark-purple/70 text-sm">
              {hasCompletedSetup ? 'Ready for some fun?' : 'Let\'s get you set up!'}
            </p>
          </div>
          <button
            data-testid="settings-button"
            onClick={() => navigate('/settings')}
            className="p-2.5 rounded-full bg-white border border-border hover:bg-muted transition-all"
          >
            <Settings className="w-5 h-5 text-dark-purple" />
          </button>
        </div>

        {/* Main Content - Show avatars when setup is complete */}
        {hasCompletedSetup ? (
          <>
            {/* Both Avatars Card */}
            <div className="card-soft p-5" data-testid="avatars-card">
              <div className="flex justify-center items-end gap-4">
                {/* User Avatar */}
                <div className="relative">
                  <div className="w-32 h-44 rounded-2xl overflow-hidden border-4 border-neon-pink shadow-lg bg-gradient-to-b from-muted to-white">
                    <img 
                      src={user.avatar_url} 
                      alt="You" 
                      className="w-full h-full object-cover object-top"
                    />
                  </div>
                  <button
                    data-testid="edit-avatar-button"
                    onClick={() => navigate('/create-avatar')}
                    className="absolute -bottom-2 -right-2 p-2 bg-neon-pink rounded-full shadow-lg hover:bg-[#D670D7] transition-all"
                  >
                    <Pencil className="w-4 h-4 text-white" />
                  </button>
                  <div className="text-center mt-3">
                    <p className="text-sm font-semibold text-dark-purple">You</p>
                  </div>
                </div>

                {/* Heart Between */}
                <div className="mb-16">
                  <span className="text-3xl">💕</span>
                </div>

                {/* Bestie Avatar */}
                <div className="relative">
                  <div className="w-32 h-44 rounded-2xl overflow-hidden border-4 border-soft-yellow shadow-lg bg-gradient-to-b from-muted to-white">
                    <img 
                      src={bestie.image_url} 
                      alt={bestie.name} 
                      className="w-full h-full object-cover object-top"
                    />
                  </div>
                  <button
                    data-testid="edit-bestie-button"
                    onClick={() => navigate('/create-bestie')}
                    className="absolute -bottom-2 -right-2 p-2 bg-soft-yellow rounded-full shadow-lg hover:bg-[#E5C76B] transition-all"
                  >
                    <Pencil className="w-4 h-4 text-dark-purple" />
                  </button>
                  <div className="text-center mt-3">
                    <p className="text-sm font-semibold text-dark-purple">{bestie.name}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Let's Play Button */}
            <button
              data-testid="lets-play-button"
              onClick={handleLetsPlay}
              className="w-full py-4 rounded-2xl bg-gradient-to-r from-neon-pink via-purple-500 to-soft-blue text-white font-bold text-lg shadow-lg hover:shadow-xl transition-all flex items-center justify-center gap-3"
            >
              <Play className="w-6 h-6 fill-white" />
              Let's Play!
            </button>

            {/* Subscription Status */}
            {subscription?.has_subscription && subscription?.subscription?.is_active ? (
              <div className="card-soft p-4 bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-green-500 flex items-center justify-center">
                    <Sparkles className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <p className="font-semibold text-green-800">Premium Active</p>
                    <p className="text-xs text-green-600">
                      {subscription.subscription.plan.replace('_', ' ')} plan
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="card-soft p-4 bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-amber-500 flex items-center justify-center">
                    <Sparkles className="w-5 h-5 text-white" />
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold text-amber-800">Subscribe to Play</p>
                    <p className="text-xs text-amber-600">Unlock chat, voice, dance & more!</p>
                  </div>
                </div>
              </div>
            )}
          </>
        ) : (
          <>
            {/* Setup Cards - Show when avatar or bestie is missing */}
            
            {/* Avatar Card */}
            <div className="card-soft p-5" data-testid="user-avatar-card">
              <div className="flex items-center gap-4">
                {user.avatar_url ? (
                  <div className="w-20 h-28 rounded-2xl overflow-hidden border-4 border-neon-pink shadow-md">
                    <img 
                      src={user.avatar_url} 
                      alt="Your Avatar" 
                      className="w-full h-full object-cover object-top"
                    />
                  </div>
                ) : (
                  <div className="w-20 h-20 rounded-full bg-gradient-to-br from-neon-pink to-soft-blue flex items-center justify-center">
                    <User className="w-10 h-10 text-white" />
                  </div>
                )}
                <div className="flex-1">
                  <h3 className="text-lg font-bold text-dark-purple">
                    {user.avatar_url ? 'Your Avatar' : 'Create Your Avatar'}
                  </h3>
                  <p className="text-sm text-dark-purple/70">
                    {user.avatar_url ? 'Looking great!' : 'Choose your look'}
                  </p>
                </div>
                <button
                  data-testid={user.avatar_url ? "edit-avatar-button" : "create-avatar-button"}
                  onClick={() => navigate('/create-avatar')}
                  className="px-5 py-2 rounded-full bg-neon-pink text-white font-semibold hover:bg-[#D670D7] transition-all"
                >
                  {user.avatar_url ? 'Edit' : 'Create'}
                </button>
              </div>
            </div>

            {/* Bestie Card */}
            <div className="card-soft p-5" data-testid="bestie-card">
              <div className="flex items-center gap-4">
                {bestie ? (
                  <div className="w-20 h-28 rounded-2xl overflow-hidden border-4 border-soft-yellow shadow-md">
                    <img 
                      src={bestie.image_url} 
                      alt={bestie.name} 
                      className="w-full h-full object-cover object-top"
                    />
                  </div>
                ) : (
                  <div className="w-20 h-20 rounded-full bg-gradient-to-br from-soft-yellow to-neon-pink flex items-center justify-center">
                    <Heart className="w-10 h-10 text-white" />
                  </div>
                )}
                <div className="flex-1">
                  <h3 className="text-lg font-bold text-dark-purple">
                    {bestie ? bestie.name : 'Your Bestie'}
                  </h3>
                  <p className="text-sm text-dark-purple/70">
                    {bestie ? bestie.personality?.join(', ') : 'Choose your virtual best friend'}
                  </p>
                </div>
                <button
                  data-testid={bestie ? "edit-bestie-button" : "create-bestie-button"}
                  onClick={() => navigate('/create-bestie')}
                  className="px-5 py-2 rounded-full bg-neon-pink text-white font-semibold hover:bg-[#D670D7] transition-all"
                >
                  {bestie ? 'Edit' : 'Choose'}
                </button>
              </div>
            </div>

            {/* Disabled Let's Play - shown when setup incomplete */}
            {user.avatar_url && !bestie && (
              <>
                <button
                  data-testid="lets-play-button"
                  onClick={() => navigate('/subscription')}
                  className="w-full py-4 rounded-2xl bg-gradient-to-r from-neon-pink via-purple-500 to-soft-blue text-white font-bold text-lg shadow-lg hover:shadow-xl transition-all flex items-center justify-center gap-3 opacity-90"
                >
                  <Play className="w-6 h-6 fill-white" />
                  Let's Play!
                </button>
                <div className="text-center">
                  <p className="text-dark-purple/50 text-sm">Choose your bestie first to play together!</p>
                </div>
              </>
            )}
            {!user.avatar_url && (
              <>
                <button
                  data-testid="lets-play-button"
                  onClick={() => navigate('/subscription')}
                  className="w-full py-4 rounded-2xl bg-gradient-to-r from-neon-pink via-purple-500 to-soft-blue text-white font-bold text-lg shadow-lg hover:shadow-xl transition-all flex items-center justify-center gap-3 opacity-90"
                >
                  <Play className="w-6 h-6 fill-white" />
                  Let's Play!
                </button>
                <div className="text-center">
                  <p className="text-dark-purple/50 text-sm">Create your avatar first to continue!</p>
                </div>
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}
