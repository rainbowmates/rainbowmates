import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { ArrowLeft, ShoppingBag } from 'lucide-react';
import { toast } from 'sonner';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

export default function ShoppingScreen({ user }) {
  const navigate = useNavigate();
  const [bestie, setBestie] = useState(null);
  const [formData, setFormData] = useState({
    gender: 'Female',
    style: '',
    length: 'Midi',
    max_price: '',
    brands: ''
  });
  const [recommendations, setRecommendations] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchBestie();
  }, []);

  const fetchBestie = async () => {
    try {
      const response = await axios.get(`${API}/bestie/${user.id}`);
      setBestie(response.data);
    } catch (error) {
      toast.error('Failed to load bestie');
      navigate('/dashboard');
    }
  };

  const getRecommendations = async () => {
    if (!bestie) return;

    setLoading(true);
    try {
      const response = await axios.post(`${API}/shopping/recommendations?user_id=${user.id}`, {
        bestie_id: bestie.id,
        gender: formData.gender,
        style: formData.style || null,
        length: formData.length,
        max_price: formData.max_price ? parseFloat(formData.max_price) : null,
        brands: formData.brands ? formData.brands.split(',').map(b => b.trim()) : null
      });

      setRecommendations(response.data.recommendations);
    } catch (error) {
      toast.error('Failed to get recommendations');
    } finally {
      setLoading(false);
    }
  };

  if (!bestie) return <div className="app-container min-h-screen flex items-center justify-center">Loading...</div>;

  return (
    <div className="app-container gradient-mesh min-h-screen">
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
            Shopping Time!
          </h1>
        </div>

        <div className="card-soft p-6 space-y-6">
          <div className="text-center">
            <ShoppingBag className="w-16 h-16 mx-auto text-neon-pink mb-2" />
            <p className="text-dark-purple/70">
              {bestie.name} is here to help you find the perfect outfit!
            </p>
          </div>

          {/* Gender */}
          <div>
            <label className="block text-sm font-medium text-dark-purple mb-2">
              Shopping For
            </label>
            <select
              data-testid="shopping-gender"
              value={formData.gender}
              onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
              className="w-full px-4 py-3 rounded-2xl bg-muted border-transparent focus:border-neon-pink focus:ring-2 focus:ring-neon-pink/20 outline-none"
            >
              <option>Male</option>
              <option>Female</option>
            </select>
          </div>

          {/* Style */}
          <div>
            <label className="block text-sm font-medium text-dark-purple mb-2">
              Style (optional)
            </label>
            <input
              data-testid="shopping-style"
              type="text"
              value={formData.style}
              onChange={(e) => setFormData({ ...formData, style: e.target.value })}
              placeholder="e.g., casual, formal, chic"
              className="w-full px-4 py-3 rounded-2xl bg-muted border-transparent focus:border-neon-pink focus:ring-2 focus:ring-neon-pink/20 outline-none"
            />
          </div>

          {/* Length */}
          <div>
            <label className="block text-sm font-medium text-dark-purple mb-2">
              Length
            </label>
            <select
              data-testid="shopping-length"
              value={formData.length}
              onChange={(e) => setFormData({ ...formData, length: e.target.value })}
              className="w-full px-4 py-3 rounded-2xl bg-muted border-transparent focus:border-neon-pink focus:ring-2 focus:ring-neon-pink/20 outline-none"
            >
              <option>Maxi</option>
              <option>Midi</option>
              <option>Mini</option>
            </select>
          </div>

          {/* Max Price */}
          <div>
            <label className="block text-sm font-medium text-dark-purple mb-2">
              Max Price (optional)
            </label>
            <input
              data-testid="shopping-price"
              type="number"
              value={formData.max_price}
              onChange={(e) => setFormData({ ...formData, max_price: e.target.value })}
              placeholder="Enter max price"
              className="w-full px-4 py-3 rounded-2xl bg-muted border-transparent focus:border-neon-pink focus:ring-2 focus:ring-neon-pink/20 outline-none"
            />
          </div>

          {/* Brands */}
          <div>
            <label className="block text-sm font-medium text-dark-purple mb-2">
              Preferred Brands (optional, comma-separated)
            </label>
            <input
              data-testid="shopping-brands"
              type="text"
              value={formData.brands}
              onChange={(e) => setFormData({ ...formData, brands: e.target.value })}
              placeholder="e.g., Zara, H&M, Nike"
              className="w-full px-4 py-3 rounded-2xl bg-muted border-transparent focus:border-neon-pink focus:ring-2 focus:ring-neon-pink/20 outline-none"
            />
          </div>

          <button
            data-testid="get-recommendations-button"
            onClick={getRecommendations}
            disabled={loading}
            className="w-full neon-button disabled:opacity-50"
          >
            {loading ? 'Getting Recommendations...' : 'Get Recommendations'}
          </button>

          {/* Recommendations */}
          {recommendations && (
            <div className="p-6 rounded-2xl bg-gradient-to-br from-soft-yellow/20 to-neon-pink/20" data-testid="recommendations">
              <h3 className="text-lg font-bold text-dark-purple mb-3">
                {bestie.name}'s Recommendations:
              </h3>
              <div className="text-dark-purple whitespace-pre-line">{recommendations}</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}