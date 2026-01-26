import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { ArrowLeft, Mic, Volume2, StopCircle } from 'lucide-react';
import { toast } from 'sonner';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

export default function VoiceScreen({ user }) {
  const navigate = useNavigate();
  const [bestie, setBestie] = useState(null);
  const [recording, setRecording] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const [mediaRecorder, setMediaRecorder] = useState(null);
  const [lastMessage, setLastMessage] = useState('');
  const audioRef = useRef(null);

  useEffect(() => {
    fetchBestie();
  }, []);

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
      toast.success(`You: "${transcribedText}"`);

      // Get bestie response
      const chatResponse = await axios.post(`${API}/chat/message?user_id=${user.id}`, {
        bestie_id: bestie.id,
        content: transcribedText
      });

      const bestieResponse = chatResponse.data.message;
      setLastMessage(bestieResponse);

      // Convert bestie response to speech
      setSpeaking(true);
      const ttsResponse = await axios.post(`${API}/voice/tts?bestie_id=${bestie.id}&text=${encodeURIComponent(bestieResponse)}`);

      if (ttsResponse.data.audio_url) {
        const audio = new Audio(ttsResponse.data.audio_url);
        audioRef.current = audio;
        audio.onended = () => setSpeaking(false);
        audio.onerror = () => setSpeaking(false);
        audio.play();
      } else {
        setSpeaking(false);
      }
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Voice processing failed');
      setSpeaking(false);
    } finally {
      setProcessing(false);
    }
  };

  const getStatusText = () => {
    if (speaking) return `${bestie.name} is speaking...`;
    if (processing) return 'Processing...';
    if (recording) return 'Listening...';
    return 'Tap the mic to talk';
  };

  if (!bestie) return <div className="app-container min-h-screen flex items-center justify-center">Loading...</div>;

  return (
    <div className="app-container gradient-mesh min-h-screen overflow-y-auto">
      <div className="p-4 pb-8 space-y-4">
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

        <div className="card-soft p-6 text-center space-y-4">
          <div className={`w-28 h-28 mx-auto rounded-full bg-gradient-to-br from-neon-pink to-soft-yellow flex items-center justify-center overflow-hidden ${speaking ? 'animate-pulse ring-4 ring-neon-pink/50' : ''}`}>
            {bestie.avatar_url && <img src={bestie.avatar_url} alt={bestie.name} className="w-full h-full object-cover" />}
          </div>

          <div>
            <h2 className="text-xl font-bold text-dark-purple mb-1">{bestie.name}</h2>
            <p className={`text-sm ${speaking ? 'text-neon-pink font-medium' : 'text-dark-purple/70'}`}>
              {getStatusText()}
            </p>
          </div>

          {/* Last message bubble */}
          {lastMessage && (
            <div className="bg-muted rounded-2xl p-4 text-left">
              <p className="text-sm text-dark-purple">{lastMessage}</p>
            </div>
          )}

          <div className="flex justify-center pt-4">
            {!recording ? (
              <button
                data-testid="start-recording-button"
                onClick={startRecording}
                disabled={processing || speaking}
                className="w-20 h-20 rounded-full bg-neon-pink text-white flex items-center justify-center shadow-lg hover:scale-110 transition-all disabled:opacity-50 disabled:hover:scale-100"
              >
                <Mic className="w-10 h-10" />
              </button>
            ) : (
              <button
                data-testid="stop-recording-button"
                onClick={stopRecording}
                className="w-20 h-20 rounded-full bg-red-500 text-white flex items-center justify-center animate-pulse"
              >
                <StopCircle className="w-10 h-10" />
              </button>
            )}
          </div>

          {speaking && (
            <div className="flex justify-center items-center gap-1 pt-2">
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
      </div>
    </div>
  );
}