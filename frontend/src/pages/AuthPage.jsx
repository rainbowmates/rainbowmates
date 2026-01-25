import React, { useState } from 'react';
import axios from 'axios';
import { Sparkles, Mail, Phone, Lock, User } from 'lucide-react';
import { toast } from 'sonner';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

export default function AuthPage({ onLogin }) {
  const [mode, setMode] = useState('login');
  const [step, setStep] = useState('auth');
  const [formData, setFormData] = useState({
    first_name: '',
    surname: '',
    dob: '',
    mobile: '',
    email: '',
    password: '',
    identifier: '',
    otp: ''
  });

  const handleRegister = async (e) => {
    e.preventDefault();
    try {
      const response = await axios.post(`${API}/auth/register`, {
        first_name: formData.first_name,
        surname: formData.surname,
        dob: formData.dob,
        mobile: formData.mobile,
        email: formData.email,
        password: formData.password
      });
      
      toast.success('Registration successful! Please verify OTP (use 123456)');
      setFormData({ ...formData, identifier: formData.email });
      setStep('otp');
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Registration failed');
    }
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    try {
      const response = await axios.post(`${API}/auth/login`, {
        identifier: formData.identifier,
        password: formData.password
      });
      
      toast.success('Login successful!');
      onLogin(response.data.user);
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Login failed');
    }
  };

  const handleVerifyOTP = async (e) => {
    e.preventDefault();
    try {
      const response = await axios.post(`${API}/auth/verify-otp`, {
        identifier: formData.identifier,
        otp: formData.otp
      });
      
      toast.success('OTP verified! Please login.');
      setMode('login');
      setStep('auth');
    } catch (error) {
      toast.error(error.response?.data?.detail || 'OTP verification failed');
    }
  };

  return (
    <div className="app-container gradient-mesh flex items-center justify-center p-6">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Sparkles className="w-16 h-16 mx-auto text-neon-pink mb-4" />
          <h1 className="text-4xl font-bold text-dark-purple mb-2" style={{ fontFamily: 'Nunito, sans-serif' }}>
            Rainbow Mates
          </h1>
          <p className="text-dark-purple/70">Your fabulous virtual bestie awaits!</p>
        </div>

        <div className="card-soft p-8">
          {step === 'auth' && (
            <>
              <div className="flex gap-2 mb-6">
                <button
                  data-testid="login-tab"
                  onClick={() => setMode('login')}
                  className={`flex-1 py-2 px-4 rounded-full font-semibold transition-all ${
                    mode === 'login'
                      ? 'bg-neon-pink text-white neon-glow'
                      : 'bg-muted text-dark-purple'
                  }`}
                >
                  Login
                </button>
                <button
                  data-testid="register-tab"
                  onClick={() => setMode('register')}
                  className={`flex-1 py-2 px-4 rounded-full font-semibold transition-all ${
                    mode === 'register'
                      ? 'bg-neon-pink text-white neon-glow'
                      : 'bg-muted text-dark-purple'
                  }`}
                >
                  Register
                </button>
              </div>

              {mode === 'login' ? (
                <form onSubmit={handleLogin} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-dark-purple mb-2">
                      Email or Mobile
                    </label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-3 w-5 h-5 text-dark-purple/40" />
                      <input
                        data-testid="login-identifier"
                        type="text"
                        value={formData.identifier}
                        onChange={(e) => setFormData({ ...formData, identifier: e.target.value })}
                        className="w-full pl-10 pr-4 py-3 rounded-2xl bg-muted border-transparent focus:border-neon-pink focus:ring-2 focus:ring-neon-pink/20 outline-none"
                        required
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-dark-purple mb-2">
                      Password
                    </label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-3 w-5 h-5 text-dark-purple/40" />
                      <input
                        data-testid="login-password"
                        type="password"
                        value={formData.password}
                        onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                        className="w-full pl-10 pr-4 py-3 rounded-2xl bg-muted border-transparent focus:border-neon-pink focus:ring-2 focus:ring-neon-pink/20 outline-none"
                        required
                      />
                    </div>
                  </div>
                  <button
                    data-testid="login-button"
                    type="submit"
                    className="w-full neon-button"
                  >
                    Login
                  </button>
                </form>
              ) : (
                <form onSubmit={handleRegister} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-dark-purple mb-2">
                        First Name
                      </label>
                      <input
                        data-testid="register-firstname"
                        type="text"
                        value={formData.first_name}
                        onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                        className="w-full px-4 py-3 rounded-2xl bg-muted border-transparent focus:border-neon-pink focus:ring-2 focus:ring-neon-pink/20 outline-none"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-dark-purple mb-2">
                        Surname
                      </label>
                      <input
                        data-testid="register-surname"
                        type="text"
                        value={formData.surname}
                        onChange={(e) => setFormData({ ...formData, surname: e.target.value })}
                        className="w-full px-4 py-3 rounded-2xl bg-muted border-transparent focus:border-neon-pink focus:ring-2 focus:ring-neon-pink/20 outline-none"
                        required
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-dark-purple mb-2">
                      Date of Birth
                    </label>
                    <input
                      data-testid="register-dob"
                      type="date"
                      value={formData.dob}
                      onChange={(e) => setFormData({ ...formData, dob: e.target.value })}
                      className="w-full px-4 py-3 rounded-2xl bg-muted border-transparent focus:border-neon-pink focus:ring-2 focus:ring-neon-pink/20 outline-none"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-dark-purple mb-2">
                      Mobile
                    </label>
                    <div className="relative">
                      <Phone className="absolute left-3 top-3 w-5 h-5 text-dark-purple/40" />
                      <input
                        data-testid="register-mobile"
                        type="tel"
                        value={formData.mobile}
                        onChange={(e) => setFormData({ ...formData, mobile: e.target.value })}
                        className="w-full pl-10 pr-4 py-3 rounded-2xl bg-muted border-transparent focus:border-neon-pink focus:ring-2 focus:ring-neon-pink/20 outline-none"
                        required
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-dark-purple mb-2">
                      Email
                    </label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-3 w-5 h-5 text-dark-purple/40" />
                      <input
                        data-testid="register-email"
                        type="email"
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        className="w-full pl-10 pr-4 py-3 rounded-2xl bg-muted border-transparent focus:border-neon-pink focus:ring-2 focus:ring-neon-pink/20 outline-none"
                        required
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-dark-purple mb-2">
                      Password
                    </label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-3 w-5 h-5 text-dark-purple/40" />
                      <input
                        data-testid="register-password"
                        type="password"
                        value={formData.password}
                        onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                        className="w-full pl-10 pr-4 py-3 rounded-2xl bg-muted border-transparent focus:border-neon-pink focus:ring-2 focus:ring-neon-pink/20 outline-none"
                        required
                      />
                    </div>
                  </div>
                  <button
                    data-testid="register-button"
                    type="submit"
                    className="w-full neon-button"
                  >
                    Register
                  </button>
                </form>
              )}
            </>
          )}

          {step === 'otp' && (
            <form onSubmit={handleVerifyOTP} className="space-y-4">
              <div className="text-center mb-4">
                <h3 className="text-xl font-bold text-dark-purple mb-2">Verify OTP</h3>
                <p className="text-sm text-dark-purple/70">Enter 123456 to verify</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-dark-purple mb-2">
                  OTP Code
                </label>
                <input
                  data-testid="otp-input"
                  type="text"
                  value={formData.otp}
                  onChange={(e) => setFormData({ ...formData, otp: e.target.value })}
                  className="w-full px-4 py-3 rounded-2xl bg-muted border-transparent focus:border-neon-pink focus:ring-2 focus:ring-neon-pink/20 outline-none text-center text-2xl tracking-widest"
                  maxLength="6"
                  required
                />
              </div>
              <button
                data-testid="verify-otp-button"
                type="submit"
                className="w-full neon-button"
              >
                Verify OTP
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}