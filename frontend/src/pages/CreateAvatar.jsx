import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { ArrowLeft, ChevronRight, X, Check, Heart, HeartHandshake, Users, Gem, CircleDot, HeartCrack, Unlink, Flower2 } from 'lucide-react';
import { toast } from 'sonner';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

// Pre-built avatar options
const avatarOptions = [
  { 
    id: 'avatar-1', 
    name: 'Priya',
    image: 'https://customer-assets.emergentagent.com/job_virtual-bff/artifacts/zprvnqkw_fruitee.fun_A_semi-realistic_AI_fashion_model_full-body_stand_1a494135-0720-4c9b-bd13-a0df59baab7d_1.png'
  },
  { 
    id: 'avatar-2', 
    name: 'Sofia',
    image: 'https://customer-assets.emergentagent.com/job_virtual-bff/artifacts/6nppo8l5_fruitee.fun_A_semi-realistic_AI_fashion_model_full-body_stand_65821d93-e99b-4027-9a7b-b7c58151b1c5_1.png'
  },
  { 
    id: 'avatar-3', 
    name: 'Maya',
    image: 'https://customer-assets.emergentagent.com/job_virtual-bff/artifacts/rfz1kms2_fruitee.fun_A_semi-realistic_AI_fashion_model_full-body_stand_9ff1ee9d-c0cd-479c-9f27-866cc96bdb26_1.png'
  },
  { 
    id: 'avatar-4', 
    name: 'Yuki',
    image: 'https://customer-assets.emergentagent.com/job_virtual-bff/artifacts/nz9mhzce_fruitee.fun_A_semi-realistic_AI_fashion_model_full-body_stand_85261d3f-0950-4740-b8ea-a38587c0bbfd_1.png'
  },
  { 
    id: 'avatar-5', 
    name: 'Luna',
    image: 'https://customer-assets.emergentagent.com/job_virtual-bff/artifacts/ivyvxm3u_fruitee.fun_A_semi-realistic_AI_fashion_model_full-body_stand_a726e66d-53f8-473a-88a9-bb36b6af18e4_2.png'
  },
  { 
    id: 'avatar-6', 
    name: 'Zara',
    image: 'https://customer-assets.emergentagent.com/job_a9da2ea3-f639-454d-8f3d-963457776e39/artifacts/vekrmbo9_fruitee.fun_A_semi-realistic_AI_fashion_model_full-body_stand_4f6d4f3d-bd54-4060-b015-04f34135b96e_0.png'
  },
  { 
    id: 'avatar-7', 
    name: 'Mei',
    image: 'https://customer-assets.emergentagent.com/job_a9da2ea3-f639-454d-8f3d-963457776e39/artifacts/gvulnkwj_fruitee.fun_A_semi-realistic_AI_fashion_model_full-body_stand_0688d511-884f-4071-92c6-7e632323b31d_3.png'
  },
  { 
    id: 'avatar-8', 
    name: 'Amara',
    image: 'https://customer-assets.emergentagent.com/job_a9da2ea3-f639-454d-8f3d-963457776e39/artifacts/h46x24gm_fruitee.fun_A_semi-realistic_AI_fashion_model_full-body_stand_4523c8d9-b426-4ce5-8d02-fffdcf43537d_1.png'
  },
  { 
    id: 'avatar-9', 
    name: 'Elena',
    image: 'https://customer-assets.emergentagent.com/job_a9da2ea3-f639-454d-8f3d-963457776e39/artifacts/5vk4z770_fruitee.fun_A_semi-realistic_AI_fashion_model_full-body_stand_cac51ae0-5cac-421a-af32-680d557ee0e1_1.png'
  },
  { 
    id: 'avatar-10', 
    name: 'Bella',
    image: 'https://customer-assets.emergentagent.com/job_a9da2ea3-f639-454d-8f3d-963457776e39/artifacts/9qyuc7sa_fruitee.fun_A_semi-realistic_AI_fashion_model_full-body_stand_d174b439-1c12-4cbf-b138-9d053311cde4_1.png'
  },
  { 
    id: 'avatar-11', 
    name: 'Jasmine',
    image: 'https://customer-assets.emergentagent.com/job_a9da2ea3-f639-454d-8f3d-963457776e39/artifacts/06r5ickk_fruitee.fun_A_semi-realistic_AI_fashion_model_full-body_stand_302f1647-4add-412d-b6bc-7385cd7eb38a_2.png'
  },
  { 
    id: 'avatar-12', 
    name: 'Hana',
    image: 'https://customer-assets.emergentagent.com/job_a9da2ea3-f639-454d-8f3d-963457776e39/artifacts/jc8ih4vw_fruitee.fun_A_semi-realistic_AI_fashion_model_full-body_stand_eb5762ec-3381-43c9-99e5-026d59f183dd_1.png'
  },
  { 
    id: 'avatar-13', 
    name: 'Layla',
    image: 'https://customer-assets.emergentagent.com/job_a9da2ea3-f639-454d-8f3d-963457776e39/artifacts/huc1elyo_fruitee.fun_A_semi-realistic_AI_fashion_model_full-body_stand_110b887f-6ced-4fa0-8e40-6ca95d6c2819_0.png'
  },
  { 
    id: 'avatar-14', 
    name: 'Test user',
    image: 'https://customer-assets.emergentagent.com/job_59b3b69e-a28f-44fd-a869-c7d33149fa88/artifacts/om174z8b_user%201.png'
  }
];

