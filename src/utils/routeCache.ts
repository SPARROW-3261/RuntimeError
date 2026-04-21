import type { ImpactWeights, Location, Route } from "../types";

const CACHE_KEY = "ecoroute_route_cache_v1";
const MAX_ITEMS = 40;

type RouteCacheEntry = {
  key: string;
  routes: Route[];
  updatedAt: string;
};

function readAll(): RouteCacheEntry[] {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeAll(entries: RouteCacheEntry[]) {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(entries.slice(0, MAX_ITEMS)));
  } catch (err) {
    console.warn("Failed to write route cache:", err);
  }
}

function roundCoord(n: number): number {
  return Math.round((n || 0) * 1000) / 1000;
}

export function buildRouteCacheKey(origin: Location, destination: Location, impact: ImpactWeights): string {
  return JSON.stringify({
    o: [roundCoord(origin.lat), roundCoord(origin.lng)],
    d: [roundCoord(destination.lat), roundCoord(destination.lng)],
    w: {
      t: Math.round(impact.timeWeight || 0),
      c: Math.round(impact.costWeight || 0),
      e: Math.round(impact.emissionWeight || 0),
      x: Math.round(impact.exposureWeight || 0),
    },
  });
}

export function getCachedRoutesByKey(key: string): Route[] | null {
  const hit = readAll().find((entry) => entry.key === key);
  return hit?.routes ?? null;
}

export function saveCachedRoutesByKey(key: string, routes: Route[]) {
  const now = new Date().toISOString();
  const entries = readAll().filter((entry) => entry.key !== key);
  entries.unshift({ key, routes, updatedAt: now });
  writeAll(entries);
}
