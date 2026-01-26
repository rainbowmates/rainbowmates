import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Search, Play } from 'lucide-react';
import YouTube from 'react-youtube';
import { toast } from 'sonner';

export default function DanceScreen({ user }) {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [videoId, setVideoId] = useState('');
  const [dancing, setDancing] = useState(false);

  const searchSong = () => {
    if (!searchQuery) {
      toast.error('Please enter a song name');
      return;
    }
    const query = encodeURIComponent(searchQuery);
    toast.success('Opening YouTube search...');
    window.open(`https://www.youtube.com/results?search_query=${query}`, '_blank');
  };

  const playVideo = (id) => {
    setVideoId(id);
    setDancing(true);
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
            Dance Party!
          </h1>
        </div>

        <div className="card-soft p-6 space-y-6">
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
                  placeholder="Search for dance music..."
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

          {/* Popular Dance Songs */}
          <div>
            <h3 className="text-lg font-bold text-dark-purple mb-3">Dance Hits</h3>
            <div className="space-y-2">
              {[
                { title: 'Levitating - Dua Lipa', id: 'TUVcZfQe-Kw' },
                { title: 'Blinding Lights - The Weeknd', id: '4NRXx6U8ABQ' },
                { title: 'Dance Monkey - Tones and I', id: 'q0hyYWKXF0Q' }
              ].map((song, idx) => (
                <button
                  key={idx}
                  data-testid={`dance-song-${idx}`}
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

          {dancing && (
            <div className="p-8 rounded-2xl bg-gradient-to-br from-neon-pink/20 to-soft-blue/20 text-center">
              <div className="animate-bounce">
                <p className="text-4xl mb-4">💃</p>
                <p className="text-xl font-bold text-dark-purple">Dance time!</p>
                <p className="text-sm text-dark-purple/70 mt-2">You and your bestie are dancing!</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}