export type TransportMode =
  | 'walking'
  | 'cycling'
  | 'bus'
  | 'car'
  | 'auto'
  | 'e-rickshaw';

const FACTOR_KG_PER_KM: Partial<Record<TransportMode, number>> = {
  walking: 0,
  cycling: 0,
  bus: 0.02,
  auto: 0.12,
  'e-rickshaw': 0,
};

const PETROL_CO2_PER_LITER = 2.31;
const CAR_EFFICIENCY_KM_PER_L = 15;
const DEFAULT_CAR_PASSENGERS = 2;

export function calculateEmission(mode: TransportMode, distanceKm: number) {
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

