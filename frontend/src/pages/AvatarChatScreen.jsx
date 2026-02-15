import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { ArrowLeft, Send, Mic, StopCircle, Settings, MessageCircle } from 'lucide-react';
import { toast } from 'sonner';
import TalkingAvatar from '../components/TalkingAvatar';
import { useLanguage } from '../context/LanguageContext';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

// Tom's image URL
const TOM_IMAGE = 'https://customer-assets.emergentagent.com/job_d78d511c-01b3-4716-b2c4-6339dea946bb/artifacts/dmzb8405_tom.png';

export default function AvatarChatScreen({ user }) {
  const navigate = useNavigate();
  const { language } = useLanguage();
  
  // Core state
  const [bestie, setBestie] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  
  // Avatar state
  const [isAvatarSpeaking, setIsAvatarSpeaking] = useState(false);
  const [currentAudioUrl, setCurrentAudioUrl] = useState(null);
  const [emotionState, setEmotionState] = useState('curious'); // Default to curious
  const [expressionConfig, setExpressionConfig] = useState(null);
  const [relationshipData, setRelationshipData] = useState(null);
  
  // Voice recording
  const [recording, setRecording] = useState(false);
  const [mediaRecorder, setMediaRecorder] = useState(null);
  
  // Usage tracking
  const [usageStats, setUsageStats] = useState(null);
  
  // View mode
  const [viewMode, setViewMode] = useState('avatar'); // 'avatar' or 'chat'
  
  const messagesEndRef = useRef(null);
  const audioChunksRef = useRef([]);

  // Fetch bestie and initial data
  useEffect(() => {
    const init = async () => {
      try {
        const bestieRes = await axios.get(`${API}/bestie/${user.id}`);
        setBestie(bestieRes.data);
        
        // Fetch relationship data
        const relRes = await axios.get(`${API}/relationship/${user.id}/${bestieRes.data.id}`);
        setRelationshipData(relRes.data);
        
        // Fetch messages
        const messagesRes = await axios.get(`${API}/chat/history/${user.id}/${bestieRes.data.id}`);
        setMessages(messagesRes.data);
        
        // Fetch usage stats
        const usageRes = await axios.get(`${API}/avatar/usage/${user.id}`);
        setUsageStats(usageRes.data);
        
        // Get conversation starter if no messages
        if (messagesRes.data.length === 0) {
          await getConversationStarter(bestieRes.data.id);
        }
      } catch (error) {
        if (error.response?.status === 404) {
          navigate('/create-bestie');
        } else {
          toast.error('Failed to load chat');
        }
      }
    };
    
    init();
  }, [user.id, navigate]);

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Get conversation starter
  const getConversationStarter = async (bestieId) => {
    try {
      const res = await axios.post(`${API}/chat/starter?user_id=${user.id}&bestie_id=${bestieId}&language=${language}`);
      const starterMessage = {
        id: res.data.message_id,
        role: 'bestie',
        content: res.data.message,
        timestamp: new Date().toISOString()
      };
      setMessages([starterMessage]);
      
      // Set expression from API response
      if (res.data.expression) {
        setEmotionState(res.data.expression.tag || 'curious');
        setExpressionConfig(res.data.expression.config || null);
      }
      
      // Speak the starter
      await speakMessage(res.data.message, res.data.expression?.tag || 'curious');
    } catch (error) {
      console.error('Failed to get starter:', error);
    }
  };

  // Speak a message using avatar TTS
  const speakMessage = async (text, emotion = 'friendly') => {
    if (!bestie) return;
    
    try {
      setIsAvatarSpeaking(true);
      setEmotionState(emotion);
      
      const res = await axios.post(`${API}/avatar/speak`, {
        text,
        user_id: user.id,
        bestie_id: bestie.id,
        emotion
      });
      
      if (res.data.success) {
        setCurrentAudioUrl(res.data.audio_url);
        setUsageStats(res.data.usage);
        
        // Update emotion from payload
        if (res.data.emotion_payload) {
          setEmotionState(res.data.emotion_payload.emotion);
        }
      }
    } catch (error) {
      console.error('TTS error:', error);
      setIsAvatarSpeaking(false);
      if (error.response?.status === 429) {
        toast.error('Monthly speaking limit reached');
      }
    }
  };

  // Handle avatar audio end
  const handleAudioEnd = useCallback(() => {
    setIsAvatarSpeaking(false);
    setCurrentAudioUrl(null);
  }, []);

  // Send text message
  const sendMessage = async () => {
    if (!input.trim() || loading || !bestie) return;
    
    const userMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: input.trim(),
      timestamp: new Date().toISOString()
    };
    
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setLoading(true);
    
    try {
      const res = await axios.post(
        `${API}/chat/message?user_id=${user.id}`,
        { bestie_id: bestie.id, content: userMessage.content }
      );
      
      const bestieMessage = {
        id: res.data.message_id,
        role: 'bestie',
        content: res.data.message,
        timestamp: new Date().toISOString()
      };
      
      setMessages(prev => [...prev, bestieMessage]);
      
      // Get expression from response (new dynamic expression system)
      const expressionTag = res.data.expression?.tag || 'curious';
      const expConfig = res.data.expression?.config || null;
      
      setEmotionState(expressionTag);
      setExpressionConfig(expConfig);
      
      // Speak the response with the detected expression
      await speakMessage(res.data.message, expressionTag);
      
    } catch (error) {
      toast.error('Failed to send message');
    } finally {
      setLoading(false);
    }
  };

  // Voice recording
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });
      
      audioChunksRef.current = [];
      
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          audioChunksRef.current.push(e.data);
        }
      };
      
      recorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        stream.getTracks().forEach(track => track.stop());
        await processVoiceInput(audioBlob);
      };
      
      recorder.start();
      setMediaRecorder(recorder);
      setRecording(true);
    } catch (error) {
      toast.error('Microphone access denied');
    }
  };

  const stopRecording = () => {
    if (mediaRecorder && recording) {
      mediaRecorder.stop();
      setRecording(false);
    }
  };

  const processVoiceInput = async (audioBlob) => {
    setLoading(true);
    try {
      const formData = new FormData();
      formData.append('audio_file', audioBlob, 'recording.webm');
      
      const sttRes = await axios.post(`${API}/voice/stt`, formData);
      const transcribedText = sttRes.data.text;
      
      if (transcribedText) {
        setInput(transcribedText);
        // Auto-send after transcription
        const userMessage = {
          id: Date.now().toString(),
          role: 'user',
          content: transcribedText,
          timestamp: new Date().toISOString()
        };
        
        setMessages(prev => [...prev, userMessage]);
        
        const res = await axios.post(
          `${API}/chat/message?user_id=${user.id}`,
          { bestie_id: bestie.id, content: transcribedText }
        );
        
        const bestieMessage = {
          id: res.data.message_id,
          role: 'bestie',
          content: res.data.message,
          timestamp: new Date().toISOString()
        };
        
        setMessages(prev => [...prev, bestieMessage]);
        
        // Get expression from response
        const expressionTag = res.data.expression?.tag || 'curious';
        const expConfig = res.data.expression?.config || null;
        
        setEmotionState(expressionTag);
        setExpressionConfig(expConfig);
        
        await speakMessage(res.data.message, expressionTag);
      }
    } catch (error) {
      toast.error('Failed to process voice');
    } finally {
      setLoading(false);
      setInput('');
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  if (!bestie) {
    return (
      <div className="app-container gradient-mesh min-h-screen flex items-center justify-center">
        <div className="animate-pulse text-dark-purple">Loading Tom...</div>
      </div>
    );
  }

  return (
    <div className="app-container gradient-mesh min-h-screen flex flex-col">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-white/80 backdrop-blur-lg border-b border-border p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate('/dashboard')}
              className="p-2 rounded-full hover:bg-muted transition-all"
              data-testid="back-button"
            >
              <ArrowLeft className="w-5 h-5 text-dark-purple" />
            </button>
            <div>
              <h1 className="text-lg font-bold text-dark-purple">Tom</h1>
              {relationshipData && (
                <p className="text-xs text-dark-purple/60">
                  {relationshipData.stage} • {relationshipData.streak_days} day streak
                </p>
              )}
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            {/* View mode toggle */}
            <button
              onClick={() => setViewMode(viewMode === 'avatar' ? 'chat' : 'avatar')}
              className={`p-2 rounded-full transition-all ${
                viewMode === 'chat' ? 'bg-neon-pink text-white' : 'bg-muted text-dark-purple'
              }`}
              data-testid="toggle-view"
            >
              <MessageCircle className="w-5 h-5" />
            </button>
            
            <button
              onClick={() => navigate('/settings')}
              className="p-2 rounded-full hover:bg-muted transition-all"
              data-testid="settings-button"
            >
              <Settings className="w-5 h-5 text-dark-purple" />
            </button>
          </div>
        </div>
        
        {/* Usage indicator */}
        {usageStats && (
          <div className="mt-2 flex items-center gap-2 text-xs text-dark-purple/60">
            <div className="flex-1 h-1 bg-muted rounded-full overflow-hidden">
              <div 
                className="h-full bg-neon-pink transition-all"
                style={{ width: `${(usageStats.used / usageStats.limit) * 100}%` }}
              />
            </div>
            <span>{usageStats.remaining} replies left</span>
          </div>
        )}
      </div>

      {/* Main content */}
      <div className="flex-1 flex flex-col">
        {viewMode === 'avatar' ? (
          /* Avatar View */
          <div className="flex-1 flex flex-col items-center justify-center p-6">
            <TalkingAvatar
              imageUrl={TOM_IMAGE}
              audioUrl={currentAudioUrl}
              isPlaying={isAvatarSpeaking}
              onAudioEnd={handleAudioEnd}
              emotionState={emotionState}
              expressionConfig={expressionConfig}
              className="mb-6"
            />
            
            {/* Last message display */}
            {messages.length > 0 && (
              <div className="max-w-sm text-center px-4">
                <p className="text-dark-purple/80 text-sm mb-1">
                  {messages[messages.length - 1]?.role === 'bestie' ? 'Tom says:' : 'You said:'}
                </p>
                <p className={`text-lg ${
                  messages[messages.length - 1]?.role === 'bestie' 
                    ? 'text-dark-purple font-medium' 
                    : 'text-dark-purple/70'
                }`}>
                  "{messages[messages.length - 1]?.content}"
                </p>
              </div>
            )}
            
            {loading && (
              <div className="mt-4 flex items-center gap-2 text-dark-purple/60">
                <div className="w-2 h-2 bg-neon-pink rounded-full animate-bounce" />
                <div className="w-2 h-2 bg-neon-pink rounded-full animate-bounce" style={{ animationDelay: '0.1s' }} />
                <div className="w-2 h-2 bg-neon-pink rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
                <span className="ml-2 text-sm">Tom is thinking...</span>
              </div>
            )}
          </div>
        ) : (
          /* Chat View */
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[80%] rounded-2xl px-4 py-3 ${
                    msg.role === 'user'
                      ? 'bg-neon-pink text-white rounded-br-md'
                      : 'bg-white border border-border text-dark-purple rounded-bl-md'
                  }`}
                >
                  <p className="text-sm">{msg.content}</p>
                </div>
              </div>
            ))}
            
            {loading && (
              <div className="flex justify-start">
                <div className="bg-white border border-border rounded-2xl rounded-bl-md px-4 py-3">
                  <div className="flex gap-1">
                    <div className="w-2 h-2 bg-neon-pink/50 rounded-full animate-bounce" />
                    <div className="w-2 h-2 bg-neon-pink/50 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }} />
                    <div className="w-2 h-2 bg-neon-pink/50 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
                  </div>
                </div>
              </div>
            )}
            
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Input area */}
      <div className="sticky bottom-0 bg-white/90 backdrop-blur-lg border-t border-border p-4">
        <div className="flex items-center gap-3">
          {/* Voice button */}
          <button
            onClick={recording ? stopRecording : startRecording}
            disabled={loading || isAvatarSpeaking}
            className={`p-3 rounded-full transition-all ${
              recording 
                ? 'bg-red-500 text-white animate-pulse' 
                : 'bg-muted text-dark-purple hover:bg-neon-pink/20'
            } disabled:opacity-50`}
            data-testid="voice-button"
          >
            {recording ? <StopCircle className="w-6 h-6" /> : <Mic className="w-6 h-6" />}
          </button>
          
          {/* Text input */}
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Talk to Tom..."
            disabled={loading || recording || isAvatarSpeaking}
            className="flex-1 px-4 py-3 rounded-full bg-muted border-0 focus:ring-2 focus:ring-neon-pink/50 outline-none disabled:opacity-50"
            data-testid="message-input"
          />
          
          {/* Send button */}
          <button
            onClick={sendMessage}
            disabled={!input.trim() || loading || isAvatarSpeaking}
            className="p-3 rounded-full bg-neon-pink text-white hover:bg-neon-pink/90 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            data-testid="send-button"
          >
            <Send className="w-6 h-6" />
          </button>
        </div>
      </div>
    </div>
  );
}
