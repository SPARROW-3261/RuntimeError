export type TransportMode =
  | 'walking'
  | 'cycling'
  | 'bus'
  | 'car'
  | 'auto'
  | 'e-rickshaw';

// Factor table from your spec (kg CO2 per km).
// Values are per passenger where applicable (bus is divided by 40).
const FACTOR_KG_PER_KM: Partial<Record<TransportMode, number>> = {
  walking: 0,
  cycling: 0,
  // Diesel bus: 800g/km divided by 40 passengers = 20g/km/person = 0.02 kg/km/person
  bus: 0.02,
  // Petrol auto: 120g/km = 0.12 kg/km (treated as per passenger for a typical ride)
  auto: 0.12,
  // E-Rickshaw: 0g local emission
  'e-rickshaw': 0,
};

// Kept for car as a reasonable per-passenger estimate (petrol, 15 km/L, 2 passengers).
const PETROL_CO2_PER_LITER = 2.31;
const CAR_EFFICIENCY_KM_PER_L = 15;
const DEFAULT_CAR_PASSENGERS = 2;

export function calculateEmission(mode: TransportMode, distanceKm: number): number {
  const d = Math.max(0, distanceKm || 0);

  const factor = FACTOR_KG_PER_KM[mode];
  if (typeof factor === 'number') return d * factor;

  if (mode === 'car') {
    const liters = d / CAR_EFFICIENCY_KM_PER_L;
    const totalKg = liters * PETROL_CO2_PER_LITER;
    return totalKg / DEFAULT_CAR_PASSENGERS;
  }

  return 0;
}

