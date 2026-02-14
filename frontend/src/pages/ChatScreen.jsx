import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { ArrowLeft, Send, Mic, StopCircle, Volume2, Trash2, X, ArrowUp } from 'lucide-react';
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
  
  if (ctx.state === 'suspended') {
    await ctx.resume();
  }
  
  const base64 = base64DataUrl.split(',')[1];
  const binaryString = atob(base64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  
  const audioBuffer = await ctx.decodeAudioData(bytes.buffer);
  const source = ctx.createBufferSource();
  const gainNode = ctx.createGain();
  gainNode.gain.value = 1.5;
  source.buffer = audioBuffer;
  source.connect(gainNode);
  gainNode.connect(ctx.destination);
  
  return { source, ctx };
};

export default function ChatScreen({ user }) {
  const navigate = useNavigate();
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
  const [lastAudioUrl, setLastAudioUrl] = useState(null);
  
  const messagesEndRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  const audioSourceRef = useRef(null);

  useEffect(() => {
    fetchBestieAndMessages();
    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
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
          const starterRes = await axios.post(`${API}/chat/starter?user_id=${user.id}&bestie_id=${bestieRes.data.id}`);
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
    } catch (error) {
      toast.error('Failed to load chat');
      navigate('/dashboard');
    }
  };

  const sendMessage = async (messageContent = null) => {
    const content = messageContent || input.trim();
    if (!content || loading) return;

    const userMessage = { id: Date.now().toString(), role: 'user', content: content, timestamp: new Date().toISOString() };
    
    setInput('');
    setMessages(prev => [...prev, userMessage]);
    setLoading(true);
    
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
        id: (Date.now() + 1).toString(),
        role: 'bestie',
        content: response.data.message,
        timestamp: new Date().toISOString()
      };
      setMessages(prev => [...prev, bestieMessage]);
      
      return response.data.message;
    } catch (error) {
      toast.error('Failed to send message');
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
        toast.error('Microphone access denied. Click the lock icon in your browser to allow access.', { duration: 6000 });
      } else {
        toast.error('Could not access microphone');
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

      // Get AI response
      const chatResponse = await axios.post(`${API}/chat/message?user_id=${user.id}`, {
        bestie_id: bestie.id,
        content: transcribedText
      });

      const bestieResponse = chatResponse.data.message;
      
      // Convert to speech and play
      setSpeaking(true);
      const ttsResponse = await axios.post(`${API}/voice/tts?bestie_id=${bestie.id}&text=${encodeURIComponent(bestieResponse)}`);

      if (ttsResponse.data.audio_url) {
        setLastAudioUrl(ttsResponse.data.audio_url);
        
        const bestieMessage = {
          id: (Date.now() + 1).toString(),
          role: 'bestie',
          content: bestieResponse,
          timestamp: new Date().toISOString()
        };

        const showMessageAfterAudio = () => {
          setMessages(prev => [...prev, bestieMessage]);
          setSpeaking(false);
        };
        
        try {
          const { source } = await playAudioFromBase64(ttsResponse.data.audio_url);
          audioSourceRef.current = source;
          source.onended = showMessageAfterAudio;
          source.start(0);
        } catch (audioError) {
          // Fallback - show message without audio
          setMessages(prev => [...prev, bestieMessage]);
          setSpeaking(false);
        }
      } else {
        const bestieMessage = {
          id: (Date.now() + 1).toString(),
          role: 'bestie',
          content: bestieResponse,
          timestamp: new Date().toISOString()
        };
        setMessages(prev => [...prev, bestieMessage]);
        setSpeaking(false);
      }
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Voice processing failed');
      setSpeaking(false);
    } finally {
      setProcessing(false);
    }
  };

  const replayLastAudio = async () => {
    if (!lastAudioUrl) return;
    
    setSpeaking(true);
    try {
      const { source } = await playAudioFromBase64(lastAudioUrl);
      audioSourceRef.current = source;
      source.onended = () => setSpeaking(false);
      source.start(0);
    } catch (error) {
      setSpeaking(false);
    }
  };

  const deleteMessage = async (messageId, index) => {
    setMessages(prev => prev.filter((_, idx) => idx !== index));
    toast.success('Message deleted');
    
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
      setShowClearConfirm(false);
      toast.success('Chat history cleared');
    } catch (error) {
      toast.error('Failed to clear history');
    }
  };

  if (!bestie) return <div className="app-container min-h-screen flex items-center justify-center">Loading...</div>;

  return (
    <div className="app-container min-h-screen flex flex-col">
      {/* Clear Confirmation Modal */}
      {showClearConfirm && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-xl">
            <h3 className="text-lg font-bold text-dark-purple mb-2">Clear All Messages?</h3>
            <p className="text-dark-purple/70 mb-6">
              Delete all chat history with {bestie.name}? This cannot be undone.
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
              {speaking ? 'Speaking...' : recording ? 'Listening...' : processing ? 'Processing...' : 'Online'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {lastAudioUrl && !recording && !processing && (
            <button
              data-testid="replay-audio-button"
              onClick={replayLastAudio}
              disabled={speaking}
              className="p-2 rounded-full hover:bg-muted transition-all disabled:opacity-50"
              title="Replay last voice"
            >
              <Volume2 className="w-5 h-5 text-neon-pink" />
            </button>
          )}
          <button
            data-testid="clear-history-button"
            onClick={() => setShowClearConfirm(true)}
            className="p-2 rounded-full hover:bg-muted transition-all"
            title="Clear all messages"
          >
            <Trash2 className="w-5 h-5 text-dark-purple" />
          </button>
        </div>
      </div>

      {/* Speaking indicator */}
      {speaking && (
        <div className="bg-neon-pink/10 px-4 py-2 flex items-center justify-center gap-2">
          <Volume2 className="w-4 h-4 text-neon-pink" />
          <div className="flex gap-1">
            <span className="w-1 h-3 bg-neon-pink rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></span>
            <span className="w-1 h-4 bg-neon-pink rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></span>
            <span className="w-1 h-3 bg-neon-pink rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></span>
          </div>
          <span className="text-sm text-neon-pink font-medium">{bestie.name} is speaking</span>
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
            
            <div
              className={`max-w-[80%] rounded-2xl px-4 py-3 ${
                msg.role === 'user'
                  ? 'bg-neon-pink text-white rounded-br-sm'
                  : 'bg-muted text-dark-purple rounded-bl-sm'
              }`}
            >
              <p className="text-sm">{msg.content}</p>
            </div>

            {msg.role === 'bestie' && (
              <button
                onClick={() => deleteMessage(msg.id, idx)}
                className="opacity-0 group-hover:opacity-100 p-1 ml-2 self-center text-dark-purple/40 hover:text-red-500 transition-all"
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
            placeholder="Type or tap mic to talk..."
            disabled={recording || processing || speaking}
            className="flex-1 px-4 py-3 rounded-full bg-muted border-transparent focus:border-neon-pink focus:ring-2 focus:ring-neon-pink/20 outline-none disabled:opacity-50"
          />
          
          {/* Show mic button when no text, send button when there's text */}
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
            Listening... Tap stop when done
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
