import { useEffect, useMemo, useRef, useState } from "react";
import polyline from "@mapbox/polyline";
import type { Route, Location } from "../types";

interface RouteMapProps {
  origin: Location;
  destination: Location;
  selectedRoute: Route | null;
  isNavigating?: boolean;
  onProgress?: (progress: number) => void;
}

declare global {
  interface Window {
    maplibregl?: any;
    pmtiles?: any;
  }
}

const MAPLIBRE_CSS = "https://unpkg.com/maplibre-gl@4.7.1/dist/maplibre-gl.css";
const MAPLIBRE_JS = "https://unpkg.com/maplibre-gl@4.7.1/dist/maplibre-gl.js";
const PMTILES_JS = "https://unpkg.com/pmtiles@3.0.5/dist/pmtiles.js";

let loaders: Promise<void> | null = null;

async function loadScript(src: string): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    if (document.querySelector(`script[src="${src}"]`)) {
      resolve();
      return;
    }
    const script = document.createElement("script");
    script.src = src;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error(`Failed to load ${src}`));
    document.head.appendChild(script);
  });
}

function ensureMaplibreAssets(): Promise<void> {
  if (loaders) return loaders;

  loaders = (async () => {
    if (!document.querySelector(`link[href="${MAPLIBRE_CSS}"]`)) {
      const link = document.createElement("link");
      link.rel = "stylesheet";
      link.href = MAPLIBRE_CSS;
      document.head.appendChild(link);
    }
    await loadScript(MAPLIBRE_JS);
    await loadScript(PMTILES_JS);
  })();

  return loaders;
}

function makeRouteFeature(path: [number, number][]) {
  return {
    type: "Feature",
    properties: {},
    geometry: {
      type: "LineString",
      coordinates: path.map(([lat, lng]) => [lng, lat]),
    },
  };
}

function makePointFeature(type: string, lat: number, lng: number) {
  return {
    type: "Feature",
    properties: { type },
    geometry: {
      type: "Point",
      coordinates: [lng, lat],
    },
  };
}

export default function VectorRouteMap({
  origin,
  destination,
  selectedRoute,
  isNavigating,
  onProgress,
}: RouteMapProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<any>(null);
  const protocolAddedRef = useRef(false);
  const [mapReady, setMapReady] = useState(false);
  const [currentPos, setCurrentPos] = useState<[number, number] | null>(null);

  const decodedPath = useMemo(() => {
    if (!selectedRoute?.geometry) return [];
    return polyline.decode(selectedRoute.geometry) as [number, number][];
  }, [selectedRoute?.geometry]);

  useEffect(() => {
    if (isNavigating && decodedPath.length > 0) {
      setCurrentPos(decodedPath[0]);
      onProgress?.(0);
    } else {
      setCurrentPos(null);
    }
  }, [isNavigating, decodedPath, onProgress]);

  useEffect(() => {
    let cancelled = false;

    const init = async () => {
      await ensureMaplibreAssets();
      if (cancelled || !containerRef.current) return;

      const maplibregl = window.maplibregl;
      if (!maplibregl) return;

      const pmtiles = window.pmtiles;
      const pmtilesUrl = String(import.meta.env.VITE_PMTILES_URL || "").trim();
      const styleUrl = String(import.meta.env.VITE_MAP_STYLE_URL || "https://demotiles.maplibre.org/style.json");

      if (pmtiles && !protocolAddedRef.current) {
        const protocol = new pmtiles.Protocol();
        maplibregl.addProtocol("pmtiles", protocol.tile);
        if (pmtilesUrl) {
          const p = new pmtiles.PMTiles(pmtilesUrl);
          protocol.add(p);
        }
        protocolAddedRef.current = true;
      }

      mapRef.current = new maplibregl.Map({
        container: containerRef.current,
        style: styleUrl,
        center: [origin.lng, origin.lat],
        zoom: 14,
        attributionControl: true,
      });

      mapRef.current.on("load", () => {
        if (cancelled) return;

        if (!mapRef.current.getSource("route-source")) {
          mapRef.current.addSource("route-source", {
            type: "geojson",
            data: { type: "FeatureCollection", features: [] },
          });
        }

        if (!mapRef.current.getSource("poi-source")) {
          mapRef.current.addSource("poi-source", {
            type: "geojson",
            data: { type: "FeatureCollection", features: [] },
          });
        }

        if (!mapRef.current.getLayer("route-line")) {
          mapRef.current.addLayer({
            id: "route-line",
            type: "line",
            source: "route-source",
            paint: {
              "line-color": "#4f46e5",
              "line-width": 6,
              "line-opacity": 0.85,
            },
          });
        }

        if (!mapRef.current.getLayer("poi-circles")) {
          mapRef.current.addLayer({
            id: "poi-circles",
            type: "circle",
            source: "poi-source",
            paint: {
              "circle-radius": [
                "match",
                ["get", "type"],
                "origin",
                6,
                "destination",
                6,
                "current",
                7,
                5,
              ],
              "circle-color": [
                "match",
                ["get", "type"],
                "origin",
                "#16a34a",
                "destination",
                "#dc2626",
                "current",
                "#2563eb",
                "#64748b",
              ],
              "circle-stroke-width": 2,
              "circle-stroke-color": "#ffffff",
            },
          });
        }

        setMapReady(true);
      });
    };

    init().catch((err) => {
      console.error("Vector map init failed:", err);
    });

    return () => {
      cancelled = true;
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
      setMapReady(false);
    };
  }, [origin.lat, origin.lng]);

  useEffect(() => {
    if (!mapReady || !mapRef.current) return;

    const path = decodedPath.length > 0 ? decodedPath : [[origin.lat, origin.lng], [destination.lat, destination.lng]];
    const routeSrc = mapRef.current.getSource("route-source");
    if (routeSrc) {
      routeSrc.setData({
        type: "FeatureCollection",
        features: [makeRouteFeature(path)],
      });
    }

    const points = [
      makePointFeature("origin", origin.lat, origin.lng),
      makePointFeature("destination", destination.lat, destination.lng),
    ];

    if (currentPos) {
      points.push(makePointFeature("current", currentPos[0], currentPos[1]));
    }

    const poiSrc = mapRef.current.getSource("poi-source");
    if (poiSrc) {
      poiSrc.setData({
        type: "FeatureCollection",
        features: points,
      });
    }

    if (path.length > 1) {
      const bounds = path.reduce(
        (b, [lat, lng]) => b.extend([lng, lat]),
        new window.maplibregl.LngLatBounds([path[0][1], path[0][0]], [path[0][1], path[0][0]])
      );
      mapRef.current.fitBounds(bounds, { padding: 40, maxZoom: 16, duration: 600 });
    } else {
      mapRef.current.easeTo({ center: [origin.lng, origin.lat], zoom: 15, duration: 500 });
    }
  }, [mapReady, decodedPath, origin.lat, origin.lng, destination.lat, destination.lng, currentPos]);

  return (
    <div className="h-full w-full rounded-3xl overflow-hidden shadow-inner border border-slate-100 relative">
      <div ref={containerRef} style={{ height: "100%", width: "100%" }} />
      {!mapReady && (
        <div className="absolute inset-0 flex items-center justify-center bg-slate-100/80 text-slate-600 text-sm font-bold">
          Loading vector map...
        </div>
      )}
    </div>
  );
}
