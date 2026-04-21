import { motion } from 'motion/react';
import { Home, History, Settings } from 'lucide-react';

interface BottomNavProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
}

export default function BottomNav({ activeTab, onTabChange }: BottomNavProps) {
  const tabs = [
    { id: 'home', icon: Home, label: 'Explore' },
    { id: 'history', icon: History, label: 'History' },
    { id: 'preferences', icon: Settings, label: 'Settings' }
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white/80 backdrop-blur-xl border-t border-slate-100 px-6 py-3 z-40">
      <div className="flex items-center justify-between max-w-lg mx-auto">
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className="relative flex flex-col items-center gap-1 group"
            >
              <div className={`p-2 rounded-2xl transition-all duration-300 ${
                isActive ? 'bg-primary text-white shadow-lg shadow-primary/20' : 'text-app-muted hover:bg-slate-50'
              }`}>
                <tab.icon className={`w-6 h-6 ${isActive ? 'fill-white/20' : ''}`} />
              </div>
              <span className={`text-[10px] font-bold transition-colors ${
                isActive ? 'text-primary' : 'text-app-muted'
              }`}>
                {tab.label}
              </span>
              {isActive && (
                <motion.div 
                  layoutId="activeTab"
                  className="absolute -top-3 w-1 h-1 bg-primary rounded-full"
                />
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
}
