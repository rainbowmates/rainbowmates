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
  const [filterStyle, setFilterStyle] = useState({
    brightness: 100,
    contrast: 100,
    saturate: 100,
    warmth: 0
  });
  const [showFilterOptions, setShowFilterOptions] = useState(false);
  const [selectedFilterPreset, setSelectedFilterPreset] = useState(null);
  const [showOutfitSelection, setShowOutfitSelection] = useState(false);
  const [selectedOutfitCategory, setSelectedOutfitCategory] = useState(null);
  const [originalPhoto, setOriginalPhoto] = useState(null); // Store original for outfit generation
  const [showOutfitReview, setShowOutfitReview] = useState(false);
  const [currentOutfitDescription, setCurrentOutfitDescription] = useState('');
  const [loadingMessage, setLoadingMessage] = useState('');
  
  const loadingMessages = [
    "Finding the perfect outfit for you...",
    "Selecting the right fabric...",
    "Cutting the cloth...",
    "Adding some style...",
    "Stitching it all together...",
    "Adding final touches...",
    "Almost ready...",
    "Just a moment more..."
  ];

  // Outfit categories
  const outfitCategories = [
    { id: 'casual-jeans', name: 'Jeans & T-Shirt', icon: '👖', options: ['Classic denim & white tee', 'Blue jeans & graphic tee', 'Black jeans & crop top'] },
    { id: 'casual-shorts', name: 'Shorts & T-Shirt', icon: '🩳', options: ['Denim shorts & tank top', 'Athletic shorts & tee', 'Casual shorts & polo'] },
    { id: 'summer-dress', name: 'Summer Dress', icon: '👗', options: ['Floral sundress', 'Maxi dress', 'Cotton mini dress'] },
    { id: 'winter', name: 'Winter Clothes', icon: '🧥', options: ['Sweater & jeans', 'Coat & scarf', 'Hoodie & leggings'] },
    { id: 'party-dress', name: 'Party Dress', icon: '🎉', options: ['Cocktail dress', 'Sequin dress', 'Little black dress'] },
    { id: 'evening-gown', name: 'Evening Gown', icon: '✨', options: ['Long satin gown', 'Ball gown', 'Elegant maxi dress'] },
    { id: 'professional', name: 'Professional', icon: '💼', options: ['Blazer & pants', 'Business dress', 'Suit'] },
    { id: 'skater-dress', name: 'Skater Dress', icon: '💃', options: ['Classic skater dress', 'Floral skater dress', 'A-line dress'] }
  ];

  // Preset filter options
  const filterPresets = [
    {
      id: 'natural',
      name: 'Natural',
      style: { brightness: 105, contrast: 100, saturate: 100, warmth: 0 }
    },
    {
      id: 'warm',
      name: 'Warm Glow',
      style: { brightness: 110, contrast: 105, saturate: 110, warmth: 10 }
    },
    {
      id: 'cool',
      name: 'Cool Vibes',
      style: { brightness: 105, contrast: 110, saturate: 115, warmth: -10 }
    },
    {
      id: 'soft',
      name: 'Soft & Dreamy',
      style: { brightness: 115, contrast: 95, saturate: 95, warmth: 5 }
    }
  ];

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
          content: `Hi ${user.first_name}! Here's your photo! Want to enhance it with filter effects? Try asking for "warmer", "brighter", "add glow", "cooler tones", or "more vibrant".`
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
      // Convert image to base64 to store directly - NO AI GENERATION
      const reader = new FileReader();
      reader.onload = async (e) => {
        const imageBase64 = e.target.result; // This is the actual uploaded photo
        
        setAvatarUrl(imageBase64);
        setShowFilterOptions(true); // Show 4 filter options
        setGenerating(false);
        toast.success('Photo uploaded! Choose your favorite filter below.');
      };
      reader.readAsDataURL(image);
    } catch (error) {
      toast.error('Failed to process image');
      setGenerating(false);
    }
  };

  const handleSelectFilter = async (preset) => {
    setSelectedFilterPreset(preset.id);
    setFilterStyle(preset.style);
    setShowFilterOptions(false);
    
    // Store original photo before outfit selection
    setOriginalPhoto(avatarUrl);
    
    // Move to outfit selection
    setShowOutfitSelection(true);
    toast.success(`${preset.name} filter selected! Now choose your outfit.`);
  };

  const handleSelectOutfit = async (category, outfitOption) => {
    setGenerating(true);
    setShowOutfitSelection(false);
    
    console.log('Generating outfit with:', { outfitOption, originalPhoto: originalPhoto?.substring(0, 50) });
    
    try {
      // Generate avatar with outfit using AI
      const response = await axios.post(`${API}/avatar/generate-with-outfit`, {
        user_id: user.id,
        base_image: originalPhoto,
        outfit_description: outfitOption,
        filter_style: filterStyle
      });

      console.log('Outfit generation response:', { 
        hasAvatarUrl: !!response.data.avatar_url, 
        avatarUrlLength: response.data.avatar_url?.length 
      });

      setAvatarUrl(response.data.avatar_url);
      setCurrentOutfitDescription(outfitOption);
      setShowOutfitReview(true);
      
      console.log('State updated:', { showOutfitReview: true, avatarUrlSet: !!response.data.avatar_url });
      
      toast.success('Avatar created! How do you like it?');
    } catch (error) {
      console.error('Outfit generation error:', error);
      toast.error('Failed to generate avatar with outfit: ' + (error.response?.data?.detail || error.message));
      // Fallback - just use the filtered photo
      setAvatarUrl(originalPhoto);
      setShowOutfitReview(true);
    } finally {
      setGenerating(false);
    }
  };

  const handleChangeOutfit = () => {
    setShowOutfitReview(false);
    setShowOutfitSelection(true);
    setSelectedOutfitCategory(null);
    toast.info('Choose a different outfit');
  };

  const handleConfirmOutfit = async () => {
    setShowOutfitReview(false);
    
    // Save to backend
    try {
      await axios.put(`${API}/user/update/${user.id}`, {
        avatar_url: avatarUrl
      });

      // Update user in localStorage
      const updatedUser = { ...user, avatar_url: avatarUrl };
      localStorage.setItem('rainbow_mates_user', JSON.stringify(updatedUser));
      
      toast.success('Avatar saved! Moving to next step.');
      
      // Move to step 2 (About You)
      setStep(2);
    } catch (error) {
      toast.error('Failed to save avatar');
    }
  };

  const handleRefresh = async () => {
    // Reset filters to default
    setFilterStyle({
      brightness: 100,
      contrast: 100,
      saturate: 100,
      warmth: 0
    });
    
    setChatMessages([...chatMessages, {
      role: 'assistant',
      content: 'Filters reset to original! Your photo looks fresh again.'
    }]);
    toast.success('Filters reset!');
  };

  const applyFilter = (request) => {
    const lower = request.toLowerCase();
    let newFilters = { ...filterStyle };
    let applied = [];

    // Brightness adjustments
    if (lower.includes('brighter') || lower.includes('lighter')) {
      newFilters.brightness = Math.min(150, filterStyle.brightness + 15);
      applied.push('brighter');
    }
    if (lower.includes('darker') || lower.includes('dimmer')) {
      newFilters.brightness = Math.max(70, filterStyle.brightness - 15);
      applied.push('darker');
    }

    // Warmth adjustments
    if (lower.includes('warm') || lower.includes('warmer')) {
      newFilters.warmth = Math.min(30, filterStyle.warmth + 10);
      applied.push('warmer tones');
    }
    if (lower.includes('cool') || lower.includes('cooler')) {
      newFilters.warmth = Math.max(-30, filterStyle.warmth - 10);
      applied.push('cooler tones');
    }

    // Saturation/Vibrance
    if (lower.includes('vibrant') || lower.includes('colorful') || lower.includes('saturate')) {
      newFilters.saturate = Math.min(150, filterStyle.saturate + 20);
      applied.push('more vibrant');
    }
    if (lower.includes('muted') || lower.includes('desaturate') || lower.includes('less color')) {
      newFilters.saturate = Math.max(70, filterStyle.saturate - 20);
      applied.push('less saturated');
    }

    // Contrast
    if (lower.includes('contrast')) {
      if (lower.includes('more') || lower.includes('higher')) {
        newFilters.contrast = Math.min(130, filterStyle.contrast + 15);
        applied.push('more contrast');
      } else if (lower.includes('less') || lower.includes('lower') || lower.includes('softer')) {
        newFilters.contrast = Math.max(80, filterStyle.contrast - 15);
        applied.push('softer look');
      }
    }

    // Glow effect (brightness + slight desaturation)
    if (lower.includes('glow')) {
      newFilters.brightness = Math.min(130, filterStyle.brightness + 10);
      newFilters.saturate = Math.max(90, filterStyle.saturate - 5);
      applied.push('soft glow');
    }

    setFilterStyle(newFilters);
    return applied.length > 0 ? applied.join(', ') : 'subtle adjustments';
  };

  const handleEditRequest = async () => {
    if (!chatInput.trim()) return;

    const userMessage = { role: 'user', content: chatInput };
    setChatMessages([...chatMessages, userMessage]);
    const editText = chatInput;
    setChatInput('');

    // Apply CSS filters based on the request
    const appliedFilters = applyFilter(editText);
    
    setChatMessages([...chatMessages, userMessage, {
      role: 'assistant',
      content: `Applied ${appliedFilters}! Your photo still looks like you, just with enhanced effects. How's this?`
    }]);
  };

  const handleContinue = () => {
    if (isEditMode) {
      // In edit mode, just save and exit
      toast.success('Avatar saved!');
      setTimeout(() => navigate('/dashboard'), 1000);
    } else {
      // This shouldn't be called in new creation flow anymore
      // as we handle it in handleConfirmOutfit
      setStep(2);
    }
  };

  const handleSaveProfile = async () => {
    setGenerating(true);
    try {
      // Update user profile with relationship details
      await axios.put(`${API}/user/update/${user.id}`, {
        relationship_status: formData.relationship_status,
        relationship_with: formData.relationship_with,
        relationship_feel: formData.relationship_feel
      });

      // Update localStorage
      const updatedUser = {
        ...user,
        relationship_status: formData.relationship_status,
        relationship_with: formData.relationship_with,
        relationship_feel: formData.relationship_feel
      };
      localStorage.setItem('rainbow_mates_user', JSON.stringify(updatedUser));

      toast.success('Profile saved successfully!');
      setTimeout(() => navigate('/dashboard'), 1000);
    } catch (error) {
      toast.error('Failed to save profile');
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
            {isEditMode ? 'Edit Your Avatar' : step === 1 ? 'Create Your Avatar' : 'About You'}
          </h1>
          {!isEditMode && step === 2 && (
            <p className="text-sm text-dark-purple/70 mt-1">Step 2 of 2</p>
          )}
        </div>

        {step === 1 ? (
          // STEP 1: Image Upload & Avatar Creation
          <div className="card-soft p-6 space-y-6">
          {/* Only show upload section if not in edit mode or if creating new */}
          {!isEditMode && !avatarUrl && (
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

          {/* Filter Options - Show 4 variations */}
          {showFilterOptions && avatarUrl && (
            <div className="space-y-4">
              <div className="text-center">
                <h3 className="text-lg font-bold text-dark-purple mb-2">Choose Your Filter</h3>
                <p className="text-sm text-dark-purple/70">Select the look you like best</p>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                {filterPresets.map((preset) => (
                  <button
                    key={preset.id}
                    data-testid={`filter-${preset.id}`}
                    onClick={() => handleSelectFilter(preset)}
                    className="relative group cursor-pointer rounded-2xl overflow-hidden border-2 border-transparent hover:border-neon-pink transition-all"
                  >
                    <div className="aspect-square overflow-hidden bg-muted">
                      <img
                        src={avatarUrl}
                        alt={preset.name}
                        className="w-full h-full object-cover"
                        style={{
                          filter: `brightness(${preset.style.brightness}%) contrast(${preset.style.contrast}%) saturate(${preset.style.saturate}%) hue-rotate(${preset.style.warmth}deg)`
                        }}
                      />
                    </div>
                    <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-dark-purple/90 to-transparent p-3">
                      <p className="text-white font-semibold text-sm">{preset.name}</p>
                    </div>
                  </button>
                ))}
              </div>

              {/* Re-upload button */}
              <button
                data-testid="reupload-button"
                onClick={() => {
                  setAvatarUrl(null);
                  setImage(null);
                  setImagePreview(null);
                  setShowFilterOptions(false);
                  setShowOutfitSelection(false);
                  setShowOutfitReview(false);
                  setSelectedOutfitCategory(null);
                  toast.info('Choose a different photo');
                }}
                className="w-full py-3 px-6 rounded-full bg-white border-2 border-neon-pink text-dark-purple font-semibold hover:bg-muted transition-all"
              >
                Choose Different Photo
              </button>
            </div>
          )}

          {/* Outfit Selection */}
          {showOutfitSelection && (
            <div className="space-y-6">
              <div className="text-center">
                <h3 className="text-lg font-bold text-dark-purple mb-2">Choose Your Outfit</h3>
                <p className="text-sm text-dark-purple/70">Select a style to create your avatar</p>
              </div>

              {selectedOutfitCategory === null ? (
                // Show outfit categories
                <div className="grid grid-cols-2 gap-4">
                  {outfitCategories.map((category) => (
                    <button
                      key={category.id}
                      data-testid={`outfit-category-${category.id}`}
                      onClick={() => setSelectedOutfitCategory(category)}
                      className="card-soft p-6 hover:scale-[1.02] transition-all text-center"
                    >
                      <div className="text-4xl mb-2">{category.icon}</div>
                      <h4 className="font-bold text-dark-purple">{category.name}</h4>
                    </button>
                  ))}
                </div>
              ) : (
                // Show options within selected category
                <div className="space-y-4">
                  <button
                    onClick={() => setSelectedOutfitCategory(null)}
                    className="flex items-center gap-2 text-dark-purple hover:text-neon-pink transition-all"
                  >
                    <ArrowLeft className="w-4 h-4" />
                    <span className="text-sm font-medium">Back to categories</span>
                  </button>

                  <div className="text-center mb-4">
                    <div className="text-3xl mb-2">{selectedOutfitCategory.icon}</div>
                    <h3 className="text-xl font-bold text-dark-purple">{selectedOutfitCategory.name}</h3>
                  </div>

                  <div className="space-y-3">
                    {selectedOutfitCategory.options.map((option, idx) => (
                      <button
                        key={idx}
                        data-testid={`outfit-option-${idx}`}
                        onClick={() => handleSelectOutfit(selectedOutfitCategory, option)}
                        disabled={generating}
                        className="w-full p-4 rounded-2xl bg-gradient-to-r from-muted to-soft-blue/20 hover:from-neon-pink/10 hover:to-soft-blue/30 text-left transition-all disabled:opacity-50"
                      >
                        <p className="font-semibold text-dark-purple">{option}</p>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {generating && (
                <div className="text-center py-8">
                  <div className="inline-block w-12 h-12 border-4 border-neon-pink border-t-transparent rounded-full animate-spin mb-4"></div>
                  <p className="text-dark-purple font-medium">Creating your avatar...</p>
                </div>
              )}
            </div>
          )}

          {/* Outfit Review - Show generated avatar for approval */}
          {showOutfitReview && avatarUrl && (
            <div className="space-y-4" data-testid="outfit-review-screen">
              <div className="text-center">
                <h3 className="text-lg font-bold text-dark-purple mb-2">How Do You Like It?</h3>
                <p className="text-sm text-dark-purple/70">Your avatar in {currentOutfitDescription}</p>
              </div>

              {/* Show the generated avatar */}
              <div className="relative w-full rounded-2xl overflow-hidden border-4 border-neon-pink bg-white">
                <img 
                  src={avatarUrl} 
                  alt="Avatar with outfit" 
                  className="w-full h-auto object-contain"
                  style={{
                    filter: `brightness(${filterStyle.brightness}%) contrast(${filterStyle.contrast}%) saturate(${filterStyle.saturate}%) hue-rotate(${filterStyle.warmth}deg)`,
                    maxHeight: '400px'
                  }}
                  onLoad={() => console.log('Avatar image loaded successfully')}
                  onError={(e) => console.error('Avatar image failed to load:', e)}
                />
              </div>

              {/* Action buttons */}
              <div className="flex gap-3">
                <button
                  data-testid="change-outfit-button"
                  onClick={handleChangeOutfit}
                  className="flex-1 py-3 px-6 rounded-full bg-white border-2 border-neon-pink text-dark-purple font-semibold hover:bg-muted transition-all"
                >
                  Try Different Outfit
                </button>
                <button
                  data-testid="confirm-outfit-button"
                  onClick={handleConfirmOutfit}
                  className="flex-1 neon-button"
                >
                  Looks Great! Continue
                </button>
              </div>
            </div>
          )}
          
          {/* Generated Avatar */}
          {avatarUrl && !showFilterOptions && !showOutfitSelection && !showOutfitReview && (
            <div className="space-y-4">
              <div className="relative w-full h-64 rounded-2xl overflow-hidden border-4 border-neon-pink">
                <img 
                  src={avatarUrl} 
                  alt="Generated Avatar" 
                  className="w-full h-full object-cover"
                  style={{
                    filter: `brightness(${filterStyle.brightness}%) contrast(${filterStyle.contrast}%) saturate(${filterStyle.saturate}%) hue-rotate(${filterStyle.warmth}deg)`
                  }}
                />
              </div>

              {/* Re-upload option when avatar is shown */}
              {!isEditMode && (
                <button
                  data-testid="change-photo-button"
                  onClick={() => {
                    setAvatarUrl(null);
                    setImage(null);
                    setImagePreview(null);
                    setShowChat(false);
                    setChatMessages([]);
                    setFilterStyle({ brightness: 100, contrast: 100, saturate: 100, warmth: 0 });
                    toast.info('Upload a new photo');
                  }}
                  className="w-full py-2 px-4 rounded-full bg-muted text-dark-purple text-sm font-medium hover:bg-border transition-all"
                >
                  Upload Different Photo
                </button>
              )}
              
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
                      placeholder="e.g., 'warmer', 'brighter', 'more vibrant', 'add glow'..."
                      className="flex-1 px-4 py-3 rounded-full bg-muted border-transparent focus:border-neon-pink focus:ring-2 focus:ring-neon-pink/20 outline-none"
                      disabled={false}
                    />
                    <button
                      data-testid="send-edit-button"
                      onClick={handleEditRequest}
                      disabled={!chatInput.trim()}
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
                  className="flex-1 py-3 px-6 rounded-full bg-white border-2 border-neon-pink text-dark-purple font-semibold hover:bg-muted transition-all flex items-center justify-center gap-2"
                >
                  <RefreshCw className="w-5 h-5" />
                  Reset Filters
                </button>
                <button
                  data-testid="continue-button"
                  onClick={handleContinue}
                  className="flex-1 neon-button"
                >
                  {isEditMode ? 'Save & Exit' : 'Next: About You'}
                </button>
              </div>
            </div>
          )}
        </div>
        ) : (
          // STEP 2: Relationship Details
          <div className="card-soft p-6 space-y-6">
            <div className="text-center mb-4">
              <p className="text-dark-purple/70">Tell us a bit about yourself to personalize your experience</p>
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

            <div className="flex gap-3">
              <button
                data-testid="back-to-avatar-button"
                onClick={() => setStep(1)}
                className="flex-1 py-3 px-6 rounded-full bg-white border-2 border-neon-pink text-dark-purple font-semibold hover:bg-muted transition-all"
              >
                Back
              </button>
              <button
                data-testid="save-profile-button"
                onClick={handleSaveProfile}
                disabled={generating}
                className="flex-1 neon-button disabled:opacity-50"
              >
                {generating ? 'Saving...' : 'Complete Profile'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}