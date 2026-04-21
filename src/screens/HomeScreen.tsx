import { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Navigation, MapPin, ArrowUpDown, Leaf, X, Map as MapIcon, Loader2 } from 'lucide-react';
import { useApp } from '../context/AppContext';
import LocationSearch from '../components/LocationSearch';
import MapPicker from '../components/MapPicker';
import { Location } from '../types';

interface HomeScreenProps {
  onFindRoute: () => void;
}

export default function HomeScreen({ onFindRoute }: HomeScreenProps) {
  const { origin, setOrigin, destination, setDestination, findRoutes, isLoading, error, settings, history } = useApp();
  const [activePicker, setActivePicker] = useState<'origin' | 'destination' | null>(null);

  const weeklySavings = useMemo(() => {
    const CAR_EMISSION_KG_PER_KM = 2.31 / 15 / 2;
    const now = new Date();
    const startOfWeek = new Date(now);
    const day = startOfWeek.getDay();
    const daysFromMonday = (day + 6) % 7;
    startOfWeek.setDate(startOfWeek.getDate() - daysFromMonday);
    startOfWeek.setHours(0, 0, 0, 0);

    return history.reduce((total, trip) => {
      const tripDate = new Date(trip.timestamp);
      if (Number.isNaN(tripDate.getTime()) || tripDate < startOfWeek) return total;

      const actualEmission = Math.max(0, trip.route.emission || 0);
      const baselineCarEmission = Math.max(0, (trip.route.distance || 0) * CAR_EMISSION_KG_PER_KM);
      const saved = Math.max(0, baselineCarEmission - actualEmission);
      return total + saved;
    }, 0);
  }, [history]);

  const weeklySavingsLiters = weeklySavings / 2.31;
  const savingsLabel = weeklySavingsLiters >= 10
    ? `${Math.round(weeklySavingsLiters)}L`
    : `${weeklySavingsLiters.toFixed(1)}L`;

  const handleFind = async () => {
    if (!origin || !destination) return;
    const success = await findRoutes();
    if (success) {
      onFindRoute();
    }
  };

  const handleLocationSelect = (loc: Location) => {
    if (activePicker === 'origin') {
      setOrigin(loc);
    } else {
      setDestination(loc);
    }
    setActivePicker(null);
  };

  const swapLocations = () => {
    const temp = origin;
    setOrigin(destination);
    setDestination(temp);
  };

  return (
    <div className={`flex flex-col h-screen overflow-y-auto pb-32 px-6 pt-12 transition-colors duration-300 ${
      settings.darkMode ? 'bg-slate-950 text-white' : 'bg-slate-50/50 text-slate-900'
    }`}>
      <header className="mb-8">
        <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Where to?</h1>
        <p className="text-slate-500 mt-1">Plan your sustainable journey</p>
      </header>

      {/* Input Section */}
      <div className="bg-white rounded-[32px] p-6 shadow-sm border border-slate-100 mb-8 relative">
        <div className="space-y-6">
          <div
            className="flex items-center gap-4 cursor-pointer group"
            onClick={() => setActivePicker('origin')}
          >
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0 group-hover:bg-primary/20 transition-colors">
              <Navigation className="w-5 h-5 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Origin</label>
              <div className="font-semibold text-slate-700 truncate">
                {origin?.name || 'Select starting point...'}
              </div>
            </div>
          </div>

          <div className="h-px bg-slate-100 ml-14 relative">
            <button
              onClick={(e) => { e.stopPropagation(); swapLocations(); }}
              className="absolute right-0 top-1/2 -translate-y-1/2 w-8 h-8 bg-white border border-slate-100 rounded-full flex items-center justify-center shadow-sm hover:bg-slate-50 transition-colors z-10"
            >
              <ArrowUpDown className="w-4 h-4 text-slate-400" />
            </button>
          </div>

          <div
            className="flex items-center gap-4 cursor-pointer group"
            onClick={() => setActivePicker('destination')}
          >
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center shrink-0 group-hover:bg-emerald-500/20 transition-colors">
              <MapPin className="w-5 h-5 text-emerald-500" />
            </div>
            <div className="flex-1 min-w-0">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Destination</label>
              <div className="font-semibold text-slate-700 truncate">
                {destination?.name || 'Where are you going?'}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Impact Card */}
      <div className="bg-emerald-500 rounded-[32px] p-6 text-white mb-8 overflow-hidden relative shadow-lg shadow-emerald-500/20">
        <div className="relative z-10">
          <div className="flex items-center gap-2 mb-2">
            <Leaf className="w-5 h-5 fill-white" />
            <span className="font-bold text-sm uppercase tracking-wider">Eco Mission</span>
          </div>
          <h2 className="text-2xl font-bold mb-1">Save {savingsLabel} (CO2 eq.)</h2>
          <p className="text-emerald-50/80 text-sm font-medium">By choosing green routes this week.</p>
        </div>
        <div className="absolute -right-8 -bottom-8 opacity-20">
          <Leaf className="w-40 h-40" />
        </div>
      </div>

      {/* CTA */}
      <div className="mt-auto">
        <motion.button
          whileTap={{ scale: 0.95 }}
          onClick={handleFind}
          disabled={!origin || !destination || isLoading}
          className={`w-full py-5 rounded-[24px] font-bold text-lg shadow-xl flex items-center justify-center gap-3 transition-all ${
            !origin || !destination || isLoading
              ? 'bg-slate-200 text-slate-400 cursor-not-allowed shadow-none'
              : 'bg-primary text-white shadow-primary/30 hover:shadow-primary/40'
          }`}
        >
          {isLoading ? (
            <>
              <Loader2 className="w-6 h-6 animate-spin" />
              <span>Calculating Routes...</span>
            </>
          ) : (
            <>
              <Navigation className="w-5 h-5 fill-white" />
              <span>Find Best Route</span>
            </>
          )}
        </motion.button>
        {error && <p className="text-rose-500 text-center mt-4 text-sm font-medium">{error}</p>}
      </div>

      {/* Map Picker Modal */}
      <AnimatePresence>
        {activePicker && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[5000] bg-slate-900/60 backdrop-blur-md flex items-center justify-center p-6"
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className="bg-white w-full max-w-md rounded-[40px] overflow-hidden shadow-2xl"
            >
              <div className="p-6 flex items-center justify-between border-b border-slate-50">
                <h2 className="text-xl font-bold text-slate-800">Select {activePicker}</h2>
                <button onClick={() => setActivePicker(null)} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
                  <X className="w-5 h-5 text-slate-500" />
                </button>
              </div>
              <div className="p-4 space-y-4">
                <LocationSearch
                  onSelect={handleLocationSelect}
                  placeholder={`Search for ${activePicker}...`}
                  initialValue={activePicker === 'origin' ? origin?.name : destination?.name}
                />
                <MapPicker
                  initialPos={activePicker === 'origin' ? (origin ? [origin.lat, origin.lng] : undefined) : (destination ? [destination.lat, destination.lng] : undefined)}
                  onSelect={handleLocationSelect}
                />
                <p className="text-xs text-slate-400 text-center font-medium italic">Search for a place or click on the map</p>
              </div>
              <div className="p-6 pt-0">
                <button
                  onClick={() => setActivePicker(null)}
                  className="w-full py-4 bg-slate-100 text-slate-600 font-bold rounded-2xl hover:bg-slate-200 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