export default function CreateAvatar({ user }) {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    relationship_status: 'Single',
    relationship_with: 'Men',
    relationship_feel: 'Happy'
  });
  const [selectedAvatar, setSelectedAvatar] = useState(null);
  const [step, setStep] = useState(1); // 1: avatar selection, 2: relationship details
  const [generating, setGenerating] = useState(false);
  const [showRelationshipPopup, setShowRelationshipPopup] = useState(false);
  const [showStatusPopup, setShowStatusPopup] = useState(false);
  const [showFeelPopup, setShowFeelPopup] = useState(false);
  
  // Relationship options with images
  const relationshipOptions = [
    { id: 'Men', label: 'Men', image: 'https://customer-assets.emergentagent.com/job_rainbow-mates-1/artifacts/nw8g9ohn_men.svg' },
    { id: 'Women', label: 'Women', image: 'https://customer-assets.emergentagent.com/job_rainbow-mates-1/artifacts/9hj7p885_women.svg' },
    { id: 'Myself', label: 'Myself', image: 'https://customer-assets.emergentagent.com/job_rainbow-mates-1/artifacts/0fxiv5lh_single.svg' },
    { id: 'Bisexual', label: 'Bisexual', image: 'https://customer-assets.emergentagent.com/job_rainbow-mates-1/artifacts/0y5dym4o_bisexual.svg' }
  ];
  
  // Relationship status options with icons
  const statusOptions = [
    { id: 'Single', label: 'Single', icon: Heart, color: 'text-pink-500' },
    { id: 'In a relationship', label: 'In a relationship', icon: HeartHandshake, color: 'text-red-500' },
    { id: 'Dating', label: 'Dating', icon: Users, color: 'text-purple-500' },
    { id: 'Engaged', label: 'Engaged', icon: Gem, color: 'text-blue-500' },
    { id: 'Married', label: 'Married', icon: CircleDot, color: 'text-yellow-600' },
    { id: 'Separated', label: 'Separated', icon: HeartCrack, color: 'text-orange-500' },
    { id: 'Divorced', label: 'Divorced', icon: Unlink, color: 'text-gray-500' },
    { id: 'Widowed', label: 'Widowed', icon: Flower2, color: 'text-indigo-500' }
  ];

  // Relationship feel options with images
  const feelOptions = [
    { id: 'Happy', label: 'Happy', image: 'https://customer-assets.emergentagent.com/job_virtual-bff/artifacts/rmpuswos_happy.svg' },
    { id: 'Bored', label: 'Bored', image: 'https://customer-assets.emergentagent.com/job_virtual-bff/artifacts/dlhl26lg_bored.svg' },
    { id: 'Angry', label: 'Angry', image: 'https://customer-assets.emergentagent.com/job_virtual-bff/artifacts/dbohhbyy_angry.svg' },
    { id: 'Coming to an end', label: 'Coming to an end', image: 'https://customer-assets.emergentagent.com/job_virtual-bff/artifacts/cjuy81zi_coming%20to%20an%20end.png' }
  ];

  useEffect(() => {
    // Check if user already has an avatar (edit mode)
    if (user.avatar_url) {
      // Find matching avatar or use the stored URL
      const existingAvatar = avatarOptions.find(a => a.image === user.avatar_url);
      if (existingAvatar) {
        setSelectedAvatar(existingAvatar);
      } else {
        // If they had a custom avatar before, default to first option
        setSelectedAvatar(null);
      }
      
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

  const handleSelectAvatar = (avatar) => {
    setSelectedAvatar(avatar);
    toast.success(`${avatar.name} selected!`);
  };

  const handleContinueToAboutYou = async () => {
    if (!selectedAvatar) {
      toast.error('Please select an avatar');
      return;
    }

    // Save avatar to backend if user ID is available
    if (user?.id) {
      try {
        await axios.put(`${API}/user/update/${user.id}`, {
          avatar_url: selectedAvatar.image
        });

        // Update localStorage
        const updatedUser = { ...user, avatar_url: selectedAvatar.image };
        localStorage.setItem('rainbow_mates_user', JSON.stringify(updatedUser));
      } catch (error) {
        console.error('Failed to save avatar:', error);
        // Continue anyway to step 2
      }
    }
    
    setStep(2);
  };

  const handleSaveProfile = async () => {
    setGenerating(true);
    try {
      // Update user profile with avatar and relationship details
      await axios.put(`${API}/user/update/${user.id}`, {
        avatar_url: selectedAvatar?.image,
        relationship_status: formData.relationship_status,
        relationship_with: formData.relationship_with,
        relationship_feel: formData.relationship_feel
      });

      // Update localStorage with avatar_url included
      const updatedUser = {
        ...user,
        avatar_url: selectedAvatar?.image,
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
            onClick={() => step === 1 ? navigate('/dashboard') : setStep(1)}
            className="p-2 rounded-full bg-white border border-border hover:bg-muted transition-all flex-shrink-0"
          >
            <ArrowLeft className="w-5 h-5 text-dark-purple" />
          </button>
          <div>
            <h1 className="text-xl font-bold text-dark-purple" style={{ fontFamily: 'Nunito, sans-serif' }}>
              {step === 1 ? 'Choose Your Avatar' : 'About You'}
            </h1>
            <p className="text-xs text-dark-purple/70">Step {step} of 2</p>
          </div>
        </div>

        {step === 1 ? (
          // STEP 1: Avatar Selection
          <div className="card-soft p-6 space-y-6">
            <div className="text-center mb-4">
              <p className="text-dark-purple/70">Pick an avatar that represents you</p>
            </div>

            {/* Avatar Grid */}
            <div className="grid grid-cols-2 gap-4">
              {avatarOptions.map((avatar) => (
                <button
                  key={avatar.id}
                  data-testid={`avatar-option-${avatar.id}`}
                  onClick={() => handleSelectAvatar(avatar)}
                  className={`relative rounded-2xl overflow-hidden border-4 transition-all ${
                    selectedAvatar?.id === avatar.id 
                      ? 'border-neon-pink scale-[1.02] shadow-lg' 
                      : 'border-transparent hover:border-neon-pink/50'
                  }`}
                >
                  <div className="aspect-[3/4] bg-gradient-to-b from-muted to-white">
                    <img 
                      src={avatar.image} 
                      alt={avatar.name}
                      className="w-full h-full object-cover object-top"
                    />
                  </div>
                  <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-dark-purple/90 to-transparent p-3">
                    <p className="text-white font-semibold text-sm">{avatar.name}</p>
                  </div>
                  
                  {/* Selection indicator */}
                  {selectedAvatar?.id === avatar.id && (
                    <div className="absolute top-2 right-2 w-8 h-8 rounded-full bg-neon-pink flex items-center justify-center">
                      <Check className="w-5 h-5 text-white" />
                    </div>
                  )}
                </button>
              ))}
            </div>

            {/* Continue Button */}
            <button
              data-testid="continue-to-about-you"
              onClick={handleContinueToAboutYou}
              disabled={!selectedAvatar}
              className="w-full neon-button disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Continue
            </button>
          </div>
        ) : (
          // STEP 2: Relationship Details
          <div className="card-soft p-6 space-y-6">
            {/* Selected Avatar Preview */}
            <div className="flex justify-center mb-4">
              <div className="w-24 h-32 rounded-xl overflow-hidden border-4 border-neon-pink">
                <img 
                  src={selectedAvatar?.image} 
                  alt="Your avatar" 
                  className="w-full h-full object-cover object-top"
                />
              </div>
            </div>
            
            <div className="text-center mb-4">
              <p className="text-dark-purple/70">Tell us a bit about yourself to personalize your experience</p>
            </div>

            {/* Relationship Status - Icon Selector */}
            <div>
              <label className="block text-sm font-medium text-dark-purple mb-2">
                Relationship Status
              </label>
              <button
                data-testid="relationship-status-button"
                onClick={() => setShowStatusPopup(true)}
                className="w-full px-4 py-3 rounded-2xl bg-muted border-2 border-transparent hover:border-neon-pink focus:border-neon-pink focus:ring-2 focus:ring-neon-pink/20 outline-none flex items-center justify-between transition-all"
              >
                <div className="flex items-center gap-3">
                  {(() => {
                    const status = statusOptions.find(o => o.id === formData.relationship_status) || statusOptions[0];
                    const IconComponent = status.icon;
                    return (
                      <>
                        <div className={`w-8 h-8 rounded-full bg-white border-2 border-current flex items-center justify-center ${status.color}`}>
                          <IconComponent className="w-4 h-4" />
                        </div>
                        <span className="text-dark-purple">{formData.relationship_status}</span>
                      </>
                    );
                  })()}
                </div>
                <ChevronRight className="w-5 h-5 text-dark-purple/50" />
              </button>
            </div>

            {/* Relationship Status Popup */}
            {showStatusPopup && (
              <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setShowStatusPopup(false)}>
                <div className="bg-white rounded-3xl p-6 w-full max-w-sm space-y-4 max-h-[80vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-bold text-dark-purple">Relationship Status</h3>
                    <button 
                      onClick={() => setShowStatusPopup(false)}
                      className="p-1 rounded-full hover:bg-muted transition-all"
                    >
                      <X className="w-5 h-5 text-dark-purple/50" />
                    </button>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-3">
                    {statusOptions.map((option) => {
                      const IconComponent = option.icon;
                      return (
                        <button
                          key={option.id}
                          data-testid={`status-option-${option.id.toLowerCase().replace(/\s+/g, '-')}`}
                          onClick={() => {
                            setFormData({ ...formData, relationship_status: option.id });
                            setShowStatusPopup(false);
                          }}
                          className={`p-3 rounded-2xl border-2 transition-all flex flex-col items-center gap-2 ${
                            formData.relationship_status === option.id 
                              ? 'border-neon-pink bg-neon-pink/10' 
                              : 'border-border hover:border-neon-pink/50'
                          }`}
                        >
                          <div className={`w-12 h-12 rounded-full bg-white border-2 border-current flex items-center justify-center ${option.color}`}>
                            <IconComponent className="w-6 h-6" />
                          </div>
                          <span className="text-xs font-medium text-dark-purple text-center leading-tight">{option.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

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

            {/* Relationship Feel - Image Selector */}
            <div>
              <label className="block text-sm font-medium text-dark-purple mb-2">
                How does the relationship feel?
              </label>
              <button
                data-testid="relationship-feel-button"
                onClick={() => setShowFeelPopup(true)}
                className="w-full px-4 py-3 rounded-2xl bg-muted border-2 border-transparent hover:border-neon-pink focus:border-neon-pink focus:ring-2 focus:ring-neon-pink/20 outline-none flex items-center justify-between transition-all"
              >
                <div className="flex items-center gap-3">
                  <img 
                    src={feelOptions.find(o => o.id === formData.relationship_feel)?.image || feelOptions[0].image} 
                    alt={formData.relationship_feel}
                    className="w-8 h-8 object-contain"
                  />
                  <span className="text-dark-purple">{formData.relationship_feel}</span>
                </div>
                <ChevronRight className="w-5 h-5 text-dark-purple/50" />
              </button>
            </div>

            {/* Relationship Feel Popup */}
            {showFeelPopup && (
              <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setShowFeelPopup(false)}>
                <div className="bg-white rounded-3xl p-6 w-full max-w-sm space-y-4" onClick={(e) => e.stopPropagation()}>
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-bold text-dark-purple">How does the relationship feel?</h3>
                    <button 
                      onClick={() => setShowFeelPopup(false)}
                      className="p-1 rounded-full hover:bg-muted transition-all"
                    >
                      <X className="w-5 h-5 text-dark-purple/50" />
                    </button>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-3">
                    {feelOptions.map((option) => (
                      <button
                        key={option.id}
                        data-testid={`feel-option-${option.id.toLowerCase().replace(/\s+/g, '-')}`}
                        onClick={() => {
                          setFormData({ ...formData, relationship_feel: option.id });
                          setShowFeelPopup(false);
                        }}
                        className={`p-4 rounded-2xl border-2 transition-all flex flex-col items-center gap-2 ${
                          formData.relationship_feel === option.id 
                            ? 'border-neon-pink bg-neon-pink/10' 
                            : 'border-border hover:border-neon-pink/50'
                        }`}
                      >
                        <img src={option.image} alt={option.label} className="w-14 h-14 object-contain" />
                        <span className="text-xs font-medium text-dark-purple text-center">{option.label}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

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
