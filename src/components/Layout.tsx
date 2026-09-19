import { ReactNode } from 'react';
import { BottomNav } from './BottomNav';

interface LayoutProps {
  children: ReactNode;
  activeTab: string;
  onTabChange: (tab: string) => void;
}

export function Layout({ children, activeTab, onTabChange }: LayoutProps) {
  return (
    <div className="min-h-screen bg-gray-100 flex justify-center overflow-hidden font-sans">
      <div className="w-full max-w-md bg-white h-screen flex flex-col relative shadow-2xl sm:rounded-[2.5rem] sm:h-[90vh] sm:my-auto sm:border-8 border-gray-900 overflow-hidden">
        <main className="flex-1 overflow-y-auto overflow-x-hidden scrollbar-hide bg-[#F9FAFB]">
          {children}
        </main>
        <BottomNav activeTab={activeTab} onTabChange={onTabChange} />
      </div>
    </div>
  );
}
