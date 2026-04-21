import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Location, Route, Trip, ImpactWeights, AppSettings } from '../types';
import axios from 'axios';
import { buildRouteCacheKey, getCachedRoutesByKey, saveCachedRoutesByKey } from '../utils/routeCache';

interface AppContextType {
  origin: Location | null;
  destination: Location | null;
  setOrigin: (loc: Location | null) => void;
  setDestination: (loc: Location | null) => void;
  
  impact: ImpactWeights;
  setImpact: (weights: ImpactWeights) => void;
  
  settings: AppSettings;
  updateSettings: (newSettings: Partial<AppSettings>) => void;
  
  routes: Route[];
  setRoutes: (routes: Route[]) => void;
  
  selectedRoute: Route | null;
  setSelectedRoute: (route: Route | null) => void;
  
  history: Trip[];
  fetchHistory: () => Promise<void>;
  saveTrip: (route: Route) => Promise<void>;
  deleteTrip: (trip: Trip) => Promise<void>;
  openTripFromHistory: (trip: Trip) => Promise<boolean>;
  
  findRoutes: () => Promise<boolean>;
  isLoading: boolean;
  error: string | null;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export function AppProvider({ children }: { children: ReactNode }) {
  const [origin, setOrigin] = useState<Location | null>(null);
  const [destination, setDestination] = useState<Location | null>(null);
  const [impact, setImpact] = useState<ImpactWeights>({
    timeWeight: 33,
    costWeight: 33,
    emissionWeight: 34,
    exposureWeight: 34
  });
  
  const [settings, setSettings] = useState<AppSettings>(() => {
    const saved = localStorage.getItem('ecoroute_settings');
    return saved ? JSON.parse(saved) : {
      darkMode: false,
      notifications: true,
      units: 'km',
      currency: 'INR'
    };
  });

  const updateSettings = (newSettings: Partial<AppSettings>) => {
    setSettings(prev => {
      const updated = { ...prev, ...newSettings };
      localStorage.setItem('ecoroute_settings', JSON.stringify(updated));
      return updated;
    });
  };

  const [routes, setRoutes] = useState<Route[]>([]);
  const [selectedRoute, setSelectedRoute] = useState<Route | null>(null);
  const [history, setHistory] = useState<Trip[]>([]);
  const [deletedTripKeys, setDeletedTripKeys] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('ecoroute_deleted_history');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const getTripKey = (trip: Trip) => String(trip.id || trip.timestamp || '');

  // Frontend safety net: if backend doesn't provide an "auto" option, synthesize it from "car"
  // so Option A (Direct Auto) is always selectable in UI.
  const ensureAutoRoute = (inputRoutes: Route[]): Route[] => {
    const routes = Array.isArray(inputRoutes) ? inputRoutes : [];
    if (routes.some((r) => r?.type === 'auto')) return routes;

    const car = routes.find((r) => r?.type === 'car');
    if (!car) return routes;

    const d = Math.max(0, car.distance || 0);
    const cost = d <= 2 ? 10 : 10 + (Math.ceil((d - 2) / 2) * 5);
    const emission = d * 0.12; // 120g/km => 0.12 kg/km (Ranchi spec)

    const autoRoute: Route = {
      ...car,
      type: 'auto',
      duration: Math.round((car.duration || 0) * 1.05),
      cost: Math.round(cost),
      emission: Number(emission.toFixed(2)),
      ecoScore: car.ecoScore ?? 0,
      geometry: car.geometry || '',
      tags: ['Direct Auto', 'Estimated']
    };

    // Insert near the car route to keep list ordering intuitive.
    const carIdx = routes.findIndex((r) => r?.type === 'car');
    if (carIdx === -1) return [...routes, autoRoute];
    return [...routes.slice(0, carIdx), autoRoute, ...routes.slice(carIdx)];
  };

  const findRoutes = async (): Promise<boolean> => {
    if (!origin || !destination) return false;
    
    setIsLoading(true);
    setError(null);
    const cacheKey = buildRouteCacheKey(origin, destination, impact);
    try {
      const response = await axios.post<{ routes: Route[] }>('/api/routes', {
        origin,
        destination,
        impact
      });
      const nextRoutes = ensureAutoRoute(response.data.routes || []);
      setRoutes(nextRoutes);
      setSelectedRoute(nextRoutes[0] || null);
      saveCachedRoutesByKey(cacheKey, nextRoutes);
      return true;
    } catch (err: any) {
      const cachedRoutes = getCachedRoutesByKey(cacheKey);
      if (cachedRoutes && cachedRoutes.length > 0) {
        setRoutes(cachedRoutes);
        setSelectedRoute(cachedRoutes[0] || null);
        setError('Using cached routes (offline mode).');
        return true;
      }
      setError(err.response?.data?.error || 'Failed to find routes');
      console.error(err);
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const fetchHistory = async () => {
    try {
      const response = await axios.get<{ history: Trip[] }>('/api/history');
      const hidden = (() => {
        try {
          const saved = localStorage.getItem('ecoroute_deleted_history');
          return saved ? JSON.parse(saved) : [];
        } catch {
          return [];
        }
      })() as string[];
      setHistory(response.data.history.filter((trip) => !hidden.includes(getTripKey(trip))));
    } catch (err) {
      console.error('Failed to fetch history', err);
    }
  };

  const saveTrip = async (route: Route) => {
    if (!origin || !destination) return;
    try {
      await axios.post('/api/history', {
        origin,
        destination,
        route
      });
      await fetchHistory();
    } catch (err) {
      console.error('Failed to save trip', err);
    }
  };

  const deleteTrip = async (tripToDelete: Trip) => {
    const tripId = getTripKey(tripToDelete);
    setHistory((prev) => prev.filter((trip) => getTripKey(trip) !== tripId));
    setDeletedTripKeys((prev) => {
      if (prev.includes(tripId)) return prev;
      const next = [...prev, tripId];
      localStorage.setItem('ecoroute_deleted_history', JSON.stringify(next));
      return next;
    });

    try {
      try {
        await axios.post('/api/history/delete', { id: tripToDelete.id, timestamp: tripToDelete.timestamp });
      } catch (err: any) {
        if (err.response?.status !== 404) {
          throw err;
        }
        await axios.delete(`/api/history/${encodeURIComponent(tripId)}`);
      }
    } catch (err) {
      console.error('Failed to delete trip', err);
    } finally {
      await fetchHistory();
    }
  };

  const openTripFromHistory = async (trip: Trip): Promise<boolean> => {
    setOrigin(trip.origin);
    setDestination(trip.destination);
    setIsLoading(true);
    setError(null);

    try {
      const response = await axios.post<{ routes: Route[] }>('/api/routes', {
        origin: trip.origin,
        destination: trip.destination,
        impact
      });
      const nextRoutes = ensureAutoRoute(response.data.routes || []);
      setRoutes(nextRoutes);
      setSelectedRoute(nextRoutes[0] || null);
      saveCachedRoutesByKey(buildRouteCacheKey(trip.origin, trip.destination, impact), nextRoutes);
      return true;
    } catch (err: any) {
      const cachedRoutes = getCachedRoutesByKey(buildRouteCacheKey(trip.origin, trip.destination, impact));
      if (cachedRoutes && cachedRoutes.length > 0) {
        setRoutes(cachedRoutes);
        setSelectedRoute(cachedRoutes[0] || null);
        setError('Using cached routes (offline mode).');
        return true;
      }
      setError(err.response?.data?.error || 'Failed to find routes');
      console.error(err);
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, []);

  return (
    <AppContext.Provider value={{
      origin, setOrigin,
      destination, setDestination,
      impact, setImpact,
      settings, updateSettings,
      routes, setRoutes,
      selectedRoute, setSelectedRoute,
      history, fetchHistory, saveTrip, deleteTrip, openTripFromHistory,
      findRoutes, isLoading, error
    }}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const context = useContext(AppContext);
  if (!context) throw new Error('useApp must be used within AppProvider');
  return context;
}
