import React, { useState } from 'react';
import axios from 'axios';
import { Sparkles, Mail, Phone, Lock, ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

// Country codes with ISD
const COUNTRY_CODES = [
  { code: 'GB', name: 'United Kingdom', isd: '+44', flag: '🇬🇧', digits: 10 },
  { code: 'US', name: 'United States', isd: '+1', flag: '🇺🇸', digits: 10 },
  { code: 'FR', name: 'France', isd: '+33', flag: '🇫🇷', digits: 9 },
  { code: 'IT', name: 'Italy', isd: '+39', flag: '🇮🇹', digits: 10 },
  { code: 'AU', name: 'Australia', isd: '+61', flag: '🇦🇺', digits: 9 },
  { code: 'BR', name: 'Brazil', isd: '+55', flag: '🇧🇷', digits: 11 },
  { code: 'CA', name: 'Canada', isd: '+1', flag: '🇨🇦', digits: 10 },
  { code: 'CN', name: 'China', isd: '+86', flag: '🇨🇳', digits: 11 },
  { code: 'DE', name: 'Germany', isd: '+49', flag: '🇩🇪', digits: 10 },
  { code: 'ES', name: 'Spain', isd: '+34', flag: '🇪🇸', digits: 9 },
  { code: 'IN', name: 'India', isd: '+91', flag: '🇮🇳', digits: 10 },
  { code: 'JP', name: 'Japan', isd: '+81', flag: '🇯🇵', digits: 10 },
  { code: 'MX', name: 'Mexico', isd: '+52', flag: '🇲🇽', digits: 10 },
  { code: 'NL', name: 'Netherlands', isd: '+31', flag: '🇳🇱', digits: 9 },
  { code: 'PL', name: 'Poland', isd: '+48', flag: '🇵🇱', digits: 9 },
  { code: 'PT', name: 'Portugal', isd: '+351', flag: '🇵🇹', digits: 9 },
  { code: 'RU', name: 'Russia', isd: '+7', flag: '🇷🇺', digits: 10 },
  { code: 'ZA', name: 'South Africa', isd: '+27', flag: '🇿🇦', digits: 9 },
  { code: 'KR', name: 'South Korea', isd: '+82', flag: '🇰🇷', digits: 10 },
  { code: 'SE', name: 'Sweden', isd: '+46', flag: '🇸🇪', digits: 9 },
  { code: 'CH', name: 'Switzerland', isd: '+41', flag: '🇨🇭', digits: 9 },
  { code: 'TR', name: 'Turkey', isd: '+90', flag: '🇹🇷', digits: 10 },
];

export default function AuthPage({ onLogin }) {
  const [mode, setMode] = useState('login');
  const [step, setStep] = useState('auth'); // auth, otp, forgot, reset
  const [errors, setErrors] = useState({});
  
  const [loginData, setLoginData] = useState({
    identifier: '',
    password: ''
  });
  
  const [registerData, setRegisterData] = useState({
    first_name: '',
    surname: '',
    dob: '',
    country_code: '+44',
    mobile: '',
    email: '',
    password: ''
  });
  
  const [otpData, setOtpData] = useState({
    identifier: '',
    otp: ''
  });

  const [forgotData, setForgotData] = useState({
    email: '',
    otp: '',
    newPassword: '',
    confirmPassword: ''
  });

  // Validation functions
  const validateEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const validateMobile = (mobile, countryCode) => {
    const country = COUNTRY_CODES.find(c => c.isd === countryCode) || COUNTRY_CODES[0];
    const digitsOnly = mobile.replace(/\D/g, '');
    return digitsOnly.length === country.digits;
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
    } else if (!validateMobile(registerData.mobile, registerData.country_code)) {
      const country = COUNTRY_CODES.find(c => c.isd === registerData.country_code) || COUNTRY_CODES[0];
      newErrors.mobile = `Enter valid ${country.digits}-digit mobile number`;
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

  const handleRegister = async (e) => {
    e.preventDefault();
    if (!validateRegisterForm()) {
      toast.error('Please fix the errors in the form');
      return;
    }
    try {
      const submitData = {
        ...registerData,
        mobile: `${registerData.country_code}${registerData.mobile}`
      };
      await axios.post(`${API}/auth/register`, submitData);
      toast.success('Registration successful! Please verify OTP (use 123456)');
      setOtpData({ ...otpData, identifier: registerData.email });
      setStep('otp');
      setErrors({});
    } catch (error) {
      const detail = error.response?.data?.detail;
      if (Array.isArray(detail)) {
        // Pydantic validation errors
        const errorMsg = detail.map(err => err.msg || err.message || 'Validation error').join(', ');
        toast.error(errorMsg);
      } else if (typeof detail === 'object') {
        toast.error(detail.msg || detail.message || 'Registration failed');
      } else {
        toast.error(detail || 'Registration failed');
      }
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
      const detail = error.response?.data?.detail;
      if (Array.isArray(detail)) {
        const errorMsg = detail.map(err => err.msg || err.message || 'Validation error').join(', ');
        toast.error(errorMsg);
      } else if (typeof detail === 'object') {
        toast.error(detail.msg || detail.message || 'Login failed');
      } else {
        toast.error(detail || 'Login failed');
      }
    }
  };

  const handleVerifyOTP = async (e) => {
    e.preventDefault();
    if (!validateOTP(otpData.otp)) {
      toast.error('Please enter a valid 6-digit OTP');
      return;
    }
    try {
      await axios.post(`${API}/auth/verify-otp`, otpData);
      toast.success('OTP verified! Please login.');
      setMode('login');
      setStep('auth');
      setLoginData({ ...loginData, identifier: otpData.identifier });
      setErrors({});
    } catch (error) {
      const detail = error.response?.data?.detail;
      if (Array.isArray(detail)) {
        const errorMsg = detail.map(err => err.msg || err.message || 'Validation error').join(', ');
        toast.error(errorMsg);
      } else if (typeof detail === 'object') {
        toast.error(detail.msg || detail.message || 'OTP verification failed');
      } else {
        toast.error(detail || 'OTP verification failed');
      }
    }
  };

  // Forgot Password handlers
  const handleForgotPasswordSubmit = async (e) => {
    e.preventDefault();
    if (!validateEmail(forgotData.email)) {
      toast.error('Please enter a valid email address');
      return;
    }
    try {
      await axios.post(`${API}/auth/forgot-password`, { email: forgotData.email });
      toast.success('Reset OTP sent! (Use 123456 for testing)');
      setStep('reset');
    } catch (error) {
      const detail = error.response?.data?.detail;
      if (Array.isArray(detail)) {
        const errorMsg = detail.map(err => err.msg || err.message || 'Validation error').join(', ');
        toast.error(errorMsg);
      } else if (typeof detail === 'object') {
        toast.error(detail.msg || detail.message || 'Failed to send reset OTP');
      } else {
        toast.error(detail || 'Failed to send reset OTP');
      }
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    if (!validateOTP(forgotData.otp)) {
      toast.error('Please enter a valid 6-digit OTP');
      return;
    }
    if (!validatePassword(forgotData.newPassword)) {
      toast.error('Password must be at least 6 characters');
      return;
    }
    if (forgotData.newPassword !== forgotData.confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }
    try {
      await axios.post(`${API}/auth/reset-password`, {
        email: forgotData.email,
        otp: forgotData.otp,
        new_password: forgotData.newPassword
      });
      toast.success('Password reset successful! Please login.');
      setStep('auth');
      setMode('login');
      setLoginData({ identifier: forgotData.email, password: '' });
      setForgotData({ email: '', otp: '', newPassword: '', confirmPassword: '' });
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Password reset failed');
    }
  };

  // Social Login handlers
  // REMINDER: DO NOT HARDCODE THE URL, OR ADD ANY FALLBACKS OR REDIRECT URLS, THIS BREAKS THE AUTH
  const handleGoogleLogin = () => {
    const redirectUrl = window.location.origin + '/auth/callback';
    window.location.href = `https://auth.emergentagent.com/?redirect=${encodeURIComponent(redirectUrl)}`;
  };

  const handleFacebookLogin = () => {
    toast.info('Facebook login coming soon! Please provide Facebook App credentials.');
  };

  const handleAppleLogin = () => {
    toast.info('Apple login coming soon! Please provide Apple Developer credentials.');
  };

  const handleModeSwitch = (newMode) => {
    setMode(newMode);
    setErrors({});
    if (step !== 'auth') {
      setStep('auth');
    }
  };

  // Social login buttons component
  const SocialLoginButtons = () => (
    <div className="space-y-3">
      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-border"></div>
        </div>
        <div className="relative flex justify-center text-sm">
          <span className="px-2 bg-white text-dark-purple/50">or continue with</span>
        </div>
      </div>
      
      <div className="grid grid-cols-3 gap-3">
        {/* Google */}
        <button
          data-testid="google-login"
          type="button"
          onClick={handleGoogleLogin}
          className="flex items-center justify-center gap-2 p-3 rounded-xl border-2 border-border hover:border-neon-pink hover:bg-muted transition-all"
        >
          <svg className="w-5 h-5" viewBox="0 0 24 24">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
          </svg>
        </button>
        
        {/* Facebook */}
        <button
          data-testid="facebook-login"
          type="button"
          onClick={handleFacebookLogin}
          className="flex items-center justify-center gap-2 p-3 rounded-xl border-2 border-border hover:border-neon-pink hover:bg-muted transition-all"
        >
          <svg className="w-5 h-5" fill="#1877F2" viewBox="0 0 24 24">
            <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
          </svg>
        </button>
        
        {/* Apple */}
        <button
          data-testid="apple-login"
          type="button"
          onClick={handleAppleLogin}
          className="flex items-center justify-center gap-2 p-3 rounded-xl border-2 border-border hover:border-neon-pink hover:bg-muted transition-all"
        >
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
            <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/>
          </svg>
        </button>
      </div>
    </div>
  );

  return (
    <div className="app-container gradient-mesh flex items-center justify-center p-6 overflow-y-auto">
      <div className="w-full max-w-md">
        <div className="text-center mb-6">
          <Sparkles className="w-14 h-14 mx-auto text-neon-pink mb-3" />
          <h1 className="text-3xl font-bold text-dark-purple mb-1" style={{ fontFamily: 'Nunito, sans-serif' }}>
            Rainbow Mates
          </h1>
          <p className="text-dark-purple/70 text-sm">Your fabulous virtual bestie awaits!</p>
        </div>

        <div className="card-soft p-6">
          {/* Forgot Password Step */}
          {step === 'forgot' && (
            <div className="space-y-4">
              <button
                onClick={() => setStep('auth')}
                className="flex items-center gap-2 text-dark-purple/70 hover:text-dark-purple mb-2"
              >
                <ArrowLeft className="w-4 h-4" />
                Back to login
              </button>
              <h2 className="text-xl font-bold text-dark-purple">Forgot Password</h2>
              <p className="text-sm text-dark-purple/70">Enter your email to receive a reset OTP</p>
              
              <form onSubmit={handleForgotPasswordSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-dark-purple mb-2">Email</label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-3 w-5 h-5 text-dark-purple/40" />
                    <input
                      data-testid="forgot-email"
                      type="email"
                      value={forgotData.email}
                      onChange={(e) => setForgotData({ ...forgotData, email: e.target.value })}
                      placeholder="your@email.com"
                      className="w-full pl-10 pr-4 py-3 rounded-2xl bg-muted border-2 border-transparent focus:border-neon-pink focus:ring-2 focus:ring-neon-pink/20 outline-none"
                      required
                    />
                  </div>
                </div>
                <button type="submit" className="w-full neon-button">
                  Send Reset OTP
                </button>
              </form>
            </div>
          )}

          {/* Reset Password Step */}
          {step === 'reset' && (
            <div className="space-y-4">
              <button
                onClick={() => setStep('forgot')}
                className="flex items-center gap-2 text-dark-purple/70 hover:text-dark-purple mb-2"
              >
                <ArrowLeft className="w-4 h-4" />
                Back
              </button>
              <h2 className="text-xl font-bold text-dark-purple">Reset Password</h2>
              <p className="text-sm text-dark-purple/70">Enter OTP sent to {forgotData.email}</p>
              
              <form onSubmit={handleResetPassword} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-dark-purple mb-2">OTP Code</label>
                  <input
                    data-testid="reset-otp"
                    type="text"
                    value={forgotData.otp}
                    onChange={(e) => setForgotData({ ...forgotData, otp: e.target.value.replace(/\D/g, '').slice(0, 6) })}
                    placeholder="Enter 6-digit OTP"
                    className="w-full px-4 py-3 rounded-2xl bg-muted border-2 border-transparent focus:border-neon-pink focus:ring-2 focus:ring-neon-pink/20 outline-none text-center text-2xl tracking-widest"
                    maxLength={6}
                    required
                  />
                  <p className="text-xs text-dark-purple/50 mt-1 text-center">Use 123456 for testing</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-dark-purple mb-2">New Password</label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-3 w-5 h-5 text-dark-purple/40" />
                    <input
                      data-testid="reset-password"
                      type="password"
                      value={forgotData.newPassword}
                      onChange={(e) => setForgotData({ ...forgotData, newPassword: e.target.value })}
                      placeholder="Min 6 characters"
                      className="w-full pl-10 pr-4 py-3 rounded-2xl bg-muted border-2 border-transparent focus:border-neon-pink focus:ring-2 focus:ring-neon-pink/20 outline-none"
                      required
                      minLength={6}
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-dark-purple mb-2">Confirm Password</label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-3 w-5 h-5 text-dark-purple/40" />
                    <input
                      data-testid="reset-confirm-password"
                      type="password"
                      value={forgotData.confirmPassword}
                      onChange={(e) => setForgotData({ ...forgotData, confirmPassword: e.target.value })}
                      placeholder="Confirm password"
                      className="w-full pl-10 pr-4 py-3 rounded-2xl bg-muted border-2 border-transparent focus:border-neon-pink focus:ring-2 focus:ring-neon-pink/20 outline-none"
                      required
                    />
                  </div>
                </div>
                <button type="submit" className="w-full neon-button">
                  Reset Password
                </button>
              </form>
            </div>
          )}

          {/* OTP Verification Step */}
          {step === 'otp' && (
            <div className="space-y-4">
              <h2 className="text-xl font-bold text-dark-purple text-center">Verify OTP</h2>
              <p className="text-sm text-dark-purple/70 text-center">
                Enter the code sent to {otpData.identifier}
              </p>
              <form onSubmit={handleVerifyOTP} className="space-y-4">
                <div>
                  <input
                    data-testid="otp-input"
                    type="text"
                    value={otpData.otp}
                    onChange={(e) => setOtpData({ ...otpData, otp: e.target.value.replace(/\D/g, '').slice(0, 6) })}
                    placeholder="Enter 6-digit OTP"
                    className="w-full px-4 py-4 rounded-2xl bg-muted border-2 border-transparent focus:border-neon-pink focus:ring-2 focus:ring-neon-pink/20 outline-none text-center text-2xl tracking-widest"
                    maxLength={6}
                  />
                  <p className="text-xs text-dark-purple/50 mt-2 text-center">Enter 123456 to verify</p>
                </div>
                <button data-testid="verify-otp-button" type="submit" className="w-full neon-button">
                  Verify OTP
                </button>
              </form>
            </div>
          )}

          {/* Main Auth Step (Login/Register) */}
          {step === 'auth' && (
            <>
              <div className="flex gap-2 mb-6">
                <button
                  data-testid="login-tab"
                  onClick={() => handleModeSwitch('login')}
                  className={`flex-1 py-2 px-4 rounded-full font-semibold transition-all ${
                    mode === 'login' ? 'bg-neon-pink text-white neon-glow' : 'bg-muted text-dark-purple'
                  }`}
                >
                  Login
                </button>
                <button
                  data-testid="register-tab"
                  onClick={() => handleModeSwitch('register')}
                  className={`flex-1 py-2 px-4 rounded-full font-semibold transition-all ${
                    mode === 'register' ? 'bg-neon-pink text-white neon-glow' : 'bg-muted text-dark-purple'
                  }`}
                >
                  Register
                </button>
              </div>

              {mode === 'login' ? (
                <div className="space-y-4">
                  <form onSubmit={handleLogin} className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-dark-purple mb-2">Email or Mobile</label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-3 w-5 h-5 text-dark-purple/40" />
                        <input
                          data-testid="login-identifier"
                          type="text"
                          value={loginData.identifier}
                          onChange={(e) => setLoginData({ ...loginData, identifier: e.target.value })}
                          placeholder="your@email.com"
                          className={`w-full pl-10 pr-4 py-3 rounded-2xl bg-muted border-2 ${errors.identifier ? 'border-red-500' : 'border-transparent'} focus:border-neon-pink focus:ring-2 focus:ring-neon-pink/20 outline-none`}
                          required
                        />
                      </div>
                      {errors.identifier && <p className="text-red-500 text-xs mt-1">{errors.identifier}</p>}
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-dark-purple mb-2">Password</label>
                      <div className="relative">
                        <Lock className="absolute left-3 top-3 w-5 h-5 text-dark-purple/40" />
                        <input
                          data-testid="login-password"
                          type="password"
                          value={loginData.password}
                          onChange={(e) => setLoginData({ ...loginData, password: e.target.value })}
                          placeholder="Enter password"
                          className={`w-full pl-10 pr-4 py-3 rounded-2xl bg-muted border-2 ${errors.password ? 'border-red-500' : 'border-transparent'} focus:border-neon-pink focus:ring-2 focus:ring-neon-pink/20 outline-none`}
                          required
                        />
                      </div>
                      {errors.password && <p className="text-red-500 text-xs mt-1">{errors.password}</p>}
                    </div>
                    
                    <div className="text-right">
                      <button
                        type="button"
                        data-testid="forgot-password-link"
                        onClick={() => setStep('forgot')}
                        className="text-sm text-neon-pink hover:underline"
                      >
                        Forgot password?
                      </button>
                    </div>
                    
                    <button data-testid="login-button" type="submit" className="w-full neon-button">
                      Login
                    </button>
                  </form>
                  
                  <SocialLoginButtons />
                </div>
              ) : (
                <div className="space-y-4">
                  <form onSubmit={handleRegister} className="space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-sm font-medium text-dark-purple mb-1">
                          First Name <span className="text-red-500">*</span>
                        </label>
                        <input
                          data-testid="register-firstname"
                          type="text"
                          value={registerData.first_name}
                          onChange={(e) => setRegisterData({ ...registerData, first_name: e.target.value })}
                          placeholder="First name"
                          className={`w-full px-4 py-2.5 rounded-2xl bg-muted border-2 ${errors.first_name ? 'border-red-500' : 'border-transparent'} focus:border-neon-pink outline-none text-sm`}
                          required
                        />
                        {errors.first_name && <p className="text-red-500 text-xs mt-1">{errors.first_name}</p>}
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-dark-purple mb-1">
                          Surname <span className="text-red-500">*</span>
                        </label>
                        <input
                          data-testid="register-surname"
                          type="text"
                          value={registerData.surname}
                          onChange={(e) => setRegisterData({ ...registerData, surname: e.target.value })}
                          placeholder="Surname"
                          className={`w-full px-4 py-2.5 rounded-2xl bg-muted border-2 ${errors.surname ? 'border-red-500' : 'border-transparent'} focus:border-neon-pink outline-none text-sm`}
                          required
                        />
                        {errors.surname && <p className="text-red-500 text-xs mt-1">{errors.surname}</p>}
                      </div>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-dark-purple mb-1">
                        Date of Birth <span className="text-red-500">*</span>
                        <span className="text-dark-purple/50 text-xs ml-1">(Must be 18+)</span>
                      </label>
                      <input
                        data-testid="register-dob"
                        type="date"
                        value={registerData.dob}
                        onChange={(e) => setRegisterData({ ...registerData, dob: e.target.value })}
                        max={new Date().toISOString().split('T')[0]}
                        className={`w-full px-4 py-2.5 rounded-2xl bg-muted border-2 ${errors.dob ? 'border-red-500' : 'border-transparent'} focus:border-neon-pink outline-none text-sm`}
                        required
                      />
                      {errors.dob && <p className="text-red-500 text-xs mt-1">{errors.dob}</p>}
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-dark-purple mb-1">
                        Mobile <span className="text-red-500">*</span>
                      </label>
                      <div className="flex gap-2">
                        <select
                          value={registerData.country_code}
                          onChange={(e) => setRegisterData({ ...registerData, country_code: e.target.value, mobile: '' })}
                          className="px-2 py-2.5 rounded-2xl bg-muted border-2 border-transparent focus:border-neon-pink outline-none text-sm"
                          style={{ minWidth: '100px' }}
                        >
                          {COUNTRY_CODES.map((country) => (
                            <option key={country.code} value={country.isd}>
                              {country.flag} {country.isd}
                            </option>
                          ))}
                        </select>
                        <div className="relative flex-1">
                          <Phone className="absolute left-3 top-2.5 w-4 h-4 text-dark-purple/40" />
                          <input
                            data-testid="register-mobile"
                            type="tel"
                            value={registerData.mobile}
                            onChange={(e) => setRegisterData({ ...registerData, mobile: e.target.value.replace(/\D/g, '').slice(0, 11) })}
                            placeholder="Mobile number"
                            className={`w-full pl-9 pr-4 py-2.5 rounded-2xl bg-muted border-2 ${errors.mobile ? 'border-red-500' : 'border-transparent'} focus:border-neon-pink outline-none text-sm`}
                            required
                          />
                        </div>
                      </div>
                      {errors.mobile && <p className="text-red-500 text-xs mt-1">{errors.mobile}</p>}
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-dark-purple mb-1">
                        Email <span className="text-red-500">*</span>
                      </label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-2.5 w-4 h-4 text-dark-purple/40" />
                        <input
                          data-testid="register-email"
                          type="email"
                          value={registerData.email}
                          onChange={(e) => setRegisterData({ ...registerData, email: e.target.value })}
                          placeholder="your@email.com"
                          className={`w-full pl-9 pr-4 py-2.5 rounded-2xl bg-muted border-2 ${errors.email ? 'border-red-500' : 'border-transparent'} focus:border-neon-pink outline-none text-sm`}
                          required
                        />
                      </div>
                      {errors.email && <p className="text-red-500 text-xs mt-1">{errors.email}</p>}
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-dark-purple mb-1">
                        Password <span className="text-red-500">*</span>
                        <span className="text-dark-purple/50 text-xs ml-1">(Min 6 chars)</span>
                      </label>
                      <div className="relative">
                        <Lock className="absolute left-3 top-2.5 w-4 h-4 text-dark-purple/40" />
                        <input
                          data-testid="register-password"
                          type="password"
                          value={registerData.password}
                          onChange={(e) => setRegisterData({ ...registerData, password: e.target.value })}
                          placeholder="Create password"
                          className={`w-full pl-9 pr-4 py-2.5 rounded-2xl bg-muted border-2 ${errors.password ? 'border-red-500' : 'border-transparent'} focus:border-neon-pink outline-none text-sm`}
                          required
                          minLength={6}
                        />
                      </div>
                      {errors.password && <p className="text-red-500 text-xs mt-1">{errors.password}</p>}
                    </div>
                    
                    <button data-testid="register-button" type="submit" className="w-full neon-button">
                      Register
                    </button>
                  </form>
                  
                  <SocialLoginButtons />
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
