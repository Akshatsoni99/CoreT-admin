import { useState, FormEvent } from 'react';
import { Mail, Lock, User, Eye, EyeOff } from 'lucide-react';
import AppLogo from '../assets/new-logo.png';
import { usePopup } from '../context/PopupContext';
import { setUserProfile, getUserProfile } from '../services/userProfileStore';

export function AuthView({ onLogin }: { onLogin: () => void }) {
  const { showSuccess, showError, showInfo } = usePopup();

  const [isLogin, setIsLogin] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: ''
  });

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();

    if (!formData.email.trim() || !formData.password.trim()) {
      showError(
        'Missing Credentials', 
        'Please enter your email or phone number and your password to continue.'
      );
      return;
    }

    if (formData.password.length < 6) {
      showError(
        'Password Too Short', 
        'For citizen data security, your password must be at least 6 characters.'
      );
      return;
    }

    if (!isLogin && !formData.name.trim()) {
      showError(
        'Full Name Required', 
        'Please enter your full name as shown on your government ID (Aadhaar/PAN).'
      );
      return;
    }

    // Save actual user credentials into user profile store
    if (!isLogin && formData.name.trim()) {
      setUserProfile({
        name: formData.name.trim(),
        email: formData.email.trim()
      });
    } else if (isLogin && formData.email.trim()) {
      const existing = getUserProfile();
      if (!existing.name) {
        const username = formData.email.split('@')[0];
        const cleanName = username.toLowerCase().startsWith('akshat')
          ? 'Akshat'
          : username.replace(/[0-9._%+-]+$/g, '').trim();
        const finalName = cleanName ? cleanName.charAt(0).toUpperCase() + cleanName.slice(1) : 'Citizen';
        setUserProfile({
          name: finalName,
          email: formData.email.trim()
        });
      } else {
        setUserProfile({ email: formData.email.trim() });
      }
    }

    if (isLogin) {
      showSuccess(
        'Signed In Successfully!', 
        'Welcome back to CoreT. Accessing your personalized citizen dashboard...',
        () => onLogin()
      );
    } else {
      showSuccess(
        'Account Registered!', 
        `Welcome to CoreT, ${formData.name}! Your citizen profile and security vault have been created.`,
        () => onLogin()
      );
    }
  };

  const handleForgotPassword = () => {
    if (!formData.email.trim()) {
      showInfo(
        'Password Recovery',
        'Please enter your registered email or phone number in the field above, then click Forgot Password.'
      );
      return;
    }

    showSuccess(
      'Recovery Code Sent',
      `A secure 6-digit OTP verification link has been sent to ${formData.email}.`
    );
  };

  return (
    <div className="flex flex-col h-full bg-white relative overflow-y-auto">
      <div className="flex-1 flex flex-col p-6 pb-8">
        <div className="mt-8 mb-10 flex flex-col items-center text-center">
          <img src={AppLogo} alt="CoreT Logo" className="h-14 object-contain mb-6" />
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            {isLogin ? 'Welcome back' : 'Create an account'}
          </h1>
          <p className="text-gray-500 text-sm">
            {isLogin 
              ? 'Sign in to access government services' 
              : 'Sign up to get started with CoreT'}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col space-y-5">
          {!isLogin && (
            <div className="space-y-1.5">
              <label className="text-sm font-bold text-gray-900 ml-1">Full Name</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
                  <User className="text-gray-400" size={20} />
                </div>
                <input 
                  type="text" 
                  placeholder="Enter your full legal name"
                  value={formData.name}
                  onChange={e => setFormData({...formData, name: e.target.value})}
                  className="w-full border border-gray-300 rounded-xl py-3 pl-11 pr-4 text-sm focus:outline-none focus:border-[#004B87] focus:ring-1 focus:ring-[#004B87] transition-all bg-white"
                />
              </div>
            </div>
          )}

          <div className="space-y-1.5">
            <label className="text-sm font-bold text-gray-900 ml-1">Email or Phone Number</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
                <Mail className="text-gray-400" size={20} />
              </div>
              <input 
                type="text" 
                placeholder="Enter your email or phone"
                value={formData.email}
                onChange={e => setFormData({...formData, email: e.target.value})}
                className="w-full border border-gray-300 rounded-xl py-3 pl-11 pr-4 text-sm focus:outline-none focus:border-[#004B87] focus:ring-1 focus:ring-[#004B87] transition-all bg-white"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-bold text-gray-900 ml-1">Password</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
                <Lock className="text-gray-400" size={20} />
              </div>
              <input 
                type={showPassword ? 'text' : 'password'} 
                placeholder="Enter your password"
                value={formData.password}
                onChange={e => setFormData({...formData, password: e.target.value})}
                className="w-full border border-gray-300 rounded-xl py-3 pl-11 pr-12 text-sm focus:outline-none focus:border-[#004B87] focus:ring-1 focus:ring-[#004B87] transition-all bg-white"
              />
              <button 
                type="button" 
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-4 flex items-center text-gray-400 hover:text-gray-600 transition-colors"
              >
                {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </div>
          </div>

          {isLogin && (
            <div className="flex justify-end pt-1">
              <button 
                type="button" 
                onClick={handleForgotPassword}
                className="text-[#004B87] text-sm font-bold hover:underline"
              >
                Forgot password?
              </button>
            </div>
          )}

          <div className="pt-4">
            <button 
              type="submit"
              className="w-full bg-[#004B87] hover:bg-blue-800 text-white rounded-full py-3.5 font-bold flex items-center justify-center gap-2 transition-all shadow-lg shadow-[#004B87]/30 active:scale-[0.99]"
            >
              {isLogin ? 'Sign In' : 'Create Account'}
            </button>
          </div>
        </form>

        <div className="mt-auto pt-8 flex justify-center pb-4">
          <p className="text-sm text-gray-600">
            {isLogin ? "Don't have an account? " : "Already have an account? "}
            <button 
              onClick={() => {
                setIsLogin(!isLogin);
                setFormData({ name: '', email: '', password: '' });
              }}
              className="text-[#004B87] font-bold hover:underline ml-1"
            >
              {isLogin ? 'Sign up' : 'Sign in'}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}
