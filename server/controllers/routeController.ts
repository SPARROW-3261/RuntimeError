import { Request, Response } from 'express';
import { getORSRoute } from '../services/orsService';
import { planOTPTransit } from '../services/otpService';
import { getAQI } from '../services/aqiService';
import { getOSRMDrivingRoutes } from '../services/osrmService';
import { calculateEmission } from '../utils/emissionCalculator';
import { calculateEcoScore, rankRoutes } from '../utils/scoringLogic';
import { calculateFare } from '../utils/fareCalculator';
import polyline from '@mapbox/polyline';
import { isWithinRanchi } from '../utils/ranchiBounds';

// In-memory storage for history
export const tripHistory: any[] = [];

export const getRoutes = async (req: Request, res: Response) => {
  try {
    const { origin, destination, impact } = req.body;

    if (!origin || !destination || !impact) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const start: [number, number] = [origin.lng, origin.lat];
    const end: [number, number] = [destination.lng, destination.lat];

    if (!isWithinRanchi(origin.lat, origin.lng) || !isWithinRanchi(destination.lat, destination.lng)) {
      return res.status(400).json({ error: 'This app works only for Ranchi city. Please select locations within Ranchi.' });
    }

    // 1. Fetch real routes from ORS with individual error handling
    const fetchORS = async (profile: any, start: any, end: any) => {
      try {
        return await getORSRoute(profile, start, end);
      } catch (err) {
        console.error(`ORS ${profile} failed, falling back to straight line:`, err);
        // Fallback straight line logic
        const directDist = calculateHaversine(start[1], start[0], end[1], end[0]);
        const roadDist = directDist * 1.2;
        let speed = profile === "driving-car" ? 45 : 5;
        
        // Encode a straight line between origin and destination
        const line = [[start[1], start[0]], [end[1], end[0]]];
        const geometry = polyline.encode(line as [number, number][]);

        return {
          distance: roadDist,
          duration: (roadDist / speed) * 60,
          geometry: geometry
        };
      }
    };

    const [walkingRoute, carRoute] = await Promise.all([
      fetchORS("foot-walking", start, end),
      fetchORS("driving-car", start, end)
    ]);

    // Ranchi Logic Step: generate alternative driving geometries so we can choose "main road" vs "back-road".
    let drivingAlts: { distanceKm: number; durationMin: number; geometry: string }[] = [];
    try {
      drivingAlts = await getOSRMDrivingRoutes(start, end, true);
    } catch {
      drivingAlts = [];
    }

    const bestDriving = drivingAlts.length > 0
      ? drivingAlts.reduce((best, r) => (r.durationMin < best.durationMin ? r : best))
      : null;

    const computeExposure = async (geometry: string, durationMin: number) => {
      const pts = geometry ? (polyline.decode(geometry) as [number, number][]) : [];
      const stride = pts.length > 0 ? Math.max(1, Math.floor(pts.length / 8)) : 1;
      const sample = pts.length > 0 ? pts.filter((_: any, i: number) => i % stride === 0) : [];
      const aqis: number[] = [];
      for (const [lat, lng] of sample) {
        const aqi = await getAQI(lat, lng);
        if (aqi != null) aqis.push(aqi);
      }
      const avgAqi = aqis.length > 0 ? aqis.reduce((a, b) => a + b, 0) / aqis.length : null;
      const exposure = avgAqi != null ? (avgAqi * durationMin) : (durationMin * 50);
      return { exposure, avgAqi };
    };

    const altWithExposure = await Promise.all(drivingAlts.slice(0, 3).map(async (r) => {
      const ex = await computeExposure(r.geometry, r.durationMin);
      return { ...r, ...ex };
    }));

    const backRoad = altWithExposure.length > 0
      ? altWithExposure.reduce((best, r) => (r.exposure < best.exposure ? r : best))
      : null;

    const safeDistance = (value: number) => Math.max(0, value || 0);
    const safeDuration = (value: number) => Math.max(0, value || 0);
    const durationAtSpeed = (distanceKm: number, speedKmph: number) =>
      speedKmph > 0 ? (safeDistance(distanceKm) / speedKmph) * 60 : 0;

    // Walking should not come back at unrealistically high speeds.
    const normalizedWalkingDuration = Math.max(
      safeDuration(walkingRoute.duration),
      durationAtSpeed(walkingRoute.distance, 5)
    );

    // Car time lower bound for dense city traffic.
    const normalizedCarDuration = Math.max(
      safeDuration(carRoute.duration),
      durationAtSpeed(carRoute.distance, 20)
    );

    const useOtp = String(process.env.ROUTING_ENGINE || '').toLowerCase() === 'otp';
    let otpItineraries: Awaited<ReturnType<typeof planOTPTransit>> = [];

    if (useOtp) {
      try {
        otpItineraries = await planOTPTransit(start, end);
      } catch (err: any) {
        console.warn('OTP routing failed, falling back to simulated transit:', err?.message || err);
        otpItineraries = [];
      }
    }

    const otpTransitIts = otpItineraries.filter((it) => it.transitDistanceKm > 0.05);

    // Pick "Bus" as the fastest transit itinerary.
    const otpBusIt = otpTransitIts.length > 0
      ? otpTransitIts.reduce((best, it) => (it.durationMin < best.durationMin ? it : best))
      : null;

    // Pick "Bus+Walk" as the itinerary with the most walking.
    const otpComboIt = otpTransitIts.length > 1
      ? otpTransitIts.reduce((best, it) => (it.walkDistanceKm > best.walkDistanceKm ? it : best))
      : null;

    // Helper for simulation fallback
    function calculateHaversine(lat1: number, lon1: number, lat2: number, lon2: number): number {
      const R = 6371;
      const dLat = (lat2 - lat1) * Math.PI / 180;
      const dLon = (lon2 - lon1) * Math.PI / 180;
      const a = Math.sin(dLat/2) * Math.sin(dLat/2) + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon/2) * Math.sin(dLon/2);
      return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    }

    // 2. Simulate Bus Route based on car route
    // Bus Model: 0.5km walk to stop, 5min wait, 1.3x driving duration
    let busRoute: { distance: number; duration: number; cost: number; emission: number; geometry: string; tags?: string[] } = {
      distance: carRoute.distance,
      duration: (normalizedCarDuration * 1.3) + 10, // 10 min wait
      cost: Math.max(20, carRoute.distance * 3), // ₹3 per km, min ₹20
      emission: calculateEmission('bus', carRoute.distance),
      geometry: carRoute.geometry 
    };

    if (otpBusIt) {
      busRoute = {
        distance: otpBusIt.distanceKm,
        duration: otpBusIt.durationMin,
        cost: Math.max(20, otpBusIt.transitDistanceKm * 3),
        emission: calculateEmission('bus', otpBusIt.transitDistanceKm),
        geometry: otpBusIt.geometry || carRoute.geometry,
        tags: ["GTFS"]
      };
    } else {
      busRoute.tags = ["Simulated"];
    }

    // 2.5 Simulate Bus + Walking combo
    const walkDist = Math.min(2, carRoute.distance * 0.15);
    const busDist = Math.max(0, carRoute.distance - walkDist);
    // Bus+walk usually includes access/egress detours and transfers beyond direct road distance.
    const comboDistance = (busDist * 1.03) + (walkDist * 1.2) + 0.2;
    let comboRoute: { type: 'bus+walking'; distance: number; duration: number; cost: number; emission: number; geometry: string; tags?: string[] } = {
      type: 'bus+walking',
      distance: comboDistance,
      duration: (walkDist / 5 * 60) + (busDist / 35 * 60) + 12, // 12 min wait/transfer
      cost: Math.max(20, busDist * 3),
      // Add small transfer/start-stop overhead for realistic transit operations.
      emission: calculateEmission('bus', busDist) + 0.02,
      geometry: carRoute.geometry
    };

    if (otpComboIt) {
      comboRoute = {
        type: 'bus+walking',
        distance: otpComboIt.distanceKm,
        duration: otpComboIt.durationMin,
        cost: Math.max(20, otpComboIt.transitDistanceKm * 3),
        emission: calculateEmission('bus', otpComboIt.transitDistanceKm) + 0.02,
        geometry: otpComboIt.geometry || carRoute.geometry,
        tags: ["GTFS"]
      };
    } else {
      comboRoute.tags = ["Simulated"];
    }

    // UX rule: bus+walk should not be faster than pure bus.
    // In real GTFS data, a "more walking" itinerary can be faster due to different stops/waits,
    // but for this app we keep the expectation consistent.
    if (comboRoute.duration <= busRoute.duration) {
      comboRoute.duration = busRoute.duration + 3;
    }

    const busFare = calculateFare('bus', busRoute.distance);
    const comboFare = Math.max(0, Math.min(calculateFare('bus+walking', comboRoute.distance), busFare - 1));

    const routesData = [
      {
        type: 'walking',
        distance: walkingRoute.distance,
        duration: normalizedWalkingDuration,
        cost: calculateFare('walking', walkingRoute.distance),
        emission: calculateEmission('walking', walkingRoute.distance),
        geometry: walkingRoute.geometry
      },
      {
        type: 'bus',
        distance: busRoute.distance,
        duration: busRoute.duration,
        cost: busFare,
        emission: busRoute.emission,
        geometry: busRoute.geometry,
        tags: busRoute.tags
      },
      {
        type: 'bus+walking',
        distance: comboRoute.distance,
        duration: comboRoute.duration,
        cost: comboFare,
        emission: comboRoute.emission,
        geometry: comboRoute.geometry,
        tags: comboRoute.tags
      },
      {
        type: 'auto',
        distance: bestDriving?.distanceKm ?? carRoute.distance,
        duration: (bestDriving?.durationMin ?? normalizedCarDuration) * 1.05,
        cost: calculateFare('auto', bestDriving?.distanceKm ?? carRoute.distance),
        emission: calculateEmission('auto', bestDriving?.distanceKm ?? carRoute.distance),
        geometry: bestDriving?.geometry ?? carRoute.geometry,
        tags: ['Direct Auto', 'Main Road']
      },
      {
        type: 'e-rickshaw',
        distance: backRoad?.distanceKm ?? carRoute.distance,
        duration: (backRoad?.durationMin ?? normalizedCarDuration) * 1.2 + 8,
        cost: calculateFare('e-rickshaw', backRoad?.distanceKm ?? carRoute.distance),
        emission: calculateEmission('e-rickshaw', backRoad?.distanceKm ?? carRoute.distance),
        geometry: backRoad?.geometry ?? carRoute.geometry,
        tags: ['Walk + E-Rickshaw', 'Back-road', 'Zero Emission']
      },
      {
        type: 'car',
        distance: carRoute.distance,
        duration: normalizedCarDuration,
        cost: calculateFare('car', carRoute.distance),
        emission: calculateEmission('car', carRoute.distance),
        geometry: carRoute.geometry
      }
    ];

    // AQI Exposure: sample points along each route geometry and compute a simple exposure score.
    // Exposure = avg(AQI) * duration (minutes). Lower is better.
    const routesWithExposure = await Promise.all(routesData.map(async (route: any) => {
      const pts = route.geometry ? (polyline.decode(route.geometry) as [number, number][]) : [];
      const stride = pts.length > 0 ? Math.max(1, Math.floor(pts.length / 8)) : 1;
      const sample = pts.length > 0 ? pts.filter((_: any, i: number) => i % stride === 0) : [];

      const aqis: number[] = [];
      for (const [lat, lng] of sample) {
        const aqi = await getAQI(lat, lng);
        if (aqi != null) aqis.push(aqi);
      }

      const avgAqi = aqis.length > 0 ? aqis.reduce((a, b) => a + b, 0) / aqis.length : null;
      const exposure = avgAqi != null ? (avgAqi * route.duration) : (route.duration * 50);

      const exposureTag = avgAqi == null
        ? 'AQI Est.'
        : avgAqi >= 200 ? 'AQI High' : avgAqi >= 100 ? 'AQI Med' : 'AQI Low';

      return {
        ...route,
        exposure: Number(exposure.toFixed(2)),
        tags: Array.isArray(route.tags) ? [...route.tags, exposureTag] : [exposureTag]
      };
    }));

    // 3. Normalization Max Values
    const maxValues = {
      time: Math.max(...routesWithExposure.map(r => r.duration)),
      cost: Math.max(...routesWithExposure.map(r => r.cost)),
      emission: Math.max(...routesWithExposure.map(r => r.emission)),
      exposure: Math.max(...routesWithExposure.map(r => r.exposure)),
    };

    // 4. Calculate Eco Scores
    const scoredRoutes = routesWithExposure.map(route => ({
      ...route,
      distance: Number(route.distance.toFixed(2)),
      duration: Math.round(route.duration),
      cost: Math.round(route.cost),
      emission: Number(route.emission.toFixed(2)),
      ecoScore: Math.round(calculateEcoScore(
        route.duration,
        route.cost,
        route.emission,
        route.exposure,
        maxValues,
        impact
      ))
    }));

    // 5. Rank Routes
    const rankedRoutes = rankRoutes(scoredRoutes);

    res.json({ routes: rankedRoutes });
  } catch (error: any) {
    console.error('Route Controller Error:', error.message);
    res.status(500).json({ error: 'Internal server error', message: error.message });
  }
};

