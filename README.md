<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/62d6a0d9-cbac-4b6f-b9b7-93b07be8b24f

## Run Locally

**Prerequisites:**  Node.js


1. Install dependencies:
   `npm install`
2. Set the `GEMINI_API_KEY` in [.env.local](.env.local) to your Gemini API key
3. Run the app:
   `npm run dev`

## Optional: Real Transit Routing (No Docker)

This project can use OpenTripPlanner (OTP) for real transit itineraries (OSM + GTFS), instead of simulating bus routes.

1. Run OTP locally (Java) with an OSM extract and a GTFS feed for your city.
2. Set env vars:
   - `ROUTING_ENGINE="otp"`
   - `OTP_BASE_URL="http://localhost:8080"`
   - `OTP_PLAN_PATH="/otp/routers/default/plan"` (OTP1 default)

If OTP is not running or fails, the app falls back to simulated bus and bus+walk routes automatically.

## Vector Tiles + Offline Cache

This app supports a vector map mode for route display and offline-friendly caching:

1. Enable in `.env.local`:
   - `VITE_USE_VECTOR_TILES="true"`
   - `VITE_MAP_STYLE_URL="<your style.json URL>"`
   - `VITE_PMTILES_URL="<optional ranchi.pmtiles URL>"`
2. Run app and open route screen once while online (tiles/styles are cached by service worker).
3. Later, if network is unavailable:
   - cached map tiles/styles can still render
   - routing tries server first, then falls back to local JSON route cache.

Notes:
- Core routing logic remains on server.
- Local route cache key is based on origin, destination, and weight settings.
