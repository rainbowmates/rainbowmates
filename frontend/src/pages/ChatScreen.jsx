import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { ArrowLeft, Send, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

export default function ChatScreen({ user }) {
  const navigate = useNavigate();
  const [bestie, setBestie] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    fetchBestieAndMessages();
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const fetchBestieAndMessages = async () => {
    try {
      const bestieRes = await axios.get(`${API}/bestie/${user.id}`);
      setBestie(bestieRes.data);

      const messagesRes = await axios.get(`${API}/chat/history/${user.id}/${bestieRes.data.id}`);
      setMessages(messagesRes.data);
    } catch (error) {
      toast.error('Failed to load chat');
      navigate('/dashboard');
    }
  };

  const sendMessage = async () => {
    if (!input.trim() || loading) return;

    const messageContent = input.trim();
    const userMessage = { role: 'user', content: messageContent, timestamp: new Date().toISOString() };
    
    // Clear input first, then update messages
    setInput('');
    setMessages(prev => [...prev, userMessage]);
    
    // Only show typing indicator AFTER user message is sent
    setLoading(true);

    try {
      const response = await axios.post(`${API}/chat/message?user_id=${user.id}`, {
        bestie_id: bestie.id,
        content: messageContent
      });

      const bestieMessage = {
        role: 'bestie',
        content: response.data.message,
        timestamp: new Date().toISOString()
      };
      setMessages(prev => [...prev, bestieMessage]);
    } catch (error) {
      toast.error('Failed to send message');
    } finally {
      setLoading(false);
    }
  };

  const deleteHistory = async () => {
    if (!window.confirm('Delete all chat history?')) return;

    try {
      await axios.delete(`${API}/chat/history/${user.id}/${bestie.id}?timeframe=all`);
      setMessages([]);
      toast.success('Chat history deleted');
    } catch (error) {
      toast.error('Failed to delete history');
    }
  };

  if (!bestie) return <div className="app-container min-h-screen flex items-center justify-center">Loading...</div>;

  return (
    <div className="app-container min-h-screen flex flex-col">
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
            {bestie.avatar_url && <img src={bestie.avatar_url} alt={bestie.name} className="w-full h-full object-cover" />}
          </div>
          <div>
            <h2 className="font-bold text-dark-purple">{bestie.name}</h2>
            <p className="text-xs text-dark-purple/60">Online</p>
          </div>
        </div>
        <button
          data-testid="delete-history-button"
          onClick={deleteHistory}
          className="p-2 rounded-full hover:bg-muted transition-all"
        >
          <Trash2 className="w-5 h-5 text-dark-purple" />
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4" data-testid="chat-messages">
        {messages.length === 0 && (
          <div className="text-center text-dark-purple/50 mt-8">
            <p>Start chatting with {bestie.name}!</p>
          </div>
        )}
        {messages.map((msg, idx) => (
          <div
            key={idx}
            data-testid={`message-${msg.role}`}
            className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[80%] rounded-2xl px-4 py-3 ${
                msg.role === 'user'
                  ? 'bg-neon-pink text-white rounded-br-sm'
                  : 'bg-muted text-dark-purple rounded-bl-sm'
              }`}
            >
              <p className="text-sm">{msg.content}</p>
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex justify-start">
            <div className="bg-muted text-dark-purple rounded-2xl rounded-bl-sm px-4 py-3">
              <p className="text-sm">Typing...</p>
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