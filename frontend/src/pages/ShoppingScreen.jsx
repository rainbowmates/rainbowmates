import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { ArrowLeft, Send, Mic, MicOff, Sparkles, Trash2, X, ExternalLink } from 'lucide-react';
import { toast } from 'sonner';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

export default function ShoppingScreen({ user }) {
  const navigate = useNavigate();
  const [bestie, setBestie] = useState(null);
  const [userRequest, setUserRequest] = useState('');
  const [maxPrice, setMaxPrice] = useState('');
  const [replyText, setReplyText] = useState('');
  const [conversation, setConversation] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isReplyRecording, setIsReplyRecording] = useState(false);
  const [mediaRecorder, setMediaRecorder] = useState(null);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [iframeUrl, setIframeUrl] = useState(null);
  const conversationEndRef = useRef(null);

  useEffect(() => {
    fetchBestie();
  }, []);

  useEffect(() => {
    conversationEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [conversation]);

  const fetchBestie = async () => {
    try {
      const response = await axios.get(`${API}/bestie/${user.id}`);
      setBestie(response.data);
    } catch (error) {
      toast.error('Failed to load bestie');
      navigate('/dashboard');
    }
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      const chunks = [];

      recorder.ondataavailable = (e) => chunks.push(e.data);
      recorder.onstop = async () => {
        const blob = new Blob(chunks, { type: 'audio/webm' });
        stream.getTracks().forEach(track => track.stop());
        
        const formData = new FormData();
        formData.append('audio_file', blob, 'recording.webm');
        
        try {
          const response = await axios.post(`${API}/voice/stt`, formData);
          if (response.data.text) {
            setUserRequest(response.data.text);
          }
        } catch (error) {
          toast.error('Failed to convert speech');
        }
      };

      recorder.start();
      setMediaRecorder(recorder);
      setIsRecording(true);
    } catch (error) {
      toast.error('Microphone access denied');
    }
  };

  const stopRecording = () => {
    if (mediaRecorder) {
      mediaRecorder.stop();
      setIsRecording(false);
    }
  };

  const startReplyRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      const chunks = [];

      recorder.ondataavailable = (e) => chunks.push(e.data);
      recorder.onstop = async () => {
        const blob = new Blob(chunks, { type: 'audio/webm' });
        stream.getTracks().forEach(track => track.stop());
        
        try {
          const formData = new FormData();
          formData.append('audio_file', blob, 'recording.webm');
          const response = await axios.post(`${API}/voice/stt`, formData);
          if (response.data.text) {
            setReplyText(response.data.text);
          }
        } catch (error) {
          toast.error('Failed to convert speech');
        }
      };

      recorder.start();
      setMediaRecorder(recorder);
      setIsReplyRecording(true);
    } catch (error) {
      toast.error('Microphone access denied');
    }
  };

  const stopReplyRecording = () => {
    if (mediaRecorder) {
      mediaRecorder.stop();
      setIsReplyRecording(false);
    }
  };

  const getRecommendations = async () => {
    if (!bestie) return;
    if (!userRequest.trim()) {
      toast.error('Tell me what you\'re looking for!');
      return;
    }

    const newUserMessage = { role: 'user', text: userRequest };
    setConversation(prev => [...prev, newUserMessage]);
    const currentRequest = userRequest;
    setUserRequest('');
    
    setLoading(true);
    try {
      const response = await axios.post(`${API}/shopping/recommendations?user_id=${user.id}`, {
        bestie_id: bestie.id,
        user_request: currentRequest,
        max_price: maxPrice ? parseFloat(maxPrice) : null
      });

      const bestieMessage = { 
        role: 'bestie', 
        text: response.data.recommendations,
        followup: response.data.followup_question || ''
      };
      setConversation(prev => [...prev, bestieMessage]);
    } catch (error) {
      toast.error('Failed to get recommendations');
    } finally {
      setLoading(false);
    }
  };

  const sendReply = async () => {
    if (!replyText.trim()) return;
    
    const newUserMessage = { role: 'user', text: replyText };
    setConversation(prev => [...prev, newUserMessage]);
    const currentReply = replyText;
    setReplyText('');
    
    setLoading(true);
    try {
      const response = await axios.post(`${API}/shopping/recommendations?user_id=${user.id}`, {
        bestie_id: bestie.id,
        user_request: currentReply,
        max_price: maxPrice ? parseFloat(maxPrice) : null
      });

      const bestieMessage = { 
        role: 'bestie', 
        text: response.data.recommendations,
        followup: response.data.followup_question || ''
      };
      setConversation(prev => [...prev, bestieMessage]);
    } catch (error) {
      toast.error('Failed to get recommendations');
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      getRecommendations();
    }
  };

  const deleteMessage = (index) => {
    setConversation(prev => prev.filter((_, idx) => idx !== index));
    toast.success('Message deleted');
  };

  const clearAllConversation = () => {
    setConversation([]);
    setShowClearConfirm(false);
    toast.success('Shopping conversation cleared');
  };

  const openInIframe = (url) => {
    console.log('Opening iframe:', url);
    setIframeUrl(url);
  };

  const closeIframe = () => {
    setIframeUrl(null);
  };

  // Parse links and make them clickable with iframe option
  const renderMessageWithLinks = (text, msgIdx) => {
    return text.split('\n').map((line, idx) => {
      const linkRegex = /\[([^\]]+)\]\(([^)]+)\)/g;
      const parts = [];
      let lastIndex = 0;
      let match;
      
      while ((match = linkRegex.exec(line)) !== null) {
        if (match.index > lastIndex) {
          parts.push(line.substring(lastIndex, match.index));
        }
        const linkText = match[1];
        const linkUrl = match[2];
        parts.push(
          <span key={`${msgIdx}-${idx}-${match.index}`} className="inline-flex items-center gap-1 flex-wrap">
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                openInIframe(linkUrl);
              }}
              className="text-neon-pink hover:text-[#D670D7] underline font-medium cursor-pointer"
              data-testid={`shopping-link-${msgIdx}-${idx}`}
            >
              {linkText}
            </button>
            <a
              href={linkUrl}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="text-dark-purple/40 hover:text-neon-pink"
              title="Open in new tab"
            >
              <ExternalLink className="w-3 h-3" />
            </a>
          </span>
        );
        lastIndex = match.index + match[0].length;
      }
      
      if (lastIndex < line.length) {
        parts.push(line.substring(lastIndex));
      }
      
      if (parts.length === 0) {
        parts.push(line);
      }
      
      return (
        <p key={idx} className={line.startsWith('👉') ? 'ml-4' : ''}>
          {parts}
        </p>
      );
    });
  };

  if (!bestie) return <div className="app-container min-h-screen flex items-center justify-center">Loading...</div>;

  return (
    <div className="app-container gradient-mesh min-h-screen overflow-y-auto">
      {/* Iframe Modal for Shopping */}
      {iframeUrl && (
        <div className="fixed inset-0 bg-black/80 z-50 flex flex-col">
          <div className="flex items-center justify-between p-3 bg-white border-b">
            <span className="text-sm text-dark-purple truncate flex-1 mr-2">{iframeUrl}</span>
            <div className="flex items-center gap-2">
              <a
                href={iframeUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="p-2 rounded-full hover:bg-muted transition-all"
                title="Open in new tab"
              >
                <ExternalLink className="w-5 h-5 text-dark-purple" />
              </a>
              <button
                onClick={closeIframe}
                className="p-2 rounded-full bg-red-500 text-white hover:bg-red-600 transition-all"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>
          <iframe
            src={iframeUrl}
            className="flex-1 w-full bg-white"
            title="Shopping"
            sandbox="allow-same-origin allow-scripts allow-popups allow-forms"
          />
        </div>
      )}

      {/* Clear Confirmation Modal */}
      {showClearConfirm && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-xl">
            <h3 className="text-lg font-bold text-dark-purple mb-2">Clear Shopping Chat?</h3>
            <p className="text-dark-purple/70 mb-6">
              Are you sure you want to delete all shopping recommendations? This action cannot be undone.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowClearConfirm(false)}
                className="flex-1 px-4 py-2 rounded-full border border-border text-dark-purple hover:bg-muted transition-all"
              >
                Cancel
              </button>
              <button
                onClick={clearAllConversation}
                className="flex-1 px-4 py-2 rounded-full bg-red-500 text-white hover:bg-red-600 transition-all"
              >
                Clear All
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="p-4 space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              data-testid="back-button"
              onClick={() => navigate('/play')}
              className="p-2 rounded-full bg-white border border-border hover:bg-muted transition-all"
            >
              <ArrowLeft className="w-5 h-5 text-dark-purple" />
            </button>
            <h1 className="text-xl font-bold text-dark-purple" style={{ fontFamily: 'Nunito, sans-serif' }}>
              Shopping Time!
            </h1>
          </div>
          {conversation.length > 0 && (
            <button
              onClick={() => setShowClearConfirm(true)}
              className="p-2 rounded-full bg-white border border-border hover:bg-muted transition-all"
            >
              <Trash2 className="w-5 h-5 text-dark-purple" />
            </button>
          )}
        </div>

        {/* Opening Greeting from Bestie */}
        <div className="flex items-start gap-3 p-4 rounded-2xl bg-gradient-to-br from-soft-yellow/30 to-neon-pink/20">
          <div className="w-12 h-12 rounded-full overflow-hidden border-2 border-neon-pink flex-shrink-0">
            <img src={bestie.image_url} alt={bestie.name} className="w-full h-full object-cover object-top" />
          </div>
          <div>
            <p className="font-bold text-dark-purple">{bestie.name}</p>
            <p className="text-dark-purple/80 text-sm mt-1">
              Hey honey! 🛍️ Ready for some retail therapy? How are you feeling today? Tell me what you&apos;re in the mood for and I&apos;ll help you find something fabulous!
            </p>
          </div>
        </div>

        {/* Input Section */}
        <div className="card-soft p-4 space-y-4">
          {/* What are you looking for? */}
          <div>
            <label className="block text-sm font-medium text-dark-purple mb-2">
              What are you looking for?
            </label>
            <div className="relative">
              <textarea
                data-testid="shopping-request"
                value={userRequest}
                onChange={(e) => setUserRequest(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Find me a dress for a cocktail event"
                rows={2}
                className="w-full px-4 py-3 pr-12 rounded-2xl bg-muted border-transparent focus:border-neon-pink focus:ring-2 focus:ring-neon-pink/20 outline-none resize-none placeholder:text-dark-purple/40 text-sm"
              />
              <button
                type="button"
                data-testid="shopping-mic-button"
                onClick={isRecording ? stopRecording : startRecording}
                className={`absolute right-3 top-3 p-2 rounded-full transition-all ${
                  isRecording ? 'bg-red-500 text-white animate-pulse' : 'bg-neon-pink/20 text-neon-pink hover:bg-neon-pink/30'
                }`}
              >
                {isRecording ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Budget */}
          <div>
            <label className="block text-sm font-medium text-dark-purple mb-2">
              Budget (optional)
            </label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-dark-purple/50 text-sm">$</span>
              <input
                data-testid="shopping-price"
                type="number"
                value={maxPrice}
                onChange={(e) => setMaxPrice(e.target.value)}
                placeholder="Max price"
                className="w-full pl-8 pr-4 py-2.5 rounded-2xl bg-muted border-transparent focus:border-neon-pink focus:ring-2 focus:ring-neon-pink/20 outline-none text-sm"
              />
            </div>
          </div>

          {/* Ask Button */}
          <button
            data-testid="get-recommendations-button"
            onClick={getRecommendations}
            disabled={loading || !userRequest.trim()}
            className="w-full neon-button disabled:opacity-50 flex items-center justify-center gap-2 py-3"
          >
            {loading ? (
              <>
                <Sparkles className="w-5 h-5 animate-spin" />
                {bestie.name} is searching...
              </>
            ) : (
              <>
                <Send className="w-5 h-5" />
                Ask {bestie.name}
              </>
            )}
          </button>
        </div>

        {/* Conversation Thread */}
        {conversation.length > 0 && (
          <div className="space-y-3" data-testid="conversation-thread">
            {conversation.map((msg, msgIdx) => (
              <div key={msgIdx}>
                {msg.role === 'user' ? (
                  <div className="flex justify-end group">
                    <button
                      onClick={() => deleteMessage(msgIdx)}
                      className="opacity-0 group-hover:opacity-100 p-1 mr-2 self-center text-dark-purple/40 hover:text-red-500 transition-all"
                    >
                      <X className="w-4 h-4" />
                    </button>
                    <div className="max-w-[85%] p-3 rounded-2xl bg-neon-pink text-white text-sm">
                      <p>{msg.text}</p>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-2 group">
                    <div className="flex">
                      <div className="flex-1 p-4 rounded-2xl bg-white border border-border shadow-sm">
                        <div className="flex items-center gap-2 mb-2">
                          <div className="w-8 h-8 rounded-full overflow-hidden border-2 border-neon-pink">
                            <img src={bestie.image_url} alt={bestie.name} className="w-full h-full object-cover object-top" />
                          </div>
                          <span className="font-bold text-dark-purple text-sm">{bestie.name}</span>
                        </div>
                        <div className="text-dark-purple text-sm leading-relaxed space-y-1">
                          {renderMessageWithLinks(msg.text, msgIdx)}
                        </div>
                      </div>
                      <button
                        onClick={() => deleteMessage(msgIdx)}
                        className="opacity-0 group-hover:opacity-100 p-1 ml-2 self-start text-dark-purple/40 hover:text-red-500 transition-all"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                    
                    {msg.followup && (
                      <div className="p-3 rounded-2xl bg-soft-yellow/30 border border-neon-pink/20 ml-4">
                        <div className="flex items-start gap-2">
                          <div className="w-6 h-6 rounded-full overflow-hidden border border-neon-pink flex-shrink-0">
                            <img src={bestie.image_url} alt={bestie.name} className="w-full h-full object-cover object-top" />
                          </div>
                          <p className="text-dark-purple text-sm">{msg.followup}</p>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}

            {loading && (
              <div className="flex items-center gap-2 p-3">
                <div className="w-6 h-6 rounded-full overflow-hidden border border-neon-pink">
                  <img src={bestie.image_url} alt={bestie.name} className="w-full h-full object-cover object-top" />
                </div>
                <div className="flex items-center gap-2 text-dark-purple/70 text-sm">
                  <Sparkles className="w-4 h-4 animate-spin text-neon-pink" />
                  <span>{bestie.name} is searching...</span>
                </div>
              </div>
            )}

            {!loading && conversation.length > 0 && (
              <div className="pt-2">
                <div className="relative">
                  <input
                    data-testid="reply-input"
                    type="text"
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && sendReply()}
                    placeholder="Type your reply..."
                    className="w-full px-4 py-3 pr-20 rounded-2xl bg-white border border-border focus:border-neon-pink focus:ring-2 focus:ring-neon-pink/20 outline-none text-sm"
                  />
                  <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
                    <button
                      type="button"
                      data-testid="reply-mic-button"
                      onClick={isReplyRecording ? stopReplyRecording : startReplyRecording}
                      className={`p-2 rounded-full transition-all ${
                        isReplyRecording ? 'bg-red-500 text-white animate-pulse' : 'bg-neon-pink/20 text-neon-pink hover:bg-neon-pink/30'
                      }`}
                    >
                      {isReplyRecording ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
                    </button>
                    <button
                      type="button"
                      onClick={sendReply}
                      disabled={!replyText.trim() || loading}
                      className="p-2 rounded-full bg-neon-pink text-white hover:bg-[#D670D7] disabled:opacity-50 transition-all"
                    >
                      <Send className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        <div ref={conversationEndRef} />
      </div>
    </div>
  );
}
