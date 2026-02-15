import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';
import { useLanguage } from '../context/LanguageContext';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const BESTIE_IMAGES = [
  { url: 'https://customer-assets.emergentagent.com/job_d78d511c-01b3-4716-b2c4-6339dea946bb/artifacts/dmzb8405_tom.png', description: 'Tom' }
];

const PERSONALITIES = ['Witty', 'Sassy', 'Loyal', 'Supportive', 'Confident', 'Empathetic', 'Outspoken', 'Stylish', 'Adventurous', 'Protective'];
const INTERESTS = ['Fashion', 'Food', 'Going out', 'Relationships'];

// Voice options for ElevenLabs - display shows country and age only
const VOICE_OPTIONS = [
  { id: 'Daniel', label: 'British (25-35)', flag: '🇬🇧', description: 'Clear, expressive' },
  { id: 'James', label: 'British (30-45)', flag: '🇬🇧', description: 'Polished, smooth' },
  { id: 'Arthur', label: 'British (35-50)', flag: '🇬🇧', description: 'Refined, calm' },
  { id: 'Adam', label: 'American (25-35)', flag: '🇺🇸', description: 'Conversational, friendly' },
  { id: 'Josh', label: 'American (30-40)', flag: '🇺🇸', description: 'Warm, smooth' },
  { id: 'Antoni', label: 'American (25-40)', flag: '🇺🇸', description: 'Soft, empathetic' }
];

