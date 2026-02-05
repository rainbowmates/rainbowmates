import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Search, Play, Music, X, Video, Loader2, RefreshCw, Download } from 'lucide-react';
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
  
  // AI Video Generation States
  const [generatingVideo, setGeneratingVideo] = useState(false);
  const [videoJobId, setVideoJobId] = useState(null);
  const [generatedVideoUrl, setGeneratedVideoUrl] = useState(null);
  const [videoStatus, setVideoStatus] = useState(null);
  const [selectedSong, setSelectedSong] = useState(null);
  const pollingRef = useRef(null);

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

  // Cleanup polling on unmount
  useEffect(() => {
    return () => {
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
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

  // Generate AI dance video
  const generateDanceVideo = async (songTitle) => {
    if (!user?.avatar_url || !bestie?.image_url) {
      toast.error('Both you and your bestie need avatars to generate a dance video!');
      return;
    }

    setGeneratingVideo(true);
    setVideoStatus('starting');
    setGeneratedVideoUrl(null);
    setSelectedSong(songTitle);

    try {
      // Create a simple, safe prompt for dance video
      const danceStyle = getDanceStyleFromSong(songTitle);
      const prompt = `Two friends dancing together in a colorful dance studio. They are doing a ${danceStyle}, having fun and smiling. Bright colorful lighting, energetic mood, professional video quality.`;

      const response = await axios.post(`${API}/video/generate`, {
        user_id: user.id,
        prompt: prompt,
        model: 'sora-2',
        size: '1280x720',
        duration: 4
      });

      if (response.data.job_id) {
        setVideoJobId(response.data.job_id);
        setVideoStatus('queued');
        toast.success('Dance video generation started! This may take a few minutes...');
        
        // Start polling for status
        startPolling(response.data.job_id);
      }
    } catch (error) {
      console.error('Video generation error:', error);
      toast.error('Failed to start video generation. Please try again.');
      setGeneratingVideo(false);
      setVideoStatus(null);
    }
  };

  const getDanceStyleFromSong = (songTitle) => {
    const title = songTitle.toLowerCase();
    if (title.includes('disco') || title.includes('funk')) return 'fun disco dance with retro moves';
    if (title.includes('hip hop') || title.includes('rap')) return 'energetic hip hop dance';
    if (title.includes('salsa') || title.includes('latin')) return 'passionate salsa dance';
    if (title.includes('pop')) return 'trendy pop dance with synchronized moves';
    if (title.includes('edm') || title.includes('electronic')) return 'high-energy EDM dance';
    if (title.includes('slow') || title.includes('ballad')) return 'elegant slow dance';
    return 'fun choreographed dance routine';
  };

  const startPolling = (jobId) => {
    // Clear any existing polling
    if (pollingRef.current) {
      clearInterval(pollingRef.current);
    }

    // Poll every 10 seconds
    pollingRef.current = setInterval(async () => {
      try {
        const response = await axios.get(`${API}/video/status/${jobId}`);
        const status = response.data.status;
        setVideoStatus(status);

        if (status === 'completed') {
          clearInterval(pollingRef.current);
          pollingRef.current = null;
          setGeneratingVideo(false);
          
          if (response.data.video_url) {
            setGeneratedVideoUrl(response.data.video_url);
            toast.success('Your dance video is ready! 🎉');
          }
        } else if (status === 'failed') {
          clearInterval(pollingRef.current);
          pollingRef.current = null;
          setGeneratingVideo(false);
          toast.error('Video generation failed. Please try again.');
        }
      } catch (error) {
        console.error('Status check error:', error);
      }
    }, 10000);
  };

  const playVideo = (id, title) => {
    setVideoId(id);
    setDancing(true);
    setSearchResults([]);
    toast.success(`Now playing: ${title}`);
    
    // Ask if they want to generate an AI dance video
    setSelectedSong(title);
  };

  const stopDancing = () => {
    setVideoId('');
    setDancing(false);
    setSelectedSong(null);
  };

  const resetVideoGeneration = () => {
    setGeneratingVideo(false);
    setVideoJobId(null);
    setGeneratedVideoUrl(null);
    setVideoStatus(null);
    if (pollingRef.current) {
      clearInterval(pollingRef.current);
      pollingRef.current = null;
    }
  };

  // Greeting message from bestie
  const getGreeting = () => {
    const greetings = [
      `Hey gorgeous! 💃 I'm SO ready to dance! Pick a song and let's create an amazing dance video together!`,
      `Ooh, dance time! 🎶 Let's make a video of us dancing! Pick your favorite song!`,
      `Hey babe! 💕 Ready to go viral? Choose a song and watch us dance together in AI magic!`
    ];
    return greetings[Math.floor(Math.random() * greetings.length)];
  };

  const getStatusMessage = () => {
    switch (videoStatus) {
      case 'starting':
        return 'Preparing your dance video...';
      case 'queued':
        return 'Video is in the queue...';
      case 'processing':
        return 'AI is creating your dance video...';
      case 'completed':
        return 'Your dance video is ready!';
      case 'failed':
        return 'Video generation failed';
      default:
        return 'Generating your dance video...';
    }
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
            <p className="text-xs text-dark-purple/70">Create AI dance videos with {bestie?.name || 'your bestie'}!</p>
          </div>
        </div>

        {/* Bestie Greeting */}
        {bestie && !dancing && !generatingVideo && !generatedVideoUrl && (
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

        {/* Generated Video Display */}
        {generatedVideoUrl && (
          <div className="card-soft p-4 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-dark-purple flex items-center gap-2">
                <Video className="w-5 h-5 text-neon-pink" />
                Your Dance Video
              </h3>
              <button
                onClick={resetVideoGeneration}
                className="p-2 rounded-full bg-muted hover:bg-neon-pink/10 transition-all"
              >
                <X className="w-4 h-4 text-dark-purple" />
              </button>
            </div>
            
            <div className="rounded-2xl overflow-hidden bg-black aspect-video">
              <video
                data-testid="generated-video"
                src={generatedVideoUrl}
                controls
                autoPlay
                loop
                className="w-full h-full object-contain"
              />
            </div>
            
            <p className="text-center text-sm text-dark-purple/70">
              You and {bestie?.name} dancing to &ldquo;{selectedSong}&rdquo;! 💃🕺
            </p>
            
            <div className="flex gap-2">
              <button
                onClick={() => generateDanceVideo(selectedSong)}
                className="flex-1 py-3 rounded-2xl bg-gradient-to-r from-neon-pink to-soft-blue text-white font-semibold hover:opacity-90 transition-all flex items-center justify-center gap-2"
              >
                <RefreshCw className="w-4 h-4" />
                Generate Another
              </button>
              <a
                href={generatedVideoUrl}
                download={`dance-${Date.now()}.mp4`}
                className="px-4 py-3 rounded-2xl bg-muted text-dark-purple font-semibold hover:bg-neon-pink/10 transition-all flex items-center justify-center gap-2"
              >
                <Download className="w-4 h-4" />
              </a>
            </div>
          </div>
        )}

        {/* Video Generation Progress */}
        {generatingVideo && (
          <div className="card-soft p-6 space-y-4">
            <div className="text-center">
              <div className="w-20 h-20 mx-auto mb-4 relative">
                <div className="absolute inset-0 rounded-full border-4 border-neon-pink/20"></div>
                <div className="absolute inset-0 rounded-full border-4 border-neon-pink border-t-transparent animate-spin"></div>
                <div className="absolute inset-2 rounded-full bg-gradient-to-br from-neon-pink/20 to-soft-blue/20 flex items-center justify-center">
                  <Video className="w-8 h-8 text-neon-pink" />
                </div>
              </div>
              
              <h3 className="text-lg font-bold text-dark-purple mb-2">Creating Your Dance Video</h3>
              <p className="text-sm text-dark-purple/70 mb-4">{getStatusMessage()}</p>
              
              {/* Progress indicator */}
              <div className="w-full bg-muted rounded-full h-2 mb-4">
                <div 
                  className="bg-gradient-to-r from-neon-pink to-soft-blue h-2 rounded-full transition-all duration-500"
                  style={{ 
                    width: videoStatus === 'queued' ? '25%' : 
                           videoStatus === 'processing' ? '60%' : 
                           videoStatus === 'completed' ? '100%' : '10%' 
                  }}
                />
              </div>
              
              {/* Preview of who's dancing */}
              <div className="flex justify-center items-center gap-4 py-4">
                {user?.avatar_url && (
                  <div className="w-16 h-20 rounded-xl overflow-hidden border-2 border-neon-pink animate-pulse">
                    <img src={user.avatar_url} alt="You" className="w-full h-full object-cover object-top" />
                  </div>
                )}
                <div className="text-2xl animate-bounce">💃🕺</div>
                {bestie?.image_url && (
                  <div className="w-16 h-20 rounded-xl overflow-hidden border-2 border-soft-yellow animate-pulse">
                    <img src={bestie.image_url} alt={bestie.name} className="w-full h-full object-cover object-top" />
                  </div>
                )}
              </div>
              
              <p className="text-xs text-dark-purple/50">
                This usually takes 2-5 minutes. Please wait...
              </p>
              
              <button
                onClick={resetVideoGeneration}
                className="mt-4 px-4 py-2 rounded-full border border-dark-purple/20 text-dark-purple/70 text-sm hover:bg-muted transition-all"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Main Content - Song Selection */}
        {!generatingVideo && !generatedVideoUrl && (
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
                      onClick={() => generateDanceVideo(result.title)}
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
                        <Video className="w-5 h-5 text-neon-pink" />
                        <span className="text-[10px] text-neon-pink font-medium">Create</span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Video Player - only show if not generating */}
            {videoId && !generatingVideo && (
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
                
                {/* Generate AI Video Button */}
                {selectedSong && (
                  <button
                    onClick={() => generateDanceVideo(selectedSong)}
                    className="w-full py-3 rounded-2xl bg-gradient-to-r from-neon-pink to-soft-blue text-white font-semibold hover:opacity-90 transition-all flex items-center justify-center gap-2"
                  >
                    <Video className="w-5 h-5" />
                    Create AI Dance Video
                  </button>
                )}
                
                <button
                  onClick={stopDancing}
                  className="w-full py-2 rounded-full border-2 border-neon-pink text-neon-pink font-semibold hover:bg-neon-pink/10 transition-all text-sm"
                >
                  Stop Music
                </button>
              </div>
            )}

            {/* Dancing Animation - shown while music plays */}
            {dancing && !generatingVideo && (
              <div className="p-4 rounded-2xl bg-gradient-to-br from-neon-pink/20 to-soft-blue/20 text-center overflow-hidden">
                <div className="relative h-48 flex justify-center items-end">
                  <div className="absolute inset-0 bg-gradient-radial from-white/30 via-transparent to-transparent rounded-full" />
                  
                  <div className="absolute top-2 left-1/4 text-xl animate-ping" style={{ animationDuration: '2s' }}>✨</div>
                  <div className="absolute top-8 right-1/4 text-lg animate-ping" style={{ animationDuration: '2.5s', animationDelay: '0.5s' }}>💫</div>
                  <div className="absolute top-4 left-1/2 text-xl animate-bounce" style={{ animationDuration: '1s' }}>🎵</div>
                  
                  <div className="relative flex items-end justify-center" style={{ animation: 'couple-sway 2s ease-in-out infinite' }}>
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
                    
                    <div className="relative z-20 -mx-3 mb-8" style={{ animation: 'heart-pulse 0.5s ease-in-out infinite' }}>
                      <span className="text-2xl">💕</span>
                    </div>
                    
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
                  
                  <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-40 h-4 bg-gradient-to-t from-neon-pink/20 to-transparent rounded-full blur-sm" />
                </div>
                
                <p className="text-base font-bold text-dark-purple mt-2">Dancing together! 💃🕺</p>
                <p className="text-xs text-dark-purple/70">Click &ldquo;Create AI Dance Video&rdquo; to make a video of you two!</p>
              </div>
            )}

            {/* Popular Dance Songs */}
            {!videoId && searchResults.length === 0 && (
              <div>
                <h3 className="text-sm font-bold text-dark-purple mb-2">
                  <span className="flex items-center gap-2">
                    <Video className="w-4 h-4 text-neon-pink" />
                    Pick a Song to Create Dance Video
                  </span>
                </h3>
                <p className="text-xs text-dark-purple/50 mb-3">Select a song and we&apos;ll create an AI video of you and {bestie?.name || 'your bestie'} dancing!</p>
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
                      onClick={() => generateDanceVideo(song.title)}
                      className="w-full p-3 rounded-xl bg-muted hover:bg-neon-pink/10 text-left transition-all flex items-center justify-between group"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-neon-pink to-soft-blue flex items-center justify-center">
                          <Music className="w-5 h-5 text-white" />
                        </div>
                        <span className="font-medium text-dark-purple text-sm">{song.title}</span>
                      </div>
                      <div className="flex items-center gap-2 opacity-70 group-hover:opacity-100 transition-all">
                        <Video className="w-5 h-5 text-neon-pink" />
                        <span className="text-xs text-neon-pink font-medium hidden sm:block">Create Video</span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}
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
    </div>
  );
}
