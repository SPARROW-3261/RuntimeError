import { motion } from 'motion/react';
import { ChevronLeft, MapPin, Navigation, Info, CheckCircle2, X } from 'lucide-react';
import { useApp } from '../context/AppContext';
import RouteMap from '../components/RouteMap';
import RouteCard from '../components/RouteCard';
import { useEffect, useMemo, useState } from 'react';
import EcoTree from '../components/EcoTree';
import { formatDuration } from '../utils/formatDuration';
import type { Route } from '../types';

interface RouteResultsScreenProps {
  onBack: () => void;
  onConfirm: () => void;
  onStartNav: () => void;
}

export default function RouteResultsScreen({ onBack, onConfirm, onStartNav }: RouteResultsScreenProps) {
  const { origin, destination, routes, selectedRoute, setSelectedRoute, saveTrip, settings } = useApp();
  const [isSaving, setIsSaving] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [showCompare, setShowCompare] = useState(false);
  const [userSelected, setUserSelected] = useState(false);
  const [pendingChoice, setPendingChoice] = useState<'A' | 'B' | null>(null);
  const [optionACandidate, setOptionACandidate] = useState<Route | null>(null);
  const [optionBCandidate, setOptionBCandidate] = useState<Route | null>(null);

  const recommended = useMemo(() => {
    if (!routes.length) return null;
    // Recommend least time, then least cost (matches your "less time and money" requirement).
    return [...routes].sort((a, b) => (a.duration - b.duration) || (a.cost - b.cost))[0];
  }, [routes]);

  const avg = useMemo(() => {
    if (!routes.length) return { cost: 0, duration: 0 };
    const totalCost = routes.reduce((sum, r) => sum + (r.cost || 0), 0);
    const totalDur = routes.reduce((sum, r) => sum + (r.duration || 0), 0);
    return { cost: totalCost / routes.length, duration: totalDur / routes.length };
  }, [routes]);

  // Option B: show only "smart" choices (<= avg time OR <= avg cost).
  const optionBChoices = useMemo(() => {
    if (!routes.length) return [];
    const filtered = routes.filter((r) => (r.cost || 0) <= avg.cost || (r.duration || 0) <= avg.duration);
    return filtered.sort((a, b) => (a.duration - b.duration) || (a.cost - b.cost));
  }, [routes, avg.cost, avg.duration]);

  // Option A choices: auto/car/bus (exclude bus+walking).
  const optionAChoices = useMemo(() => {
    if (!routes.length) return [];
    const filtered = routes.filter((r) => r.type === 'auto' || r.type === 'car' || r.type === 'bus');
    return filtered.sort((a, b) => (a.duration - b.duration) || (a.cost - b.cost));
  }, [routes]);

  useEffect(() => {
    // Keep a stable Option A candidate as routes update.
    if (!routes.length) {
      setOptionACandidate(null);
      return;
    }
    if (optionACandidate && routes.includes(optionACandidate)) return;
    const defaultA = routes.find((r) => r.type === 'auto')
      || routes.find((r) => r.type === 'car')
      || routes.find((r) => r.type === 'bus')
      || null;
    setOptionACandidate(defaultA);
  }, [routes, optionACandidate]);

  useEffect(() => {
    // Keep a stable Option B candidate as routes update.
    if (!routes.length) {
      setOptionBCandidate(null);
      return;
    }
    if (optionBCandidate && routes.includes(optionBCandidate)) return;
    setOptionBCandidate(recommended || routes[0] || null);
  }, [routes, recommended, optionBCandidate]);

  // Auto-select the recommended route unless the user manually chose something.
  useEffect(() => {
    if (!userSelected && recommended) {
      setSelectedRoute(recommended);
    }
  }, [recommended, userSelected, setSelectedRoute]);

  const getOptionA = () => {
    // Option A supports Auto/Car/Bus (but not Bus+Walk).
    return routes.find((r) => r.type === 'auto')
      || routes.find((r) => r.type === 'car')
      || routes.find((r) => r.type === 'bus')
      || null;
  };

  const optionA = optionACandidate || getOptionA();
  const chosenRoute = selectedRoute || recommended || routes[0] || null;
  const optionB = optionBCandidate || recommended || chosenRoute;
  const optionC = routes.reduce((best, r) => {
    const score = (r.emission || 0) + ((r.exposure || 0) / 10000);
    const bestScore = (best.emission || 0) + ((best.exposure || 0) / 10000);
    return score < bestScore ? r : best;
  }, (routes[0] || null) as any);

  const savings = (() => {
    if (!optionA || !chosenRoute) return null;
    const savedCost = Math.max(0, (optionA.cost || 0) - (chosenRoute.cost || 0));
    const savedKg = Math.max(0, (optionA.emission || 0) - (chosenRoute.emission || 0));
    const pct = optionA.emission > 0 ? Math.max(0, Math.min(1, savedKg / optionA.emission)) : 0;
    return { savedCost, savedKg, pct };
  })();

  const handleConfirm = async () => {
    if (!selectedRoute) return;
    setIsSaving(true);
    try {
      await saveTrip(selectedRoute);
      setIsSaved(true);
      setTimeout(() => {
        onStartNav(); // Go to navigation after saving
      }, 1000);
    } catch (err) {
      console.error(err);
    } finally {
      setIsSaving(false);
    }
  };

  if (!origin || !destination) return null;

  const pollutionLabel = (route: any) => {
    const co2 = (route?.emission || 0) as number;
    const aqiTag = route?.tags?.find?.((t: string) => String(t).startsWith('AQI')) || 'AQI Est.';
    return `${co2.toFixed(2)} kg + ${aqiTag}`;
  };

  return (
    <div className={`flex flex-col h-screen overflow-y-auto transition-colors duration-300 ${settings.darkMode ? 'bg-slate-950' : 'bg-white'}`}>
      {/* Header */}
      <header className="absolute top-0 left-0 right-0 z-[2000] p-6 flex items-center gap-4">
        <motion.button 
          whileTap={{ scale: 0.9 }}
          onClick={onBack}
          className={`w-12 h-12 rounded-2xl shadow-lg flex items-center justify-center border transition-colors ${
            settings.darkMode ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-slate-100 text-slate-800'
          }`}
        >
          <ChevronLeft className="w-6 h-6" />
        </motion.button>
        <div className={`flex-1 rounded-2xl shadow-lg p-3 flex items-center gap-3 border transition-colors ${
          settings.darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-100'
        }`}>
          <MapPin className="w-5 h-5 text-emerald-500" />
          <span className={`font-bold truncate text-sm ${settings.darkMode ? 'text-slate-200' : 'text-slate-700'}`}>{destination.name}</span>
        </div>
      </header>

      {/* Map Section */}
      <div className="flex-[1.2] min-h-[300px] relative">
        <RouteMap origin={origin} destination={destination} selectedRoute={selectedRoute} />
      </div>

      {/* Results Section */}
      <div className={`flex-1 rounded-t-[40px] -mt-10 relative z-10 shadow-[0_-10px_40px_rgba(0,0,0,0.05)] border-t flex flex-col transition-colors duration-300 ${
        settings.darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-50'
      }`}>
        <div className="w-12 h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full mx-auto mt-4 mb-6" />
        
        <div className="px-6 flex items-center justify-between mb-4">
          <div>
            <h2 className={`text-xl font-bold ${settings.darkMode ? 'text-white' : 'text-slate-800'}`}>Ranked Routes</h2>
            {recommended && (
              <p className="text-xs text-slate-400 font-bold mt-1">
                Recommended (time + cost): {recommended.type === 'bus+walking' ? 'Bus + Walk' : recommended.type}
              </p>
            )}
          </div>
          <button
            onClick={() => setShowCompare(true)}
            className="p-2 text-slate-400 hover:text-primary transition-colors"
            aria-label="Compare options"
          >
            <Info className="w-5 h-5" />
          </button>
        </div>

        {savings && chosenRoute && (
          <div className={`mx-6 mb-4 p-4 rounded-2xl border flex items-center justify-between gap-4 ${
            settings.darkMode ? 'bg-slate-950/40 border-slate-800' : 'bg-emerald-50 border-emerald-100'
          }`}>
            <div className="min-w-0">
              <p className={`text-sm font-bold ${settings.darkMode ? 'text-emerald-300' : 'text-emerald-700'}`}>
                Save INR {Math.round(savings.savedCost)} and {savings.savedKg.toFixed(1)} kg CO2 by choosing {chosenRoute.type === 'bus+walking' ? 'Bus + Walk' : chosenRoute.type}.
              </p>
              <p className="text-xs text-slate-400 mt-1 truncate">
                Compared to {optionA?.type === 'bus+walking' ? 'Bus + Walk' : optionA?.type}.
              </p>
            </div>
            <EcoTree progress={savings.pct} darkMode={settings.darkMode} />
          </div>
        )}

        <div className="mx-6 mb-4 grid grid-cols-2 gap-3">
          <button
            disabled={!optionA}
            onClick={() => { if (optionA) { setPendingChoice('A'); setShowCompare(true); } }}
            className={`py-3 rounded-2xl font-black text-sm transition-colors border ${
              !optionA
                ? settings.darkMode ? 'bg-slate-900 border-slate-800 text-slate-600' : 'bg-slate-100 border-slate-100 text-slate-400'
                : (selectedRoute === optionA)
                  ? settings.darkMode ? 'bg-primary/20 border-primary/40 text-primary' : 'bg-primary/10 border-primary/30 text-primary'
                  : settings.darkMode ? 'bg-slate-900 border-slate-800 text-slate-200 hover:bg-slate-800' : 'bg-white border-slate-100 text-slate-700 hover:bg-slate-50'
            }`}
          >
            Choose Option A
            <span className="block text-[10px] font-bold text-slate-400 mt-0.5">Auto/Car/Bus</span>
          </button>
          <button
            disabled={!recommended}
            onClick={() => { if (recommended) { setPendingChoice('B'); setShowCompare(true); } }}
            className={`py-3 rounded-2xl font-black text-sm transition-colors ${
              (selectedRoute === recommended)
                ? settings.darkMode ? 'bg-primary/30 text-primary border border-primary/40' : 'bg-primary/20 text-primary border border-primary/30'
                : settings.darkMode ? 'bg-primary/20 text-primary hover:bg-primary/30 border border-primary/30' : 'bg-primary/10 text-primary hover:bg-primary/20 border border-primary/20'
            }`}
          >
            Choose Option B
            <span className="block text-[10px] font-bold text-slate-400 mt-0.5">Best (time + cost)</span>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 pb-32 space-y-4">
          {routes.map((route, idx) => (
            <RouteCard 
              key={`${route.type}-${idx}`}
              route={route}
              isSelected={selectedRoute === route}
              onClick={() => { setUserSelected(true); setSelectedRoute(route); }}
            />
          ))}
          
          {routes.length === 0 && (
            <div className="text-center py-12 px-6">
              <div className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 ${settings.darkMode ? 'bg-slate-800' : 'bg-slate-100'}`}>
                <Info className="w-8 h-8 text-slate-300" />
              </div>
              <h3 className={`text-lg font-bold mb-2 ${settings.darkMode ? 'text-slate-200' : 'text-slate-800'}`}>No routes found</h3>
              <p className="text-slate-400 font-medium mb-8">We couldn't find any routes for this journey. Try a different destination or check your connection.</p>
              <button 
                onClick={onBack}
                className={`px-8 py-3 font-bold rounded-2xl transition-colors ${
                  settings.darkMode ? 'bg-slate-800 text-slate-300 hover:bg-slate-700' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                Go Back
              </button>
            </div>
          )}
        </div>

        {/* Footer CTA */}
        <div className={`absolute bottom-0 left-0 right-0 p-6 pt-10 transition-colors duration-300 ${
          settings.darkMode ? 'bg-gradient-to-t from-slate-900 via-slate-900 to-transparent' : 'bg-gradient-to-t from-white via-white to-transparent'
        }`}>
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={handleConfirm}
            disabled={!selectedRoute || isSaving || isSaved}
            className={`w-full py-5 rounded-[24px] font-bold text-lg shadow-xl flex items-center justify-center gap-3 transition-all ${
              isSaved 
                ? 'bg-emerald-500 text-white shadow-emerald-500/20'
                : !selectedRoute || isSaving
                  ? settings.darkMode ? 'bg-slate-800 text-slate-600' : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                  : 'bg-primary text-white shadow-primary/30'
            }`}
          >
            {isSaved ? (
              <>
                <CheckCircle2 className="w-6 h-6" />
                <span>Trip Saved!</span>
              </>
            ) : isSaving ? (
              <span>Saving...</span>
            ) : (
              <>
                <Navigation className="w-5 h-5 fill-white" />
                <span>Start Journey</span>
              </>
            )}
          </motion.button>
        </div>
      </div>

      {showCompare && optionA && chosenRoute && optionC && (
        <div className="fixed inset-0 z-[6000] bg-slate-900/60 backdrop-blur-md flex items-center justify-center p-6">
          <div className={`w-full max-w-md rounded-[28px] overflow-hidden shadow-2xl border ${
            settings.darkMode ? 'bg-slate-950 border-slate-800' : 'bg-white border-slate-100'
          }`}>
            <div className={`p-5 flex items-center justify-between border-b ${
              settings.darkMode ? 'border-slate-800' : 'border-slate-100'
            }`}>
              <div>
                <h3 className={`text-lg font-black ${settings.darkMode ? 'text-white' : 'text-slate-900'}`}>Route Comparison</h3>
                <p className="text-xs text-slate-400">Time, cost, pollution (CO2 + AQI)</p>
              </div>
              <button onClick={() => setShowCompare(false)} className="p-2 rounded-xl hover:bg-slate-100/10">
                <X className="w-5 h-5 text-slate-400" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => { setPendingChoice('A'); }}
                  className={`py-3 rounded-2xl font-black text-sm transition-colors border ${
                    pendingChoice === 'A'
                      ? settings.darkMode ? 'bg-primary/25 border-primary/40 text-primary' : 'bg-primary/15 border-primary/30 text-primary'
                      : settings.darkMode ? 'bg-slate-900 border-slate-800 text-slate-200 hover:bg-slate-800' : 'bg-white border-slate-100 text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  Select Option A
                  <span className="block text-[10px] font-bold text-slate-400 mt-0.5">Direct</span>
                </button>
                <button
                  onClick={() => { setPendingChoice('B'); setUserSelected(true); setSelectedRoute(optionB); }}
                  className={`py-3 rounded-2xl font-black text-sm transition-colors ${
                    pendingChoice === 'B'
                      ? settings.darkMode ? 'bg-primary/30 text-primary border border-primary/40' : 'bg-primary/20 text-primary border border-primary/30'
                      : settings.darkMode ? 'bg-primary/20 text-primary hover:bg-primary/30 border border-primary/30' : 'bg-primary/10 text-primary hover:bg-primary/20 border border-primary/20'
                  }`}
                >
                  Select Option B
                  <span className="block text-[10px] font-bold text-slate-400 mt-0.5">Smart</span>
                </button>
              </div>

              <div className="grid grid-cols-3 gap-2 text-[11px] font-extrabold uppercase tracking-wider text-slate-400">
                <div>Metric</div>
                <div>Option A</div>
                <div>Option B</div>
              </div>

              <div className="grid grid-cols-3 gap-2 text-sm">
                <div className="text-slate-400 font-bold">Mode</div>
                <div className={`${settings.darkMode ? 'text-slate-200' : 'text-slate-800'} font-bold`}>{optionA.type}</div>
                <div className={`${settings.darkMode ? 'text-slate-200' : 'text-slate-800'} font-bold`}>{optionB.type}</div>
              </div>

              <div className="grid grid-cols-3 gap-2 text-sm">
                <div className="text-slate-400 font-bold">Time</div>
                <div className={`${settings.darkMode ? 'text-slate-200' : 'text-slate-800'} font-bold`}>{formatDuration(optionA.duration)}</div>
                <div className={`${settings.darkMode ? 'text-slate-200' : 'text-slate-800'} font-bold`}>{formatDuration(optionB.duration)}</div>
              </div>

              <div className="grid grid-cols-3 gap-2 text-sm">
                <div className="text-slate-400 font-bold">Cost</div>
                <div className={`${settings.darkMode ? 'text-slate-200' : 'text-slate-800'} font-bold`}>INR {Math.round(optionA.cost)}</div>
                <div className={`${settings.darkMode ? 'text-slate-200' : 'text-slate-800'} font-bold`}>INR {Math.round(optionB.cost)}</div>
              </div>

              <div className="grid grid-cols-3 gap-2 text-sm">
                <div className="text-slate-400 font-bold">Pollution</div>
                <div className={`${settings.darkMode ? 'text-slate-200' : 'text-slate-800'} font-bold`}>{pollutionLabel(optionA)}</div>
                <div className={`${settings.darkMode ? 'text-slate-200' : 'text-slate-800'} font-bold`}>{pollutionLabel(optionB)}</div>
              </div>

              {pendingChoice === 'A' && optionAChoices.length > 0 && (
                <div className="pt-2">
                  <div className="text-xs font-black tracking-wide text-slate-400 uppercase mb-2">Option A Available (Direct)</div>
                  <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
                    {optionAChoices.map((r, idx) => {
                      const isActive = optionA === r;
                      return (
                        <button
                          key={`${r.type}-direct-${idx}`}
                          onClick={() => { setOptionACandidate(r); setPendingChoice('A'); }}
                          className={`w-full text-left p-3 rounded-2xl border transition-colors ${
                            isActive
                              ? settings.darkMode ? 'bg-primary/20 border-primary/40' : 'bg-primary/10 border-primary/30'
                              : settings.darkMode ? 'bg-slate-900 border-slate-800 hover:bg-slate-800' : 'bg-white border-slate-100 hover:bg-slate-50'
                          }`}
                        >
                          <div className="flex items-center justify-between gap-3">
                            <div>
                              <div className={`font-black text-sm capitalize ${settings.darkMode ? 'text-slate-100' : 'text-slate-900'}`}>
                                {r.type}
                              </div>
                              <div className="text-[11px] font-bold text-slate-400 mt-0.5">
                                {formatDuration(r.duration)} · INR {Math.round(r.cost)} · {pollutionLabel(r)}
                              </div>
                            </div>
                            {isActive && (
                              <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400">
                                Active
                              </span>
                            )}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {pendingChoice === 'B' && optionBChoices.length > 0 && (
                <div className="pt-2">
                  <div className="flex items-baseline justify-between mb-2">
                    <div className="text-xs font-black tracking-wide text-slate-400 uppercase">Option B Available (Smart)</div>
                    <div className="text-[11px] font-extrabold text-slate-400">
                      Avg: {formatDuration(Math.round(avg.duration))} / INR {Math.round(avg.cost)}
                    </div>
                  </div>

                  <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                    {optionBChoices.map((r, idx) => {
                      const isActive = optionB === r;
                      const isLessTime = (r.duration || 0) <= avg.duration;
                      const isLessCost = (r.cost || 0) <= avg.cost;
                      return (
                        <button
                          key={`${r.type}-${idx}`}
                          onClick={() => { setOptionBCandidate(r); setPendingChoice('B'); setUserSelected(true); setSelectedRoute(r); }}
                          className={`w-full text-left p-3 rounded-2xl border transition-colors ${
                            isActive
                              ? settings.darkMode ? 'bg-primary/20 border-primary/40' : 'bg-primary/10 border-primary/30'
                              : settings.darkMode ? 'bg-slate-900 border-slate-800 hover:bg-slate-800' : 'bg-white border-slate-100 hover:bg-slate-50'
                          }`}
                        >
                          <div className="flex items-center justify-between gap-3">
                            <div>
                              <div className={`font-black text-sm capitalize ${settings.darkMode ? 'text-slate-100' : 'text-slate-900'}`}>
                                {r.type === 'bus+walking' ? 'Bus + Walk' : r.type}
                              </div>
                              <div className="text-[11px] font-bold text-slate-400 mt-0.5">
                                {formatDuration(r.duration)} · INR {Math.round(r.cost)} · {pollutionLabel(r)}
                              </div>
                            </div>
                            <div className="flex flex-col items-end gap-1">
                              {isLessTime && <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400">Less Time</span>}
                              {isLessCost && <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-400">Less INR</span>}
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
