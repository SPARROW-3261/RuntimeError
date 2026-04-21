import axios from "axios";
import polyline from "@mapbox/polyline";

const ORS_BASE = "https://api.openrouteservice.org/v2/directions";

export type ORSProfile = "foot-walking" | "driving-car" | "cycling-regular";

export interface ORSResult {
  distance: number; // km
  duration: number; // minutes
  geometry: string; // encoded polyline
}

interface OSRMResponse {
  routes: {
    distance: number;
    duration: number;
    geometry: string;
  }[];
}

export async function getORSRoute(
  profile: ORSProfile,
  start: [number, number], // [lng, lat]
  end: [number, number]    // [lng, lat]
): Promise<ORSResult> {
  const apiKey = process.env.ORS_API_KEY;
  // Try OSRM first if no API key, or as a fallback
  const fetchOSRM = async (osrmProfile: string): Promise<ORSResult | null> => {
    try {
      const osrmUrl = `https://router.project-osrm.org/route/v1/${osrmProfile}/${start[0]},${start[1]};${end[0]},${end[1]}?overview=full&geometries=polyline`;
      const response = await axios.get<OSRMResponse>(osrmUrl);
      if (response.data.routes && response.data.routes.length > 0) {
        const route = response.data.routes[0];
        return {
          distance: route.distance / 1000,
          duration: route.duration / 60,
          geometry: route.geometry
        };
      }
      return null;
    } catch (e) {
      console.error("OSRM Fallback failed:", e);
      return null;
    }
  };

  if (!apiKey) {
    console.warn(`ORS_API_KEY missing. Trying OSRM fallback for ${profile}.`);
    const osrmProfile = profile === "foot-walking" ? "foot" : profile === "cycling-regular" ? "bicycle" : "driving";
    const osrmResult = await fetchOSRM(osrmProfile);
    if (osrmResult) return osrmResult;

    // Last resort simulation
    const directDist = calculateHaversine(start[1], start[0], end[1], end[0]);
    const roadDist = directDist * 1.3;
    let speed = 5;
    if (profile === "driving-car") speed = 40;
    if (profile === "cycling-regular") speed = 15;

    // Straight line fallback
    const line = [[start[1], start[0]], [end[1], end[0]]];
    const geometry = polyline.encode(line as [number, number][]);

    return {
      distance: roadDist,
      duration: (roadDist / speed) * 60,
      geometry: geometry
    };
  }

  try {
    const response = await axios.post<any>(
      `${ORS_BASE}/${profile}`,
      {
        coordinates: [start, end],
      },
      {
        headers: {
          Authorization: apiKey,
          "Content-Type": "application/json",
        },
      }
    );

    const route = response.data.routes[0];
    const summary = route.summary;

    return {
      distance: summary.distance / 1000, // km
      duration: summary.duration / 60,   // minutes
      geometry: route.geometry,
    };
  } catch (error: any) {
    console.error(`ORS Error (${profile}):`, error.response?.data || error.message);
    // Try OSRM fallback on error too
    const osrmProfile = profile === "foot-walking" ? "foot" : profile === "cycling-regular" ? "bicycle" : "driving";
    const osrmResult = await fetchOSRM(osrmProfile);
    if (osrmResult) return osrmResult;
    throw error;
  }
}

function calculateHaversine(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}
