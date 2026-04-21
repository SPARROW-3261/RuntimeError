export type FareMode = 'bus' | 'bus+walking' | 'auto' | 'e-rickshaw' | 'car' | 'walking' | 'cycling';

const ceilDiv = (a: number, b: number) => Math.ceil(a / b);

export function calculateFare(mode: FareMode, distanceKm: number): number {
  const d = Math.max(0, distanceKm || 0);

  if (mode === 'walking' || mode === 'cycling') return 0;

  if (mode === 'bus') {
    // Ranchi city-limit style flat fare.
    return 20;
  }

  if (mode === 'bus+walking') {
    // Cheaper than pure bus because part of the trip is walked.
    return 15;
  }

  if (mode === 'auto') {
    // Ranchi example: Min 10, then 5 per 2km.
    if (d <= 2) return 10;
    const extra = d - 2;
    return 10 + (ceilDiv(extra, 2) * 5);
  }

  if (mode === 'e-rickshaw') {
    // Placeholder: local policy varies; keep a visible, editable default.
    return 60;
  }

  if (mode === 'car') {
    // Rough fuel+wear proxy (keep existing behavior scale).
    return Math.round(d * 15);
  }

  return 0;
}