export default function CreateBestie({ user }) {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const [formData, setFormData] = useState({
    name: '',
    image_url: BESTIE_IMAGES[0].url,
    personality: [],
    interests: [],
    voice_id: 'Daniel' // ElevenLabs voice ID
  });
  const [generating, setGenerating] = useState(false);

  const togglePersonality = (p) => {
    if (formData.personality.includes(p)) {
      setFormData({ ...formData, personality: formData.personality.filter(x => x !== p) });
    } else {
      setFormData({ ...formData, personality: [...formData.personality, p] });
    }
  };

  const toggleInterest = (i) => {
    if (formData.interests.includes(i)) {
      setFormData({ ...formData, interests: formData.interests.filter(x => x !== i) });
    } else {
      setFormData({ ...formData, interests: [...formData.interests, i] });
    }
  };

  const handleCreate = async () => {
    if (!formData.name || formData.personality.length === 0 || formData.interests.length === 0) {
      toast.error('Please fill all fields');
      return;
    }

    setGenerating(true);
    try {
      const response = await axios.post(`${API}/bestie/create?user_id=${user.id}`, formData);
      const newBestie = response.data;
      
      // Save bestie to localStorage immediately
      localStorage.setItem('rainbow_mates_bestie', JSON.stringify(newBestie));
      
      // Also refresh user data from backend to ensure avatar_url is included
      try {
        const userResponse = await axios.get(`${API}/user/${user.id}`);
        if (userResponse.data) {
          localStorage.setItem('rainbow_mates_user', JSON.stringify(userResponse.data));
        }
      } catch (e) {
        // User data refresh failed, but bestie was created
        console.log('User refresh skipped');
      }
      
      toast.success('Bestie created successfully!');
      navigate('/dashboard');
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to create bestie');
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="app-container gradient-mesh min-h-screen overflow-y-auto">
      <div className="p-6 space-y-6">
        <div className="flex items-center gap-4">
          <button
            data-testid="back-button"
            onClick={() => navigate('/dashboard')}
            className="p-2 rounded-full bg-white border border-border hover:bg-muted transition-all"
          >
            <ArrowLeft className="w-6 h-6 text-dark-purple" />
          </button>
          <h1 className="text-3xl font-bold text-dark-purple" style={{ fontFamily: 'Nunito, sans-serif' }}>
            Create Your Bestie
          </h1>
        </div>

        <div className="card-soft p-6 space-y-6">
          {/* Image Selection */}
          <div>
            <label className="block text-sm font-medium text-dark-purple mb-2">
              Choose Look
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {BESTIE_IMAGES.map((img, idx) => (
                <div
                  key={idx}
                  data-testid={`bestie-image-${idx}`}
                  onClick={() => setFormData({ ...formData, image_url: img.url })}
                  className={`relative cursor-pointer rounded-2xl overflow-hidden border-4 transition-all ${
                    formData.image_url === img.url ? 'border-neon-pink ring-2 ring-neon-pink/50' : 'border-transparent'
                  }`}
                >
                  <img src={img.url} alt={img.description} className="w-full h-28 object-cover object-top" />
                  <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-2">
                    <p className="text-xs text-white font-medium text-center">{img.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Name */}
          <div>
            <label className="block text-sm font-medium text-dark-purple mb-2">
              Bestie's Name
            </label>
            <input
              data-testid="bestie-name"
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="Enter a fabulous name..."
              className="w-full px-4 py-3 rounded-2xl bg-muted border-transparent focus:border-neon-pink focus:ring-2 focus:ring-neon-pink/20 outline-none"
            />
          </div>

          {/* Personality - Multi-select Checkboxes */}
          <div>
            <label className="block text-sm font-medium text-dark-purple mb-2">
              Personality Traits
              <span className="text-dark-purple/50 text-xs ml-2">(select all that apply)</span>
            </label>
            <div className="grid grid-cols-2 gap-2">
              {PERSONALITIES.map((p, idx) => {
                const isChecked = formData.personality.includes(p);
                return (
                  <label
                    key={idx}
                    data-testid={`personality-${p.toLowerCase()}`}
                    className={`flex items-center gap-2 px-3 py-2.5 rounded-xl border-2 cursor-pointer transition-all ${
                      isChecked
                        ? 'border-neon-pink bg-neon-pink/10'
                        : 'border-border hover:border-neon-pink/50'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={() => togglePersonality(p)}
                      className="w-4 h-4 rounded border-2 border-neon-pink text-neon-pink focus:ring-neon-pink accent-[#E989EA]"
                    />
                    <span className="text-sm font-medium text-dark-purple">{p}</span>
                  </label>
                );
              })}
            </div>
          </div>

          {/* Interests */}
          <div>
            <label className="block text-sm font-medium text-dark-purple mb-2">
              Interests
            </label>
            <div className="grid grid-cols-2 gap-2">
              {INTERESTS.map((i, idx) => (
                <button
                  key={idx}
                  data-testid={`interest-${i.toLowerCase().replace(' ', '-')}`}
                  onClick={() => toggleInterest(i)}
                  className={`px-4 py-3 rounded-2xl font-semibold transition-all ${
                    formData.interests.includes(i)
                      ? 'bg-neon-pink text-white neon-glow'
                      : 'bg-muted text-dark-purple'
                  }`}
                >
                  {i}
                </button>
              ))}
            </div>
          </div>

          {/* Voice Selection */}
          <div>
            <label className="block text-sm font-medium text-dark-purple mb-2">
              Voice
              <span className="text-dark-purple/50 text-xs ml-2">(select one)</span>
            </label>
            <div className="grid grid-cols-1 gap-2">
              {VOICE_OPTIONS.map((voice) => {
                const isSelected = formData.voice_id === voice.id;
                return (
                  <label
                    key={voice.id}
                    data-testid={`voice-${voice.id.toLowerCase()}`}
                    className={`flex items-center gap-3 px-4 py-3 rounded-xl border-2 cursor-pointer transition-all ${
                      isSelected
                        ? 'border-neon-pink bg-neon-pink/10'
                        : 'border-border hover:border-neon-pink/50'
                    }`}
                  >
                    <input
                      type="radio"
                      name="voice"
                      checked={isSelected}
                      onChange={() => setFormData({ ...formData, voice_id: voice.id })}
                      className="w-4 h-4 border-2 border-neon-pink text-neon-pink focus:ring-neon-pink accent-[#E989EA]"
                    />
                    <span className="text-lg">{voice.flag}</span>
                    <div className="flex-1">
                      <span className="text-sm font-medium text-dark-purple">{voice.label}</span>
                      <span className="text-xs text-dark-purple/50 ml-2">• {voice.description}</span>
                    </div>
                  </label>
                );
              })}
            </div>
          </div>

          {/* Create Button */}
          <button
            data-testid="create-bestie-button"
            onClick={handleCreate}
            disabled={generating}
            className="w-full neon-button disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {generating ? 'Creating...' : 'Create Bestie'}
          </button>
        </div>
      </div>
    </div>
  );
}