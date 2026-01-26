import React, { useState } from 'react';
import axios from 'axios';
import { Sparkles, Mail, Phone, Lock } from 'lucide-react';
import { toast } from 'sonner';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

export default function AuthPage({ onLogin }) {
  const [mode, setMode] = useState('login');
  const [step, setStep] = useState('auth');
  const [errors, setErrors] = useState({});
  
  // Separate state for each form to avoid mixing
  const [loginData, setLoginData] = useState({
    identifier: '',
    password: ''
  });
  
  const [registerData, setRegisterData] = useState({
    first_name: '',
    surname: '',
    dob: '',
    mobile: '',
    email: '',
    password: ''
  });
  
  const [otpData, setOtpData] = useState({
    identifier: '',
    otp: ''
  });

  // Validation functions
  const validateEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const validateMobile = (mobile) => {
    const mobileRegex = /^[0-9]{10}$/;
    return mobileRegex.test(mobile.replace(/[\s\-\(\)]/g, ''));
  };

  const validatePassword = (password) => {
    return password.length >= 6;
  };

  const validateAge = (dob) => {
    const birthDate = new Date(dob);
    const today = new Date();
    const age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      return age - 1 >= 18;
    }
    return age >= 18;
  };

  const validateOTP = (otp) => {
    return /^[0-9]{6}$/.test(otp);
  };

  const validateRegisterForm = () => {
    const newErrors = {};

    if (!registerData.first_name.trim()) {
      newErrors.first_name = 'First name is required';
    }

    if (!registerData.surname.trim()) {
      newErrors.surname = 'Surname is required';
    }

    if (!registerData.dob) {
      newErrors.dob = 'Date of birth is required';
    } else if (!validateAge(registerData.dob)) {
      newErrors.dob = 'You must be 18 or older';
    }

    if (!registerData.mobile) {
      newErrors.mobile = 'Mobile number is required';
    } else if (!validateMobile(registerData.mobile)) {
      newErrors.mobile = 'Enter valid 10-digit mobile number';
    }

    if (!registerData.email) {
      newErrors.email = 'Email is required';
    } else if (!validateEmail(registerData.email)) {
      newErrors.email = 'Enter a valid email address';
    }

    if (!registerData.password) {
      newErrors.password = 'Password is required';
    } else if (!validatePassword(registerData.password)) {
      newErrors.password = 'Password must be at least 6 characters';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const validateLoginForm = () => {
    const newErrors = {};

    if (!loginData.identifier.trim()) {
      newErrors.identifier = 'Email or mobile is required';
    }

    if (!loginData.password) {
      newErrors.password = 'Password is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const validateOTPForm = () => {
    const newErrors = {};

    if (!otpData.otp) {
      newErrors.otp = 'OTP is required';
    } else if (!validateOTP(otpData.otp)) {
      newErrors.otp = 'OTP must be 6 digits';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    
    if (!validateRegisterForm()) {
      toast.error('Please fix the errors in the form');
      return;
    }

    try {
      const response = await axios.post(`${API}/auth/register`, registerData);
      
      toast.success('Registration successful! Please verify OTP (use 123456)');
      setOtpData({ ...otpData, identifier: registerData.email });
      setStep('otp');
      setErrors({});
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Registration failed');
    }
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    
    if (!validateLoginForm()) {
      toast.error('Please fill in all required fields');
      return;
    }

    try {
      const response = await axios.post(`${API}/auth/login`, loginData);
      
      toast.success('Login successful!');
      onLogin(response.data.user);
      setErrors({});
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Login failed');
    }
  };

  const handleVerifyOTP = async (e) => {
    e.preventDefault();
    
    if (!validateOTPForm()) {
      toast.error('Please enter a valid OTP');
      return;
    }

    try {
      await axios.post(`${API}/auth/verify-otp`, otpData);
      
      toast.success('OTP verified! Please login.');
      setMode('login');
      setStep('auth');
      // Pre-fill login identifier
      setLoginData({ ...loginData, identifier: otpData.identifier });
      setErrors({});
    } catch (error) {
      toast.error(error.response?.data?.detail || 'OTP verification failed');
    }
  };

  const handleModeSwitch = (newMode) => {
    setMode(newMode);
    setErrors({});
    // Reset step when switching modes
    if (step === 'otp') {
      setStep('auth');
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
                  onClick={() => handleModeSwitch('login')}
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
                  onClick={() => handleModeSwitch('register')}
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
                        value={loginData.identifier}
                        onChange={(e) => setLoginData({ ...loginData, identifier: e.target.value })}
                        className="w-full pl-10 pr-4 py-3 rounded-2xl bg-muted border-transparent focus:border-neon-pink focus:ring-2 focus:ring-neon-pink/20 outline-none"
                        required
                        autoComplete="username"
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
                        value={loginData.password}
                        onChange={(e) => setLoginData({ ...loginData, password: e.target.value })}
                        className="w-full pl-10 pr-4 py-3 rounded-2xl bg-muted border-transparent focus:border-neon-pink focus:ring-2 focus:ring-neon-pink/20 outline-none"
                        required
                        autoComplete="current-password"
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
                        value={registerData.first_name}
                        onChange={(e) => setRegisterData({ ...registerData, first_name: e.target.value })}
                        className="w-full px-4 py-3 rounded-2xl bg-muted border-transparent focus:border-neon-pink focus:ring-2 focus:ring-neon-pink/20 outline-none"
                        required
                        autoComplete="given-name"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-dark-purple mb-2">
                        Surname
                      </label>
                      <input
                        data-testid="register-surname"
                        type="text"
                        value={registerData.surname}
                        onChange={(e) => setRegisterData({ ...registerData, surname: e.target.value })}
                        className="w-full px-4 py-3 rounded-2xl bg-muted border-transparent focus:border-neon-pink focus:ring-2 focus:ring-neon-pink/20 outline-none"
                        required
                        autoComplete="family-name"
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
                      value={registerData.dob}
                      onChange={(e) => setRegisterData({ ...registerData, dob: e.target.value })}
                      className="w-full px-4 py-3 rounded-2xl bg-muted border-transparent focus:border-neon-pink focus:ring-2 focus:ring-neon-pink/20 outline-none"
                      required
                      autoComplete="bday"
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
                        value={registerData.mobile}
                        onChange={(e) => setRegisterData({ ...registerData, mobile: e.target.value })}
                        className="w-full pl-10 pr-4 py-3 rounded-2xl bg-muted border-transparent focus:border-neon-pink focus:ring-2 focus:ring-neon-pink/20 outline-none"
                        required
                        autoComplete="tel"
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
                        value={registerData.email}
                        onChange={(e) => setRegisterData({ ...registerData, email: e.target.value })}
                        className="w-full pl-10 pr-4 py-3 rounded-2xl bg-muted border-transparent focus:border-neon-pink focus:ring-2 focus:ring-neon-pink/20 outline-none"
                        required
                        autoComplete="email"
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
                        value={registerData.password}
                        onChange={(e) => setRegisterData({ ...registerData, password: e.target.value })}
                        className="w-full pl-10 pr-4 py-3 rounded-2xl bg-muted border-transparent focus:border-neon-pink focus:ring-2 focus:ring-neon-pink/20 outline-none"
                        required
                        autoComplete="new-password"
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
                  value={otpData.otp}
                  onChange={(e) => setOtpData({ ...otpData, otp: e.target.value })}
                  className="w-full px-4 py-3 rounded-2xl bg-muted border-transparent focus:border-neon-pink focus:ring-2 focus:ring-neon-pink/20 outline-none text-center text-2xl tracking-widest"
                  maxLength="6"
                  required
                  autoComplete="one-time-code"
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
