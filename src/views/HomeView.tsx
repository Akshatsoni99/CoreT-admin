import { useState, useEffect, KeyboardEvent } from 'react';
import { 
  Search as SearchIcon, 
  Mic, 
  Scan, 
  MessageSquare, 
  Lightbulb, 
  Leaf, 
  ArrowRight, 
  ChevronRight, 
  Bell, 
  X, 
  CheckCheck, 
  ShieldAlert, 
  FileCheck, 
  User, 
  LogOut, 
  Lock, 
  ExternalLink,
  Landmark
} from 'lucide-react';
import AppLogo from '../assets/new-logo.png';
import { usePopup } from '../context/PopupContext';
import { getUserProfile, UserProfile } from '../services/userProfileStore';

interface HomeViewProps {
  onNavigate: (tab: string, query?: string) => void;
}

export function HomeView({ onNavigate }: HomeViewProps) {
  const { showSuccess, showError, showInfo, showWarning } = usePopup();

  const [profile, setProfile] = useState<UserProfile>(() => getUserProfile());

  useEffect(() => {
    const handleProfileChange = () => setProfile(getUserProfile());
    window.addEventListener('coreserve_profile_updated', handleProfileChange);
    return () => window.removeEventListener('coreserve_profile_updated', handleProfileChange);
  }, []);

  const getInitials = (name: string) => {
    if (!name.trim()) return 'CP';
    const parts = name.trim().split(/\s+/);
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  };

  const [searchQuery, setSearchQuery] = useState('');
  const [showNotifications, setShowNotifications] = useState(false);
  const [showAccountSheet, setShowAccountSheet] = useState(false);
  const [notifications, setNotifications] = useState([
    {
      id: 1,
      title: 'Aadhaar e-KYC Verification',
      message: 'Aadhaar OTP request generated for citizen e-Sign verification.',
      time: '12 min ago',
      read: false,
      type: 'security',
      actionTab: 'services'
    },
    {
      id: 2,
      title: 'Income Certificate Status',
      message: 'Application #MP-89412 is under active scrutiny at Tehsil Revenue Office.',
      time: '2 hours ago',
      read: false,
      type: 'update',
      actionTab: 'services'
    },
    {
      id: 3,
      title: 'Scam Shield Threat Blocked',
      message: '1 high-risk phishing SMS impersonating SBI net banking was detected.',
      time: 'Yesterday',
      read: false,
      type: 'warning',
      actionTab: 'scam-shield'
    },
    {
      id: 4,
      title: 'PM Kisan 16th Installment',
      message: 'Direct benefit transfer has been processed to your linked account.',
      time: '3 days ago',
      read: true,
      type: 'benefit',
      actionTab: 'services'
    }
  ]);

  const unreadCount = notifications.filter(n => !n.read).length;

  const handleMarkAllRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    showSuccess('Notifications Cleared', 'All pending citizen updates have been marked as read.');
  };

  const handleNotificationClick = (item: typeof notifications[0]) => {
    setNotifications(prev => prev.map(n => n.id === item.id ? { ...n, read: true } : n));
    setShowNotifications(false);
    showInfo(item.title, item.message, () => {
      if (item.actionTab) {
        onNavigate(item.actionTab);
      }
    }, 'Go to Service');
  };

  const handleSearchSubmit = () => {
    if (!searchQuery.trim()) {
      showError('Search Query Required', 'Please enter a government service, certificate name, or banking question.');
      return;
    }

    const query = searchQuery.trim();
    setSearchQuery('');
    onNavigate('ask-ai', query);
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleSearchSubmit();
    }
  };

  const handleMicClick = () => {
    onNavigate('ask-ai');
  };

  const handleTipsClick = () => {
    showInfo(
      'Citizen Essential Tips',
      '1. Always link your active mobile number with Aadhaar for instant OTP verification.\n2. Keep digital copies of your Ration Card and Income Certificate ready for faster service approvals.\n3. Verify government links in Scam Shield before sharing credentials.'
    );
  };

  const handleGreenerTomorrowClick = () => {
    showInfo(
      'Greener India & Paperless Governance',
      'By applying for digital services and verifying forms online, you eliminate physical paper waste, reduce transport emissions, and help build a cleaner, faster digital India.'
    );
  };

  return (
    <div className="flex flex-col h-full bg-[#F9FAFB] relative">
      {/* Header */}
      <header className="pt-12 pb-4 px-6 bg-white flex justify-between items-start rounded-b-3xl shadow-[0_4px_20px_-10px_rgba(0,0,0,0.05)] z-10 relative">
        <div className="flex flex-col">
          <img src={AppLogo} alt="CoreT Logo" className="h-8 mb-1 object-contain object-left" />
          <p className="text-[10px] text-gray-500 font-medium tracking-wide">People • Services • A Safer Tomorrow</p>
        </div>
        <div className="flex gap-3 items-center">
          {/* Notification Button */}
          <button 
            onClick={() => setShowNotifications(true)}
            title="Notifications"
            className="relative p-2.5 rounded-full border border-gray-200 hover:bg-blue-50 transition-colors focus:outline-none"
          >
            <Bell size={20} className="text-gray-700" />
            {unreadCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 bg-red-500 text-white text-[10px] font-bold w-4 h-4 rounded-full flex items-center justify-center border-2 border-white animate-pulse">
                {unreadCount}
              </span>
            )}
          </button>

          {/* Account Profile Button */}
          <button 
            onClick={() => setShowAccountSheet(true)}
            title="Citizen Profile Account"
            className="w-10 h-10 rounded-full bg-blue-100 hover:bg-blue-200 text-[#004B87] flex items-center justify-center font-black text-sm border-2 border-blue-200 transition-all active:scale-95 shadow-sm focus:outline-none"
          >
            {getInitials(profile.name)}
          </button>
        </div>
      </header>

      {/* Main Content */}
      <div className="px-6 py-6 pb-24 overflow-y-auto">
        {/* Welcome Section */}
        <div className="mb-6 relative">
          <h2 className="text-gray-600 text-lg">Good morning,</h2>
          <h1 className="text-4xl font-extrabold text-[#002D5A] mb-2 flex items-center gap-2">
            {profile.name ? profile.name.split(' ')[0] : 'Citizen'} <span className="text-3xl">👋</span>
          </h1>
          <p className="text-gray-600 max-w-[200px] text-sm mb-4 leading-snug">
            Simpler government services for a brighter tomorrow.
          </p>
          <div className="flex items-center gap-1 mb-2">
             <div className="h-1 w-8 bg-red-500 rounded-full"></div>
             <div className="h-1 w-8 bg-[#004B87] rounded-full"></div>
          </div>
          <p className="text-[10px] font-bold text-gray-400 tracking-widest uppercase">
            People • Progress • Possibilities
          </p>

          <div className="absolute top-2 right-0 w-48 h-40 pointer-events-none overflow-hidden">
             <div className="absolute bottom-6 right-4 w-32 h-24 bg-orange-100 rounded-t-full opacity-50"></div>
             <div className="absolute top-4 right-12 w-8 h-8 rounded-full bg-yellow-400"></div>
             <div className="absolute right-4 bottom-14 text-[10px] italic text-[#004B87] font-bold text-right leading-tight bg-white/70 p-1 rounded backdrop-blur-sm">
               A more<br/>empowered<br/>citizen.<br/>A stronger<br/>India.
             </div>
          </div>
        </div>

        {/* Global Search Bar */}
        <div className="relative mb-8">
          <button 
            onClick={handleSearchSubmit}
            className="absolute inset-y-0 left-4 flex items-center text-gray-700 hover:text-[#004B87] transition-colors"
          >
            <SearchIcon size={20} strokeWidth={2.5} />
          </button>
          <input 
            type="text" 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask anything... (e.g. How to apply for passport?)" 
            className="w-full bg-white border border-gray-200 rounded-full py-4 pl-12 pr-12 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-[#004B87] transition-all"
          />
          <div className="absolute inset-y-0 right-4 flex items-center">
            <button 
              onClick={handleMicClick} 
              title="Voice Search"
              className="text-[#004B87] hover:bg-blue-50 p-1.5 rounded-full transition-colors"
            >
              <Mic size={20} />
            </button>
          </div>
        </div>

        {/* Quick Action Cards */}
        <div className="grid grid-cols-3 gap-3 mb-8">
          <button 
            onClick={() => onNavigate('scanner')} 
            className="bg-red-50/70 rounded-2xl p-4 flex flex-col items-center text-center border border-red-100/50 hover:bg-red-100/70 transition-colors shadow-sm active:scale-95"
          >
            <div className="w-14 h-14 rounded-2xl bg-white text-red-500 flex items-center justify-center mb-3 shadow-[0_2px_10px_-4px_rgba(239,68,68,0.3)] border border-red-50">
              <Scan size={28} strokeWidth={2} />
            </div>
            <h3 className="font-bold text-gray-900 text-sm mb-1">Scan a Form</h3>
            <p className="text-[10px] text-gray-500 mb-4 leading-tight">Get help to fill government forms</p>
            <div className="w-8 h-8 rounded-full bg-red-500 text-white flex items-center justify-center shadow-md shadow-red-500/30 mt-auto">
              <ArrowRight size={16} />
            </div>
          </button>
          
          <button 
            onClick={() => onNavigate('services')} 
            className="bg-blue-50/70 rounded-2xl p-4 flex flex-col items-center text-center border border-blue-100/50 hover:bg-blue-100/70 transition-colors shadow-sm active:scale-95"
          >
            <div className="w-14 h-14 rounded-2xl bg-white text-[#004B87] flex items-center justify-center mb-3 shadow-[0_2px_10px_-4px_rgba(0,75,135,0.3)] border border-blue-50">
              <SearchIcon size={28} strokeWidth={2} />
            </div>
            <h3 className="font-bold text-gray-900 text-sm mb-1">Find a Service</h3>
            <p className="text-[10px] text-gray-500 mb-4 leading-tight">Discover government services you need</p>
            <div className="w-8 h-8 rounded-full bg-[#004B87] text-white flex items-center justify-center shadow-md shadow-[#004B87]/30 mt-auto">
              <ArrowRight size={16} />
            </div>
          </button>

          <button 
            onClick={() => onNavigate('scam-shield')} 
            className="bg-green-50/70 rounded-2xl p-4 flex flex-col items-center text-center border border-green-100/50 hover:bg-green-100/70 transition-colors shadow-sm active:scale-95"
          >
            <div className="w-14 h-14 rounded-2xl bg-white text-green-600 flex items-center justify-center mb-3 shadow-[0_2px_10px_-4px_rgba(22,163,74,0.3)] border border-green-50">
              <MessageSquare size={28} strokeWidth={2} />
            </div>
            <h3 className="font-bold text-gray-900 text-sm mb-1">Check a Message</h3>
            <p className="text-[10px] text-gray-500 mb-4 leading-tight">View updates from departments</p>
            <div className="w-8 h-8 rounded-full bg-green-600 text-white flex items-center justify-center shadow-md shadow-green-600/30 mt-auto">
              <ArrowRight size={16} />
            </div>
          </button>
        </div>

        {/* Informative Banners */}
        <div className="space-y-4">
          <button 
            onClick={handleTipsClick}
            className="w-full text-left bg-orange-50 hover:bg-orange-100/70 transition-colors rounded-2xl p-4 flex items-center gap-4 relative overflow-hidden border border-orange-100/50 shadow-sm"
          >
            <div className="w-12 h-12 rounded-full bg-orange-100 flex items-center justify-center shrink-0 z-10 text-orange-400">
              <Lightbulb size={24} fill="currentColor" />
            </div>
            <div className="flex-1 z-10">
              <h4 className="font-bold text-gray-900 text-sm mb-1">Tips for You</h4>
              <p className="text-xs text-gray-600 leading-snug">Learn useful tips to save time, avoid mistakes and get things done faster.</p>
            </div>
            <ChevronRight size={20} className="shrink-0 z-10 text-gray-400" />
          </button>

          <button 
            onClick={handleGreenerTomorrowClick}
            className="w-full text-left bg-gradient-to-r from-green-50 to-green-100/50 hover:from-green-100/50 hover:to-green-100 transition-colors rounded-2xl p-4 flex items-center gap-4 relative overflow-hidden border border-green-100/50 shadow-sm"
          >
            <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center shrink-0 z-10 text-green-500">
              <Leaf size={24} fill="currentColor" />
            </div>
            <div className="flex-1 z-10">
              <h4 className="font-bold text-gray-900 text-sm mb-1">Greener Tomorrow</h4>
              <p className="text-xs text-gray-600 leading-snug">Go digital. Save paper.<br/>Be a part of a cleaner, greener India.</p>
            </div>
            <ChevronRight size={20} className="shrink-0 z-10 text-gray-400" />
            <div className="absolute right-0 bottom-0 text-green-200 w-32 h-16 flex items-end justify-end overflow-hidden pointer-events-none">
              <div className="w-24 h-12 bg-green-200/50 rounded-t-full translate-y-4 translate-x-4"></div>
              <div className="w-16 h-8 bg-green-300/50 rounded-t-full translate-y-2 -translate-x-8"></div>
            </div>
          </button>
        </div>
      </div>

      {/* Notifications Drawer Modal */}
      {showNotifications && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-200">
          <div 
            className="bg-white w-full max-w-md rounded-t-3xl sm:rounded-3xl max-h-[85vh] flex flex-col shadow-2xl overflow-hidden animate-in slide-in-from-bottom-5 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="p-5 border-b border-gray-100 flex justify-between items-center bg-white sticky top-0 z-10">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-full bg-blue-50 text-[#004B87]">
                  <Bell size={20} />
                </div>
                <div>
                  <h3 className="font-bold text-gray-900 text-base">Notifications</h3>
                  <p className="text-[11px] text-gray-500">{unreadCount} unread citizen alerts</p>
                </div>
              </div>
              <div className="flex items-center gap-1">
                {unreadCount > 0 && (
                  <button 
                    onClick={handleMarkAllRead}
                    title="Mark all as read"
                    className="p-2 text-xs font-bold text-[#004B87] hover:bg-blue-50 rounded-lg transition-colors flex items-center gap-1"
                  >
                    <CheckCheck size={16} />
                    <span className="hidden sm:inline">Mark read</span>
                  </button>
                )}
                <button 
                  onClick={() => setShowNotifications(false)}
                  className="p-2 text-gray-400 hover:text-gray-700 rounded-full hover:bg-gray-100 transition-colors"
                >
                  <X size={20} />
                </button>
              </div>
            </div>

            {/* Notifications List */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {notifications.map((item) => (
                <button
                  key={item.id}
                  onClick={() => handleNotificationClick(item)}
                  className={`w-full text-left p-4 rounded-2xl border transition-all flex gap-3.5 items-start ${
                    item.read 
                      ? 'bg-white border-gray-100 hover:bg-gray-50' 
                      : 'bg-blue-50/40 border-blue-100 hover:bg-blue-50 shadow-sm'
                  }`}
                >
                  <div className="mt-0.5 shrink-0">
                    {item.type === 'security' && (
                      <div className="w-9 h-9 rounded-full bg-blue-100 text-[#004B87] flex items-center justify-center">
                        <Lock size={18} />
                      </div>
                    )}
                    {item.type === 'update' && (
                      <div className="w-9 h-9 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center">
                        <FileCheck size={18} />
                      </div>
                    )}
                    {item.type === 'warning' && (
                      <div className="w-9 h-9 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center">
                        <ShieldAlert size={18} />
                      </div>
                    )}
                    {item.type === 'benefit' && (
                      <div className="w-9 h-9 rounded-full bg-green-100 text-green-600 flex items-center justify-center">
                        <Leaf size={18} />
                      </div>
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-start mb-0.5">
                      <h4 className={`text-xs font-bold truncate pr-2 ${item.read ? 'text-gray-800' : 'text-gray-900'}`}>
                        {item.title}
                      </h4>
                      <span className="text-[10px] text-gray-400 whitespace-nowrap shrink-0">{item.time}</span>
                    </div>
                    <p className="text-xs text-gray-600 leading-relaxed line-clamp-2">
                      {item.message}
                    </p>
                  </div>

                  {!item.read && (
                    <div className="w-2 h-2 rounded-full bg-[#004B87] mt-1.5 shrink-0"></div>
                  )}
                </button>
              ))}
            </div>

            {/* Footer */}
            <div className="p-4 bg-gray-50 border-t border-gray-100 flex justify-between items-center text-xs">
              <span className="text-gray-500 font-medium">CoreT Notification Hub</span>
              <button 
                onClick={() => setShowNotifications(false)}
                className="text-[#004B87] font-bold hover:underline"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Account Profile Bottom Sheet Modal */}
      {showAccountSheet && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-200">
          <div 
            className="bg-white w-full max-w-md rounded-t-3xl sm:rounded-3xl flex flex-col shadow-2xl overflow-hidden animate-in slide-in-from-bottom-5 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Sheet Handle */}
            <div className="w-12 h-1.5 bg-gray-200 rounded-full mx-auto mt-3 sm:hidden"></div>

            {/* Top Close Button */}
            <div className="p-4 pb-0 flex justify-end">
              <button 
                onClick={() => setShowAccountSheet(false)}
                className="p-2 text-gray-400 hover:text-gray-700 rounded-full hover:bg-gray-100 transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            {/* Profile Info */}
            <div className="px-6 pb-6 pt-2 flex flex-col items-center text-center">
              <div className="w-20 h-20 rounded-full bg-blue-50 text-[#004B87] flex items-center justify-center font-extrabold text-2xl border-4 border-blue-100 shadow-md mb-3">
                {getInitials(profile.name)}
              </div>
              <h3 className="text-xl font-bold text-gray-900">{profile.name || 'Citizen User'}</h3>
              <p className="text-xs text-gray-500 mt-0.5 font-mono">
                {profile.phone || 'No phone registered'} • {profile.email || 'No email registered'}
              </p>
              
              <div className="mt-3 inline-flex items-center gap-1.5 bg-green-50 border border-green-200 text-green-700 px-3 py-1 rounded-full text-xs font-bold">
                <CheckCheck size={14} />
                <span>Verified Citizen Profile</span>
              </div>
            </div>

            {/* Action Links */}
            <div className="px-6 pb-6 space-y-2">
              <button 
                onClick={() => {
                  setShowAccountSheet(false);
                  onNavigate('profile');
                }}
                className="w-full flex items-center justify-between p-3.5 bg-gray-50 hover:bg-blue-50 text-gray-800 hover:text-[#004B87] rounded-2xl transition-all border border-gray-100 group"
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-white text-[#004B87] flex items-center justify-center shadow-sm">
                    <User size={18} />
                  </div>
                  <div className="text-left">
                    <p className="text-xs font-bold">View & Edit Profile</p>
                    <p className="text-[10px] text-gray-400">Update address, gender, date of birth</p>
                  </div>
                </div>
                <ChevronRight size={18} className="text-gray-400 group-hover:text-[#004B87]" />
              </button>

              <button 
                onClick={() => {
                  setShowAccountSheet(false);
                  onNavigate('profile');
                }}
                className="w-full flex items-center justify-between p-3.5 bg-gray-50 hover:bg-blue-50 text-gray-800 hover:text-[#004B87] rounded-2xl transition-all border border-gray-100 group"
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-white text-[#004B87] flex items-center justify-center shadow-sm">
                    <FileCheck size={18} />
                  </div>
                  <div className="text-left">
                    <p className="text-xs font-bold">Saved Information Vault</p>
                    <p className="text-[10px] text-gray-400">Manage documents for instant form auto-fill</p>
                  </div>
                </div>
                <ChevronRight size={18} className="text-gray-400 group-hover:text-[#004B87]" />
              </button>

              {/* Dedicated Bank Staff Portal Link */}
              <button 
                onClick={() => {
                  setShowAccountSheet(false);
                  onNavigate('admin');
                }}
                className="w-full flex items-center justify-between p-3.5 bg-blue-50/80 hover:bg-blue-100/80 text-[#002D5A] rounded-2xl transition-all border border-blue-200 group"
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-[#004B87] text-white flex items-center justify-center shadow-sm">
                    <Landmark size={18} />
                  </div>
                  <div className="text-left">
                    <p className="text-xs font-bold text-[#002D5A]">Bank Staff Portal (Admin)</p>
                    <p className="text-[10px] text-blue-700">Verify slips, check verification IDs & transactions</p>
                  </div>
                </div>
                <ChevronRight size={18} className="text-[#004B87] group-hover:translate-x-0.5 transition-transform" />
              </button>

              <button 
                onClick={() => {
                  setShowAccountSheet(false);
                  showWarning(
                    'Sign Out Confirmation',
                    'Are you sure you want to end your current citizen session and log out?',
                    () => {
                      onNavigate('profile');
                    }
                  );
                }}
                className="w-full flex items-center justify-between p-3.5 bg-red-50/50 hover:bg-red-50 text-red-600 rounded-2xl transition-all border border-red-100 group mt-4"
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-white text-red-600 flex items-center justify-center shadow-sm">
                    <LogOut size={18} />
                  </div>
                  <div className="text-left">
                    <p className="text-xs font-bold">Log Out</p>
                    <p className="text-[10px] text-red-400">End secure session</p>
                  </div>
                </div>
                <ChevronRight size={18} className="text-red-400 group-hover:text-red-600" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
