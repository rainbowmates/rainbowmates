import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Search, Play, Music, X, Mic, Square } from 'lucide-react';
import { toast } from 'sonner';
import axios from 'axios';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

export default function KaraokeScreen({ user, bestie: propBestie }) {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [videoId, setVideoId] = useState('');
  const [currentSong, setCurrentSong] = useState('');
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
      const response = await axios.get(`${API}/youtube/search?q=${encodeURIComponent(searchQuery + ' karaoke lyrics on screen')}`);
      if (response.data.results && response.data.results.length > 0) {
        setSearchResults(response.data.results);
      } else {
        toast.info('No karaoke videos found. Try a different song.');
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
    setCurrentSong(title);
    setSearchResults([]);
    toast.success(`Now playing: ${title}`);
  };

  const stopPlaying = () => {
    setVideoId('');
    setCurrentSong('');
  };

  // Popular karaoke songs with lyrics on screen
  const popularKaraokeSongs = [
    { title: 'Sweet Caroline - Neil Diamond', id: 'NsLyI1_R01M' },
    { title: 'Wonderwall - Oasis', id: 'Gvfgut8nAgw' },
    { title: 'Happy - Pharrell Williams', id: 'C7dPqrmDWxs' },
    { title: 'Shallow - Lady Gaga', id: 'bo_efYhYU2A' },
    { title: 'Someone Like You - Adele', id: '720FLdlNc7g' }
  ];

  // Greeting message from bestie
  const getGreeting = () => {
    const greetings = [
      `Hey superstar! 🎤 Ready to sing? Pick a song - the lyrics are right on the video!`,
      `Ooh, karaoke time! 🎵 Find your favorite song and sing your heart out!`,
      `Yes! Singing time! 💕 Choose a song and follow the lyrics on screen!`
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
              Karaoke Time
            </h1>
            <p className="text-xs text-dark-purple/70">Sing along with lyrics on screen!</p>
          </div>
        </div>

        {/* Bestie Greeting */}
        {bestie && !videoId && (
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
              Search for a karaoke song
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
                  placeholder="e.g. Dancing Queen by ABBA"
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
                <h3 className="text-sm font-bold text-dark-purple">Karaoke Results</h3>
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
                        <Mic className="w-6 h-6 text-dark-purple/30" />
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

          {/* Video Player */}
          {videoId && (
            <div className="space-y-3">
              <div className="text-center">
                <p className="text-sm font-medium text-dark-purple mb-1">🎤 Now Playing</p>
                <p className="text-xs text-dark-purple/70 truncate">{currentSong}</p>
              </div>
              
              {/* Video - Full focus on karaoke with lyrics on screen */}
              <div className="rounded-2xl overflow-hidden bg-black aspect-video">
                <iframe
                  data-testid="karaoke-player"
                  width="100%"
                  height="100%"
                  src={`https://www.youtube-nocookie.com/embed/${videoId}?autoplay=1&rel=0&modestbranding=1`}
                  title="Karaoke video player"
                  frameBorder="0"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                  allowFullScreen
                  className="w-full h-full"
                  style={{ minHeight: '220px' }}
                ></iframe>
              </div>
              
              {/* Simple singing indicator */}
              {bestie && (
                <div className="flex items-center justify-center gap-3 py-2">
                  <div className="w-10 h-10 rounded-full overflow-hidden border-2 border-neon-pink">
                    <img src={bestie.image_url} alt={bestie.name} className="w-full h-full object-cover object-top" />
                  </div>
                  <p className="text-sm text-dark-purple">
                    <span className="font-bold">{bestie.name}</span> is cheering you on! 🎵
                  </p>
                </div>
              )}
              
              <button
                data-testid="stop-karaoke-button"
                onClick={stopPlaying}
                className="w-full py-3 rounded-2xl border-2 border-neon-pink text-neon-pink font-semibold hover:bg-neon-pink/10 transition-all flex items-center justify-center gap-2"
              >
                <Square className="w-4 h-4" />
                Stop Karaoke
              </button>
            </div>
          )}

          {/* Popular Karaoke Songs */}
          {!videoId && searchResults.length === 0 && (
            <div>
              <h3 className="text-sm font-bold text-dark-purple mb-2">
                <span className="flex items-center gap-2">
                  <Mic className="w-4 h-4 text-neon-pink" />
                  Popular Karaoke Songs
                </span>
              </h3>
              <p className="text-xs text-dark-purple/50 mb-3">
                Lyrics appear on the video - just sing along!
              </p>
              <div className="space-y-2">
                {popularKaraokeSongs.map((song, idx) => (
                  <button
                    key={idx}
                    data-testid={`karaoke-song-${idx}`}
                    onClick={() => playVideo(song.id, song.title)}
                    className="w-full p-3 rounded-xl bg-muted hover:bg-neon-pink/10 text-left transition-all flex items-center justify-between group"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-neon-pink to-purple-500 flex items-center justify-center">
                        <Mic className="w-5 h-5 text-white" />
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
    </div>
  );
}
