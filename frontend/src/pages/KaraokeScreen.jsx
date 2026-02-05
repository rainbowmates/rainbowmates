import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Search, Play, Music, X, Mic, Volume2, VolumeX, Loader2, Pause } from 'lucide-react';
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
  
  // Karaoke singing states
  const [lyrics, setLyrics] = useState([]);
  const [currentLineIndex, setCurrentLineIndex] = useState(0);
  const [loadingLyrics, setLoadingLyrics] = useState(false);
  const [bestieSinging, setBestieSinging] = useState(false);
  const [singingAudio, setSingingAudio] = useState(null);
  const [bestieMuted, setBestieMuted] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  
  const audioRef = useRef(null);
  const lyricsIntervalRef = useRef(null);

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

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (lyricsIntervalRef.current) {
        clearInterval(lyricsIntervalRef.current);
      }
      if (audioRef.current) {
        audioRef.current.pause();
      }
    };
  }, []);

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

  // Fetch lyrics and start bestie singing
  const fetchLyricsAndSing = async (songTitle) => {
    setLoadingLyrics(true);
    setBestieSinging(true);
    
    try {
      // Extract song name and artist from title
      const parts = songTitle.replace(/\(.*?\)/g, '').split('-');
      const songName = parts[0]?.trim() || songTitle;
      const artist = parts[1]?.trim() || null;
      
      // Get lyrics
      const lyricsResponse = await axios.post(`${API}/karaoke/lyrics`, {
        song_title: songName,
        artist: artist
      });
      
      if (lyricsResponse.data.lines) {
        setLyrics(lyricsResponse.data.lines);
        setCurrentLineIndex(0);
        
        // Generate singing audio
        const singResponse = await axios.post(`${API}/karaoke/sing`, {
          bestie_id: bestie?.id || 'default',
          lyrics: lyricsResponse.data.lyrics,
          song_title: songName
        });
        
        if (singResponse.data.audio_url) {
          setSingingAudio(singResponse.data.audio_url);
          
          // Start playback
          if (audioRef.current) {
            audioRef.current.src = singResponse.data.audio_url;
            audioRef.current.volume = bestieMuted ? 0 : 0.7;
            
            // Wait a moment for video to start, then play audio
            setTimeout(() => {
              if (audioRef.current) {
                audioRef.current.play().catch(e => console.log('Audio play error:', e));
                setIsPlaying(true);
                startLyricsSync(lyricsResponse.data.lines);
              }
            }, 2000);
          }
        }
      }
    } catch (error) {
      console.error('Lyrics/singing error:', error);
      toast.error('Could not load lyrics. Enjoy the karaoke video!');
    } finally {
      setLoadingLyrics(false);
    }
  };

  // Sync lyrics display with audio
  const startLyricsSync = (lyricsLines) => {
    if (lyricsIntervalRef.current) {
      clearInterval(lyricsIntervalRef.current);
    }
    
    // Estimate time per line based on total lyrics length
    const totalLines = lyricsLines.filter(l => l.trim()).length;
    const estimatedDuration = totalLines * 3000; // ~3 seconds per line
    const timePerLine = estimatedDuration / totalLines;
    
    let lineIdx = 0;
    lyricsIntervalRef.current = setInterval(() => {
      if (lineIdx < lyricsLines.length) {
        setCurrentLineIndex(lineIdx);
        lineIdx++;
      } else {
        clearInterval(lyricsIntervalRef.current);
      }
    }, timePerLine);
  };

  const playVideo = async (id, title) => {
    setVideoId(id);
    setCurrentSong(title);
    setSearchResults([]);
    setLyrics([]);
    setCurrentLineIndex(0);
    toast.success(`Now playing: ${title}`);
    
    // Fetch lyrics and start bestie singing
    if (bestie) {
      await fetchLyricsAndSing(title);
    }
  };

  const stopPlaying = () => {
    setVideoId('');
    setCurrentSong('');
    setLyrics([]);
    setCurrentLineIndex(0);
    setBestieSinging(false);
    setIsPlaying(false);
    
    if (lyricsIntervalRef.current) {
      clearInterval(lyricsIntervalRef.current);
    }
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
  };

  const toggleBestieMute = () => {
    setBestieMuted(!bestieMuted);
    if (audioRef.current) {
      audioRef.current.volume = bestieMuted ? 0.7 : 0;
    }
  };

  // Popular karaoke songs
  const popularKaraokeSongs = [
    { title: 'Sweet Caroline - Neil Diamond (Karaoke)', id: 'NsLyI1_R01M', available: true },
    { title: 'Wonderwall - Oasis (Karaoke)', id: 'Gvfgut8nAgw', available: true },
    { title: 'Happy - Pharrell Williams (Karaoke)', id: 'C7dPqrmDWxs', available: true },
    { title: 'Shallow - Lady Gaga (Karaoke)', id: 'bo_efYhYU2A', available: true },
    { title: 'Someone Like You - Adele (Karaoke)', id: '720FLdlNc7g', available: true }
  ].filter(song => song.available);

  // Greeting message from bestie
  const getGreeting = () => {
    const greetings = [
      `Hey superstar! 🎤 Ready to sing together? Pick a song and I&apos;ll sing along with you!`,
      `Ooh, karaoke time! 🎵 I&apos;ll read the lyrics and sing with you! What should we perform?`,
      `Yes! Singing time! 💕 Choose a song and watch me sing along on screen!`
    ];
    return greetings[Math.floor(Math.random() * greetings.length)];
  };

  return (
    <div className="app-container gradient-mesh min-h-screen overflow-y-auto">
      {/* Hidden audio element for bestie singing */}
      <audio ref={audioRef} />
      
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
            <p className="text-xs text-dark-purple/70">{bestie?.name || 'Your bestie'} sings along with you!</p>
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

          {/* Video Player with Lyrics */}
          {videoId && (
            <div className="space-y-3">
              <div className="text-center">
                <p className="text-sm font-medium text-dark-purple mb-2">🎤 Now Playing</p>
                <p className="text-xs text-dark-purple/70 truncate">{currentSong}</p>
              </div>
              
              {/* Video */}
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
              
              {/* Bestie Singing Section */}
              {bestie && (
                <div className="p-4 rounded-2xl bg-gradient-to-br from-neon-pink/20 to-soft-blue/20">
                  {/* Bestie header */}
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className="relative">
                        <div className="w-12 h-12 rounded-full overflow-hidden border-2 border-neon-pink">
                          <img src={bestie.image_url} alt={bestie.name} className="w-full h-full object-cover object-top" />
                        </div>
                        {bestieSinging && isPlaying && (
                          <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-neon-pink rounded-full flex items-center justify-center">
                            <Mic className="w-3 h-3 text-white animate-pulse" />
                          </div>
                        )}
                      </div>
                      <div>
                        <p className="font-bold text-dark-purple text-sm">{bestie.name}</p>
                        <p className="text-xs text-dark-purple/60">
                          {loadingLyrics ? 'Getting ready to sing...' : 
                           bestieSinging ? 'Singing along! 🎵' : 'Ready to sing'}
                        </p>
                      </div>
                    </div>
                    
                    {/* Mute/unmute bestie */}
                    <button
                      onClick={toggleBestieMute}
                      className="p-2 rounded-full bg-white/50 hover:bg-white/80 transition-all"
                      title={bestieMuted ? 'Unmute bestie' : 'Mute bestie'}
                    >
                      {bestieMuted ? (
                        <VolumeX className="w-5 h-5 text-dark-purple/50" />
                      ) : (
                        <Volume2 className="w-5 h-5 text-neon-pink" />
                      )}
                    </button>
                  </div>
                  
                  {/* Lyrics Display */}
                  {loadingLyrics ? (
                    <div className="flex items-center justify-center py-6">
                      <Loader2 className="w-6 h-6 text-neon-pink animate-spin mr-2" />
                      <span className="text-sm text-dark-purple/70">Loading lyrics...</span>
                    </div>
                  ) : lyrics.length > 0 ? (
                    <div className="bg-white/50 rounded-xl p-4 max-h-40 overflow-hidden">
                      <div className="space-y-2 text-center">
                        {/* Previous line */}
                        {currentLineIndex > 0 && lyrics[currentLineIndex - 1] && (
                          <p className="text-xs text-dark-purple/40 transition-all">
                            {lyrics[currentLineIndex - 1]}
                          </p>
                        )}
                        
                        {/* Current line - highlighted */}
                        <p className="text-base font-bold text-dark-purple animate-pulse transition-all">
                          {lyrics[currentLineIndex] || '🎵 🎵 🎵'}
                        </p>
                        
                        {/* Next line */}
                        {currentLineIndex < lyrics.length - 1 && lyrics[currentLineIndex + 1] && (
                          <p className="text-xs text-dark-purple/40 transition-all">
                            {lyrics[currentLineIndex + 1]}
                          </p>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-4">
                      <div className="flex justify-center items-center gap-2 mb-2">
                        <Mic className="w-5 h-5 text-neon-pink animate-pulse" />
                        <span className="text-lg">🎶</span>
                      </div>
                      <p className="font-bold text-dark-purple">Sing along!</p>
                      <p className="text-xs text-dark-purple/70">Follow the lyrics on the video</p>
                    </div>
                  )}
                </div>
              )}
              
              <button
                onClick={stopPlaying}
                className="w-full py-2 rounded-full border-2 border-neon-pink text-neon-pink font-semibold hover:bg-neon-pink/10 transition-all text-sm"
              >
                Stop Karaoke
              </button>
            </div>
          )}

          {/* Popular Karaoke Songs */}
          {!videoId && searchResults.length === 0 && (
            <div>
              <h3 className="text-sm font-bold text-dark-purple mb-2">Popular Karaoke Songs</h3>
              <p className="text-xs text-dark-purple/50 mb-3">
                {bestie?.name || 'Your bestie'} will sing along with you!
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
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-neon-pink opacity-0 group-hover:opacity-100 transition-all">
                        Sing together!
                      </span>
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
