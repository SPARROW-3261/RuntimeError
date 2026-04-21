import { useState } from 'react';
import { motion } from 'motion/react';
import { Clock, Leaf, Calendar, Trash2, ExternalLink } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { Trip } from '../types';
import { formatDuration } from '../utils/formatDuration';

interface HistoryScreenProps {
  onOpenRoute: () => void;
}

export default function HistoryScreen({ onOpenRoute }: HistoryScreenProps) {
  const { history, settings, deleteTrip, openTripFromHistory } = useApp();
  const [openingTripId, setOpeningTripId] = useState<string | null>(null);
  const [deletingTripId, setDeletingTripId] = useState<string | null>(null);

  const formatEmissionLiters = (emissionKg: number) => {
    const liters = emissionKg / 2.31;
    return liters >= 10 ? `${Math.round(liters)}L` : `${liters.toFixed(1)}L`;
  };

  const getTripKey = (trip: Trip) => trip.id || trip.timestamp;

  const handleOpen = async (trip: Trip) => {
    const tripKey = getTripKey(trip);
    setOpeningTripId(tripKey);
    const success = await openTripFromHistory(trip);
    setOpeningTripId(null);
    if (success) {
      onOpenRoute();
    }
  };

  const handleDelete = async (trip: Trip) => {
    const tripKey = getTripKey(trip);
    setDeletingTripId(tripKey);
    await deleteTrip(trip);
    setDeletingTripId(null);
  };

  return (
    <div className={`flex flex-col h-screen overflow-y-auto pb-32 px-6 pt-12 transition-colors duration-300 ${
      settings.darkMode ? 'bg-slate-950 text-white' : 'bg-slate-50/50 text-slate-900'
    }`}>
      <header className="mb-8">
        <h1 className={`text-3xl font-bold tracking-tight ${settings.darkMode ? 'text-white' : 'text-slate-900'}`}>Trip History</h1>
        <p className="text-slate-500 mt-1">Your past sustainable journeys</p>
      </header>

      <div className="space-y-4">
        {history.map((trip) => (
          <motion.div
            key={getTripKey(trip)}
            whileTap={{ scale: 0.98 }}
            className={`p-5 rounded-[28px] border shadow-sm transition-colors ${
              settings.darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-100'
            }`}
          >
            <div className="flex justify-between items-start mb-4">
              <div className="flex items-center gap-2 text-slate-400">
                <Calendar className="w-4 h-4" />
                <span className="text-xs font-bold uppercase tracking-wider">
                  {new Date(trip.timestamp).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                </span>
              </div>
              <div className={`px-2 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider ${
                settings.darkMode ? 'bg-emerald-500/10 text-emerald-400' : 'bg-emerald-50 text-emerald-600'
              }`}>
                {trip.route.type}
              </div>
            </div>

            <div className="flex items-center gap-4 mb-4">
              <div className="flex flex-col items-center gap-1">
                <div className="w-2 h-2 rounded-full bg-primary" />
                <div className={`w-0.5 h-6 ${settings.darkMode ? 'bg-slate-800' : 'bg-slate-100'}`} />
                <div className="w-2 h-2 rounded-full bg-emerald-500" />
              </div>
              <div className="flex-1 min-w-0 space-y-2">
                <div className={`text-sm font-bold truncate ${settings.darkMode ? 'text-slate-200' : 'text-slate-700'}`}>{trip.origin.name}</div>
                <div className={`text-sm font-bold truncate ${settings.darkMode ? 'text-slate-200' : 'text-slate-700'}`}>{trip.destination.name}</div>
              </div>
            </div>

            <div className={`flex items-center justify-between pt-4 border-t ${settings.darkMode ? 'border-slate-800' : 'border-slate-50'}`}>
              <div className="flex gap-4">
                <div className="flex items-center gap-1.5">
                  <Leaf className="w-4 h-4 text-emerald-500" />
                  <span className={`text-sm font-bold ${settings.darkMode ? 'text-slate-300' : 'text-slate-700'}`}>{formatEmissionLiters(trip.route.emission)} (CO2 eq.)</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Clock className="w-4 h-4 text-slate-400" />
                  <span className={`text-sm font-bold ${settings.darkMode ? 'text-slate-300' : 'text-slate-700'}`}>{formatDuration(trip.route.duration)}</span>
                </div>
              </div>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-3">
              <button
                onClick={() => handleOpen(trip)}
                disabled={openingTripId === getTripKey(trip)}
                className={`py-2.5 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-colors ${
                  openingTripId === getTripKey(trip)
                    ? settings.darkMode ? 'bg-slate-800 text-slate-500' : 'bg-slate-100 text-slate-400'
                    : settings.darkMode ? 'bg-primary/20 text-primary hover:bg-primary/30' : 'bg-primary/10 text-primary hover:bg-primary/20'
                }`}
              >
                <ExternalLink className="w-4 h-4" />
                <span>{openingTripId === getTripKey(trip) ? 'Opening...' : 'Open'}</span>
              </button>
              <button
                onClick={() => handleDelete(trip)}
                disabled={deletingTripId === getTripKey(trip)}
                className={`py-2.5 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-colors ${
                  deletingTripId === getTripKey(trip)
                    ? settings.darkMode ? 'bg-slate-800 text-slate-500' : 'bg-slate-100 text-slate-400'
                    : settings.darkMode ? 'bg-rose-500/20 text-rose-400 hover:bg-rose-500/30' : 'bg-rose-50 text-rose-600 hover:bg-rose-100'
                }`}
              >
                <Trash2 className="w-4 h-4" />
                <span>{deletingTripId === getTripKey(trip) ? 'Deleting...' : 'Delete'}</span>
              </button>
            </div>
          </motion.div>
        ))}

        {history.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mb-4">
              <Clock className="w-10 h-10 text-slate-300" />
            </div>
            <h3 className="text-lg font-bold text-slate-700">No trips yet</h3>
            <p className="text-slate-400 max-w-[200px] mt-1">Start your first eco-friendly journey today!</p>
          </div>
        )}
      </div>
    </div>
  );
}
