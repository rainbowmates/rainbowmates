import React, { useState, useEffect } from 'react';
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
  const [mediaRecorder, setMediaRecorder] = useState(null);
  const [audioChunks, setAudioChunks] = useState([]);

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
      setAudioChunks(chunks);
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
      toast.success(`You said: ${transcribedText}`);

      // Get bestie response
      const chatResponse = await axios.post(`${API}/chat/message?user_id=${user.id}`, {
        bestie_id: bestie.id,
        content: transcribedText
      });

      const bestieResponse = chatResponse.data.message;

      // Convert bestie response to speech
      const ttsResponse = await axios.post(`${API}/voice/tts?bestie_id=${bestie.id}&text=${encodeURIComponent(bestieResponse)}`);

      if (ttsResponse.data.audio_url) {
        const audio = new Audio(ttsResponse.data.audio_url);
        audio.play();
      }
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Voice processing failed');
    } finally {
      setProcessing(false);
    }
  };

  if (!bestie) return <div className="app-container min-h-screen flex items-center justify-center">Loading...</div>;

  return (
    <div className="app-container gradient-mesh min-h-screen">
      <div className="p-6 space-y-6">
        <div className="flex items-center gap-4">
          <button
            data-testid="back-button"
            onClick={() => navigate('/play')}
            className="p-2 rounded-full bg-white border border-border hover:bg-muted transition-all"
          >
            <ArrowLeft className="w-6 h-6 text-dark-purple" />
          </button>
          <h1 className="text-3xl font-bold text-dark-purple" style={{ fontFamily: 'Nunito, sans-serif' }}>
            Voice Chat
          </h1>
        </div>

        <div className="card-soft p-8 text-center space-y-6">
          <div className="w-32 h-32 mx-auto rounded-full bg-gradient-to-br from-neon-pink to-soft-yellow flex items-center justify-center overflow-hidden">
            {bestie.avatar_url && <img src={bestie.avatar_url} alt={bestie.name} className="w-full h-full object-cover" />}
          </div>

          <div>
            <h2 className="text-2xl font-bold text-dark-purple mb-2">{bestie.name}</h2>
            <p className="text-dark-purple/70">
              {processing ? 'Processing...' : recording ? 'Listening...' : 'Press mic to talk'}
            </p>
          </div>

          <div className="flex justify-center">
            {!recording ? (
              <button
                data-testid="start-recording-button"
                onClick={startRecording}
                disabled={processing}
                className="w-24 h-24 rounded-full bg-neon-pink text-white flex items-center justify-center neon-glow hover:scale-110 transition-all disabled:opacity-50"
              >
                <Mic className="w-12 h-12" />
              </button>
            ) : (
              <button
                data-testid="stop-recording-button"
                onClick={stopRecording}
                className="w-24 h-24 rounded-full bg-red-500 text-white flex items-center justify-center animate-pulse"
              >
                <StopCircle className="w-12 h-12" />
              </button>
            )}
          </div>

          <p className="text-sm text-dark-purple/60">
            Note: Voice features require ElevenLabs API key
          </p>
        </div>
      </div>
    </div>
  );
}