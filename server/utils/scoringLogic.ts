export interface RouteWeights {
  timeWeight: number;
  costWeight: number;
  emissionWeight: number;
  exposureWeight?: number;
}

export interface MaxValues {
  time: number;
  cost: number;
  emission: number;
  exposure: number;
}

/**
 * Normalizes a value between 0 and 1
 */
export function normalize(value: number, maxValue: number): number {
  if (maxValue === 0) return 0;
  return Math.min(value / maxValue, 1);
}

/**
 * Calculates the Eco Score (0-100)
 * Higher is better.
 */
export function calculateEcoScore(
  duration: number,
  cost: number,
  emission: number,
  exposure: number,
  maxValues: MaxValues,
  weights: RouteWeights
): number {
  const normTime = normalize(duration, maxValues.time);
  const normCost = normalize(cost, maxValues.cost);
  const normEmission = normalize(emission, maxValues.emission);
  const normExposure = normalize(exposure, maxValues.exposure);

  // Total weight sum for normalization
  const exposureWeight = weights.exposureWeight ?? weights.emissionWeight;
  const totalWeight = weights.timeWeight + weights.costWeight + weights.emissionWeight + exposureWeight;
  
  // Weighted penalty score (0-1)
  const penaltyScore = (
    (normTime * weights.timeWeight) +
    (normCost * weights.costWeight) +
    (normEmission * weights.emissionWeight) +
    (normExposure * exposureWeight)
  ) / (totalWeight || 1);

  // Eco score is 100 minus the penalty percentage
  return 100 - (penaltyScore * 100);
}

export function rankRoutes(routes: any[]) {
  // Sort by ecoScore descending
  const ranked = [...routes].sort((a, b) => b.ecoScore - a.ecoScore);

  // Find fastest
  const fastest = [...routes].sort((a, b) => a.duration - b.duration)[0];
  
  // Find greenest
  const greenest = [...routes].sort((a, b) => a.emission - b.emission)[0];

  return ranked.map(route => {
    const baseTags: string[] = Array.isArray(route.tags) ? route.tags : [];
    const tags = [...baseTags];

    if (route === ranked[0]) tags.push("Best Overall");
    if (route === fastest) tags.push("Fastest");
    if (route === greenest) tags.push("Greenest");

    // Deduplicate while preserving order.
    const seen = new Set<string>();
    const deduped = tags.filter((t) => {
      if (seen.has(t)) return false;
      seen.add(t);
      return true;
    });
    
    return { ...route, tags: deduped };
  });
}
