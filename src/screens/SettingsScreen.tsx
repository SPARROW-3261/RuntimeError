import { motion, AnimatePresence } from 'motion/react';
import { User, Bell, Shield, HelpCircle, LogOut, ChevronRight, Moon, Globe, Map as MapIcon, CreditCard } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { useState } from 'react';

export default function SettingsScreen({ onOpenRanchiLogic }: { onOpenRanchiLogic: () => void }) {
  const { settings, updateSettings } = useApp();
  const [activeTab, setActiveTab] = useState<string | null>(null);

  const toggleSetting = (key: keyof typeof settings) => {
    if (typeof settings[key] === 'boolean') {
      updateSettings({ [key]: !settings[key] });
    }
  };

  const SettingRow = ({ 
    icon, 
    label, 
    value, 
    onClick, 
    color = 'text-blue-500', 
    bg = 'bg-blue-50',
    type = 'toggle'
  }: any) => (
    <motion.div
      layout
      className={`border-b last:border-0 ${settings.darkMode ? 'border-slate-800' : 'border-slate-50'}`}
    >
      <button
        onClick={onClick}
        className={`w-full flex items-center justify-between p-5 transition-colors ${
          settings.darkMode ? 'hover:bg-slate-900/50' : 'hover:bg-slate-50/50'
        }`}
      >
        <div className="flex items-center gap-4">
          <div className={`w-10 h-10 rounded-xl ${bg} ${color} flex items-center justify-center`}>
            {icon}
          </div>
          <div className="text-left">
            <p className={`font-bold ${settings.darkMode ? 'text-slate-200' : 'text-slate-700'}`}>{label}</p>
            {value !== undefined && typeof value === 'string' && <p className="text-xs text-slate-400 font-medium">{value}</p>}
          </div>
        </div>
        
        {type === 'toggle' ? (
          <div className={`w-12 h-6 rounded-full p-1 transition-colors duration-300 ${value ? 'bg-emerald-500' : 'bg-slate-200 dark:bg-slate-700'}`}>
            <motion.div 
              animate={{ x: value ? 24 : 0 }}
              className="w-4 h-4 bg-white rounded-full shadow-sm"
            />
          </div>
        ) : (
          <ChevronRight className="w-5 h-5 text-slate-300" />
        )}
      </button>
    </motion.div>
  );

  return (
    <div className={`flex flex-col h-screen overflow-y-auto pb-32 px-6 pt-12 transition-colors duration-300 ${
      settings.darkMode ? 'bg-slate-950' : 'bg-slate-50/50'
    }`}>
      <header className="mb-8">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <h1 className={`text-3xl font-bold tracking-tight ${settings.darkMode ? 'text-white' : 'text-slate-900'}`}>Settings</h1>
          <p className="text-slate-500 mt-1">Manage your account and app preferences</p>
        </motion.div>
      </header>

      <div className="space-y-6">
        {/* Account Section */}
        <section>
          <h2 className="text-xs font-bold text-slate-400 uppercase tracking-widest ml-2 mb-3">Account</h2>
          <div className={`rounded-[32px] overflow-hidden border shadow-sm transition-colors ${
            settings.darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-100'
          }`}>
            <SettingRow 
              icon={<User className="w-5 h-5" />} 
              label="Profile Settings" 
              value="Chiraag Naal"
              type="link"
              color="text-blue-500"
              bg="bg-blue-50 dark:bg-blue-500/10"
            />
            <SettingRow 
              icon={<Shield className="w-5 h-5" />} 
              label="Privacy & Security" 
              type="link"
              color="text-emerald-500"
              bg="bg-emerald-50 dark:bg-emerald-500/10"
            />
          </div>
        </section>

        {/* Preferences Section */}
        <section>
          <h2 className="text-xs font-bold text-slate-400 uppercase tracking-widest ml-2 mb-3">Preferences</h2>
          <div className={`rounded-[32px] overflow-hidden border shadow-sm transition-colors ${
            settings.darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-100'
          }`}>
            <SettingRow 
              icon={<Moon className="w-5 h-5" />} 
              label="Dark Mode" 
              value={settings.darkMode}
              onClick={() => toggleSetting('darkMode')}
              color="text-indigo-500"
              bg="bg-indigo-50 dark:bg-indigo-500/10"
            />
            <SettingRow 
              icon={<Bell className="w-5 h-5" />} 
              label="Push Notifications" 
              value={settings.notifications}
              onClick={() => toggleSetting('notifications')}
              color="text-rose-500"
              bg="bg-rose-50 dark:bg-rose-500/10"
            />
            <SettingRow 
              icon={<MapIcon className="w-5 h-5" />} 
              label="Distance Units" 
              value={settings.units.toUpperCase()}
              onClick={() => updateSettings({ units: settings.units === 'km' ? 'miles' : 'km' })}
              type="link"
              color="text-amber-500"
              bg="bg-amber-50 dark:bg-amber-500/10"
            />
            <SettingRow 
              icon={<CreditCard className="w-5 h-5" />} 
              label="Currency" 
              value={settings.currency}
              onClick={() => {
                const currencies: ('INR' | 'USD' | 'EUR')[] = ['INR', 'USD', 'EUR'];
                const next = currencies[(currencies.indexOf(settings.currency) + 1) % currencies.length];
                updateSettings({ currency: next });
              }}
              type="link"
              color="text-emerald-500"
              bg="bg-emerald-50 dark:bg-emerald-500/10"
            />
          </div>
        </section>

        {/* Support Section */}
        <section>
          <h2 className="text-xs font-bold text-slate-400 uppercase tracking-widest ml-2 mb-3">Support</h2>
          <div className={`rounded-[32px] overflow-hidden border shadow-sm transition-colors ${
            settings.darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-100'
          }`}>
            <SettingRow 
              icon={<HelpCircle className="w-5 h-5" />} 
              label="Help & Support" 
              type="link"
              color="text-slate-500"
              bg="bg-slate-100 dark:bg-slate-500/10"
            />
            <SettingRow 
              icon={<MapIcon className="w-5 h-5" />} 
              label="Ranchi Logic Flowchart" 
              value="How routes are scored"
              type="link"
              onClick={onOpenRanchiLogic}
              color="text-emerald-500"
              bg="bg-emerald-50 dark:bg-emerald-500/10"
            />
            <SettingRow 
              icon={<Globe className="w-5 h-5" />} 
              label="Language" 
              value="English (US)"
              type="link"
              color="text-slate-500"
              bg="bg-slate-100 dark:bg-slate-500/10"
            />
          </div>
        </section>
      </div>

      <motion.button 
        whileTap={{ scale: 0.98 }}
        className={`w-full mt-8 flex items-center gap-4 p-5 rounded-[24px] font-bold transition-colors ${
          settings.darkMode ? 'bg-rose-500/10 text-rose-400 hover:bg-rose-500/20' : 'bg-rose-50 text-rose-600 hover:bg-rose-100'
        }`}
      >
        <LogOut className="w-5 h-5" />
        <span>Sign Out</span>
      </motion.button>

      <div className="py-12 text-center">
        <p className="text-xs text-slate-400 font-bold uppercase tracking-widest">EcoRoute v2.4.0</p>
        <p className="text-[10px] text-slate-300 mt-1">Crafted with ❤️ for the Planet</p>
      </div>
    </div>
  );
}
