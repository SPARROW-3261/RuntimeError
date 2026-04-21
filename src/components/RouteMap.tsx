import { MapContainer, TileLayer, Marker, Polyline, useMap } from "react-leaflet";
import { useEffect, useState } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import polyline from "@mapbox/polyline";
import { Route, Location } from "../types";
import VectorRouteMap from "./VectorRouteMap";

interface RouteMapProps {
  origin: Location;
  destination: Location;
  selectedRoute: Route | null;
  isNavigating?: boolean;
  onProgress?: (progress: number) => void;
}

export default function RouteMap({ origin, destination, selectedRoute, isNavigating, onProgress }: RouteMapProps) {
  const useVectorTiles = String(import.meta.env.VITE_USE_VECTOR_TILES || "").toLowerCase() === "true";

  if (useVectorTiles) {
    return (
      <VectorRouteMap
        origin={origin}
        destination={destination}
        selectedRoute={selectedRoute}
        isNavigating={isNavigating}
        onProgress={onProgress}
      />
    );
  }

  const [currentPos, setCurrentPos] = useState<[number, number] | null>(null);
  const [rotation, setRotation] = useState(0);

  const decodedPath = selectedRoute?.geometry 
    ? polyline.decode(selectedRoute.geometry) as [number, number][]
    : [];

  useEffect(() => {
    if (isNavigating && decodedPath.length > 0) {
      // Keep nav marker fixed at route start unless real GPS updates are wired.
      setCurrentPos(decodedPath[0]);
      setRotation(0);
      if (onProgress) onProgress(0);
    } else {
      setCurrentPos(null);
    }
  }, [isNavigating, selectedRoute]);

  function MapController({ path, focusPos }: { path: [number, number][], focusPos?: [number, number] | null }) {
    const map = useMap();
    useEffect(() => {
      if (focusPos) {
        map.setView(focusPos, map.getZoom(), { animate: true });
      } else if (path.length > 0) {
        const bounds = L.latLngBounds(path);
        map.fitBounds(bounds, { padding: [50, 50] });
      }
    }, [path, focusPos, map]);
    return null;
  }

  const getRouteColor = (type: string) => {
    switch (type) {
      case 'walking': return '#10b981'; // emerald-500
      case 'bus': return '#3b82f6';    // blue-500
      case 'car': return '#ef4444';    // red-500
      case 'auto': return '#f59e0b';   // amber-500
      case 'e-rickshaw': return '#22c55e'; // green-500
      case 'bus+walking': return '#8b5cf6'; // violet-500
      default: return '#6366f1';      // indigo-500
    }
  };

  // Custom icon for the moving vehicle/person
  const navIcon = L.divIcon({
    className: 'nav-marker',
    html: `<div style="transform: rotate(${rotation}deg); transition: transform 0.3s ease;">
            <div style="width: 24px; height: 24px; background: #3b82f6; border-radius: 50%; border: 3px solid white; box-shadow: 0 0 10px rgba(0,0,0,0.3); display: flex; items-center; justify-center;">
              <div style="width: 0; height: 0; border-left: 6px solid transparent; border-right: 6px solid transparent; border-bottom: 10px solid white; margin-bottom: 2px;"></div>
            </div>
          </div>`,
    iconSize: [24, 24],
    iconAnchor: [12, 12],
  });

  return (
    <div className="h-full w-full rounded-3xl overflow-hidden shadow-inner border border-slate-100 relative">
      <MapContainer
        center={[origin.lat, origin.lng]}
        zoom={15}
        style={{ height: "100%", width: "100%" }}
        zoomControl={false}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        
        {!isNavigating && <Marker position={[origin.lat, origin.lng]} />}
        <Marker position={[destination.lat, destination.lng]} />
        
        {currentPos && <Marker position={currentPos} icon={navIcon} />}
        
        {decodedPath.length > 0 && (
          <Polyline 
            positions={decodedPath} 
            color={getRouteColor(selectedRoute?.type || '')}
            weight={8}
            opacity={0.8}
            dashArray={isNavigating ? "1, 10" : undefined}
          />
        )}
        
        <MapController 
          path={decodedPath.length > 0 ? decodedPath : [[origin.lat, origin.lng], [destination.lat, destination.lng]]} 
          focusPos={isNavigating ? currentPos : null}
        />
      </MapContainer>
      
      {isNavigating && (
        <div className="absolute top-4 right-4 z-[1000] bg-white/90 backdrop-blur p-2 rounded-full shadow-lg border border-slate-100">
          <div 
            className="w-8 h-8 flex items-center justify-center transition-transform duration-300"
            style={{ transform: `rotate(${-rotation}deg)` }}
          >
            <div className="w-1 h-4 bg-rose-500 rounded-full mb-2"></div>
            <div className="w-1 h-4 bg-slate-300 rounded-full"></div>
          </div>
        </div>
      )}
    </div>
  );
}
