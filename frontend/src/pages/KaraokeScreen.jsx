import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Search, Play } from 'lucide-react';
import YouTube from 'react-youtube';
import { toast } from 'sonner';

export default function KaraokeScreen({ user }) {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [videoId, setVideoId] = useState('');
  const [showLyrics, setShowLyrics] = useState(false);

  const searchSong = () => {
    if (!searchQuery) {
      toast.error('Please enter a song name');
      return;
    }
    // Simple YouTube search - in production, use YouTube API
    const query = encodeURIComponent(searchQuery + ' karaoke lyrics');
    toast.success('Opening YouTube search...');
    window.open(`https://www.youtube.com/results?search_query=${query}`, '_blank');
  };

  const playVideo = (id) => {
    setVideoId(id);
    setShowLyrics(true);
  };

  return (
    <div className="app-container gradient-mesh min-h-screen overflow-y-auto">
      <div className="p-6 space-y-6">
        <div className="flex items-center gap-4">
          <button
            data-testid="back-button"
            onClick={() => navigate('/play')}
            className="p-2 rounded-full bg-white border border-border hover:bg-muted transition-all"
          >
            <ArrowLeft className="w-6 h-6 text-dark-purple" />
          </button>
          <h1 className="text-3xl font-bold text-dark-purple" style={{ fontFamily: 'Nunito, sans-serif' }}>
            Karaoke Time!
          </h1>
        </div>

        <div className="card-soft p-6 space-y-6">
          {/* Search */}
          <div>
            <label className="block text-sm font-medium text-dark-purple mb-2">
              Search for a song
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
                  placeholder="Search for songs..."
                  className="w-full pl-10 pr-4 py-3 rounded-2xl bg-muted border-transparent focus:border-neon-pink focus:ring-2 focus:ring-neon-pink/20 outline-none"
                />
              </div>
              <button
                data-testid="search-button"
                onClick={searchSong}
                className="px-6 py-3 rounded-2xl bg-neon-pink text-white font-semibold hover:bg-[#D670D7] transition-all"
              >
                Search
              </button>
            </div>
          </div>

          {/* Popular Songs */}
          <div>
            <h3 className="text-lg font-bold text-dark-purple mb-3">Popular Songs</h3>
            <div className="space-y-2">
              {[
                { title: 'Dancing Queen - ABBA', id: 'xFrGuyw1V8s' },
                { title: 'I Will Survive - Gloria Gaynor', id: 'gYkACVDFmeg' },
                { title: 'Girls Just Want to Have Fun', id: 'PIb6AZdTr-A' }
              ].map((song, idx) => (
                <button
                  key={idx}
                  data-testid={`song-${idx}`}
                  onClick={() => playVideo(song.id)}
                  className="w-full p-4 rounded-2xl bg-muted hover:bg-neon-pink/10 text-left transition-all flex items-center justify-between"
                >
                  <span className="font-medium text-dark-purple">{song.title}</span>
                  <Play className="w-5 h-5 text-neon-pink" />
                </button>
              ))}
            </div>
          </div>

          {/* Video Player */}
          {videoId && (
            <div className="rounded-2xl overflow-hidden">
              <YouTube
                videoId={videoId}
                opts={{
                  width: '100%',
                  height: '240',
                  playerVars: {
                    autoplay: 1,
                  }
                }}
              />
            </div>
          )}

          {showLyrics && (
            <div className="p-4 rounded-2xl bg-gradient-to-br from-neon-pink/10 to-soft-blue/10">
              <p className="text-center text-dark-purple font-medium">
                Sing along with your bestie!
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}