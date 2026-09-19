import { Home, Scan, Grid, ShieldCheck, User, Bot } from 'lucide-react';

interface BottomNavProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
}

export function BottomNav({ activeTab, onTabChange }: BottomNavProps) {
  const navItems = [
    { id: 'home', label: 'Home', icon: Home },
    { id: 'scanner', label: 'Scanner', icon: Scan },
    { id: 'ask-ai', label: 'RAAHA', icon: Bot, isCenter: true },
    { id: 'services', label: 'Services', icon: Grid },
    { id: 'scam-shield', label: 'Scam Shield', icon: ShieldCheck },
    { id: 'profile', label: 'Profile', icon: User },
  ];

  return (
    <div className="bg-white border-t border-gray-100 px-2 py-3 flex justify-between items-end relative z-50">
      {navItems.map((item) => {
        const isActive = activeTab === item.id;
        const Icon = item.icon;

        if (item.isCenter) {
          return (
            <button
              key={item.id}
              onClick={() => onTabChange(item.id)}
              className="flex flex-col items-center justify-center relative -top-6 w-1/5"
            >
              <div className="w-14 h-14 rounded-full bg-[#004B87] text-white flex items-center justify-center shadow-lg shadow-blue-200 border-4 border-white mb-1">
                <Icon size={28} />
              </div>
              <span className="text-[10px] font-bold text-[#004B87]">
                {item.label}
              </span>
            </button>
          );
        }

        const activeColor = item.id === 'home' ? 'text-red-600' : 'text-[#004B87]';

        return (
          <button
            key={item.id}
            onClick={() => onTabChange(item.id)}
            className="flex flex-col items-center justify-center w-[16%]"
          >
            <div className={`mb-1 transition-colors ${isActive ? activeColor : 'text-gray-400'}`}>
              <Icon size={24} strokeWidth={isActive ? 2.5 : 2} />
            </div>
            <span className={`text-[10px] font-bold transition-colors ${isActive ? activeColor : 'text-gray-400'}`}>
              {item.label}
            </span>
          </button>
        );
      })}
    </div>
  );
}
