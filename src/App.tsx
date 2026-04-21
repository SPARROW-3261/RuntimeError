import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Home, Clock, Settings } from 'lucide-react';
import { AppProvider, useApp } from './context/AppContext';
import HomeScreen from './screens/HomeScreen';
import RouteResultsScreen from './screens/RouteResultsScreen';
import HistoryScreen from './screens/HistoryScreen';
import SettingsScreen from './screens/SettingsScreen';
import RanchiLogicScreen from './screens/RanchiLogicScreen';

import NavigationScreen from './screens/NavigationScreen';

type Screen = 'home' | 'results' | 'history' | 'settings' | 'navigation' | 'ranchiLogic';

function AppContent() {
  const { settings } = useApp();
  const [currentScreen, setCurrentScreen] = useState<Screen>('home');

  useEffect(() => {
    if (settings.darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [settings.darkMode]);

  const renderScreen = () => {
    switch (currentScreen) {
      case 'home':
        return <HomeScreen onFindRoute={() => setCurrentScreen('results')} />;
      case 'results':
        return (
          <RouteResultsScreen 
            onBack={() => setCurrentScreen('home')} 
            onConfirm={() => setCurrentScreen('history')} 
            onStartNav={() => setCurrentScreen('navigation')}
          />
        );
      case 'history':
        return <HistoryScreen onOpenRoute={() => setCurrentScreen('results')} />;
      case 'settings':
        return <SettingsScreen onOpenRanchiLogic={() => setCurrentScreen('ranchiLogic')} />;
      case 'navigation':
        return <NavigationScreen onStop={() => setCurrentScreen('home')} />;
      case 'ranchiLogic':
        return <RanchiLogicScreen onBack={() => setCurrentScreen('settings')} />;
      default:
        return <HomeScreen onFindRoute={() => setCurrentScreen('results')} />;
    }
  };

  const navItems = [
    { id: 'home', icon: <Home className="w-6 h-6" />, label: 'Home' },
    { id: 'history', icon: <Clock className="w-6 h-6" />, label: 'History' },
    { id: 'settings', icon: <Settings className="w-6 h-6" />, label: 'Settings' },
  ];

  return (
    <div className={`max-w-md mx-auto min-h-screen shadow-2xl relative overflow-x-hidden font-sans transition-colors duration-300 ${
      settings.darkMode ? 'bg-slate-950 text-white' : 'bg-white text-slate-900'
    }`}>
      <main className="h-full">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentScreen}
            initial={{ opacity: 0, x: 10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -10 }}
            transition={{ duration: 0.2 }}
            className="h-full"
          >
            {renderScreen()}
          </motion.div>
        </AnimatePresence>
      </main>

      {/* Bottom Navigation */}
      {currentScreen !== 'results' && currentScreen !== 'navigation' && (
        <nav className={`fixed bottom-0 left-0 right-0 max-w-md mx-auto backdrop-blur-lg border-t px-6 py-3 flex justify-between items-center z-[150] transition-colors duration-300 ${
          settings.darkMode 
            ? 'bg-slate-900/80 border-slate-800' 
            : 'bg-white/80 border-slate-100'
        }`}>
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => setCurrentScreen(item.id as Screen)}
              className={`flex flex-col items-center gap-1 transition-all ${
                currentScreen === item.id 
                  ? 'text-primary' 
                  : settings.darkMode ? 'text-slate-500 hover:text-slate-300' : 'text-slate-400 hover:text-slate-600'
              }`}
            >
              <motion.div
                whileTap={{ scale: 0.8 }}
                className={`p-2 rounded-xl ${currentScreen === item.id ? 'bg-primary/10' : ''}`}
              >
                {item.icon}
              </motion.div>
              <span className="text-[10px] font-bold uppercase tracking-wider">{item.label}</span>
            </button>
          ))}
        </nav>
      )}
    </div>
  );
}

export default function App() {
  return (
    <AppProvider>
      <AppContent />
    </AppProvider>
  );
}
