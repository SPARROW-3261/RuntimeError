export type RouteType = 'walking' | 'bus' | 'car' | 'cycling' | 'bus+walking' | 'auto' | 'e-rickshaw';

export interface Location {
  name: string;
  lat: number;
  lng: number;
  coordinates: [number, number]; // [lng, lat]
}

export interface Route {
  type: RouteType;
  distance: number;
  duration: number;
  cost: number;
  emission: number;
  exposure?: number;
  ecoScore: number;
  geometry: string;
  tags: string[];
}

export interface Trip {
  id: string;
  origin: Location;
  destination: Location;
  route: Route;
  timestamp: string;
}

export interface ImpactWeights {
  timeWeight: number;
  costWeight: number;
  emissionWeight: number;
  exposureWeight?: number;
}

export interface AppSettings {
  darkMode: boolean;
  notifications: boolean;
  units: 'km' | 'miles';
  currency: 'INR' | 'USD' | 'EUR';
}
