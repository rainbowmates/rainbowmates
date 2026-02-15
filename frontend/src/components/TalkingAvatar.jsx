import React, { useEffect, useRef, useState, useCallback } from 'react';

/**
 * TalkingAvatar - 2.5D avatar with lip-sync animation and dynamic expressions
 * Uses Web Audio API for real-time amplitude analysis
 * Supports 8 emotional expression states from the Expression State Mapping
 */
const TalkingAvatar = ({ 
  imageUrl, 
  audioUrl, 
  isPlaying,
  onAudioEnd,
  emotionState = 'curious',
  expressionConfig = null,
  className = ''
}) => {
  const audioRef = useRef(null);
  const audioContextRef = useRef(null);
  const analyserRef = useRef(null);
  const animationFrameRef = useRef(null);
  const sourceRef = useRef(null);
  
  const [mouthOpenness, setMouthOpenness] = useState(0);
  const [isBreathing, setIsBreathing] = useState(true);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [eyeState, setEyeState] = useState('neutral');
  const [eyeRollActive, setEyeRollActive] = useState(false);
  const [currentExpression, setCurrentExpression] = useState(null);
  const [transitionProgress, setTransitionProgress] = useState(1);

  // 8 Core Expression States based on document specification
  const expressionConfigs = {
    // 1. SOFT_COMFORTING - User is sad/anxious/vulnerable
    comforting: {
      eyebrows: -0.1,        // Inward tilt (gentle concern)
      eyebrowAsymmetry: 0,
      eyeScale: 1.0,
      eyeSquint: 0.15,       // Soft, warm eyes
      mouthCurve: 0.12,      // Gentle smile
      mouthAsymmetry: 0,
      mouthOpen: 0,
      headTilt: 0.05,        // Slight empathetic tilt
      energy: 'low_medium',
      glowColor: 'rgba(150, 200, 255, 0.35)',  // Soft calming blue
      glowIntensity: 40
    },
    // 2. PLAYFUL_TEASING - Light banter, playfulness > 0.6
    playful: {
      eyebrows: 0.18,        // One raised
      eyebrowAsymmetry: 0.2, // Asymmetric (left higher)
      eyeScale: 1.08,
      eyeSquint: 0,
      mouthCurve: 0.22,      // Smirk
      mouthAsymmetry: 0.15,  // Asymmetric smirk
      mouthOpen: 0,
      headTilt: -0.03,       // Slight playful tilt
      energy: 'medium',
      glowColor: 'rgba(255, 150, 200, 0.45)',  // Playful pink
      glowIntensity: 50
    },
    // 3. DRAMATIC_DISBELIEF - Surprising or absurd statement
    dramatic: {
      eyebrows: 0.35,        // Lifted HIGH
      eyebrowAsymmetry: 0,
      eyeScale: 1.3,         // Wide eyes!
      eyeSquint: -0.1,       // Eyes wide open
      mouthCurve: -0.05,     // Slight "O" shape
      mouthAsymmetry: 0,
      mouthOpen: 0.25,       // Mouth open in disbelief
      headTilt: 0,
      energy: 'medium_high',
      glowColor: 'rgba(255, 200, 100, 0.5)',   // Dramatic gold
      glowIntensity: 60
    },
    // 4. PROTECTIVE_SERIOUS - User facing conflict, needs grounding
    protective: {
      eyebrows: -0.18,       // Lowered, determined
      eyebrowAsymmetry: 0,
      eyeScale: 1.12,        // Alert, focused
      eyeSquint: 0.05,
      mouthCurve: 0,         // Firm, neutral
      mouthAsymmetry: 0,
      mouthOpen: 0,
      headTilt: 0,           // Steady
      energy: 'medium_low',
      glowColor: 'rgba(100, 150, 255, 0.4)',   // Steady steel blue
      glowIntensity: 45
    },
    // 5. CURIOUS_LEAN_IN - User shares new story/detail (DEFAULT)
    curious: {
      eyebrows: 0.15,        // Raised, interested
      eyebrowAsymmetry: 0.05,
      eyeScale: 1.18,        // Wide, attentive
      eyeSquint: 0,
      mouthCurve: 0.08,      // Slight interested smile
      mouthAsymmetry: 0,
      mouthOpen: 0.05,       // Slightly parted
      headTilt: 0.08,        // Leaning in
      energy: 'medium',
      glowColor: 'rgba(180, 230, 150, 0.4)',   // Fresh curious green
      glowIntensity: 45
    },
    // 6. EXCITED_SPARKLE - User shares good news
    excited: {
      eyebrows: 0.22,        // Lifted with joy
      eyebrowAsymmetry: 0,
      eyeScale: 1.25,        // Bright, wide
      eyeSquint: 0.1,        // Happy squint
      mouthCurve: 0.35,      // Full natural smile
      mouthAsymmetry: 0,
      mouthOpen: 0.12,       // Open smile
      headTilt: 0,
      energy: 'medium_high',
      glowColor: 'rgba(255, 220, 100, 0.55)',  // Bright sparkle gold
      glowIntensity: 65
    },
    // 7. TEASING_EYEROLL - User repeating bad decision, playful frustration
    teasing_annoyed: {
      eyebrows: 0.12,
      eyebrowAsymmetry: 0.08,
      eyeScale: 1.0,
      eyeSquint: 0,
      eyeRoll: true,         // Eye roll animation trigger
      mouthCurve: 0.15,      // Soft smirk
      mouthAsymmetry: 0.12,
      mouthOpen: 0,
      headTilt: -0.04,
      energy: 'medium',
      glowColor: 'rgba(255, 180, 200, 0.4)',   // Light pink (affectionate)
      glowIntensity: 45
    },
    // 8. GENTLE_CONCERN - User emotional but not fully vulnerable
    concern: {
      eyebrows: 0.05,        // Inner brows lifted
      eyebrowAsymmetry: 0,
      eyebrowTilt: 0.12,     // Tilted upward (empathy)
      eyeScale: 1.08,
      eyeSquint: 0.08,       // Soft, caring
      mouthCurve: 0.05,      // Soft, neutral
      mouthAsymmetry: 0,
      mouthOpen: 0,
      headTilt: 0.04,
      energy: 'low',
      glowColor: 'rgba(180, 200, 255, 0.35)',  // Gentle pale blue
      glowIntensity: 35
    }
  };

  // Get expression config (from prop or lookup)
  const getExpression = useCallback(() => {
    if (expressionConfig) {
      return expressionConfig;
    }
    return expressionConfigs[emotionState] || expressionConfigs.curious;
  }, [emotionState, expressionConfig]);

  const expression = getExpression();

  // Smooth transition between expressions
  useEffect(() => {
    setTransitionProgress(0);
    const timer = setInterval(() => {
      setTransitionProgress(prev => {
        if (prev >= 1) {
          clearInterval(timer);
          return 1;
        }
        return prev + 0.05; // ~300-500ms transition
      });
    }, 16);
    
    return () => clearInterval(timer);
  }, [emotionState]);

  // Eye roll animation for teasing_annoyed
  useEffect(() => {
    if (expression.eyeRoll && emotionState === 'teasing_annoyed') {
      setEyeRollActive(true);
      const timer = setTimeout(() => setEyeRollActive(false), 800);
      return () => clearTimeout(timer);
    }
  }, [emotionState, expression.eyeRoll]);

  // Initialize Web Audio API
  const initAudioAnalyser = useCallback(() => {
    if (!audioRef.current) return;

    try {
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)();
      }

      if (audioContextRef.current.state === 'suspended') {
        audioContextRef.current.resume();
      }

      if (!sourceRef.current) {
        sourceRef.current = audioContextRef.current.createMediaElementSource(audioRef.current);
        analyserRef.current = audioContextRef.current.createAnalyser();
        analyserRef.current.fftSize = 256;
        analyserRef.current.smoothingTimeConstant = 0.8;
        
        sourceRef.current.connect(analyserRef.current);
        analyserRef.current.connect(audioContextRef.current.destination);
      }
    } catch (error) {
      console.error('Error initializing audio analyser:', error);
    }
  }, []);

  // Animate mouth based on audio amplitude
  const animateMouth = useCallback(() => {
    if (!analyserRef.current || !isSpeaking) {
      setMouthOpenness(0);
      return;
    }

    const bufferLength = analyserRef.current.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    analyserRef.current.getByteFrequencyData(dataArray);

    // Calculate average amplitude (focus on voice frequencies 85-255 Hz range)
    const voiceRange = dataArray.slice(2, 20);
    const average = voiceRange.reduce((a, b) => a + b, 0) / voiceRange.length;
    
    // Normalize to 0-1 range with some smoothing
    const normalized = Math.min(1, Math.max(0, (average - 20) / 100));
    
    // Apply easing for more natural movement
    setMouthOpenness(prev => prev + (normalized - prev) * 0.3);

    animationFrameRef.current = requestAnimationFrame(animateMouth);
  }, [isSpeaking]);

  // Handle audio playback
  useEffect(() => {
    if (audioUrl && audioRef.current) {
      audioRef.current.src = audioUrl;
      
      if (isPlaying) {
        initAudioAnalyser();
        audioRef.current.play().then(() => {
          setIsSpeaking(true);
          setIsBreathing(false);
          animateMouth();
        }).catch(console.error);
      }
    }
  }, [audioUrl, isPlaying, initAudioAnalyser, animateMouth]);

  // Start animation loop when speaking
  useEffect(() => {
    if (isSpeaking) {
      animationFrameRef.current = requestAnimationFrame(animateMouth);
    }
    
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [isSpeaking, animateMouth]);

  // Handle audio end
  const handleAudioEnd = () => {
    setIsSpeaking(false);
    setIsBreathing(true);
    setMouthOpenness(0);
    if (onAudioEnd) onAudioEnd();
  };

  // Idle breathing animation
  useEffect(() => {
    if (!isBreathing) return;

    let breathFrame = 0;
    const breathe = () => {
      if (!isBreathing) return;
      breathFrame += 0.02;
      // Subtle breathing effect handled by CSS
      requestAnimationFrame(breathe);
    };
    breathe();
  }, [isBreathing]);

  // Blink animation
  useEffect(() => {
    const blinkInterval = setInterval(() => {
      setEyeState('blink');
      setTimeout(() => setEyeState('neutral'), 150);
    }, 3000 + Math.random() * 2000);

    return () => clearInterval(blinkInterval);
  }, []);

  return (
    <div className={`talking-avatar-container ${className}`}>
      {/* Hidden audio element */}
      <audio
        ref={audioRef}
        onEnded={handleAudioEnd}
        crossOrigin="anonymous"
        preload="auto"
      />

      {/* Avatar wrapper with breathing animation */}
      <div 
        className={`avatar-wrapper ${isBreathing ? 'breathing' : ''}`}
        style={{
          '--breath-scale': isBreathing ? 1 : 1,
        }}
      >
        {/* Base avatar image */}
        <div className="avatar-base">
          <img 
            src={imageUrl} 
            alt="Tom - Your Bestie"
            className="avatar-image"
          />
        </div>

        {/* Mouth overlay for lip-sync */}
        <div 
          className="mouth-overlay"
          style={{
            '--mouth-open': mouthOpenness,
            '--mouth-curve': expression.mouthCurve,
          }}
        >
          <div className="mouth-shape" />
        </div>

        {/* Eye overlay for expressions */}
        <div 
          className="eyes-overlay"
          style={{
            '--eye-scale': eyeState === 'blink' ? 0.1 : expression.eyeScale,
            '--brow-position': expression.eyeBrows,
          }}
        >
          <div className="eye left-eye" />
          <div className="eye right-eye" />
        </div>

        {/* Emotion indicator (subtle glow) */}
        <div 
          className={`emotion-glow emotion-${emotionState}`}
        />
      </div>

      {/* Speaking indicator */}
      {isSpeaking && (
        <div className="speaking-indicator">
          <span className="pulse-dot" />
          <span className="pulse-dot" />
          <span className="pulse-dot" />
        </div>
      )}

      <style jsx>{`
        .talking-avatar-container {
          position: relative;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
        }

        .avatar-wrapper {
          position: relative;
          width: 280px;
          height: 280px;
          border-radius: 50%;
          overflow: hidden;
          box-shadow: 0 8px 32px rgba(233, 137, 234, 0.3);
          transition: transform 0.3s ease;
        }

        .avatar-wrapper.breathing {
          animation: breathe 4s ease-in-out infinite;
        }

        @keyframes breathe {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.02); }
        }

        .avatar-base {
          width: 100%;
          height: 100%;
          position: relative;
        }

        .avatar-image {
          width: 100%;
          height: 100%;
          object-fit: cover;
          object-position: center top;
        }

        .mouth-overlay {
          position: absolute;
          bottom: 28%;
          left: 50%;
          transform: translateX(-50%);
          width: 60px;
          height: 30px;
          pointer-events: none;
          opacity: 0;
        }

        .mouth-shape {
          width: 100%;
          height: calc(10px + var(--mouth-open, 0) * 20px);
          background: rgba(80, 40, 40, 0.9);
          border-radius: 50%;
          transform: scaleY(calc(0.3 + var(--mouth-open, 0) * 0.7));
          transition: transform 0.05s ease-out;
        }

        .eyes-overlay {
          position: absolute;
          top: 38%;
          left: 50%;
          transform: translateX(-50%);
          width: 100px;
          display: flex;
          justify-content: space-between;
          pointer-events: none;
          opacity: 0;
        }

        .eye {
          width: 20px;
          height: calc(20px * var(--eye-scale, 1));
          background: transparent;
          border-radius: 50%;
          transition: height 0.1s ease;
        }

        .emotion-glow {
          position: absolute;
          inset: -10px;
          border-radius: 50%;
          opacity: 0.3;
          pointer-events: none;
          transition: all 0.5s ease;
        }

        .emotion-glow.emotion-friendly { box-shadow: 0 0 40px rgba(233, 137, 234, 0.4); }
        .emotion-glow.emotion-excited { box-shadow: 0 0 60px rgba(255, 200, 100, 0.5); }
        .emotion-glow.emotion-comforting { box-shadow: 0 0 50px rgba(150, 200, 255, 0.4); }
        .emotion-glow.emotion-playful { box-shadow: 0 0 50px rgba(255, 150, 200, 0.5); }
        .emotion-glow.emotion-sassy { box-shadow: 0 0 50px rgba(255, 100, 150, 0.5); }
        .emotion-glow.emotion-protective { box-shadow: 0 0 50px rgba(100, 150, 255, 0.4); }
        .emotion-glow.emotion-curious { box-shadow: 0 0 50px rgba(200, 255, 150, 0.4); }
        .emotion-glow.emotion-warm { box-shadow: 0 0 50px rgba(255, 180, 100, 0.5); }

        .speaking-indicator {
          display: flex;
          gap: 6px;
          margin-top: 16px;
        }

        .pulse-dot {
          width: 8px;
          height: 8px;
          background: #E989EA;
          border-radius: 50%;
          animation: pulse 1s ease-in-out infinite;
        }

        .pulse-dot:nth-child(2) { animation-delay: 0.2s; }
        .pulse-dot:nth-child(3) { animation-delay: 0.4s; }

        @keyframes pulse {
          0%, 100% { transform: scale(1); opacity: 1; }
          50% { transform: scale(1.3); opacity: 0.7; }
        }
      `}</style>
    </div>
  );
};

export default TalkingAvatar;
