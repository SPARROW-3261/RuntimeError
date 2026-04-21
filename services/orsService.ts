import axios from "axios";

const ORS_BASE = "https://api.openrouteservice.org/v2/directions";
const API_KEY = process.env.ORS_API_KEY;

export type ORSProfile = "foot-walking" | "driving-car" | "cycling-regular";

export async function getORSRoute(
  profile: ORSProfile,
  start: [number, number], // [lng, lat]
  end: [number, number]    // [lng, lat]
) {
  if (!API_KEY) {
    throw new Error("ORS_API_KEY is not configured");
  }

  try {
    const response = await axios.post<any>(
      `${ORS_BASE}/${profile}`,
      {
        coordinates: [start, end],
      },
      {
        headers: {
          Authorization: API_KEY,
          "Content-Type": "application/json",
        },
      }
    );

    const route = response.data.routes[0];
    const summary = route.summary;

    return {
      distance: summary.distance / 1000, // km
      duration: summary.duration / 60,   // minutes
      geometry: route.geometry,          // For map rendering if needed
    };
  } catch (error: any) {
    console.error(`ORS Error (${profile}):`, error.response?.data || error.message);
    throw error;
  }
}
