import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { ArrowLeft, Send, Trash2, X, ArrowUp } from 'lucide-react';
import { toast } from 'sonner';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

export default function ChatScreen({ user }) {
  const navigate = useNavigate();
  const [bestie, setBestie] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [showTyping, setShowTyping] = useState(false);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const messagesEndRef = useRef(null);
  const messagesTopRef = useRef(null);
  const typingTimeoutRef = useRef(null);

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
    messagesTopRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const fetchBestieAndMessages = async () => {
    try {
      const bestieRes = await axios.get(`${API}/bestie/${user.id}`);
      setBestie(bestieRes.data);

      const messagesRes = await axios.get(`${API}/chat/history/${user.id}/${bestieRes.data.id}`);
      
      // If no messages, add a greeting from bestie
      if (!messagesRes.data || messagesRes.data.length === 0) {
        const greetingMessage = {
          id: 'greeting',
          role: 'bestie',
          content: `Hey babe! 💕 It's so good to see you! How are you feeling today? I'm all ears and ready to chat about whatever's on your mind!`,
          timestamp: new Date().toISOString()
        };
        setMessages([greetingMessage]);
      } else {
        setMessages(messagesRes.data);
      }
    } catch (error) {
      toast.error('Failed to load chat');
      navigate('/dashboard');
    }
  };

  const sendMessage = async () => {
    if (!input.trim() || loading) return;

    const messageContent = input.trim();
    const userMessage = { id: Date.now().toString(), role: 'user', content: messageContent, timestamp: new Date().toISOString() };
    
    // Clear input first, then update messages
    setInput('');
    setMessages(prev => [...prev, userMessage]);
    setLoading(true);
    
    // Show typing indicator after a small delay (bestie is "reading" the message first)
    typingTimeoutRef.current = setTimeout(() => {
      setShowTyping(true);
    }, 500);

    try {
      const response = await axios.post(`${API}/chat/message?user_id=${user.id}`, {
        bestie_id: bestie.id,
        content: messageContent
      });

      // Clear typing indicator
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
    } catch (error) {
      toast.error('Failed to send message');
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      setShowTyping(false);
    } finally {
      setLoading(false);
    }
  };

  const deleteMessage = async (messageId, index) => {
    // Remove from local state immediately
    setMessages(prev => prev.filter((_, idx) => idx !== index));
    toast.success('Message deleted');
    
    // Optionally sync with backend
    try {
      await axios.delete(`${API}/chat/message/${user.id}/${bestie.id}/${messageId}`);
    } catch (error) {
      // Silent fail - local state is already updated
      console.log('Backend sync failed for delete');
    }
  };

  const clearAllHistory = async () => {
    try {
      await axios.delete(`${API}/chat/history/${user.id}/${bestie.id}?timeframe=all`);
      setMessages([]);
      setShowClearConfirm(false);
      toast.success('All chat history cleared');
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
              Are you sure you want to delete all chat history with {bestie.name}? This action cannot be undone.
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
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-neon-pink to-soft-yellow flex items-center justify-center overflow-hidden">
            {bestie.image_url ? (
              <img src={bestie.image_url} alt={bestie.name} className="w-full h-full object-cover object-top" />
            ) : bestie.avatar_url ? (
              <img src={bestie.avatar_url} alt={bestie.name} className="w-full h-full object-cover object-top" />
            ) : null}
          </div>
          <div>
            <h2 className="font-bold text-dark-purple">{bestie.name}</h2>
            <p className="text-xs text-dark-purple/60">Online</p>
          </div>
        </div>
        <button
          data-testid="clear-history-button"
          onClick={() => setShowClearConfirm(true)}
          className="p-2 rounded-full hover:bg-muted transition-all"
          title="Clear all messages"
        >
          <Trash2 className="w-5 h-5 text-dark-purple" />
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4" data-testid="chat-messages">
        <div ref={messagesTopRef} />
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
            {/* Delete button for user messages (left side) */}
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
                  : 'bg-muted text-dark-purple rounded-bl-sm'
              }`}
            >
              <p className="text-sm">{msg.content}</p>
            </div>

            {/* Delete button for bestie messages (right side) */}
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

      {/* Input */}
      <div className="bg-white border-t border-border p-4">
        <div className="flex gap-2">
          <input
            data-testid="chat-input"
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
            placeholder="Type a message..."
            className="flex-1 px-4 py-3 rounded-full bg-muted border-transparent focus:border-neon-pink focus:ring-2 focus:ring-neon-pink/20 outline-none"
          />
          <button
            data-testid="send-button"
            onClick={sendMessage}
            disabled={!input.trim() || loading}
            className="p-3 rounded-full bg-neon-pink text-white hover:bg-[#D670D7] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Send className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
}