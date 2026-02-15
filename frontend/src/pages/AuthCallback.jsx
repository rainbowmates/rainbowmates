import React, { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Sparkles } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

// REMINDER: DO NOT HARDCODE THE URL, OR ADD ANY FALLBACKS OR REDIRECT URLS, THIS BREAKS THE AUTH

export default function AuthCallback({ onLogin }) {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const hasProcessed = useRef(false);

  useEffect(() => {
    // Prevent double processing in StrictMode
    if (hasProcessed.current) return;
    hasProcessed.current = true;

    const processAuth = async () => {
      try {
        // Get session_id from URL hash
        const hash = window.location.hash;
        const params = new URLSearchParams(hash.replace('#', ''));
        const sessionId = params.get('session_id');

        if (!sessionId) {
          console.error('No session_id found');
          navigate('/auth');
          return;
        }

        // Exchange session_id for user data
        const response = await axios.post(`${API}/auth/google/callback`, {
          session_id: sessionId
        });

        if (response.data.user) {
          // Store user in localStorage
          localStorage.setItem('rainbow_mates_user', JSON.stringify(response.data.user));
          
          // Call onLogin callback
          if (onLogin) {
            onLogin(response.data.user);
          }

          // Redirect to dashboard
          navigate('/dashboard', { replace: true });
        } else {
          throw new Error('No user data received');
        }
      } catch (error) {
        console.error('Auth callback error:', error);
        navigate('/auth');
      }
    };

    processAuth();
  }, [navigate, onLogin]);

  return (
    <div className="app-container gradient-mesh flex items-center justify-center min-h-screen">
      <div className="text-center">
        <Sparkles className="w-16 h-16 mx-auto text-neon-pink mb-4 animate-pulse" />
        <h2 className="text-xl font-bold text-dark-purple mb-2">{t('signingYouIn')}</h2>
        <p className="text-dark-purple/70">{t('pleaseWaitLogin')}</p>
        <div className="mt-4 flex justify-center gap-1">
          <span className="w-2 h-2 bg-neon-pink rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></span>
          <span className="w-2 h-2 bg-neon-pink rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></span>
          <span className="w-2 h-2 bg-neon-pink rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></span>
        </div>
      </div>
    </div>
  );
}
