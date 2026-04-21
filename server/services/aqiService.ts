import axios from "axios";

type CacheEntry = { value: number; expiresAt: number };

const cache = new Map<string, CacheEntry>();

const nowMs = () => Date.now();

// Approx 500m grid; good enough for heuristic caching.
const cellKey = (lat: number, lng: number) => {
  const step = 0.005;
  const latKey = Math.round(lat / step) * step;
  const lngKey = Math.round(lng / step) * step;
  return `${latKey.toFixed(3)},${lngKey.toFixed(3)}`;
};

export async function getAQI(lat: number, lng: number): Promise<number | null> {
  const token = process.env.WAQI_TOKEN;
  if (!token) return null;

  const key = cellKey(lat, lng);
  const hit = cache.get(key);
  if (hit && hit.expiresAt > nowMs()) return hit.value;

  const url = `https://api.waqi.info/feed/geo:${lat};${lng}/`;
  const response = await axios.get<any>(url, { params: { token } });
  const aqi = response.data?.data?.aqi;
  const num = typeof aqi === "number" ? aqi : Number(aqi);
  if (!Number.isFinite(num)) return null;

  cache.set(key, { value: num, expiresAt: nowMs() + 10 * 60 * 1000 });
  return num;
}

