import React, { useEffect, useRef, useState, useCallback } from 'react';

/**
 * TalkingAvatar - 2.5D avatar with lip-sync animation and dynamic expressions
 * 
 * Architecture Features:
 * - Viseme-based lip-sync (15 mouth shapes mapped to phonemes)
 * - 300-500ms smooth expression transitions
 * - Real-time audio amplitude fallback
 * - 8 emotional expression states
 */

// Viseme to mouth shape mapping (15 standard visemes)
const VISEME_MOUTH_SHAPES = {
  0: { openness: 0, width: 0 },       // Silence
  1: { openness: 0.1, width: -0.2 },  // Bilabial (p, b, m) - lips together
  2: { openness: 0.15, width: -0.1 }, // Labiodental (f, v) - teeth on lip
  3: { openness: 0.2, width: 0.1 },   // Dental (th)
  4: { openness: 0.25, width: 0 },    // Alveolar (t, d, n, l)
  5: { openness: 0.3, width: 0.2 },   // Postalveolar (sh, ch, zh, j)
  6: { openness: 0.2, width: -0.1 },  // Velar (k, g, ng)
  7: { openness: 0.25, width: 0.1 },  // Glottal (h)
  8: { openness: 0.6, width: 0.3 },   // Open vowels (aa, ah)
  9: { openness: 0.5, width: 0.4 },   // (ae) cat
  10: { openness: 0.4, width: 0.2 },  // (eh) bed
  11: { openness: 0.3, width: 0.3 },  // (ih) bit
  12: { openness: 0.2, width: 0.5 },  // (iy) beat - spread lips
  13: { openness: 0.5, width: -0.2 }, // (oh, ow) - rounded
  14: { openness: 0.3, width: -0.3 }, // (uw) boot - pursed
};

