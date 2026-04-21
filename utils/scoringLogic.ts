/**
 * Normalizes a value relative to its maximum
 */
function normalize(value: number, max: number) {
  return max === 0 ? 0 : value / max;
}

export interface RouteMetrics {
  duration: number; // minutes
  cost: number; // dollars
  emission: number; // kg CO2
}

export interface Weights {
  time: number;
  cost: number;
  emission: number;
}

/**
 * Calculates a weighted eco score (0-100)
 * Higher score is better.
 */
export function calculateEcoScore(
  time: number,
  cost: number,
  emission: number,
  maxValues: { time: number; cost: number; emission: number },
  weights: { time: number; cost: number; emission: number }
) {
  // Normalize values (0 to 1 scale)
  const normTime = normalize(time, maxValues.time);
  const normCost = normalize(cost, maxValues.cost);
  const normEmission = normalize(emission, maxValues.emission);

  // Total weight for normalization
  const totalWeight = weights.time + weights.cost + weights.emission;
  
  if (totalWeight === 0) return 100;

  // Weighted penalty (0 to 1)
  const penalty = (
    (normTime * weights.time) +
    (normCost * weights.cost) +
    (normEmission * weights.emission)
  ) / totalWeight;

  // Score is 100 minus the penalty percentage
  return Math.max(0, Math.min(100, 100 * (1 - penalty)));
}

/**
 * Ranks routes based on their scores
 */
export const rankRoutes = <T extends { ecoScore: number }>(routes: T[]): T[] => {
  return [...routes].sort((a, b) => b.ecoScore - a.ecoScore);
};
