import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { ArrowLeft, Upload, RefreshCw, Send, ChevronRight, X } from 'lucide-react';
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
  const [quotaError, setQuotaError] = useState(false);
  const [lastSelectedOutfit, setLastSelectedOutfit] = useState(null);
  const [showRelationshipPopup, setShowRelationshipPopup] = useState(false);
  
  // Relationship options with images
  const relationshipOptions = [
    { id: 'Men', label: 'Men', image: 'https://customer-assets.emergentagent.com/job_rainbow-mates-1/artifacts/nw8g9ohn_men.svg' },
    { id: 'Women', label: 'Women', image: 'https://customer-assets.emergentagent.com/job_rainbow-mates-1/artifacts/9hj7p885_women.svg' },
    { id: 'Myself', label: 'Myself', image: 'https://customer-assets.emergentagent.com/job_rainbow-mates-1/artifacts/0fxiv5lh_single.svg' },
    { id: 'Bisexual', label: 'Bisexual', image: 'https://customer-assets.emergentagent.com/job_rainbow-mates-1/artifacts/0y5dym4o_bisexual.svg' }
  ];
  
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

  // Outfit categories - will be populated from backend
  const [outfitCatalog, setOutfitCatalog] = useState({});
  
  // Category display info
  const categoryInfo = {
    'casual-jeans': { name: 'Jeans & T-Shirt', icon: '👖' },
    'casual-shorts': { name: 'Shorts & T-Shirt', icon: '🩳' },
    'summer-dress': { name: 'Summer Dress', icon: '👗' },
    'winter': { name: 'Winter Clothes', icon: '🧥' },
    'party-dress': { name: 'Party Dress', icon: '🎉' },
    'evening-gown': { name: 'Evening Gown', icon: '✨' }
  };

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
    // Fetch outfit catalog from backend
    const fetchOutfitCatalog = async () => {
      try {
        const response = await axios.get(`${API}/outfits/catalog`);
        setOutfitCatalog(response.data);
      } catch (error) {
        console.error('Failed to fetch outfit catalog:', error);
      }
    };
    fetchOutfitCatalog();
    
    // Check if user already has an avatar (edit mode)
    if (user.avatar_url) {
      setIsEditMode(true);
      setAvatarUrl(user.avatar_url);
      setOriginalPhoto(user.avatar_url);
      setStep(1);
      
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

  const handleSelectOutfit = async (outfit) => {
    setGenerating(true);
    setShowOutfitSelection(false);
    setQuotaError(false);
    setLastSelectedOutfit(outfit);
    
    // Start rotating messages
    let messageIndex = 0;
    setLoadingMessage(loadingMessages[0]);
    const messageInterval = setInterval(() => {
      messageIndex = (messageIndex + 1) % loadingMessages.length;
      setLoadingMessage(loadingMessages[messageIndex]);
    }, 2000);
    
    console.log('Preparing avatar with outfit:', outfit);
    
    // For now, skip Virtual Try-On API and use original photo
    // Virtual Try-On will be enabled once quota is increased
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    clearInterval(messageInterval);
    
    // Use original photo with selected outfit info
    setAvatarUrl(originalPhoto);
    setCurrentOutfitDescription(outfit.name);
    setShowOutfitReview(true);
    setGenerating(false);
    toast.success('Avatar ready! Virtual outfit preview coming soon.');
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
    <div className="app-container gradient-mesh min-h-screen overflow-y-auto">
      <div className="p-4 pb-8 space-y-4">
        <div className="flex items-center gap-3">
          <button
            data-testid="back-button"
            onClick={() => navigate('/dashboard')}
            className="p-2 rounded-full bg-white border border-border hover:bg-muted transition-all flex-shrink-0"
          >
            <ArrowLeft className="w-5 h-5 text-dark-purple" />
          </button>
          <div>
            <h1 className="text-xl font-bold text-dark-purple" style={{ fontFamily: 'Nunito, sans-serif' }}>
              {isEditMode ? 'Edit Your Avatar' : step === 1 ? 'Create Your Avatar' : 'About You'}
            </h1>
            {!isEditMode && step === 2 && (
              <p className="text-xs text-dark-purple/70">Step 2 of 2</p>
            )}
          </div>
        </div>

        {step === 1 ? (
          // STEP 1: Image Upload & Avatar Creation
          <div className="card-soft p-6 space-y-6">
          
          {/* Edit Mode - Show avatar with 3 options */}
          {isEditMode && avatarUrl && !showFilterOptions && !showOutfitSelection && !showOutfitReview && !generating && !quotaError && (
            <div className="space-y-4">
              {/* Avatar Preview */}
              <div className="relative w-full aspect-[3/4] max-h-64 rounded-2xl overflow-hidden bg-muted mx-auto">
                <img 
                  src={avatarUrl} 
                  alt="Your Avatar" 
                  className="w-full h-full object-cover"
                  style={{
                    filter: `brightness(${filterStyle.brightness}%) contrast(${filterStyle.contrast}%) saturate(${filterStyle.saturate}%)`,
                    ...(filterStyle.warmth > 0 ? { filter: `brightness(${filterStyle.brightness}%) contrast(${filterStyle.contrast}%) saturate(${filterStyle.saturate}%) sepia(${filterStyle.warmth}%)` } : {})
                  }}
                />
              </div>

              {/* Edit Options */}
              <div className="space-y-3">
                <button
                  data-testid="change-filter-button"
                  onClick={() => setShowFilterOptions(true)}
                  className="w-full py-3 px-4 rounded-2xl bg-gradient-to-r from-soft-yellow/30 to-neon-pink/30 text-dark-purple font-semibold hover:from-soft-yellow/50 hover:to-neon-pink/50 transition-all flex items-center justify-between"
                >
                  <span>Change Filter Effects</span>
                  <ChevronRight className="w-5 h-5" />
                </button>
                
                <button
                  data-testid="choose-outfit-button"
                  onClick={() => {
                    setOriginalPhoto(avatarUrl);
                    setShowOutfitSelection(true);
                  }}
                  className="w-full py-3 px-4 rounded-2xl bg-gradient-to-r from-soft-blue/30 to-neon-pink/30 text-dark-purple font-semibold hover:from-soft-blue/50 hover:to-neon-pink/50 transition-all flex items-center justify-between"
                >
                  <span>Choose Your Outfit</span>
                  <ChevronRight className="w-5 h-5" />
                </button>
                
                <button
                  data-testid="next-about-you-button"
                  onClick={() => setStep(2)}
                  className="w-full neon-button"
                >
                  Next: About You
                </button>
              </div>
            </div>
          )}
          
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
            <div className="space-y-4">
              <div className="text-center">
                <h3 className="text-lg font-bold text-dark-purple mb-1">Choose Your Outfit</h3>
                <p className="text-sm text-dark-purple/70">Select a style to try on</p>
              </div>

              {selectedOutfitCategory === null ? (
                // Show outfit categories
                <div className="grid grid-cols-2 gap-3">
                  {Object.keys(outfitCatalog).map((categoryId) => (
                    <button
                      key={categoryId}
                      data-testid={`outfit-category-${categoryId}`}
                      onClick={() => setSelectedOutfitCategory(categoryId)}
                      className="card-soft p-4 hover:scale-[1.02] transition-all text-center"
                    >
                      <div className="text-3xl mb-1">{categoryInfo[categoryId]?.icon || '👗'}</div>
                      <h4 className="font-bold text-dark-purple text-sm">{categoryInfo[categoryId]?.name || categoryId}</h4>
                      <p className="text-xs text-dark-purple/60">{outfitCatalog[categoryId]?.length || 0} styles</p>
                    </button>
                  ))}
                </div>
              ) : (
                // Show outfit images within selected category
                <div className="space-y-3">
                  <button
                    onClick={() => setSelectedOutfitCategory(null)}
                    className="flex items-center gap-2 text-dark-purple hover:text-neon-pink transition-all"
                  >
                    <ArrowLeft className="w-4 h-4" />
                    <span className="text-sm font-medium">Back to categories</span>
                  </button>

                  <div className="text-center mb-2">
                    <div className="text-2xl mb-1">{categoryInfo[selectedOutfitCategory]?.icon || '👗'}</div>
                    <h3 className="text-lg font-bold text-dark-purple">{categoryInfo[selectedOutfitCategory]?.name || selectedOutfitCategory}</h3>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    {outfitCatalog[selectedOutfitCategory]?.map((outfit) => (
                      <button
                        key={outfit.id}
                        data-testid={`outfit-${outfit.id}`}
                        onClick={() => handleSelectOutfit(outfit)}
                        disabled={generating}
                        className="card-soft overflow-hidden hover:scale-[1.02] transition-all disabled:opacity-50"
                      >
                        <img 
                          src={`${API}/outfits/image/${outfit.id}`} 
                          alt={outfit.name}
                          className="w-full h-32 object-cover object-top"
                        />
                        <div className="p-2">
                          <p className="font-semibold text-dark-purple text-xs text-center">{outfit.name}</p>
                        </div>
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

          {/* Loading Screen with Fun Messages */}
          {generating && (
            <div className="space-y-6 py-12" data-testid="outfit-loading">
              <div className="flex justify-center">
                <div className="relative">
                  {/* Spinning dress icon */}
                  <div className="w-24 h-24 rounded-full bg-gradient-to-br from-neon-pink to-soft-blue flex items-center justify-center animate-spin">
                    <div className="text-5xl">👗</div>
                  </div>
                  {/* Pulsing ring */}
                  <div className="absolute inset-0 rounded-full border-4 border-neon-pink animate-pulse"></div>
                </div>
              </div>
              
              <div className="text-center space-y-3">
                <h3 className="text-xl font-bold text-dark-purple animate-pulse">
                  Creating Your Avatar...
                </h3>
                <p className="text-lg text-neon-pink font-medium animate-bounce">
                  {loadingMessage}
                </p>
                <div className="flex justify-center gap-2 mt-4">
                  <div className="w-3 h-3 bg-neon-pink rounded-full animate-bounce" style={{animationDelay: '0s'}}></div>
                  <div className="w-3 h-3 bg-neon-pink rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
                  <div className="w-3 h-3 bg-neon-pink rounded-full animate-bounce" style={{animationDelay: '0.4s'}}></div>
                </div>
              </div>
            </div>
          )}

          {/* Quota Error Screen */}
          {quotaError && !generating && (
            <div className="space-y-6 py-8" data-testid="quota-error-screen">
              <div className="text-center">
                <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-orange-100 flex items-center justify-center">
                  <span className="text-4xl">⏳</span>
                </div>
                <h3 className="text-xl font-bold text-dark-purple mb-2">Service Temporarily Busy</h3>
                <p className="text-sm text-dark-purple/70 mb-4">
                  Our virtual try-on service is experiencing high demand. Please wait a moment and try again.
                </p>
              </div>
              
              <div className="space-y-3">
                <button
                  data-testid="retry-outfit-button"
                  onClick={() => {
                    setQuotaError(false);
                    if (lastSelectedOutfit) {
                      handleSelectOutfit(lastSelectedOutfit);
                    }
                  }}
                  className="w-full neon-button text-base py-3"
                >
                  Try Again
                </button>
                
                <button
                  data-testid="choose-different-outfit-button"
                  onClick={() => {
                    setQuotaError(false);
                    setShowOutfitSelection(true);
                    setSelectedOutfitCategory(null);
                  }}
                  className="w-full py-3 px-6 rounded-full bg-white border-2 border-neon-pink text-dark-purple font-semibold hover:bg-muted transition-all"
                >
                  Choose Different Outfit
                </button>
              </div>
            </div>
          )}

          {/* Outfit Review - Show generated avatar for approval */}
          {showOutfitReview && avatarUrl && !generating && (
            <div className="space-y-4" data-testid="outfit-review-screen">
              <div className="text-center">
                <h3 className="text-lg font-bold text-dark-purple mb-2">Here's Your Photo!</h3>
                <p className="text-sm text-dark-purple/70">Selected style: {currentOutfitDescription}</p>
                <p className="text-xs text-dark-purple/50 mt-1">* Outfit visualization feature coming soon</p>
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
          
          {/* Generated Avatar - Only for new users, not edit mode */}
          {!isEditMode && avatarUrl && !showFilterOptions && !showOutfitSelection && !showOutfitReview && !generating && (
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

            {/* Relationship With - Image Selector */}
            <div>
              <label className="block text-sm font-medium text-dark-purple mb-2">
                Relationship With
              </label>
              <button
                data-testid="relationship-with-button"
                onClick={() => setShowRelationshipPopup(true)}
                className="w-full px-4 py-3 rounded-2xl bg-muted border-2 border-transparent hover:border-neon-pink focus:border-neon-pink focus:ring-2 focus:ring-neon-pink/20 outline-none flex items-center justify-between transition-all"
              >
                <div className="flex items-center gap-3">
                  <img 
                    src={relationshipOptions.find(o => o.id === formData.relationship_with)?.image || relationshipOptions[0].image} 
                    alt={formData.relationship_with}
                    className="w-8 h-8"
                  />
                  <span className="text-dark-purple">{formData.relationship_with}</span>
                </div>
                <ChevronRight className="w-5 h-5 text-dark-purple/50" />
              </button>
            </div>

            {/* Relationship With Popup */}
            {showRelationshipPopup && (
              <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setShowRelationshipPopup(false)}>
                <div className="bg-white rounded-3xl p-6 w-full max-w-sm space-y-4" onClick={(e) => e.stopPropagation()}>
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-bold text-dark-purple">Relationship With</h3>
                    <button 
                      onClick={() => setShowRelationshipPopup(false)}
                      className="p-1 rounded-full hover:bg-muted transition-all"
                    >
                      <X className="w-5 h-5 text-dark-purple/50" />
                    </button>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-3">
                    {relationshipOptions.map((option) => (
                      <button
                        key={option.id}
                        data-testid={`relationship-option-${option.id.toLowerCase()}`}
                        onClick={() => {
                          setFormData({ ...formData, relationship_with: option.id });
                          setShowRelationshipPopup(false);
                        }}
                        className={`p-4 rounded-2xl border-2 transition-all flex flex-col items-center gap-2 ${
                          formData.relationship_with === option.id 
                            ? 'border-neon-pink bg-neon-pink/10' 
                            : 'border-border hover:border-neon-pink/50'
                        }`}
                      >
                        <img src={option.image} alt={option.label} className="w-16 h-16" />
                        <span className="text-sm font-medium text-dark-purple">{option.label}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

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