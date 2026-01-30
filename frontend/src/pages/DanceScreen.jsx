import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Search, Play, Music, X } from 'lucide-react';
import YouTube from 'react-youtube';
import { toast } from 'sonner';
import axios from 'axios';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

export default function DanceScreen({ user, bestie }) {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [videoId, setVideoId] = useState('');
  const [dancing, setDancing] = useState(false);
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);

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
                  src={`https://www.youtube.com/embed/${videoId}?autoplay=1&rel=0`}
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

          {/* Dancing Animation */}
          {dancing && (
            <div className="p-6 rounded-2xl bg-gradient-to-br from-neon-pink/20 to-soft-blue/20 text-center">
              <div className="flex justify-center items-end gap-4 mb-4">
                {/* User dancing */}
                {user?.avatar_url && (
                  <div className="relative" style={{ animation: 'dance-left 0.8s ease-in-out infinite' }}>
                    <div className="w-20 h-28 rounded-xl overflow-hidden border-3 border-neon-pink shadow-lg">
                      <img src={user.avatar_url} alt="You" className="w-full h-full object-cover object-top" />
                    </div>
                    <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 text-lg">💃</span>
                  </div>
                )}
                
                {/* Heart */}
                <div className="text-2xl" style={{ animation: 'pulse-heart 0.5s ease-in-out infinite' }}>🎵</div>
                
                {/* Bestie dancing */}
                {bestie?.image_url && (
                  <div className="relative" style={{ animation: 'dance-right 0.8s ease-in-out infinite' }}>
                    <div className="w-20 h-28 rounded-xl overflow-hidden border-3 border-soft-yellow shadow-lg">
                      <img src={bestie.image_url} alt={bestie.name} className="w-full h-full object-cover object-top" />
                    </div>
                    <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 text-lg">🕺</span>
                  </div>
                )}
              </div>
              <p className="text-lg font-bold text-dark-purple">Dancing together!</p>
              <p className="text-xs text-dark-purple/70">You and {bestie?.name || 'your bestie'} are having fun!</p>
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
        
        {/* CSS for dance animations */}
        <style>{`
          @keyframes dance-left {
            0%, 100% { transform: translateY(0) rotate(-5deg); }
            50% { transform: translateY(-10px) rotate(5deg); }
          }
          @keyframes dance-right {
            0%, 100% { transform: translateY(-10px) rotate(5deg); }
            50% { transform: translateY(0) rotate(-5deg); }
          }
          @keyframes pulse-heart {
            0%, 100% { transform: scale(1); }
            50% { transform: scale(1.3); }
          }
        `}</style>
      </div>
    </div>
  );
}