export const saveTrip = (req: Request, res: Response) => {
  const trip = req.body;
  trip.id = `trip-${Date.now()}`;
  trip.timestamp = new Date().toISOString();
  tripHistory.unshift(trip);
  res.json({ success: true, trip });
};

export const getHistory = (req: Request, res: Response) => {
  res.json({ history: tripHistory });
};

export const deleteHistoryTrip = (req: Request, res: Response) => {
  const rawId = req.params.id || req.body?.id || '';
  const rawTimestamp = req.body?.timestamp || '';
  const candidates = [rawId, rawTimestamp]
    .filter(Boolean)
    .map((value: string) => decodeURIComponent(String(value)));

  if (candidates.length === 0) {
    return res.status(400).json({ error: 'Trip id or timestamp is required' });
  }

  const index = tripHistory.findIndex((trip) => {
    const tripId = String(trip.id ?? '');
    const tripTimestamp = String(trip.timestamp ?? '');
    return candidates.includes(tripId) || candidates.includes(tripTimestamp);
  });

  if (index === -1) {
    return res.status(404).json({ error: 'Trip not found' });
  }

  const deleted = tripHistory[index];
  tripHistory.splice(index, 1);
  res.json({ success: true, id: deleted?.id, timestamp: deleted?.timestamp });
};
