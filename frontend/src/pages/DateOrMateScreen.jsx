import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Send, Heart, Users, Loader2, ChevronDown, Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import axios from 'axios';
import { useLanguage } from '../context/LanguageContext';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

export default function DateOrMateScreen({ user, bestie: propBestie }) {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const [bestie, setBestie] = useState(propBestie || null);
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [sending, setSending] = useState(false);
  const [sessionId, setSessionId] = useState(null);
  const [previousPeople, setPreviousPeople] = useState([]);
  const [showPeopleList, setShowPeopleList] = useState(false);
  const [currentPerson, setCurrentPerson] = useState(null);
  const [isInitializing, setIsInitializing] = useState(true);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  // Fetch bestie if not passed as prop
  useEffect(() => {
    const fetchBestie = async () => {
      if (!bestie && user?.id) {
        try {
          const response = await axios.get(`${API}/bestie/${user.id}`);
          if (response.data) {
            setBestie(response.data);
          }
        } catch (error) {
          const savedBestie = localStorage.getItem('rainbow_mates_bestie');
          if (savedBestie) {
            setBestie(JSON.parse(savedBestie));
          }
        }
      }
    };
    fetchBestie();
  }, [user, bestie]);

  // Initialize conversation
  useEffect(() => {
    if (user?.id && bestie) {
      initializeConversation();
    }
  }, [user?.id, bestie]);

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const initializeConversation = async () => {
    setIsInitializing(true);
    try {
      // Fetch previous people discussed
      const peopleResponse = await axios.get(`${API}/date-or-mate/people/${user.id}`);
      setPreviousPeople(peopleResponse.data.people || []);

      // Start new session
      const sessionResponse = await axios.post(`${API}/date-or-mate/start`, {
        user_id: user.id,
        bestie_name: bestie.name,
        bestie_personality: bestie.personality || []
      });

      setSessionId(sessionResponse.data.session_id);
      
      // Add initial greeting from bestie
      const greeting = sessionResponse.data.greeting || getInitialGreeting();
      setMessages([{
        id: Date.now(),
        sender: 'bestie',
        text: greeting,
        timestamp: new Date()
      }]);
    } catch (error) {
      console.error('Init error:', error);
      // Fallback greeting
      setMessages([{
        id: Date.now(),
        sender: 'bestie',
        text: getInitialGreeting(),
        timestamp: new Date()
      }]);
    } finally {
      setIsInitializing(false);
    }
  };

  const getInitialGreeting = () => {
    const greetings = [
      `Hey girl! 💕 So tell me, who are we talking about today? Is it someone new or someone we've discussed before? I'm ALL ears! 👀`,
      `Ooh, spill the tea! ☕ Who's caught your attention? New crush or an update on someone? Let's figure this out together! 💖`,
      `Hey babe! 💋 Ready to play Date or Mate? Tell me about this person - is it someone new or are we revisiting an old flame? 🔥`
    ];
    return greetings[Math.floor(Math.random() * greetings.length)];
  };

  const sendMessage = async () => {
    if (!inputText.trim() || sending) return;

    const userMessage = {
      id: Date.now(),
      sender: 'user',
      text: inputText.trim(),
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputText('');
    setSending(true);

    try {
      const response = await axios.post(`${API}/date-or-mate/chat`, {
        user_id: user.id,
        session_id: sessionId,
        message: userMessage.text,
        bestie_name: bestie.name,
        bestie_personality: bestie.personality || [],
        current_person: currentPerson,
        previous_people: previousPeople.map(p => p.name)
      });

      const bestieMessage = {
        id: Date.now() + 1,
        sender: 'bestie',
        text: response.data.response,
        timestamp: new Date()
      };

      setMessages(prev => [...prev, bestieMessage]);

      // Update current person if detected
      if (response.data.detected_person) {
        setCurrentPerson(response.data.detected_person);
        // Refresh people list
        const peopleResponse = await axios.get(`${API}/date-or-mate/people/${user.id}`);
        setPreviousPeople(peopleResponse.data.people || []);
      }

      // Check if verdict was given
      if (response.data.verdict) {
        toast.success(`Verdict: ${response.data.verdict}! 💖`);
      }
    } catch (error) {
      console.error('Chat error:', error);
      const errorMessage = {
        id: Date.now() + 1,
        sender: 'bestie',
        text: "Oops, I got distracted! 😅 Say that again, hun?",
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setSending(false);
      inputRef.current?.focus();
    }
  };

  const selectPreviousPerson = async (person) => {
    setCurrentPerson(person.name);
    setShowPeopleList(false);
    
    // Add a message about continuing with this person
    const userMessage = {
      id: Date.now(),
      sender: 'user',
      text: `Let's talk more about ${person.name}`,
      timestamp: new Date()
    };
    setMessages(prev => [...prev, userMessage]);
    setSending(true);

    try {
      const response = await axios.post(`${API}/date-or-mate/chat`, {
        user_id: user.id,
        session_id: sessionId,
        message: `I want to continue discussing ${person.name}. Here's what we talked about before: ${person.summary || 'We discussed them previously.'}`,
        bestie_name: bestie.name,
        bestie_personality: bestie.personality || [],
        current_person: person.name,
        previous_people: previousPeople.map(p => p.name),
        is_continuation: true
      });

      const bestieMessage = {
        id: Date.now() + 1,
        sender: 'bestie',
        text: response.data.response,
        timestamp: new Date()
      };
      setMessages(prev => [...prev, bestieMessage]);
    } catch (error) {
      console.error('Chat error:', error);
    } finally {
      setSending(false);
    }
  };

  const startNewDiscussion = () => {
    setCurrentPerson(null);
    setShowPeopleList(false);
    
    const bestieMessage = {
      id: Date.now(),
      sender: 'bestie',
      text: "Fresh start! 🌟 Tell me about this new person. What's their name and how did you meet?",
      timestamp: new Date()
    };
    setMessages(prev => [...prev, bestieMessage]);
  };

  const deletePerson = async (personId, e) => {
    e.stopPropagation();
    try {
      await axios.delete(`${API}/date-or-mate/people/${user.id}/${personId}`);
      setPreviousPeople(prev => prev.filter(p => p.id !== personId));
      toast.success('Removed from history');
    } catch (error) {
      toast.error('Failed to remove');
    }
  };

  return (
    <div className="app-container gradient-mesh min-h-screen flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-neon-pink/20 bg-white/80 backdrop-blur-sm">
        <div className="flex items-center gap-3">
          <button
            data-testid="back-button"
            onClick={() => navigate('/play')}
            className="p-2 rounded-full bg-white border border-border hover:bg-muted transition-all flex-shrink-0"
          >
            <ArrowLeft className="w-5 h-5 text-dark-purple" />
          </button>
          <div className="flex-1">
            <h1 className="text-xl font-bold text-dark-purple" style={{ fontFamily: 'Nunito, sans-serif' }}>
              Date or Just Mates?
            </h1>
            <p className="text-xs text-dark-purple/70">
              {currentPerson ? `Discussing: ${currentPerson}` : 'Let\'s figure it out together!'}
            </p>
          </div>
          
          {/* People dropdown */}
          <div className="relative">
            <button
              data-testid="people-dropdown"
              onClick={() => setShowPeopleList(!showPeopleList)}
              className="p-2 rounded-full bg-gradient-to-br from-neon-pink to-soft-blue text-white hover:opacity-90 transition-all"
            >
              <Users className="w-5 h-5" />
            </button>
            
            {showPeopleList && (
              <div className="absolute right-0 top-12 w-64 bg-white rounded-2xl shadow-xl border border-border z-50 overflow-hidden">
                <div className="p-3 border-b border-border">
                  <p className="text-sm font-bold text-dark-purple">Previous Discussions</p>
                </div>
                
                <button
                  data-testid="new-person-btn"
                  onClick={startNewDiscussion}
                  className="w-full p-3 flex items-center gap-3 hover:bg-neon-pink/10 transition-all border-b border-border"
                >
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-neon-pink to-soft-blue flex items-center justify-center">
                    <Plus className="w-4 h-4 text-white" />
                  </div>
                  <span className="text-sm font-medium text-dark-purple">New Person</span>
                </button>
                
                <div className="max-h-60 overflow-y-auto">
                  {previousPeople.length === 0 ? (
                    <p className="p-4 text-sm text-dark-purple/50 text-center">No previous discussions yet</p>
                  ) : (
                    previousPeople.map((person) => (
                      <button
                        key={person.id}
                        data-testid={`person-${person.id}`}
                        onClick={() => selectPreviousPerson(person)}
                        className="w-full p-3 flex items-center gap-3 hover:bg-neon-pink/10 transition-all group"
                      >
                        <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center">
                          <Heart className={`w-4 h-4 ${person.verdict === 'Date' ? 'text-neon-pink' : 'text-soft-blue'}`} />
                        </div>
                        <div className="flex-1 text-left">
                          <p className="text-sm font-medium text-dark-purple">{person.name}</p>
                          {person.verdict && (
                            <p className={`text-xs ${person.verdict === 'Date' ? 'text-neon-pink' : 'text-soft-blue'}`}>
                              {person.verdict}
                            </p>
                          )}
                        </div>
                        <button
                          onClick={(e) => deletePerson(person.id, e)}
                          className="p-1 rounded-full opacity-0 group-hover:opacity-100 hover:bg-red-100 transition-all"
                        >
                          <Trash2 className="w-4 h-4 text-red-400" />
                        </button>
                      </button>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {isInitializing ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-8 h-8 text-neon-pink animate-spin" />
          </div>
        ) : (
          messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              {msg.sender === 'bestie' && bestie && (
                <div className="w-8 h-8 rounded-full overflow-hidden border-2 border-neon-pink flex-shrink-0 mr-2">
                  <img src={bestie.image_url} alt={bestie.name} className="w-full h-full object-cover object-top" />
                </div>
              )}
              <div
                className={`max-w-[75%] p-3 rounded-2xl ${
                  msg.sender === 'user'
                    ? 'bg-gradient-to-br from-neon-pink to-soft-blue text-white rounded-br-md'
                    : 'bg-white border border-border text-dark-purple rounded-bl-md'
                }`}
              >
                <p className="text-sm whitespace-pre-wrap">{msg.text}</p>
              </div>
            </div>
          ))
        )}
        
        {sending && (
          <div className="flex justify-start">
            {bestie && (
              <div className="w-8 h-8 rounded-full overflow-hidden border-2 border-neon-pink flex-shrink-0 mr-2">
                <img src={bestie.image_url} alt={bestie.name} className="w-full h-full object-cover object-top" />
              </div>
            )}
            <div className="bg-white border border-border rounded-2xl rounded-bl-md p-3">
              <div className="flex gap-1">
                <div className="w-2 h-2 bg-neon-pink rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                <div className="w-2 h-2 bg-neon-pink rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                <div className="w-2 h-2 bg-neon-pink rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            </div>
          </div>
        )}
        
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="p-4 border-t border-neon-pink/20 bg-white/80 backdrop-blur-sm">
        <div className="flex gap-2">
          <input
            ref={inputRef}
            data-testid="message-input"
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
            placeholder="Tell me about them..."
            className="flex-1 px-4 py-3 rounded-2xl bg-muted border-transparent focus:border-neon-pink focus:ring-2 focus:ring-neon-pink/20 outline-none text-sm"
            disabled={sending}
          />
          <button
            data-testid="send-button"
            onClick={sendMessage}
            disabled={!inputText.trim() || sending}
            className="p-3 rounded-2xl bg-gradient-to-br from-neon-pink to-soft-blue text-white disabled:opacity-50 transition-all hover:opacity-90"
          >
            <Send className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
}
