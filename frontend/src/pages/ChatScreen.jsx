import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { ArrowLeft, Send, Mic, StopCircle, Volume2, VolumeX, Trash2, X, ArrowUp, Play, Pause, RotateCcw } from 'lucide-react';
import { toast } from 'sonner';
import { useLanguage } from '../context/LanguageContext';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

// Global AudioContext for reliable playback
let audioContext = null;

const getAudioContext = () => {
  if (!audioContext || audioContext.state === 'closed') {
    audioContext = new (window.AudioContext || window.webkitAudioContext)();
  }
  return audioContext;
};

export default function ChatScreen({ user }) {
  const navigate = useNavigate();
  const { t, language } = useLanguage();
  const [bestie, setBestie] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [showTyping, setShowTyping] = useState(false);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  
  // Voice-related state
  const [recording, setRecording] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const [mediaRecorder, setMediaRecorder] = useState(null);
  const [currentPlayingId, setCurrentPlayingId] = useState(null);
  const [isPaused, setIsPaused] = useState(false);
  
  // Audio storage for each message
  const [messageAudios, setMessageAudios] = useState({});
  
  // Mood tracking
  const [currentMood, setCurrentMood] = useState(null);
  
  const messagesEndRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  const audioElementRef = useRef(null);
  const audioContextRef = useRef(null);
  const sourceNodeRef = useRef(null);
  const gainNodeRef = useRef(null);
  const startTimeRef = useRef(0);
  const pauseTimeRef = useRef(0);

  useEffect(() => {
    fetchBestieAndMessages();
    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      // Cleanup audio
      if (audioElementRef.current) {
        audioElementRef.current.pause();
      }
    };
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, showTyping]);

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const fetchBestieAndMessages = async () => {
    try {
      const bestieRes = await axios.get(`${API}/bestie/${user.id}`);
      setBestie(bestieRes.data);

      const messagesRes = await axios.get(`${API}/chat/history/${user.id}/${bestieRes.data.id}`);
      
      if (!messagesRes.data || messagesRes.data.length === 0) {
        try {
          setShowTyping(true);
          const starterRes = await axios.post(`${API}/chat/starter?user_id=${user.id}&bestie_id=${bestieRes.data.id}&language=${language}`);
          setShowTyping(false);
          
          const starterMessage = {
            id: starterRes.data.message_id || 'starter',
            role: 'bestie',
            content: starterRes.data.message,
            timestamp: new Date().toISOString()
          };
          setMessages([starterMessage]);
        } catch (starterError) {
          setShowTyping(false);
          const fallbackMessage = {
            id: 'greeting',
            role: 'bestie',
            content: `Hey babe! 💕 How are you?`,
            timestamp: new Date().toISOString()
          };
          setMessages([fallbackMessage]);
        }
      } else {
        setMessages(messagesRes.data);
      }
      
      // Get current mood
      fetchMoodSummary();
    } catch (error) {
      toast.error(t('failedToLoad'));
      navigate('/dashboard');
    }
  };

  const fetchMoodSummary = async () => {
    try {
      const res = await axios.get(`${API}/mood/summary/${user.id}?days=1`);
      if (res.data.dominant_mood) {
        setCurrentMood(res.data.dominant_mood);
      }
    } catch (e) {
      // Ignore mood errors
    }
  };

  const analyzeMood = async (message) => {
    try {
      const res = await axios.post(`${API}/mood/analyze?user_id=${user.id}&message=${encodeURIComponent(message)}`);
      setCurrentMood(res.data.mood);
    } catch (e) {
      // Ignore mood errors
    }
  };

  const sendMessage = async (messageContent = null) => {
    const content = messageContent || input.trim();
    if (!content || loading) return;

    const userMessage = { id: Date.now().toString(), role: 'user', content: content, timestamp: new Date().toISOString() };
    
    setInput('');
    setMessages(prev => [...prev, userMessage]);
    setLoading(true);
    
    // Analyze mood in background
    analyzeMood(content);
    
    typingTimeoutRef.current = setTimeout(() => {
      setShowTyping(true);
    }, 500);

    try {
      const response = await axios.post(`${API}/chat/message?user_id=${user.id}`, {
        bestie_id: bestie.id,
        content: content
      });

      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      setShowTyping(false);

      const bestieMessage = {
        id: response.data.message_id || (Date.now() + 1).toString(),
        role: 'bestie',
        content: response.data.message,
        timestamp: new Date().toISOString()
      };
      setMessages(prev => [...prev, bestieMessage]);
      
      return response.data.message;
    } catch (error) {
      toast.error(t('failedToSend'));
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      setShowTyping(false);
      return null;
    } finally {
      setLoading(false);
    }
  };

  // Voice recording functions
  const startRecording = async () => {
    try {
      const ctx = getAudioContext();
      if (ctx.state === 'suspended') {
        await ctx.resume();
      }
      
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      const chunks = [];

      recorder.ondataavailable = (e) => {
        chunks.push(e.data);
      };

      recorder.onstop = async () => {
        const audioBlob = new Blob(chunks, { type: 'audio/webm' });
        await processVoiceInput(audioBlob);
        stream.getTracks().forEach(track => track.stop());
      };

      recorder.start();
      setMediaRecorder(recorder);
      setRecording(true);
    } catch (error) {
      console.error('Mic error:', error);
      if (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError') {
        toast.error(t('micAccessDenied'), { duration: 6000 });
      } else {
        toast.error(t('couldNotAccessMic'));
      }
    }
  };

  const stopRecording = () => {
    if (mediaRecorder) {
      mediaRecorder.stop();
      setRecording(false);
    }
  };

  const processVoiceInput = async (audioBlob) => {
    setProcessing(true);
    try {
      // Speech to text
      const formData = new FormData();
      formData.append('audio_file', audioBlob, 'recording.webm');

      const sttResponse = await axios.post(`${API}/voice/stt`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      const transcribedText = sttResponse.data.text;
      
      // Add user message
      const userMessage = {
        id: Date.now().toString(),
        role: 'user',
        content: transcribedText,
        timestamp: new Date().toISOString()
      };
      setMessages(prev => [...prev, userMessage]);
      
      // Analyze mood
      analyzeMood(transcribedText);

      // Get AI response
      const chatResponse = await axios.post(`${API}/chat/message?user_id=${user.id}`, {
        bestie_id: bestie.id,
        content: transcribedText
      });

      const bestieResponse = chatResponse.data.message;
      const bestieMessageId = chatResponse.data.message_id || (Date.now() + 1).toString();
      
      // Convert to speech
      setSpeaking(true);
      setCurrentPlayingId(bestieMessageId);
      
      const ttsResponse = await axios.post(`${API}/voice/tts?bestie_id=${bestie.id}&text=${encodeURIComponent(bestieResponse)}`);

      const bestieMessage = {
        id: bestieMessageId,
        role: 'bestie',
        content: bestieResponse,
        timestamp: new Date().toISOString()
      };

      if (ttsResponse.data.audio_url) {
        // Store audio URL for this message
        setMessageAudios(prev => ({
          ...prev,
          [bestieMessageId]: ttsResponse.data.audio_url
        }));
        
        // Play audio
        await playAudio(ttsResponse.data.audio_url, bestieMessageId, () => {
          setMessages(prev => [...prev, bestieMessage]);
          setSpeaking(false);
          setCurrentPlayingId(null);
        });
      } else {
        setMessages(prev => [...prev, bestieMessage]);
        setSpeaking(false);
        setCurrentPlayingId(null);
      }
    } catch (error) {
      toast.error(t('voiceProcessingFailed'));
      setSpeaking(false);
      setCurrentPlayingId(null);
    } finally {
      setProcessing(false);
    }
  };

  // Audio playback functions
  const playAudio = async (audioUrl, messageId, onEnd) => {
    try {
      // Stop any currently playing audio
      stopCurrentAudio();
      
      // Create new audio element
      const audio = new Audio(audioUrl);
      audio.volume = 1.0;
      audioElementRef.current = audio;
      
      setCurrentPlayingId(messageId);
      setIsPaused(false);
      
      audio.onended = () => {
        setCurrentPlayingId(null);
        setIsPaused(false);
        if (onEnd) onEnd();
      };
      
      audio.onerror = () => {
        setCurrentPlayingId(null);
        setIsPaused(false);
        if (onEnd) onEnd();
      };
      
      await audio.play();
    } catch (error) {
      console.error('Audio playback error:', error);
      setCurrentPlayingId(null);
      if (onEnd) onEnd();
    }
  };

  const stopCurrentAudio = () => {
    if (audioElementRef.current) {
      audioElementRef.current.pause();
      audioElementRef.current.currentTime = 0;
      audioElementRef.current = null;
    }
    setCurrentPlayingId(null);
    setIsPaused(false);
  };

  const togglePlayPause = (messageId) => {
    if (!audioElementRef.current) return;
    
    if (currentPlayingId === messageId && !isPaused) {
      // Pause
      audioElementRef.current.pause();
      setIsPaused(true);
    } else if (currentPlayingId === messageId && isPaused) {
      // Resume
      audioElementRef.current.play();
      setIsPaused(false);
    }
  };

  const listenAgain = async (messageId) => {
    const audioUrl = messageAudios[messageId];
    if (!audioUrl) {
      // Generate TTS for this message
      const message = messages.find(m => m.id === messageId);
      if (!message || message.role !== 'bestie') return;
      
      try {
        setSpeaking(true);
        const ttsResponse = await axios.post(`${API}/voice/tts?bestie_id=${bestie.id}&text=${encodeURIComponent(message.content)}`);
        
        if (ttsResponse.data.audio_url) {
          setMessageAudios(prev => ({
            ...prev,
            [messageId]: ttsResponse.data.audio_url
          }));
          
          await playAudio(ttsResponse.data.audio_url, messageId, () => {
            setSpeaking(false);
          });
        } else {
          setSpeaking(false);
        }
      } catch (error) {
        toast.error(t('voiceProcessingFailed'));
        setSpeaking(false);
      }
    } else {
      await playAudio(audioUrl, messageId, () => {
        setSpeaking(false);
      });
    }
  };

  const deleteMessage = async (messageId, index) => {
    setMessages(prev => prev.filter((_, idx) => idx !== index));
    toast.success(t('messageDeleted'));
    
    try {
      await axios.delete(`${API}/chat/message/${user.id}/${bestie.id}/${messageId}`);
    } catch (error) {
      console.log('Backend sync failed for delete');
    }
  };

  const clearAllHistory = async () => {
    try {
      await axios.delete(`${API}/chat/history/${user.id}/${bestie.id}?timeframe=all`);
      setMessages([]);
      setMessageAudios({});
      setShowClearConfirm(false);
      toast.success(t('chatHistoryCleared'));
    } catch (error) {
      toast.error(t('failedToLoad'));
    }
  };

  const getMoodEmoji = (mood) => {
    const moodEmojis = {
      happy: '😊',
      sad: '😢',
      anxious: '😰',
      excited: '🤩',
      neutral: '😐',
      stressed: '😫',
      calm: '😌',
      angry: '😠'
    };
    return moodEmojis[mood] || '😐';
  };

  if (!bestie) return <div className="app-container min-h-screen flex items-center justify-center">{t('loading')}</div>;

  return (
    <div className="app-container min-h-screen flex flex-col">
      {/* Clear Confirmation Modal */}
      {showClearConfirm && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-xl">
            <h3 className="text-lg font-bold text-dark-purple mb-2">{t('clearAllMessages')}</h3>
            <p className="text-dark-purple/70 mb-6">{t('clearAllConfirm')}</p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowClearConfirm(false)}
                className="flex-1 px-4 py-2 rounded-full border border-border text-dark-purple hover:bg-muted transition-all"
              >
                {t('cancel')}
              </button>
              <button
                onClick={clearAllHistory}
                className="flex-1 px-4 py-2 rounded-full bg-red-500 text-white hover:bg-red-600 transition-all"
              >
                {t('clearAll')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="bg-white border-b border-border p-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            data-testid="back-button"
            onClick={() => navigate('/play')}
            className="p-2 rounded-full hover:bg-muted transition-all"
          >
            <ArrowLeft className="w-5 h-5 text-dark-purple" />
          </button>
          <div className={`w-10 h-10 rounded-full bg-gradient-to-br from-neon-pink to-soft-yellow flex items-center justify-center overflow-hidden ${speaking ? 'animate-pulse ring-2 ring-neon-pink' : ''}`}>
            {bestie.image_url ? (
              <img src={bestie.image_url} alt={bestie.name} className="w-full h-full object-cover object-top" />
            ) : bestie.avatar_url ? (
              <img src={bestie.avatar_url} alt={bestie.name} className="w-full h-full object-cover object-top" />
            ) : null}
          </div>
          <div>
            <h2 className="font-bold text-dark-purple">{bestie.name}</h2>
            <p className="text-xs text-dark-purple/60">
              {speaking ? t('speaking') : recording ? t('listening') : processing ? t('processing') : t('online')}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {/* Mood indicator */}
          {currentMood && (
            <div className="flex items-center gap-1 px-2 py-1 bg-muted rounded-full" title={t('currentMood')}>
              <span className="text-sm">{getMoodEmoji(currentMood)}</span>
            </div>
          )}
          <button
            data-testid="clear-history-button"
            onClick={() => setShowClearConfirm(true)}
            className="p-2 rounded-full hover:bg-muted transition-all"
            title={t('clearAll')}
          >
            <Trash2 className="w-5 h-5 text-dark-purple" />
          </button>
        </div>
      </div>

      {/* Speaking indicator */}
      {speaking && currentPlayingId && (
        <div className="bg-neon-pink/10 px-4 py-2 flex items-center justify-center gap-2">
          <Volume2 className="w-4 h-4 text-neon-pink" />
          <div className="flex gap-1">
            <span className="w-1 h-3 bg-neon-pink rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></span>
            <span className="w-1 h-4 bg-neon-pink rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></span>
            <span className="w-1 h-3 bg-neon-pink rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></span>
          </div>
          <span className="text-sm text-neon-pink font-medium">{bestie.name} {t('isSpeaking')}</span>
          <button
            onClick={() => togglePlayPause(currentPlayingId)}
            className="ml-2 p-1 rounded-full bg-neon-pink/20 hover:bg-neon-pink/30"
          >
            {isPaused ? <Play className="w-4 h-4 text-neon-pink" /> : <Pause className="w-4 h-4 text-neon-pink" />}
          </button>
          <button
            onClick={stopCurrentAudio}
            className="p-1 rounded-full bg-neon-pink/20 hover:bg-neon-pink/30"
          >
            <VolumeX className="w-4 h-4 text-neon-pink" />
          </button>
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4" data-testid="chat-messages">
        {messages.length === 0 && (
          <div className="text-center text-dark-purple/50 mt-8">
            <p>Start chatting with {bestie.name}!</p>
          </div>
        )}
        {messages.map((msg, idx) => (
          <div
            key={msg.id || idx}
            data-testid={`message-${msg.role}`}
            className={`flex group ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            {msg.role === 'user' && (
              <button
                onClick={() => deleteMessage(msg.id, idx)}
                className="opacity-0 group-hover:opacity-100 p-1 mr-2 self-center text-dark-purple/40 hover:text-red-500 transition-all"
              >
                <X className="w-4 h-4" />
              </button>
            )}
            
            <div className={`max-w-[80%] ${msg.role === 'user' ? '' : ''}`}>
              <div
                className={`rounded-2xl px-4 py-3 ${
                  msg.role === 'user'
                    ? 'bg-neon-pink text-white rounded-br-sm'
                    : 'bg-muted text-dark-purple rounded-bl-sm'
                }`}
              >
                <p className="text-sm">{msg.content}</p>
              </div>
              
              {/* Listen again button for bestie messages */}
              {msg.role === 'bestie' && (
                <div className="flex items-center gap-2 mt-1 ml-1">
                  <button
                    onClick={() => listenAgain(msg.id)}
                    disabled={speaking && currentPlayingId !== msg.id}
                    className="flex items-center gap-1 text-xs text-dark-purple/50 hover:text-neon-pink transition-all disabled:opacity-30"
                    data-testid={`listen-again-${msg.id}`}
                  >
                    {currentPlayingId === msg.id ? (
                      isPaused ? (
                        <>
                          <Play className="w-3 h-3" />
                          <span>{t('play')}</span>
                        </>
                      ) : (
                        <>
                          <Pause className="w-3 h-3" />
                          <span>{t('pause')}</span>
                        </>
                      )
                    ) : (
                      <>
                        <RotateCcw className="w-3 h-3" />
                        <span>{t('listenAgain')}</span>
                      </>
                    )}
                  </button>
                  {currentPlayingId === msg.id && (
                    <button
                      onClick={stopCurrentAudio}
                      className="text-xs text-dark-purple/50 hover:text-red-500"
                    >
                      <VolumeX className="w-3 h-3" />
                    </button>
                  )}
                </div>
              )}
            </div>

            {msg.role === 'bestie' && (
              <button
                onClick={() => deleteMessage(msg.id, idx)}
                className="opacity-0 group-hover:opacity-100 p-1 ml-2 self-start text-dark-purple/40 hover:text-red-500 transition-all"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        ))}
        {showTyping && (
          <div className="flex justify-start" data-testid="typing-indicator">
            <div className="bg-muted text-dark-purple rounded-2xl rounded-bl-sm px-4 py-3">
              <div className="flex items-center gap-1">
                <span className="w-2 h-2 bg-dark-purple/40 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></span>
                <span className="w-2 h-2 bg-dark-purple/40 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></span>
                <span className="w-2 h-2 bg-dark-purple/40 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></span>
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area - Text + Voice */}
      <div className="bg-white border-t border-border p-4">
        <div className="flex gap-2 items-center">
          <input
            data-testid="chat-input"
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
            placeholder={t('typeOrTalk')}
            disabled={recording || processing || speaking}
            className="flex-1 px-4 py-3 rounded-full bg-muted border-transparent focus:border-neon-pink focus:ring-2 focus:ring-neon-pink/20 outline-none disabled:opacity-50"
          />
          
          {!input.trim() ? (
            !recording ? (
              <button
                data-testid="mic-button"
                onClick={startRecording}
                disabled={processing || speaking || loading}
                className="p-3 rounded-full bg-neon-pink text-white hover:bg-[#D670D7] transition-all disabled:opacity-50"
              >
                <Mic className="w-5 h-5" />
              </button>
            ) : (
              <button
                data-testid="stop-recording-button"
                onClick={stopRecording}
                className="p-3 rounded-full bg-red-500 text-white animate-pulse"
              >
                <StopCircle className="w-5 h-5" />
              </button>
            )
          ) : (
            <button
              data-testid="send-button"
              onClick={() => sendMessage()}
              disabled={loading || recording || processing || speaking}
              className="p-3 rounded-full bg-neon-pink text-white hover:bg-[#D670D7] transition-all disabled:opacity-50"
            >
              <Send className="w-5 h-5" />
            </button>
          )}
        </div>
        
        {recording && (
          <p className="text-center text-sm text-neon-pink mt-2 animate-pulse">
            {t('tapStopWhenDone')}
          </p>
        )}
      </div>

      {/* Floating Scroll to Top Button */}
      {messages.length > 3 && (
        <button
          onClick={scrollToTop}
          className="fixed top-20 left-1/2 -translate-x-1/2 z-40 flex items-center gap-1 px-3 py-1.5 bg-white border border-neon-pink/50 rounded-full shadow-lg text-xs font-medium text-dark-purple hover:bg-neon-pink/10 hover:border-neon-pink transition-all"
          data-testid="scroll-to-top-button"
        >
          <ArrowUp className="w-3 h-3 text-neon-pink" />
          <span>Top</span>
        </button>
      )}
    </div>
  );
}
