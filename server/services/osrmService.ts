import axios from "axios";

export interface OSRMRoute {
  distanceKm: number;
  durationMin: number;
  geometry: string;
}

type OSRMResponse = {
  routes?: Array<{
    distance: number;
    duration: number;
    geometry: string;
  }>;
};

export async function getOSRMDrivingRoutes(
  start: [number, number], // [lng, lat]
  end: [number, number],   // [lng, lat]
  alternatives = true
): Promise<OSRMRoute[]> {
  const url = `https://router.project-osrm.org/route/v1/driving/${start[0]},${start[1]};${end[0]},${end[1]}`;
  const res = await axios.get<OSRMResponse>(url, {
    params: {
      overview: "full",
      geometries: "polyline",
      alternatives: alternatives ? "true" : "false",
    },
  });

  const routes = res.data.routes || [];
  return routes.map((r) => ({
    distanceKm: r.distance / 1000,
    durationMin: r.duration / 60,
    geometry: r.geometry,
  }));
}

