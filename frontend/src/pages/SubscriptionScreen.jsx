import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import axios from 'axios';
import { ArrowLeft, Check, Crown, Gift } from 'lucide-react';
import { toast } from 'sonner';
import { useLanguage } from '../context/LanguageContext';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const PLANS = [
  { id: '1_month', name: '1 Month', price: 9.99, features: ['Full access to all features', 'Chat with bestie', 'Voice chat', 'Karaoke & Dance', 'Shopping assistant'] },
  { id: '3_months', name: '3 Months', price: 24.99, features: ['Everything in 1 Month', 'Save $5', 'Best value!'], popular: true },
  { id: '6_months', name: '6 Months', price: 44.99, features: ['Everything in 1 Month', 'Save $15', 'Longest fun!'] }
];

export default function SubscriptionScreen({ user }) {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { t } = useLanguage();
  const [selectedPlan, setSelectedPlan] = useState('free_pilot');
  const [autoRenew, setAutoRenew] = useState(true);
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(false);
  const sessionId = searchParams.get('session_id');

  useEffect(() => {
    if (sessionId) {
      checkPaymentStatus(sessionId);
    }
  }, [sessionId]);

  const checkPaymentStatus = async (sessionId) => {
    setChecking(true);
    let attempts = 0;
    const maxAttempts = 10;

    const poll = async () => {
      try {
        console.log(`Checking payment status, attempt ${attempts + 1}`);
        const response = await axios.get(`${API}/subscription/status/${sessionId}`);
        console.log('Status response:', response.data);
        
        if (response.data.payment_status === 'paid') {
          toast.success('Payment successful! Welcome to Premium!');
          navigate('/dashboard');
          return;
        } else if (response.data.status === 'expired') {
          toast.error('Payment session expired. Please try again.');
          setChecking(false);
          return;
        }

        attempts++;
        if (attempts < maxAttempts) {
          setTimeout(poll, 2000);
        } else {
          try {
            const subCheck = await axios.get(`${API}/subscription/${user.id}`);
            if (subCheck.data.has_subscription) {
              toast.success('Subscription activated!');
              navigate('/dashboard');
              return;
            }
          } catch (e) {
            console.log('Subscription check failed:', e);
          }
          toast.info('Payment is being processed. Please check back in a moment.');
          setChecking(false);
        }
      } catch (error) {
        console.error('Error checking status:', error);
        attempts++;
        if (attempts < maxAttempts) {
          setTimeout(poll, 2000);
        } else {
          setChecking(false);
        }
      }
    };

    poll();
  };

  const handleSubscribe = async () => {
    // Handle free pilot subscription
    if (selectedPlan === 'free_pilot') {
      // Save free subscription to localStorage
      localStorage.setItem('rainbow_mates_free_subscription', JSON.stringify({
        type: 'free_pilot',
        activated_at: new Date().toISOString(),
        is_active: true
      }));
      toast.success('Free pilot subscription activated! Enjoy all features! 🎉');
      navigate('/play');
      return;
    }

    if (!user?.id) {
      toast.error('Please log in to subscribe');
      return;
    }
    
    setLoading(true);
    try {
      console.log('Creating subscription for user:', user.id);
      const response = await axios.post(`${API}/subscription/create?user_id=${user.id}`, {
        plan: selectedPlan,
        auto_renew: autoRenew
      });

      console.log('Subscription response:', response.data);
      
      if (response.data.checkout_url) {
        console.log('Redirecting to:', response.data.checkout_url);
        window.location.href = response.data.checkout_url;
      } else {
        toast.error('No checkout URL received');
        setLoading(false);
      }
    } catch (error) {
      console.error('Subscription error:', error);
      toast.error(error.response?.data?.detail || 'Failed to create subscription');
      setLoading(false);
    }
  };

  if (checking) {
    return (
      <div className="app-container gradient-mesh min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Crown className="w-16 h-16 mx-auto text-neon-pink animate-pulse mb-4" />
          <p className="text-xl font-bold text-dark-purple">Processing payment...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="app-container gradient-mesh min-h-screen overflow-y-auto">
      <div className="p-4 pb-8 space-y-4">
        <div className="flex items-center gap-3">
          <button
            data-testid="back-button"
            onClick={() => navigate('/dashboard')}
            className="p-2 rounded-full bg-white border border-border hover:bg-muted transition-all flex-shrink-0"
          >
            <ArrowLeft className="w-5 h-5 text-dark-purple" />
          </button>
          <h1 className="text-2xl font-bold text-dark-purple" style={{ fontFamily: 'Nunito, sans-serif' }}>
            Subscribe
          </h1>
        </div>

        <div className="text-center py-2">
          <Crown className="w-12 h-12 mx-auto text-neon-pink mb-1" />
          <p className="text-sm text-dark-purple/70">Unlock all features and endless fun!</p>
        </div>

        {/* Free Pilot Plan */}
        <div className="space-y-3">
          <button
            data-testid="plan-free_pilot"
            onClick={() => setSelectedPlan('free_pilot')}
            className={`w-full card-soft p-4 text-left transition-all relative ${
              selectedPlan === 'free_pilot' ? 'ring-2 ring-green-500' : ''
            }`}
          >
            <div className="absolute -top-2 left-1/2 transform -translate-x-1/2 px-3 py-0.5 rounded-full bg-green-500 text-white text-xs font-bold">
              🎉 Pilot Special
            </div>
            <div className="flex items-start justify-between mb-2">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center">
                  <Gift className="w-5 h-5 text-green-600" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-dark-purple">Free Subscription</h3>
                  <div className="flex items-baseline gap-1">
                    <span className="text-2xl font-bold text-green-600">$0</span>
                    <span className="text-sm text-dark-purple/60">forever during pilot</span>
                  </div>
                </div>
              </div>
              <div
                className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
                  selectedPlan === 'free_pilot'
                    ? 'border-green-500 bg-green-500'
                    : 'border-border'
                }`}
              >
                {selectedPlan === 'free_pilot' && <Check className="w-3 h-3 text-white" />}
              </div>
            </div>
            <ul className="space-y-1 ml-13">
              {['Full access to all features', 'Chat with bestie', 'Voice chat', 'Karaoke & Music', 'Date or Just Mates', 'Shopping assistant'].map((feature, idx) => (
                <li key={idx} className="flex items-start gap-2 text-xs text-dark-purple/70">
                  <Check className="w-3 h-3 text-green-500 mt-0.5 flex-shrink-0" />
                  <span>{feature}</span>
                </li>
              ))}
            </ul>
          </button>

          {/* Divider */}
          <div className="flex items-center gap-3 py-2">
            <div className="flex-1 h-px bg-border"></div>
            <span className="text-xs text-dark-purple/40">Coming Soon</span>
            <div className="flex-1 h-px bg-border"></div>
          </div>

          {/* Paid Plans - Greyed out */}
          {PLANS.map((plan) => (
            <div
              key={plan.id}
              data-testid={`plan-${plan.id}`}
              className={`w-full card-soft p-4 text-left opacity-50 cursor-not-allowed ${plan.popular ? 'relative' : ''}`}
            >
              {plan.popular && (
                <div className="absolute -top-2 left-1/2 transform -translate-x-1/2 px-3 py-0.5 rounded-full bg-gray-400 text-white text-xs font-bold">
                  Most Popular
                </div>
              )}
              <div className="flex items-start justify-between mb-2">
                <div>
                  <h3 className="text-lg font-bold text-dark-purple/50">{plan.name}</h3>
                  <div className="flex items-baseline gap-1">
                    <span className="text-2xl font-bold text-gray-400">${plan.price}</span>
                    <span className="text-sm text-dark-purple/40">USD</span>
                  </div>
                </div>
                <div className="w-5 h-5 rounded-full border-2 border-gray-300 flex-shrink-0" />
              </div>
              <ul className="space-y-1">
                {plan.features.map((feature, idx) => (
                  <li key={idx} className="flex items-start gap-2 text-xs text-dark-purple/40">
                    <Check className="w-3 h-3 text-gray-400 mt-0.5 flex-shrink-0" />
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Subscribe Button */}
        <button
          data-testid="subscribe-button"
          onClick={handleSubscribe}
          disabled={loading || selectedPlan !== 'free_pilot'}
          className={`w-full text-base py-3 rounded-full font-semibold transition-all ${
            selectedPlan === 'free_pilot' 
              ? 'bg-green-500 hover:bg-green-600 text-white' 
              : 'bg-gray-300 text-gray-500 cursor-not-allowed'
          }`}
        >
          {loading ? 'Processing...' : selectedPlan === 'free_pilot' ? 'Start Free Pilot' : 'Subscribe Now'}
        </button>

        <p className="text-xs text-center text-dark-purple/60 pb-4">
          Enjoy full access during our pilot phase. No credit card required!
        </p>
      </div>
    </div>
  );
}
