import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const BESTIE_IMAGES = [
  { url: 'https://customer-assets.emergentagent.com/job_rainbow-mates-1/artifacts/32yvckp4_gay%2017.png', description: 'Pink Chic' },
  { url: 'https://customer-assets.emergentagent.com/job_rainbow-mates-1/artifacts/2jwu7p2q_gay%206.png', description: 'Cool & Casual' },
  { url: 'https://customer-assets.emergentagent.com/job_rainbow-mates-1/artifacts/fsnv5n4y_gay%202.png', description: 'Golden Style' },
  { url: 'https://customer-assets.emergentagent.com/job_rainbow-mates-1/artifacts/huvllvzn_gay%208.png', description: 'Glamorous' },
  { url: 'https://customer-assets.emergentagent.com/job_rainbow-mates-1/artifacts/fmgwn4zi_gay%2040.png', description: 'Classic & Warm' }
];

const PERSONALITIES = ['Funny', 'Chatty', 'Serious', 'Gossipy', 'Sympathetic', 'Attentive', 'Intellectual', 'Bitchy'];
const INTERESTS = ['Fashion', 'Food', 'Going out', 'Relationships'];
const ACCENTS = ['American', 'British', 'Australian', 'Southern', 'New York', 'Valley Girl'];

export default function CreateBestie({ user }) {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    name: '',
    image_url: BESTIE_IMAGES[0].url,
    personality: [],
    interests: [],
    accent: 'American'
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
      await axios.post(`${API}/bestie/create?user_id=${user.id}`, formData);
      toast.success('Bestie created successfully!');
      setTimeout(() => navigate('/dashboard'), 2000);
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

          {/* Personality */}
          <div>
            <label className="block text-sm font-medium text-dark-purple mb-2">
              Personality (swipe to select)
            </label>
            <div className="flex gap-2 overflow-x-auto pb-2">
              {PERSONALITIES.map((p, idx) => (
                <button
                  key={idx}
                  data-testid={`personality-${p.toLowerCase()}`}
                  onClick={() => togglePersonality(p)}
                  className={`px-4 py-2 rounded-full font-semibold whitespace-nowrap transition-all ${
                    formData.personality.includes(p)
                      ? 'bg-neon-pink text-white neon-glow'
                      : 'bg-muted text-dark-purple'
                  }`}
                >
                  {p}
                </button>
              ))}
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

          {/* Accent */}
          <div>
            <label className="block text-sm font-medium text-dark-purple mb-2">
              Accent
            </label>
            <select
              data-testid="bestie-accent"
              value={formData.accent}
              onChange={(e) => setFormData({ ...formData, accent: e.target.value })}
              className="w-full px-4 py-3 rounded-2xl bg-muted border-transparent focus:border-neon-pink focus:ring-2 focus:ring-neon-pink/20 outline-none"
            >
              {ACCENTS.map((a, idx) => (
                <option key={idx} value={a}>{a}</option>
              ))}
            </select>
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