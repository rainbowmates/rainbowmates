import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { ArrowLeft, Mic, Volume2, StopCircle, Trash2, X, ArrowUp } from 'lucide-react';
import { toast } from 'sonner';

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

const playAudioFromBase64 = async (base64DataUrl) => {
  const ctx = getAudioContext();
  
  // Resume context if suspended
  if (ctx.state === 'suspended') {
    await ctx.resume();
  }
  
  // Extract base64 data from data URL
  const base64 = base64DataUrl.split(',')[1];
  const binaryString = atob(base64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  
  // Decode and play
  const audioBuffer = await ctx.decodeAudioData(bytes.buffer);
  const source = ctx.createBufferSource();
  const gainNode = ctx.createGain();
  gainNode.gain.value = 1.5; // Boost volume
  source.buffer = audioBuffer;
  source.connect(gainNode);
  gainNode.connect(ctx.destination);
  
  return { source, ctx };
};

export default function VoiceScreen({ user }) {
  const navigate = useNavigate();
  const [bestie, setBestie] = useState(null);
  const [recording, setRecording] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const [mediaRecorder, setMediaRecorder] = useState(null);
  const [conversation, setConversation] = useState([]);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [lastAudioUrl, setLastAudioUrl] = useState(null);
  const audioRef = useRef(null);
  const audioSourceRef = useRef(null);
  const conversationEndRef = useRef(null);
  const conversationTopRef = useRef(null);

  useEffect(() => {
    fetchBestie();
  }, []);

  useEffect(() => {
    conversationEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [conversation]);

  const scrollToTop = () => {
    conversationTopRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const fetchBestie = async () => {
    try {
      const response = await axios.get(`${API}/bestie/${user.id}`);
      setBestie(response.data);
      
      // Load voice conversation history
      try {
        const historyRes = await axios.get(`${API}/chat/history/${user.id}/${response.data.id}`);
        if (historyRes.data && historyRes.data.length > 0) {
          // Convert to conversation format with IDs
          const formattedHistory = historyRes.data.map((msg, idx) => ({
            id: msg.id || `history-${idx}`,
            role: msg.role,
            text: msg.content,
            timestamp: msg.timestamp
          }));
          setConversation(formattedHistory);
        } else {
          // Add greeting if no history
          const greetingMessage = {
            id: 'greeting',
            role: 'bestie',
            text: `Hey gorgeous! 🎤 Ready for a voice chat? Tell me, how's your day going? I want to hear all about it!`,
            timestamp: new Date().toISOString()
          };
          setConversation([greetingMessage]);
        }
      } catch (e) {
        // No history - add greeting
        const greetingMessage = {
          id: 'greeting',
          role: 'bestie',
          text: `Hey gorgeous! 🎤 Ready for a voice chat? Tell me, how's your day going? I want to hear all about it!`,
          timestamp: new Date().toISOString()
        };
        setConversation([greetingMessage]);
      }
    } catch (error) {
      toast.error('Failed to load bestie');
      navigate('/dashboard');
    }
  };

  const startRecording = async () => {
    try {
      // Initialize AudioContext on user interaction (required for autoplay)
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
        await processAudio(audioBlob);
        stream.getTracks().forEach(track => track.stop());
      };

      recorder.start();
      setMediaRecorder(recorder);
      setRecording(true);
    } catch (error) {
      console.error('Mic error:', error);
      toast.error('Microphone access denied');
    }
  };

  const stopRecording = () => {
    if (mediaRecorder) {
      mediaRecorder.stop();
      setRecording(false);
    }
  };

  const processAudio = async (audioBlob) => {
    setProcessing(true);
    try {
      // Convert speech to text
      const formData = new FormData();
      formData.append('audio_file', audioBlob, 'recording.webm');

      const sttResponse = await axios.post(`${API}/voice/stt`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      const transcribedText = sttResponse.data.text;
      
      // Add user message to conversation
      const userMessage = {
        id: Date.now().toString(),
        role: 'user',
        text: transcribedText,
        timestamp: new Date().toISOString()
      };
      setConversation(prev => [...prev, userMessage]);

      // Get bestie response
      const chatResponse = await axios.post(`${API}/chat/message?user_id=${user.id}`, {
        bestie_id: bestie.id,
        content: transcribedText
      });

      const bestieResponse = chatResponse.data.message;
      
      // Add bestie message to conversation
      const bestieMessage = {
        id: (Date.now() + 1).toString(),
        role: 'bestie',
        text: bestieResponse,
        timestamp: new Date().toISOString()
      };
      setConversation(prev => [...prev, bestieMessage]);

      // Convert bestie response to speech
      setSpeaking(true);
      const ttsResponse = await axios.post(`${API}/voice/tts?bestie_id=${bestie.id}&text=${encodeURIComponent(bestieResponse)}`);

      if (ttsResponse.data.audio_url) {
        setLastAudioUrl(ttsResponse.data.audio_url);
        
        try {
          const { source, ctx } = await playAudioFromBase64(ttsResponse.data.audio_url);
          audioSourceRef.current = source;
          source.onended = () => setSpeaking(false);
          source.start(0);
        } catch (audioError) {
          console.error('Web Audio failed, falling back to HTML5:', audioError);
          // Fallback to HTML5 Audio
          const audio = new Audio(ttsResponse.data.audio_url);
          audio.volume = 1.0;
          audioRef.current = audio;
          audio.onended = () => setSpeaking(false);
          audio.onerror = () => setSpeaking(false);
          audio.play().catch(() => setSpeaking(false));
        }
      } else {
        toast.error('No audio received from server');
        setSpeaking(false);
      }
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Voice processing failed');
      setSpeaking(false);
    } finally {
      setProcessing(false);
    }
  };

  const deleteMessage = (messageId, index) => {
    setConversation(prev => prev.filter((_, idx) => idx !== index));
    toast.success('Message deleted');
  };

  const clearAllHistory = async () => {
    try {
      await axios.delete(`${API}/chat/history/${user.id}/${bestie.id}?timeframe=all`);
      setConversation([]);
      setShowClearConfirm(false);
      toast.success('All conversation cleared');
    } catch (error) {
      toast.error('Failed to clear history');
    }
  };

  const getStatusText = () => {
    if (speaking) return `${bestie.name} is speaking...`;
    if (processing) return 'Processing...';
    if (recording) return 'Listening...';
    return 'Tap the mic to talk';
  };

  const replayLastAudio = async () => {
    if (!lastAudioUrl) {
      toast.error('No audio to replay');
      return;
    }
    
    setSpeaking(true);
    
    try {
      const { source } = await playAudioFromBase64(lastAudioUrl);
      audioSourceRef.current = source;
      source.onended = () => setSpeaking(false);
      source.start(0);
    } catch (audioError) {
      console.error('Web Audio replay failed, falling back:', audioError);
      const audio = new Audio(lastAudioUrl);
      audio.volume = 1.0;
      audioRef.current = audio;
      audio.onended = () => setSpeaking(false);
      audio.onerror = () => setSpeaking(false);
      audio.play().catch(() => setSpeaking(false));
    }
  };

  if (!bestie) return <div className="app-container min-h-screen flex items-center justify-center">Loading...</div>;

  return (
    <div className="app-container gradient-mesh min-h-screen overflow-y-auto flex flex-col">
      {/* Clear Confirmation Modal */}
      {showClearConfirm && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-xl">
            <h3 className="text-lg font-bold text-dark-purple mb-2">Clear All Messages?</h3>
            <p className="text-dark-purple/70 mb-6">
              Are you sure you want to delete all voice chat history with {bestie.name}? This action cannot be undone.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowClearConfirm(false)}
                className="flex-1 px-4 py-2 rounded-full border border-border text-dark-purple hover:bg-muted transition-all"
              >
                Cancel
              </button>
              <button
                onClick={clearAllHistory}
                className="flex-1 px-4 py-2 rounded-full bg-red-500 text-white hover:bg-red-600 transition-all"
              >
                Clear All
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="p-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            data-testid="back-button"
            onClick={() => navigate('/play')}
            className="p-2 rounded-full bg-white border border-border hover:bg-muted transition-all"
          >
            <ArrowLeft className="w-5 h-5 text-dark-purple" />
          </button>
          <h1 className="text-xl font-bold text-dark-purple" style={{ fontFamily: 'Nunito, sans-serif' }}>
            Voice Chat
          </h1>
        </div>
        {conversation.length > 0 && (
          <button
            data-testid="clear-history-button"
            onClick={() => setShowClearConfirm(true)}
            className="p-2 rounded-full bg-white border border-border hover:bg-muted transition-all"
            title="Clear all messages"
          >
            <Trash2 className="w-5 h-5 text-dark-purple" />
          </button>
        )}
      </div>

      {/* Bestie Avatar & Status */}
      <div className="card-soft mx-4 p-4 text-center">
        <div className={`w-20 h-20 mx-auto rounded-full bg-gradient-to-br from-neon-pink to-soft-yellow flex items-center justify-center overflow-hidden ${speaking ? 'animate-pulse ring-4 ring-neon-pink/50' : ''}`}>
          {bestie.image_url ? (
            <img src={bestie.image_url} alt={bestie.name} className="w-full h-full object-cover object-top" />
          ) : bestie.avatar_url ? (
            <img src={bestie.avatar_url} alt={bestie.name} className="w-full h-full object-cover object-top" />
          ) : null}
        </div>
        <h2 className="text-lg font-bold text-dark-purple mt-2">{bestie.name}</h2>
        <p className={`text-sm ${speaking ? 'text-neon-pink font-medium' : 'text-dark-purple/70'}`}>
          {getStatusText()}
        </p>
        
        {speaking && (
          <div className="flex justify-center items-center gap-1 mt-2">
            <Volume2 className="w-4 h-4 text-neon-pink" />
            <div className="flex gap-1">
              <span className="w-1 h-3 bg-neon-pink rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></span>
              <span className="w-1 h-4 bg-neon-pink rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></span>
              <span className="w-1 h-3 bg-neon-pink rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></span>
              <span className="w-1 h-5 bg-neon-pink rounded-full animate-bounce" style={{ animationDelay: '450ms' }}></span>
              <span className="w-1 h-3 bg-neon-pink rounded-full animate-bounce" style={{ animationDelay: '600ms' }}></span>
            </div>
          </div>
        )}
      </div>

      {/* Conversation History */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3 relative">
        <div ref={conversationTopRef} />
        
        {conversation.length === 0 && (
          <div className="text-center text-dark-purple/50 py-8">
            <p>Start talking with {bestie.name}!</p>
            <p className="text-sm mt-1">Tap the mic button below</p>
          </div>
        )}
        {conversation.map((msg, idx) => (
          <div
            key={msg.id || idx}
            className={`flex group ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            {/* Delete button for user messages */}
            {msg.role === 'user' && (
              <button
                onClick={() => deleteMessage(msg.id, idx)}
                className="opacity-0 group-hover:opacity-100 p-1 mr-2 self-center text-dark-purple/40 hover:text-red-500 transition-all"
                title="Delete message"
              >
                <X className="w-4 h-4" />
              </button>
            )}
            
            <div
              className={`max-w-[80%] rounded-2xl px-4 py-3 ${
                msg.role === 'user'
                  ? 'bg-neon-pink text-white rounded-br-sm'
                  : 'bg-white text-dark-purple rounded-bl-sm shadow-sm'
              }`}
            >
              <p className="text-sm">{msg.text || msg.content}</p>
            </div>

            {/* Delete button for bestie messages */}
            {msg.role === 'bestie' && (
              <button
                onClick={() => deleteMessage(msg.id, idx)}
                className="opacity-0 group-hover:opacity-100 p-1 ml-2 self-center text-dark-purple/40 hover:text-red-500 transition-all"
                title="Delete message"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        ))}
        <div ref={conversationEndRef} />
      </div>

      {/* Mic Button and Replay */}
      <div className="p-6 flex justify-center items-center gap-4">
        {lastAudioUrl && !recording && !processing && (
          <button
            data-testid="replay-audio-button"
            onClick={replayLastAudio}
            disabled={speaking}
            className="w-12 h-12 rounded-full bg-white border-2 border-neon-pink text-neon-pink flex items-center justify-center shadow-md hover:bg-neon-pink/10 transition-all disabled:opacity-50"
            title="Replay last response"
          >
            <Volume2 className="w-5 h-5" />
          </button>
        )}
        
        {!recording ? (
          <button
            data-testid="start-recording-button"
            onClick={startRecording}
            disabled={processing || speaking}
            className="w-16 h-16 rounded-full bg-neon-pink text-white flex items-center justify-center shadow-lg hover:scale-110 transition-all disabled:opacity-50 disabled:hover:scale-100"
          >
            <Mic className="w-8 h-8" />
          </button>
        ) : (
          <button
            data-testid="stop-recording-button"
            onClick={stopRecording}
            className="w-16 h-16 rounded-full bg-red-500 text-white flex items-center justify-center animate-pulse"
          >
            <StopCircle className="w-8 h-8" />
          </button>
        )}
      </div>
    </div>
  );
}