import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { ArrowLeft, Upload, RefreshCw, Send } from 'lucide-react';
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
  const [showChat, setShowChat] = useState(false);
  const [chatInput, setChatInput] = useState('');
  const [chatMessages, setChatMessages] = useState([]);
  const [isEditMode, setIsEditMode] = useState(false);
  const [step, setStep] = useState(1); // 1: image upload, 2: relationship details

  useEffect(() => {
    // Check if user already has an avatar (edit mode)
    if (user.avatar_url) {
      setIsEditMode(true);
      setAvatarUrl(user.avatar_url);
      setShowChat(true);
      setStep(1); // Start at step 1 even in edit mode
      setChatMessages([
        {
          role: 'assistant',
          content: `Hi ${user.first_name}! Here's your avatar - it looks exactly like you with just a light artistic touch. Want to adjust the filter? Just ask for small changes like "warmer tones" or "softer glow".`
        }
      ]);
      
      // Load saved relationship data
      if (user.relationship_status) {
        setFormData({
          relationship_status: user.relationship_status || 'Single',
          relationship_with: user.relationship_with || 'Men',
          relationship_feel: user.relationship_feel || 'Fun'
        });
      }
    }
  }, [user]);

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      // Create a canvas to resize the image
      const reader = new FileReader();
      reader.onload = (event) => {
        const img = new Image();
        img.onload = () => {
          // Create canvas
          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d');
          
          // Set max dimensions
          const maxWidth = 800;
          const maxHeight = 800;
          
          let width = img.width;
          let height = img.height;
          
          // Calculate new dimensions maintaining aspect ratio
          if (width > height) {
            if (width > maxWidth) {
              height = (height * maxWidth) / width;
              width = maxWidth;
            }
          } else {
            if (height > maxHeight) {
              width = (width * maxHeight) / height;
              height = maxHeight;
            }
          }
          
          // Set canvas size
          canvas.width = width;
          canvas.height = height;
          
          // Draw image on canvas
          ctx.drawImage(img, 0, 0, width, height);
          
          // Convert canvas to blob
          canvas.toBlob((blob) => {
            const resizedFile = new File([blob], file.name, {
              type: file.type,
              lastModified: Date.now()
            });
            
            setImage(resizedFile);
            setImagePreview(URL.createObjectURL(blob));
          }, file.type, 0.9);
        };
        img.src = event.target.result;
      };
      reader.readAsDataURL(file);
    }
  };

  const handleCreate = async () => {
    if (!isEditMode && !image) {
      toast.error('Please upload an image');
      return;
    }

    // If in edit mode and no new image, skip to step 2
    if (isEditMode && !image) {
      setStep(2);
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
      setShowChat(true);
      setChatMessages([
        {
          role: 'assistant',
          content: `Hi ${user.first_name}! I've applied a very light artistic filter to your photo - it should look almost exactly like you with just a subtle touch. Would you like me to adjust the filter? You can ask for things like "add a bit more warmth" or "make it slightly softer".`
        }
      ]);
      toast.success('Avatar created successfully!');
      
      // Update user in localStorage
      const updatedUser = { ...user, avatar_url: response.data.avatar_url };
      localStorage.setItem('rainbow_mates_user', JSON.stringify(updatedUser));
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
      
      // Update user in localStorage
      const updatedUser = { ...user, avatar_url: response.data.avatar_url };
      localStorage.setItem('rainbow_mates_user', JSON.stringify(updatedUser));
      
      setChatMessages([...chatMessages, {
        role: 'assistant',
        content: 'I\'ve applied a new subtle filter - looks just like you! How about this version?'
      }]);
      toast.success('Avatar refreshed!');
    } catch (error) {
      toast.error('Failed to refresh avatar');
    } finally {
      setGenerating(false);
    }
  };

  const handleEditRequest = async () => {
    if (!chatInput.trim()) return;

    const userMessage = { role: 'user', content: chatInput };
    setChatMessages([...chatMessages, userMessage]);
    const editText = chatInput;
    setChatInput('');
    setGenerating(true);

    try {
      // Call the edit endpoint with the description
      const response = await axios.post(
        `${API}/avatar/edit/${user.id}?edit_description=${encodeURIComponent(editText)}`
      );
      
      setAvatarUrl(response.data.avatar_url);
      
      // Update user in localStorage
      const updatedUser = { ...user, avatar_url: response.data.avatar_url };
      localStorage.setItem('rainbow_mates_user', JSON.stringify(updatedUser));

      setChatMessages([...chatMessages, userMessage, {
        role: 'assistant',
        content: 'I\'ve applied that adjustment - the photo should still look exactly like you! How\'s this?'
      }]);
    } catch (error) {
      toast.error('Failed to update avatar. Let me try refreshing it!');
      
      // Fallback to refresh
      try {
        const response = await axios.get(`${API}/avatar/refresh/${user.id}`);
        setAvatarUrl(response.data.avatar_url);
        
        const updatedUser = { ...user, avatar_url: response.data.avatar_url };
        localStorage.setItem('rainbow_mates_user', JSON.stringify(updatedUser));
        
        setChatMessages([...chatMessages, userMessage, {
          role: 'assistant',
          content: 'I\'ve tried a different light filter - still looks like you! Better?'
        }]);
      } catch (err) {
        toast.error('Failed to update avatar');
      }
    } finally {
      setGenerating(false);
    }
  };

  const handleContinue = () => {
    toast.success('Avatar saved! Moving forward...');
    setTimeout(() => navigate('/dashboard'), 1000);
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
            {isEditMode ? 'Edit Your Avatar' : 'Create Your Avatar'}
          </h1>
        </div>

        <div className="card-soft p-6 space-y-6">
          {/* Only show form if not in edit mode or if creating new */}
          {!isEditMode && (
            <>
              {/* Image Upload */}
              <div>
                <label className="block text-sm font-medium text-dark-purple mb-2">
                  Upload Your Photo
                </label>
                <div className="relative">
                  {imagePreview ? (
                    <div className="relative w-full h-48 rounded-2xl overflow-hidden bg-muted">
                      <img 
                        src={imagePreview} 
                        alt="Preview" 
                        className="w-full h-full object-contain"
                      />
                      <button
                        onClick={() => {
                          setImage(null);
                          setImagePreview(null);
                        }}
                        className="absolute top-2 right-2 p-2 rounded-full bg-white/90 hover:bg-white text-dark-purple font-bold text-xl leading-none transition-all shadow-lg"
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

              {/* Create Button */}
              <button
                data-testid="create-avatar-button"
                onClick={handleCreate}
                disabled={generating}
                className="w-full neon-button disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {generating ? 'Creating...' : 'Create Avatar'}
              </button>
            </>
          )}
          {/* Generated Avatar */}
          {avatarUrl && (
            <div className="space-y-4">
              <div className="relative w-full h-64 rounded-2xl overflow-hidden border-4 border-neon-pink">
                <img src={avatarUrl} alt="Generated Avatar" className="w-full h-full object-cover" />
              </div>
              
              {showChat && (
                <>
                  {/* Chat Messages */}
                  <div className="bg-gradient-to-br from-soft-yellow/20 to-neon-pink/20 rounded-2xl p-4 space-y-3 max-h-48 overflow-y-auto" data-testid="avatar-chat">
                    {chatMessages.map((msg, idx) => (
                      <div
                        key={idx}
                        className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                      >
                        <div
                          className={`max-w-[85%] rounded-2xl px-4 py-2 text-sm ${
                            msg.role === 'user'
                              ? 'bg-neon-pink text-white rounded-br-sm'
                              : 'bg-white text-dark-purple rounded-bl-sm'
                          }`}
                        >
                          {msg.content}
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Chat Input */}
                  <div className="flex gap-2">
                    <input
                      data-testid="avatar-edit-input"
                      type="text"
                      value={chatInput}
                      onChange={(e) => setChatInput(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && handleEditRequest()}
                      placeholder="e.g., 'a bit warmer', 'slightly softer', 'less glow'..."
                      className="flex-1 px-4 py-3 rounded-full bg-muted border-transparent focus:border-neon-pink focus:ring-2 focus:ring-neon-pink/20 outline-none"
                      disabled={generating}
                    />
                    <button
                      data-testid="send-edit-button"
                      onClick={handleEditRequest}
                      disabled={generating || !chatInput.trim()}
                      className="px-6 py-3 rounded-full bg-neon-pink text-white font-semibold hover:bg-[#D670D7] transition-all disabled:opacity-50"
                    >
                      Send
                    </button>
                  </div>
                </>
              )}

              <div className="flex gap-3">
                <button
                  data-testid="refresh-avatar-button"
                  onClick={handleRefresh}
                  disabled={generating}
                  className="flex-1 py-3 px-6 rounded-full bg-white border-2 border-neon-pink text-dark-purple font-semibold hover:bg-muted transition-all flex items-center justify-center gap-2"
                >
                  <RefreshCw className={`w-5 h-5 ${generating ? 'animate-spin' : ''}`} />
                  Try Another
                </button>
                <button
                  data-testid="continue-button"
                  onClick={handleContinue}
                  disabled={generating}
                  className="flex-1 neon-button disabled:opacity-50"
                >
                  Looks Great! Continue
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}