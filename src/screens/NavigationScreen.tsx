import { motion } from 'motion/react';
import { X, Navigation, MapPin, Clock, ArrowRight, Volume2, Mic } from 'lucide-react';
import { useApp } from '../context/AppContext';
import RouteMap from '../components/RouteMap';
import { useState, useEffect } from 'react';
import { formatDuration } from '../utils/formatDuration';

interface NavigationScreenProps {
  onStop: () => void;
}

export default function NavigationScreen({ onStop }: NavigationScreenProps) {
  const { origin, destination, selectedRoute, settings } = useApp();
  const [progress, setProgress] = useState(0);
  const [instruction, setInstruction] = useState("Head towards the main road");

  useEffect(() => {
    if (progress > 0.3 && progress < 0.6) {
      setInstruction("Continue straight for 500m");
    } else if (progress >= 0.6 && progress < 0.9) {
      setInstruction("Turn right in 200m");
    } else if (progress >= 0.9) {
      setInstruction("You are arriving at your destination");
    }
  }, [progress]);

  if (!origin || !destination || !selectedRoute) return null;

  return (
    <div className={`flex flex-col h-screen overflow-y-auto transition-colors duration-300 ${settings.darkMode ? 'bg-slate-950' : 'bg-white'}`}>
      {/* Top Instruction Panel */}
      <div className={`p-6 pt-12 shadow-lg z-20 transition-colors duration-300 ${settings.darkMode ? 'bg-slate-900' : 'bg-primary text-white'}`}>
        <div className="flex items-start gap-4">
          <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 ${settings.darkMode ? 'bg-primary/20 text-primary' : 'bg-white/20'}`}>
            <Navigation className="w-7 h-7" />
          </div>
          <div className="flex-1">
            <h2 className="text-2xl font-bold leading-tight">{instruction}</h2>
            <div className="flex items-center gap-2 mt-1 opacity-80">
              <span className="text-sm font-medium">Next turn in 250m</span>
            </div>
          </div>
          <button className={`p-3 rounded-full ${settings.darkMode ? 'bg-slate-800' : 'bg-white/10'}`}>
            <Volume2 className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Map Section */}
      <div className="flex-1 relative">
        <RouteMap 
          origin={origin} 
          destination={destination} 
          selectedRoute={selectedRoute} 
          isNavigating={true}
          onProgress={setProgress}
        />
        
        {/* Floating Controls */}
        <div className="absolute bottom-32 right-6 flex flex-col gap-4 z-[1000]">
          <button className={`w-14 h-14 rounded-full shadow-xl flex items-center justify-center border transition-colors ${
            settings.darkMode ? 'bg-slate-900 border-slate-800 text-slate-400' : 'bg-white border-slate-100 text-slate-600'
          }`}>
            <Mic className="w-6 h-6" />
          </button>
        </div>
      </div>

      {/* Bottom Info Panel */}
      <div className={`p-6 pb-10 rounded-t-[40px] -mt-8 relative z-20 shadow-[0_-10px_40px_rgba(0,0,0,0.1)] border-t transition-colors duration-300 ${
        settings.darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-50'
      }`}>
        <div className="w-12 h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full mx-auto mb-6" />
        
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <div className="text-left">
              <p className={`text-3xl font-bold ${settings.darkMode ? 'text-white' : 'text-slate-900'}`}>{formatDuration(selectedRoute.duration * (1 - progress))}</p>
              <p className="text-slate-400 font-medium">{(selectedRoute.distance * (1 - progress)).toFixed(1)} km left</p>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <div className="text-right">
              <p className="text-emerald-500 font-bold text-lg">Eco Mode</p>
              <p className="text-slate-400 text-xs font-bold uppercase tracking-widest">Active</p>
            </div>
            <div className="w-12 h-12 bg-emerald-500/10 rounded-2xl flex items-center justify-center">
              <Clock className="w-6 h-6 text-emerald-500" />
            </div>
          </div>
        </div>

        <button 
          onClick={onStop}
          className="w-full py-5 bg-rose-500 text-white rounded-[24px] font-bold text-lg shadow-xl shadow-rose-500/20 flex items-center justify-center gap-3"
        >
          <X className="w-6 h-6" />
          <span>Exit Navigation</span>
        </button>
      </div>
    </div>
  );
}
