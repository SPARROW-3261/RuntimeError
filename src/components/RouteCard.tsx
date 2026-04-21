import React from 'react';
import { motion } from "motion/react";
import { Clock, MapPin, Leaf, DollarSign, Zap, Bus, Footprints, Car } from "lucide-react";
import { Route } from "../types";
import { useApp } from '../context/AppContext';
import { formatDuration } from '../utils/formatDuration';

interface RouteCardProps {
  route: Route;
  isSelected: boolean;
  onClick: () => void;
}

const RouteCard: React.FC<RouteCardProps> = ({ route, isSelected, onClick }) => {
  const { settings } = useApp();
  const emissionLiters = route.emission / 2.31;
  const emissionLabel = emissionLiters >= 10
    ? `${Math.round(emissionLiters)} L`
    : `${emissionLiters.toFixed(1)} L`;

  const getEcoColor = (score: number) => {
    if (score > 80) return "bg-emerald-500";
    if (score > 60) return "bg-amber-500";
    return "bg-rose-500";
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'walking': return <Footprints className="w-5 h-5" />;
      case 'bus': return <Bus className="w-5 h-5" />;
      case 'car': return <Car className="w-5 h-5" />;
      case 'auto': return <Car className="w-5 h-5" />;
      case 'e-rickshaw': return <Zap className="w-5 h-5" />;
      case 'bus+walking': return (
        <div className="relative">
          <Bus className="w-4 h-4" />
          <Footprints className="w-3 h-3 absolute -bottom-1 -right-1 text-emerald-400" />
        </div>
      );
      default: return <Zap className="w-5 h-5" />;
    }
  };

  return (
    <motion.div
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className={`p-4 rounded-2xl border-2 transition-all cursor-pointer ${
        isSelected
          ? settings.darkMode
            ? "border-primary bg-primary/10 shadow-lg shadow-primary/5"
            : "border-primary bg-primary/5 shadow-md"
          : settings.darkMode
            ? "border-slate-800 bg-slate-900 hover:border-slate-700"
            : "border-slate-100 bg-white hover:border-slate-200"
      }`}
    >
      <div className="flex justify-between items-start mb-3">
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-colors ${
            isSelected
              ? "bg-primary text-white"
              : settings.darkMode ? "bg-slate-800 text-slate-400" : "bg-slate-100 text-slate-500"
          }`}>
            {getIcon(route.type)}
          </div>
          <div>
            <h3 className={`font-bold capitalize transition-colors ${settings.darkMode ? 'text-slate-200' : 'text-slate-800'}`}>
              {route.type === 'bus+walking' ? 'Bus + Walk' : route.type}
            </h3>
            <div className="flex gap-1">
              {route.tags.map(tag => (
                <span key={tag} className={`text-[10px] font-bold px-1.5 py-0.5 rounded uppercase tracking-tighter transition-colors ${
                  settings.darkMode ? 'bg-slate-800 text-slate-500' : 'bg-slate-100 text-slate-500'
                }`}>
                  {tag}
                </span>
              ))}
            </div>
          </div>
        </div>
        <div className={`px-3 py-1 rounded-full text-white text-xs font-bold ${getEcoColor(route.ecoScore)}`}>
          {route.ecoScore} Score
        </div>
      </div>

      <div className="grid grid-cols-2 gap-y-2 gap-x-4">
        <div className={`flex items-center gap-2 transition-colors ${settings.darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
          <Clock className="w-4 h-4" />
          <span className="text-sm font-medium">{formatDuration(route.duration)}</span>
        </div>
        <div className={`flex items-center gap-2 transition-colors ${settings.darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
          <MapPin className="w-4 h-4" />
          <span className="text-sm font-medium">{route.distance} km</span>
        </div>
        <div className={`flex items-center gap-2 transition-colors ${settings.darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
          <Leaf className="w-4 h-4 text-emerald-500" />
          <span className="text-sm font-medium">{emissionLabel} (CO2 eq.)</span>
        </div>
        <div className={`flex items-center gap-2 transition-colors ${settings.darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
          <DollarSign className="w-4 h-4 text-amber-500" />
          <span className="text-sm font-medium">INR {route.cost}</span>
        </div>
      </div>
    </motion.div>
  );
};

export default RouteCard;
