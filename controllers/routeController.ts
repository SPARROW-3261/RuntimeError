import { Request, Response } from 'express';
import { getORSRoute } from '../services/orsService';
import { calculateEmission, TransportMode } from '../utils/emissionCalculator';
import { calculateEcoScore, rankRoutes } from '../utils/scoringLogic';

export const getRoutes = async (req: Request, res: Response) => {
  try {
    const { origin, destination, preferences } = req.body;
    console.log('Incoming route request:', { origin, destination, preferences });

    if (!origin || !destination || !preferences) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // ORS expects [lng, lat]
    const start: [number, number] = [origin.lng, origin.lat];
    const end: [number, number] = [destination.lng, destination.lat];

    // 1. Fetch real routes from ORS with fallback
    let walkingRoute, carRoute, cyclingRoute;
    try {
      [walkingRoute, carRoute, cyclingRoute] = await Promise.all([
        getORSRoute("foot-walking", start, end),
        getORSRoute("driving-car", start, end),
        getORSRoute("cycling-regular", start, end)
      ]);
    } catch (error: any) {
      console.warn('ORS API failed, falling back to simulation:', error.message);
      
      // High-fidelity simulation based on straight-line distance
      const earthRadius = 6371; // km
      const dLat = (destination.lat - origin.lat) * Math.PI / 180;
      const dLon = (destination.lng - origin.lng) * Math.PI / 180;
      const a = 
        Math.sin(dLat/2) * Math.sin(dLat/2) +
        Math.cos(origin.lat * Math.PI / 180) * Math.cos(destination.lat * Math.PI / 180) * 
        Math.sin(dLon/2) * Math.sin(dLon/2);
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
      const directDist = earthRadius * c;
      
      // Road distance is usually ~1.3x straight line
      const roadDist = directDist * 1.3;

      walkingRoute = { distance: roadDist, duration: roadDist * 12 }; // 5km/h -> 12 min/km
      carRoute = { distance: roadDist, duration: roadDist * 1.5 }; // 40km/h -> 1.5 min/km
      cyclingRoute = { distance: roadDist, duration: roadDist * 4 }; // 15km/h -> 4 min/km
    }

    // 2. Multi-modal simulation (Bus)
    // Bus is based on car route but slower and has a base cost
    const busRoute = {
      mode: 'bus',
      distance: carRoute.distance,
      duration: carRoute.duration * 1.2 + 5, // 20% slower + 5 min wait
      cost: 2.50 // Flat fare
    };

    const routesData = [
      {
        mode: 'walking',
        distance: walkingRoute.distance,
        duration: walkingRoute.duration,
        cost: 0,
        emission: calculateEmission('walking', walkingRoute.distance)
      },
      {
        mode: 'cycling',
        distance: cyclingRoute.distance,
        duration: cyclingRoute.duration,
        cost: 0,
        emission: calculateEmission('cycling', cyclingRoute.distance)
      },
      {
        mode: 'bus',
        distance: busRoute.distance,
        duration: busRoute.duration,
        cost: busRoute.cost,
        emission: calculateEmission('bus', busRoute.distance)
      },
      {
        mode: 'car',
        distance: carRoute.distance,
        duration: carRoute.duration,
        cost: carRoute.distance * 0.15, // fuel/wear
        emission: calculateEmission('car', carRoute.distance)
      }
    ];

    // 3. Find max values for normalization
    const maxValues = {
      time: Math.max(...routesData.map(r => r.duration)),
      cost: Math.max(...routesData.map(r => r.cost)),
      emission: Math.max(...routesData.map(r => r.emission)),
    };

    // 4. Calculate Eco Scores and format
    const weights = {
      time: preferences.timeWeight || 33,
      cost: preferences.costWeight || 33,
      emission: preferences.emissionWeight || 33
    };

    const scoredRoutes = routesData.map((route) => ({
      mode: route.mode,
      distance: Number(route.distance.toFixed(2)),
      duration: Math.round(route.duration),
      cost: Number(route.cost.toFixed(2)),
      emission: Number(route.emission.toFixed(3)),
      ecoScore: Math.round(calculateEcoScore(
        route.duration,
        route.cost,
        route.emission,
        maxValues,
        weights
      )),
    }));

    // 5. Rank and return
    const rankedRoutes = rankRoutes(scoredRoutes);

    res.json({ routes: rankedRoutes });
  } catch (error: any) {
    console.error('Route Controller Error:', error.message);
    res.status(500).json({ error: 'Internal server error', message: error.message });
  }
};
