import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Search, Play, Music, X, Square } from 'lucide-react';
import { toast } from 'sonner';
import axios from 'axios';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

export default function DanceScreen({ user, bestie: propBestie }) {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [videoId, setVideoId] = useState('');
  const [playing, setPlaying] = useState(false);
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [bestie, setBestie] = useState(propBestie || null);
  const [currentSong, setCurrentSong] = useState(null);

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
      const response = await axios.get(`${API}/youtube/search?q=${encodeURIComponent(searchQuery + ' music')}`);
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

  const playMusic = (id, title) => {
    setVideoId(id);
    setPlaying(true);
    setCurrentSong(title);
    setSearchResults([]);
    toast.success(`Now playing: ${title}`);
  };

  const stopMusic = () => {
    setVideoId('');
    setPlaying(false);
    setCurrentSong(null);
  };

  // Greeting message from bestie
  const getGreeting = () => {
    const greetings = [
      `Hey gorgeous! 🎵 Let's play some music and vibe together!`,
      `Ooh, music time! 🎶 Pick a song and let's dance!`,
      `Hey babe! 💕 I'm ready to jam! What should we listen to?`
    ];
    return greetings[Math.floor(Math.random() * greetings.length)];
  };

  return (
    <div className="app-container gradient-mesh min-h-screen overflow-y-auto flex flex-col">
      <div className="p-4 space-y-4 flex-1">
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
              Play Music
            </h1>
            <p className="text-xs text-dark-purple/70">Listen to music with {bestie?.name || 'your bestie'}!</p>
          </div>
        </div>

        {/* Bestie Greeting */}
        {bestie && !playing && (
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
                    onClick={() => playMusic(result.id, result.title)}
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
                    <div className="flex flex-col items-center gap-1">
                      <Play className="w-5 h-5 text-neon-pink" />
                      <span className="text-[10px] text-neon-pink font-medium">Play</span>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Video Player */}
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
                data-testid="stop-music-button"
                onClick={stopMusic}
                className="w-full py-3 rounded-2xl border-2 border-neon-pink text-neon-pink font-semibold hover:bg-neon-pink/10 transition-all flex items-center justify-center gap-2"
              >
                <Square className="w-4 h-4" />
                Stop Music
              </button>
            </div>
          )}

          {/* Popular Songs */}
          {!videoId && searchResults.length === 0 && (
            <div>
              <h3 className="text-sm font-bold text-dark-purple mb-2">
                <span className="flex items-center gap-2">
                  <Music className="w-4 h-4 text-neon-pink" />
                  Popular Songs
                </span>
              </h3>
              <p className="text-xs text-dark-purple/50 mb-3">Pick a song to listen with {bestie?.name || 'your bestie'}!</p>
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
                    data-testid={`popular-song-${idx}`}
                    onClick={() => playMusic(song.id, song.title)}
                    className="w-full p-3 rounded-xl bg-muted hover:bg-neon-pink/10 text-left transition-all flex items-center justify-between group"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-neon-pink to-soft-blue flex items-center justify-center">
                        <Music className="w-5 h-5 text-white" />
                      </div>
                      <span className="font-medium text-dark-purple text-sm">{song.title}</span>
                    </div>
                    <div className="flex items-center gap-2 opacity-70 group-hover:opacity-100 transition-all">
                      <Play className="w-5 h-5 text-neon-pink" />
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Dancing Avatars at Bottom - shown while music plays */}
      {playing && (
        <div className="p-4 bg-gradient-to-t from-neon-pink/30 via-soft-blue/20 to-transparent">
          <div className="relative flex justify-center items-end h-32">
            {/* Sparkles */}
            <div className="absolute top-0 left-1/4 text-xl animate-ping" style={{ animationDuration: '2s' }}>✨</div>
            <div className="absolute top-4 right-1/4 text-lg animate-ping" style={{ animationDuration: '2.5s', animationDelay: '0.5s' }}>💫</div>
            <div className="absolute top-2 left-1/2 text-xl animate-bounce" style={{ animationDuration: '1s' }}>🎵</div>
            
            <div className="relative flex items-end justify-center gap-4" style={{ animation: 'couple-sway 2s ease-in-out infinite' }}>
              {/* User Avatar */}
              {user?.avatar_url && (
                <div 
                  className="relative z-10"
                  style={{ animation: 'partner-left 1s ease-in-out infinite', transformOrigin: 'bottom center' }}
                >
                  <div className="w-20 h-28 rounded-xl overflow-hidden border-3 border-neon-pink shadow-lg">
                    <img src={user.avatar_url} alt="You" className="w-full h-full object-cover object-top" />
                  </div>
                </div>
              )}
              
              {/* Heart */}
              <div className="relative z-20 -mx-2 mb-10" style={{ animation: 'heart-pulse 0.5s ease-in-out infinite' }}>
                <span className="text-2xl">💕</span>
              </div>
              
              {/* Bestie Avatar */}
              {bestie?.image_url && (
                <div 
                  className="relative z-10"
                  style={{ animation: 'partner-right 1s ease-in-out infinite', transformOrigin: 'bottom center' }}
                >
                  <div className="w-20 h-28 rounded-xl overflow-hidden border-3 border-soft-yellow shadow-lg">
                    <img src={bestie.image_url} alt={bestie.name} className="w-full h-full object-cover object-top" />
                  </div>
                </div>
              )}
            </div>
            
            {/* Floor shadow */}
            <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-48 h-4 bg-gradient-to-t from-neon-pink/30 to-transparent rounded-full blur-sm" />
          </div>
          
          <p className="text-center text-sm font-bold text-dark-purple mt-2">
            Dancing to &ldquo;{currentSong}&rdquo;! 💃🕺
          </p>
        </div>
      )}
      
      {/* CSS for partner dance animations */}
      <style>{`
        @keyframes couple-sway {
          0%, 100% { transform: translateX(-5px); }
          50% { transform: translateX(5px); }
        }
        
        @keyframes partner-left {
          0%, 100% { transform: rotate(-8deg) translateY(0); }
          25% { transform: rotate(3deg) translateY(-12px); }
          50% { transform: rotate(8deg) translateY(-5px); }
          75% { transform: rotate(-3deg) translateY(-12px); }
        }
        
        @keyframes partner-right {
          0%, 100% { transform: rotate(8deg) translateY(-5px); }
          25% { transform: rotate(-3deg) translateY(-12px); }
          50% { transform: rotate(-8deg) translateY(0); }
          75% { transform: rotate(3deg) translateY(-12px); }
        }
        
        @keyframes heart-pulse {
          0%, 100% { transform: scale(1) translateY(0); }
          50% { transform: scale(1.3) translateY(-5px); }
        }
      `}</style>
    </div>
  );
}
