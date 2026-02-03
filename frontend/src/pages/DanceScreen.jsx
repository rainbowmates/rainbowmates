import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Search, Play, Music, X } from 'lucide-react';
import { toast } from 'sonner';
import axios from 'axios';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

export default function DanceScreen({ user, bestie: propBestie }) {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [videoId, setVideoId] = useState('');
  const [dancing, setDancing] = useState(false);
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [bestie, setBestie] = useState(propBestie || null);

  // Fetch bestie if not passed as prop
  useEffect(() => {
    const fetchBestie = async () => {
      if (!bestie && user?.id) {
        try {
          const response = await axios.get(`${API}/bestie/${user.id}`);
          if (response.data) {
            setBestie(response.data);
          }
        } catch (error) {
          // Check localStorage as fallback
          const savedBestie = localStorage.getItem('rainbow_mates_bestie');
          if (savedBestie) {
            setBestie(JSON.parse(savedBestie));
          }
        }
      }
    };
    fetchBestie();
  }, [user, bestie]);

  const searchSong = async () => {
    if (!searchQuery.trim()) {
      toast.error('Please enter a song name');
      return;
    }
    
    setSearching(true);
    try {
      const response = await axios.get(`${API}/youtube/search?q=${encodeURIComponent(searchQuery + ' dance music')}`);
      if (response.data.results && response.data.results.length > 0) {
        setSearchResults(response.data.results);
      } else {
        toast.info('No results found. Try a different search.');
        setSearchResults([]);
      }
    } catch (error) {
      console.error('Search error:', error);
      toast.error('Search failed. Please try again.');
    } finally {
      setSearching(false);
    }
  };

  const playVideo = (id, title) => {
    setVideoId(id);
    setDancing(true);
    setSearchResults([]); // Clear search results when playing
    toast.success(`Now playing: ${title}`);
  };

  const stopDancing = () => {
    setVideoId('');
    setDancing(false);
  };

  // Greeting message from bestie
  const getGreeting = () => {
    const greetings = [
      `Hey gorgeous! 💃 I'm SO ready to dance! How are you feeling? Let's find a song that matches your mood!`,
      `Ooh, dance time! 🎶 How's my favorite person doing today? Pick a song and let's get moving!`,
      `Hey babe! 💕 Ready to shake it? Tell me how you're feeling and let's find the perfect beat!`
    ];
    return greetings[Math.floor(Math.random() * greetings.length)];
  };

  return (
    <div className="app-container gradient-mesh min-h-screen overflow-y-auto">
      <div className="p-4 pb-8 space-y-4">
        <div className="flex items-center gap-3">
          <button
            data-testid="back-button"
            onClick={() => navigate('/play')}
            className="p-2 rounded-full bg-white border border-border hover:bg-muted transition-all flex-shrink-0"
          >
            <ArrowLeft className="w-5 h-5 text-dark-purple" />
          </button>
          <div>
            <h1 className="text-xl font-bold text-dark-purple" style={{ fontFamily: 'Nunito, sans-serif' }}>
              Dance together
            </h1>
            <p className="text-xs text-dark-purple/70">Dance with {bestie?.name || 'your bestie'}!</p>
          </div>
        </div>

        {/* Bestie Greeting */}
        {bestie && !dancing && (
          <div className="flex items-start gap-3 p-4 rounded-2xl bg-white/80 border border-neon-pink/20">
            <div className="w-12 h-12 rounded-full overflow-hidden border-2 border-neon-pink flex-shrink-0">
              <img src={bestie.image_url} alt={bestie.name} className="w-full h-full object-cover object-top" />
            </div>
            <div>
              <p className="font-bold text-dark-purple text-sm">{bestie.name}</p>
              <p className="text-dark-purple/80 text-sm mt-1">{getGreeting()}</p>
            </div>
          </div>
        )}

        <div className="card-soft p-4 space-y-4">
          {/* Search */}
          <div>
            <label className="block text-sm font-medium text-dark-purple mb-2">
              Search for music
            </label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-3 w-5 h-5 text-dark-purple/40" />
                <input
                  data-testid="song-search"
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && searchSong()}
                  placeholder="Search songs on YouTube..."
                  className="w-full pl-10 pr-4 py-3 rounded-2xl bg-muted border-transparent focus:border-neon-pink focus:ring-2 focus:ring-neon-pink/20 outline-none text-sm"
                />
              </div>
              <button
                data-testid="search-button"
                onClick={searchSong}
                disabled={searching}
                className="px-4 py-3 rounded-2xl bg-neon-pink text-white font-semibold hover:bg-[#D670D7] transition-all disabled:opacity-50"
              >
                {searching ? '...' : 'Search'}
              </button>
            </div>
          </div>

          {/* Search Results */}
          {searchResults.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-bold text-dark-purple">Search Results</h3>
                <button 
                  onClick={() => setSearchResults([])}
                  className="text-dark-purple/50 hover:text-dark-purple"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {searchResults.map((result, idx) => (
                  <button
                    key={idx}
                    data-testid={`search-result-${idx}`}
                    onClick={() => playVideo(result.videoId, result.title)}
                    className="w-full p-3 rounded-xl bg-muted hover:bg-neon-pink/10 text-left transition-all flex items-center gap-3"
                  >
                    {result.thumbnail ? (
                      <img 
                        src={result.thumbnail} 
                        alt={result.title}
                        className="w-16 h-12 rounded-lg object-cover flex-shrink-0"
                      />
                    ) : (
                      <div className="w-16 h-12 rounded-lg bg-dark-purple/10 flex items-center justify-center flex-shrink-0">
                        <Music className="w-6 h-6 text-dark-purple/30" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-dark-purple text-sm truncate">{result.title}</p>
                      <p className="text-xs text-dark-purple/50 truncate">{result.channelTitle}</p>
                    </div>
                    <Play className="w-5 h-5 text-neon-pink flex-shrink-0" />
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Video Player - Full YouTube Embed */}
          {videoId && (
            <div className="space-y-3">
              <div className="rounded-2xl overflow-hidden bg-black aspect-video">
                <iframe
                  data-testid="youtube-player"
                  width="100%"
                  height="100%"
                  src={`https://www.youtube-nocookie.com/embed/${videoId}?autoplay=1&rel=0&modestbranding=1`}
                  title="YouTube video player"
                  frameBorder="0"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                  allowFullScreen
                  className="w-full h-full"
                  style={{ minHeight: '220px' }}
                ></iframe>
              </div>
              <button
                onClick={stopDancing}
                className="w-full py-2 rounded-full border-2 border-neon-pink text-neon-pink font-semibold hover:bg-neon-pink/10 transition-all text-sm"
              >
                Stop Dancing
              </button>
            </div>
          )}

          {/* Dancing Animation - Partner Dance */}
          {dancing && (
            <div className="p-4 rounded-2xl bg-gradient-to-br from-neon-pink/20 to-soft-blue/20 text-center overflow-hidden">
              {/* Dance Floor */}
              <div className="relative h-48 flex justify-center items-end">
                {/* Spotlight effect */}
                <div className="absolute inset-0 bg-gradient-radial from-white/30 via-transparent to-transparent rounded-full" />
                
                {/* Sparkles */}
                <div className="absolute top-2 left-1/4 text-xl animate-ping" style={{ animationDuration: '2s' }}>✨</div>
                <div className="absolute top-8 right-1/4 text-lg animate-ping" style={{ animationDuration: '2.5s', animationDelay: '0.5s' }}>💫</div>
                <div className="absolute top-4 left-1/2 text-xl animate-bounce" style={{ animationDuration: '1s' }}>🎵</div>
                <div className="absolute top-12 right-1/3 text-lg animate-bounce" style={{ animationDuration: '1.2s', animationDelay: '0.3s' }}>🎶</div>
                
                {/* Dancing couple container */}
                <div className="relative flex items-end justify-center" style={{ animation: 'couple-sway 2s ease-in-out infinite' }}>
                  {/* User Avatar */}
                  {user?.avatar_url && (
                    <div 
                      className="relative z-10"
                      style={{ 
                        animation: 'partner-left 1s ease-in-out infinite',
                        transformOrigin: 'bottom center'
                      }}
                    >
                      <div className="w-20 h-28 rounded-xl overflow-hidden border-3 border-neon-pink shadow-lg">
                        <img src={user.avatar_url} alt="You" className="w-full h-full object-cover object-top" />
                      </div>
                    </div>
                  )}
                  
                  {/* Holding hands heart */}
                  <div 
                    className="relative z-20 -mx-3 mb-8"
                    style={{ animation: 'heart-pulse 0.5s ease-in-out infinite' }}
                  >
                    <span className="text-2xl">💕</span>
                  </div>
                  
                  {/* Bestie Avatar */}
                  {bestie?.image_url && (
                    <div 
                      className="relative z-10"
                      style={{ 
                        animation: 'partner-right 1s ease-in-out infinite',
                        transformOrigin: 'bottom center'
                      }}
                    >
                      <div className="w-20 h-28 rounded-xl overflow-hidden border-3 border-soft-yellow shadow-lg">
                        <img src={bestie.image_url} alt={bestie.name} className="w-full h-full object-cover object-top" />
                      </div>
                    </div>
                  )}
                </div>
                
                {/* Dance floor reflection */}
                <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-40 h-4 bg-gradient-to-t from-neon-pink/20 to-transparent rounded-full blur-sm" />
              </div>
              
              <p className="text-base font-bold text-dark-purple mt-2">Dancing together! 💃🕺</p>
              <p className="text-xs text-dark-purple/70">You and {bestie?.name || 'your bestie'} are having a blast!</p>
            </div>
          )}

          {/* Popular Dance Songs - shown when not searching or playing */}
          {!videoId && searchResults.length === 0 && (
            <div>
              <h3 className="text-sm font-bold text-dark-purple mb-2">Popular Dance Hits</h3>
              <div className="space-y-2">
                {[
                  { title: 'Levitating - Dua Lipa', id: 'TUVcZfQe-Kw' },
                  { title: 'Blinding Lights - The Weeknd', id: '4NRXx6U8ABQ' },
                  { title: 'Dance Monkey - Tones and I', id: 'q0hyYWKXF0Q' },
                  { title: 'Uptown Funk - Bruno Mars', id: 'OPf0YbXqDm0' },
                  { title: 'Shake It Off - Taylor Swift', id: 'nfWlot6h_JM' }
                ].map((song, idx) => (
                  <button
                    key={idx}
                    data-testid={`dance-song-${idx}`}
                    onClick={() => playVideo(song.id, song.title)}
                    className="w-full p-3 rounded-xl bg-muted hover:bg-neon-pink/10 text-left transition-all flex items-center justify-between"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-neon-pink to-soft-blue flex items-center justify-center">
                        <Music className="w-5 h-5 text-white" />
                      </div>
                      <span className="font-medium text-dark-purple text-sm">{song.title}</span>
                    </div>
                    <Play className="w-5 h-5 text-neon-pink" />
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
        
        {/* CSS for partner dance animations */}
        <style>{`
          /* Couple sways together as a unit */
          @keyframes couple-sway {
            0%, 100% { transform: translateX(-5px); }
            50% { transform: translateX(5px); }
          }
          
          /* Left partner dance - leans in and out */
          @keyframes partner-left {
            0%, 100% { 
              transform: rotate(-8deg) translateY(0);
            }
            25% {
              transform: rotate(3deg) translateY(-12px);
            }
            50% { 
              transform: rotate(8deg) translateY(-5px);
            }
            75% {
              transform: rotate(-3deg) translateY(-12px);
            }
          }
          
          /* Right partner dance - mirrors left */
          @keyframes partner-right {
            0%, 100% { 
              transform: rotate(8deg) translateY(-5px);
            }
            25% {
              transform: rotate(-3deg) translateY(-12px);
            }
            50% { 
              transform: rotate(-8deg) translateY(0);
            }
            75% {
              transform: rotate(3deg) translateY(-12px);
            }
          }
          
          /* Heart pulses between them */
          @keyframes heart-pulse {
            0%, 100% { transform: scale(1) translateY(0); }
            50% { transform: scale(1.3) translateY(-5px); }
          }
          
          /* Spin move - can be triggered */
          @keyframes partner-spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    </div>
  );
}
