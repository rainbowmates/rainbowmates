import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { ArrowLeft, Upload, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

export default function CreateAvatar({ user }) {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    relationship_status: 'Single',
    relationship_with: 'Men',
    relationship_feel: 'Fun'
  });
  const [image, setImage] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [generating, setGenerating] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState(null);

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setImage(file);
      setImagePreview(URL.createObjectURL(file));
    }
  };

  const handleCreate = async () => {
    if (!image) {
      toast.error('Please upload an image');
      return;
    }

    setGenerating(true);
    try {
      const formDataObj = new FormData();
      formDataObj.append('user_id', user.id);
      formDataObj.append('relationship_status', formData.relationship_status);
      formDataObj.append('relationship_with', formData.relationship_with);
      formDataObj.append('relationship_feel', formData.relationship_feel);
      formDataObj.append('image', image);

      const response = await axios.post(`${API}/avatar/create`, formDataObj, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      setAvatarUrl(response.data.avatar_url);
      toast.success('Avatar created successfully!');
      
      // Update user in localStorage
      const updatedUser = { ...user, avatar_url: response.data.avatar_url };
      localStorage.setItem('rainbow_mates_user', JSON.stringify(updatedUser));
      
      setTimeout(() => navigate('/dashboard'), 2000);
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to create avatar');
    } finally {
      setGenerating(false);
    }
  };

  const handleRefresh = async () => {
    setGenerating(true);
    try {
      const response = await axios.get(`${API}/avatar/refresh/${user.id}`);
      setAvatarUrl(response.data.avatar_url);
      toast.success('Avatar refreshed!');
    } catch (error) {
      toast.error('Failed to refresh avatar');
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="app-container gradient-mesh min-h-screen">
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
            Create Your Avatar
          </h1>
        </div>

        <div className="card-soft p-6 space-y-6">
          {/* Image Upload */}
          <div>
            <label className="block text-sm font-medium text-dark-purple mb-2">
              Upload Your Photo
            </label>
            <div className="relative">
              {imagePreview ? (
                <div className="relative w-full h-48 rounded-2xl overflow-hidden">
                  <img src={imagePreview} alt="Preview" className="w-full h-full object-cover" />
                  <button
                    onClick={() => {
                      setImage(null);
                      setImagePreview(null);
                    }}
                    className="absolute top-2 right-2 p-2 rounded-full bg-white/80 hover:bg-white"
                  >
                    ×
                  </button>
                </div>
              ) : (
                <label
                  data-testid="image-upload"
                  className="flex flex-col items-center justify-center w-full h-48 border-2 border-dashed border-border rounded-2xl cursor-pointer hover:bg-muted transition-all"
                >
                  <Upload className="w-12 h-12 text-dark-purple/40 mb-2" />
                  <p className="text-sm text-dark-purple/60">Click to upload</p>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageChange}
                    className="hidden"
                  />
                </label>
              )}
            </div>
          </div>

          {/* Relationship Status */}
          <div>
            <label className="block text-sm font-medium text-dark-purple mb-2">
              Relationship Status
            </label>
            <select
              data-testid="relationship-status"
              value={formData.relationship_status}
              onChange={(e) => setFormData({ ...formData, relationship_status: e.target.value })}
              className="w-full px-4 py-3 rounded-2xl bg-muted border-transparent focus:border-neon-pink focus:ring-2 focus:ring-neon-pink/20 outline-none"
            >
              <option>Single</option>
              <option>Partner</option>
              <option>Married</option>
              <option>Open relationship</option>
              <option>Rather not say</option>
            </select>
          </div>

          {/* Relationship With */}
          <div>
            <label className="block text-sm font-medium text-dark-purple mb-2">
              Relationship With
            </label>
            <select
              data-testid="relationship-with"
              value={formData.relationship_with}
              onChange={(e) => setFormData({ ...formData, relationship_with: e.target.value })}
              className="w-full px-4 py-3 rounded-2xl bg-muted border-transparent focus:border-neon-pink focus:ring-2 focus:ring-neon-pink/20 outline-none"
            >
              <option>Men</option>
              <option>A woman</option>
              <option>Multiple women</option>
              <option>Bi</option>
              <option>Transgender person</option>
              <option>Rather not say</option>
            </select>
          </div>

          {/* Relationship Feel */}
          <div>
            <label className="block text-sm font-medium text-dark-purple mb-2">
              How does it feel?
            </label>
            <select
              data-testid="relationship-feel"
              value={formData.relationship_feel}
              onChange={(e) => setFormData({ ...formData, relationship_feel: e.target.value })}
              className="w-full px-4 py-3 rounded-2xl bg-muted border-transparent focus:border-neon-pink focus:ring-2 focus:ring-neon-pink/20 outline-none"
            >
              <option>Fun</option>
              <option>Boring</option>
              <option>Coming to an end</option>
              <option>Rather not say</option>
            </select>
          </div>

          {/* Generated Avatar */}
          {avatarUrl && (
            <div className="space-y-4">
              <div className="relative w-full h-64 rounded-2xl overflow-hidden">
                <img src={avatarUrl} alt="Generated Avatar" className="w-full h-full object-cover" />
              </div>
              <button
                data-testid="refresh-avatar-button"
                onClick={handleRefresh}
                disabled={generating}
                className="w-full py-3 px-6 rounded-full bg-white border-2 border-neon-pink text-dark-purple font-semibold hover:bg-muted transition-all flex items-center justify-center gap-2"
              >
                <RefreshCw className={`w-5 h-5 ${generating ? 'animate-spin' : ''}`} />
                Refresh Avatar
              </button>
            </div>
          )}

          {/* Create Button */}
          <button
            data-testid="create-avatar-button"
            onClick={handleCreate}
            disabled={generating}
            className="w-full neon-button disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {generating ? 'Creating...' : 'Create Avatar'}
          </button>
        </div>
      </div>
    </div>
  );
}