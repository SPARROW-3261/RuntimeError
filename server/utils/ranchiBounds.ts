export const RANCHI_BOUNDS = {
  south: 23.250,
  west: 85.200,
  north: 23.450,
  east: 85.450,
};

export function isWithinRanchi(lat: number, lng: number): boolean {
  return (
    Number.isFinite(lat) &&
    Number.isFinite(lng) &&
    lat >= RANCHI_BOUNDS.south &&
    lat <= RANCHI_BOUNDS.north &&
    lng >= RANCHI_BOUNDS.west &&
    lng <= RANCHI_BOUNDS.east
  );
}

