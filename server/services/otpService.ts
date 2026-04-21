import axios from "axios";

export interface OTPItinerary {
  durationMin: number;
  distanceKm: number;
  walkDistanceKm: number;
  transitDistanceKm: number;
  geometry?: string;
  fare?: number;
}

type OTPPlanResponse = {
  plan?: {
    itineraries?: Array<{
      duration?: number; // seconds
      walkDistance?: number; // meters
      fare?: {
        fare?: {
          regular?: { cents?: number };
        };
      };
      legs?: Array<{
        mode?: string;
        distance?: number; // meters
        legGeometry?: { points?: string };
      }>;
    }>;
  };
  error?: any;
};

const safeNumber = (value: any, fallback = 0) => {
  const num = typeof value === "number" ? value : Number(value);
  return Number.isFinite(num) ? num : fallback;
};

export async function planOTPTransit(
  start: [number, number], // [lng, lat]
  end: [number, number]    // [lng, lat]
): Promise<OTPItinerary[]> {
  const baseUrl = process.env.OTP_BASE_URL || "http://localhost:8080";
  const planPath = process.env.OTP_PLAN_PATH || "/otp/routers/default/plan";

  const url = `${baseUrl}${planPath}`;
  const params = {
    fromPlace: `${start[1]},${start[0]}`,
    toPlace: `${end[1]},${end[0]}`,
    mode: "TRANSIT,WALK",
    numItineraries: 3,
    // OTP expects walkSpeed in m/s; ~1.4 m/s is a normal walking pace.
    walkSpeed: 1.4,
  };

  const response = await axios.get<OTPPlanResponse>(url, { params });
  const itineraries = response.data?.plan?.itineraries || [];

  return itineraries.map((it) => {
    const legs = it.legs || [];

    const totalDistanceM = legs.reduce((sum, leg) => sum + safeNumber(leg.distance), 0);
    const walkDistanceM = legs
      .filter((leg) => (leg.mode || "").toUpperCase() === "WALK")
      .reduce((sum, leg) => sum + safeNumber(leg.distance), 0);
    const transitDistanceM = Math.max(0, totalDistanceM - walkDistanceM);

    const geometry =
      legs.find((leg) => leg.legGeometry?.points)?.legGeometry?.points ||
      undefined;

    const fareCents = it.fare?.fare?.regular?.cents;
    const fare = fareCents != null ? safeNumber(fareCents) / 100 : undefined;

    return {
      durationMin: safeNumber(it.duration) / 60,
      distanceKm: totalDistanceM / 1000,
      walkDistanceKm: walkDistanceM / 1000,
      transitDistanceKm: transitDistanceM / 1000,
      geometry,
      fare,
    };
  });
}