const TalkingAvatar = ({ 
  imageUrl, 
  audioUrl, 
  isPlaying,
  onAudioEnd,
  emotionState = 'curious',
  expressionConfig = null,
  visemeTimingData = null,  // NEW: Viseme timing from backend
  emotionPayload = null,    // NEW: Full emotion payload from backend
  className = ''
}) => {
  const audioRef = useRef(null);
  const audioContextRef = useRef(null);
  const analyserRef = useRef(null);
  const animationFrameRef = useRef(null);
  const sourceRef = useRef(null);
  const visemeIntervalRef = useRef(null);
  const audioStartTimeRef = useRef(null);
  
  const [mouthOpenness, setMouthOpenness] = useState(0);
  const [mouthWidth, setMouthWidth] = useState(0);  // NEW: For viseme shapes
  const [isBreathing, setIsBreathing] = useState(true);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [eyeState, setEyeState] = useState('neutral');
  const [eyeRollActive, setEyeRollActive] = useState(false);
  const [currentExpression, setCurrentExpression] = useState(null);
  const [transitionProgress, setTransitionProgress] = useState(1);
  const [useVisemeLipSync, setUseVisemeLipSync] = useState(false);  // NEW

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

  // Smooth transition between expressions (300-500ms per architecture spec)
  useEffect(() => {
    setTransitionProgress(0);
    const transitionDuration = emotionPayload?.transition_ms || 350;  // Default 350ms
    const steps = Math.ceil(transitionDuration / 16);  // ~60fps
    const increment = 1 / steps;
    
    const timer = setInterval(() => {
      setTransitionProgress(prev => {
        if (prev >= 1) {
          clearInterval(timer);
          return 1;
        }
        return Math.min(1, prev + increment);
      });
    }, 16);
    
    return () => clearInterval(timer);
  }, [emotionState, emotionPayload?.transition_ms]);

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

  // Animate mouth based on audio amplitude (fallback when no viseme data)
  const animateMouth = useCallback(() => {
    if (!analyserRef.current || !isSpeaking || useVisemeLipSync) {
      if (!useVisemeLipSync) {
        setMouthOpenness(0);
        setMouthWidth(0);
      }
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
  }, [isSpeaking, useVisemeLipSync]);

  // Viseme-based lip sync animation (precise timing from backend)
  const animateWithVisemes = useCallback(() => {
    if (!visemeTimingData || visemeTimingData.length === 0 || !audioStartTimeRef.current) {
      return;
    }

    const currentTime = Date.now() - audioStartTimeRef.current;
    
    // Find current viseme based on timing
    let currentViseme = 0;
    for (let i = 0; i < visemeTimingData.length; i++) {
      const viseme = visemeTimingData[i];
      if (currentTime >= viseme.time && currentTime < viseme.time + viseme.duration) {
        currentViseme = viseme.viseme;
        break;
      }
    }
    
    // Get mouth shape for this viseme
    const shape = VISEME_MOUTH_SHAPES[currentViseme] || VISEME_MOUTH_SHAPES[0];
    
    // Apply with smooth interpolation
    setMouthOpenness(prev => prev + (shape.openness - prev) * 0.4);
    setMouthWidth(prev => prev + (shape.width - prev) * 0.4);

    if (isSpeaking) {
      animationFrameRef.current = requestAnimationFrame(animateWithVisemes);
    }
  }, [visemeTimingData, isSpeaking]);

  // Handle audio playback
  useEffect(() => {
    if (audioUrl && audioRef.current) {
      audioRef.current.src = audioUrl;
      
      if (isPlaying) {
        // Determine if we should use viseme-based lip sync
        const hasVisemeData = visemeTimingData && visemeTimingData.length > 0;
        setUseVisemeLipSync(hasVisemeData);
        
        initAudioAnalyser();
        audioRef.current.play().then(() => {
          setIsSpeaking(true);
          setIsBreathing(false);
          audioStartTimeRef.current = Date.now();
          
          // Start appropriate lip sync method
          if (hasVisemeData) {
            animateWithVisemes();
          } else {
            animateMouth();
          }
        }).catch(console.error);
      }
    }
  }, [audioUrl, isPlaying, initAudioAnalyser, animateMouth, animateWithVisemes, visemeTimingData]);

  // Start animation loop when speaking
  useEffect(() => {
    if (isSpeaking) {
      if (useVisemeLipSync && visemeTimingData?.length > 0) {
        animationFrameRef.current = requestAnimationFrame(animateWithVisemes);
      } else {
        animationFrameRef.current = requestAnimationFrame(animateMouth);
      }
    }
    
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [isSpeaking, animateMouth, animateWithVisemes, useVisemeLipSync, visemeTimingData]);

  // Handle audio end
  const handleAudioEnd = () => {
    setIsSpeaking(false);
    setIsBreathing(true);
    setMouthOpenness(0);
    setMouthWidth(0);
    setUseVisemeLipSync(false);
    audioStartTimeRef.current = null;
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

      {/* Avatar wrapper with breathing animation and expression-based transforms */}
      <div 
        className={`avatar-wrapper ${isBreathing ? 'breathing' : ''} ${eyeRollActive ? 'eye-rolling' : ''}`}
        style={{
          '--head-tilt': `${expression.headTilt || 0}rad`,
          '--glow-color': expression.glowColor || 'rgba(233, 137, 234, 0.4)',
          '--glow-intensity': `${expression.glowIntensity || 40}px`,
          '--transition-progress': transitionProgress,
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

        {/* Eyebrow overlays for expression */}
        <div 
          className="eyebrows-overlay"
          style={{
            '--brow-raise': expression.eyebrows || 0,
            '--brow-asymmetry': expression.eyebrowAsymmetry || 0,
            '--brow-tilt': expression.eyebrowTilt || 0,
          }}
        >
          <div className="eyebrow left-brow" />
          <div className="eyebrow right-brow" />
        </div>

        {/* Eye overlays for expressions with squint/scale */}
        <div 
          className={`eyes-overlay ${eyeRollActive ? 'rolling' : ''}`}
          style={{
            '--eye-scale': eyeState === 'blink' ? 0.1 : (expression.eyeScale || 1),
            '--eye-squint': expression.eyeSquint || 0,
          }}
        >
          <div className="eye left-eye">
            {expression.eyeSparkle && <span className="sparkle" />}
          </div>
          <div className="eye right-eye">
            {expression.eyeSparkle && <span className="sparkle" />}
          </div>
        </div>

        {/* Mouth overlay for lip-sync + expression */}
        <div 
          className="mouth-overlay"
          style={{
            '--mouth-open': mouthOpenness + (expression.mouthOpen || 0),
            '--mouth-curve': expression.mouthCurve || 0,
            '--mouth-asymmetry': expression.mouthAsymmetry || 0,
          }}
        >
          <div className="mouth-shape" />
        </div>

        {/* Dynamic emotion glow */}
        <div 
          className="emotion-glow"
          style={{
            boxShadow: `0 0 ${expression.glowIntensity || 40}px ${expression.glowColor || 'rgba(233, 137, 234, 0.4)'}`,
          }}
        />
        
        {/* Energy indicator particles for high-energy states */}
        {(expression.energy === 'medium_high') && (
          <div className="energy-particles">
            <span className="particle p1" />
            <span className="particle p2" />
            <span className="particle p3" />
          </div>
        )}
      </div>

      {/* Expression label (for debugging - can hide in production) */}
      <div className="expression-label">
        {emotionState}
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
          overflow: visible;
          transition: transform 0.35s cubic-bezier(0.4, 0, 0.2, 1);
          transform: rotate(var(--head-tilt, 0));
        }

        .avatar-wrapper.breathing {
          animation: breathe 4s ease-in-out infinite;
        }
        
        .avatar-wrapper.eye-rolling {
          animation: subtle-head-shake 0.6s ease-in-out;
        }

        @keyframes breathe {
          0%, 100% { transform: rotate(var(--head-tilt, 0)) scale(1); }
          50% { transform: rotate(var(--head-tilt, 0)) scale(1.015); }
        }
        
        @keyframes subtle-head-shake {
          0%, 100% { transform: rotate(var(--head-tilt, 0)); }
          25% { transform: rotate(calc(var(--head-tilt, 0) - 0.02rad)); }
          75% { transform: rotate(calc(var(--head-tilt, 0) + 0.02rad)); }
        }

        .avatar-base {
          width: 100%;
          height: 100%;
          position: relative;
          border-radius: 50%;
          overflow: hidden;
          box-shadow: 0 8px 32px rgba(0, 0, 0, 0.15);
        }

        .avatar-image {
          width: 100%;
          height: 100%;
          object-fit: cover;
          object-position: center top;
        }

        /* Eyebrow overlays */
        .eyebrows-overlay {
          position: absolute;
          top: 32%;
          left: 50%;
          transform: translateX(-50%);
          width: 110px;
          display: flex;
          justify-content: space-between;
          pointer-events: none;
          z-index: 10;
        }

        .eyebrow {
          width: 35px;
          height: 6px;
          background: transparent;
          border-radius: 3px;
          transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        }

        .left-brow {
          transform: 
            translateY(calc(var(--brow-raise, 0) * -15px))
            rotate(calc((var(--brow-asymmetry, 0) + var(--brow-tilt, 0)) * -0.15rad));
        }

        .right-brow {
          transform: 
            translateY(calc((var(--brow-raise, 0) - var(--brow-asymmetry, 0)) * -15px))
            rotate(calc(var(--brow-tilt, 0) * 0.15rad));
        }

        /* Eye overlays */
        .eyes-overlay {
          position: absolute;
          top: 38%;
          left: 50%;
          transform: translateX(-50%);
          width: 100px;
          display: flex;
          justify-content: space-between;
          pointer-events: none;
          z-index: 5;
        }
        
        .eyes-overlay.rolling .eye {
          animation: eye-roll 0.8s ease-in-out;
        }
        
        @keyframes eye-roll {
          0%, 100% { transform: translateY(0) scaleY(var(--eye-scale, 1)); }
          25% { transform: translateY(-3px) scaleY(0.8); }
          50% { transform: translateY(-6px) scaleY(0.9); }
          75% { transform: translateY(-3px) scaleY(0.85); }
        }

        .eye {
          width: 22px;
          height: calc(22px * var(--eye-scale, 1) * (1 - var(--eye-squint, 0)));
          background: transparent;
          border-radius: 50%;
          transition: all 0.15s ease;
          position: relative;
        }
        
        .sparkle {
          position: absolute;
          top: 20%;
          right: 20%;
          width: 6px;
          height: 6px;
          background: rgba(255, 255, 255, 0.9);
          border-radius: 50%;
          animation: sparkle-shine 1.5s ease-in-out infinite;
        }
        
        @keyframes sparkle-shine {
          0%, 100% { opacity: 0.7; transform: scale(1); }
          50% { opacity: 1; transform: scale(1.3); }
        }

        /* Mouth overlay */
        .mouth-overlay {
          position: absolute;
          bottom: 28%;
          left: 50%;
          transform: translateX(calc(-50% + var(--mouth-asymmetry, 0) * 5px));
          width: 55px;
          height: 30px;
          pointer-events: none;
          z-index: 5;
          opacity: 0;
        }

        .mouth-shape {
          width: 100%;
          height: calc(8px + var(--mouth-open, 0) * 22px);
          background: transparent;
          border-radius: calc(50% - var(--mouth-curve, 0) * 20%);
          transform: 
            scaleY(calc(0.3 + var(--mouth-open, 0) * 0.7))
            skewX(calc(var(--mouth-asymmetry, 0) * 5deg));
          transition: all 0.08s ease-out;
        }

        /* Dynamic emotion glow */
        .emotion-glow {
          position: absolute;
          inset: -15px;
          border-radius: 50%;
          opacity: 0.4;
          pointer-events: none;
          transition: box-shadow 0.5s cubic-bezier(0.4, 0, 0.2, 1);
          z-index: -1;
        }

        /* Energy particles for excited states */
        .energy-particles {
          position: absolute;
          inset: -30px;
          pointer-events: none;
        }

        .particle {
          position: absolute;
          width: 8px;
          height: 8px;
          background: rgba(255, 220, 100, 0.7);
          border-radius: 50%;
          animation: float-particle 2s ease-in-out infinite;
        }

        .p1 { top: 10%; left: 20%; animation-delay: 0s; }
        .p2 { top: 15%; right: 15%; animation-delay: 0.5s; }
        .p3 { bottom: 20%; left: 10%; animation-delay: 1s; }

        @keyframes float-particle {
          0%, 100% { transform: translateY(0) scale(1); opacity: 0.7; }
          50% { transform: translateY(-10px) scale(1.2); opacity: 1; }
        }

        /* Expression label */
        .expression-label {
          margin-top: 12px;
          padding: 4px 12px;
          background: rgba(0, 0, 0, 0.05);
          border-radius: 12px;
          font-size: 11px;
          color: #666;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          font-weight: 500;
        }

        /* Speaking indicator */
        .speaking-indicator {
          display: flex;
          gap: 6px;
          margin-top: 12px;
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
