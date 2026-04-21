import { MapContainer, TileLayer, Marker, useMapEvents, useMap } from "react-leaflet";
import { useState, useEffect } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { Navigation } from "lucide-react";
import { Location } from "../types";
import { isWithinRanchi, RANCHI_BOUNDS } from "../utils/ranchiBounds";

// Fix for default marker icon in Leaflet
const DefaultIcon = L.icon({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41]
});

L.Marker.prototype.options.icon = DefaultIcon;

interface MapPickerProps {
  onSelect: (loc: Location) => void;
  initialPos?: [number, number];
}

export default function MapPicker({ onSelect, initialPos }: MapPickerProps) {
  const [marker, setMarker] = useState<[number, number] | null>(initialPos || null);
  const [error, setError] = useState<string | null>(null);

  const reverseGeocode = async (lat: number, lng: number): Promise<string> => {
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`
      );
      const data = await res.json();
      return data.display_name || "Custom Selected Location";
    } catch (error) {
      console.error("Reverse geocoding error:", error);
      return "Custom Selected Location";
    }
  };

  function LocationSelector() {
    useMapEvents({
      async click(e) {
        const { lat, lng } = e.latlng;
        if (!isWithinRanchi(lat, lng)) {
          setError("Only Ranchi city is supported. Please pick a location inside Ranchi.");
          return;
        }
        setError(null);
        setMarker([lat, lng]);
        const address = await reverseGeocode(lat, lng);
        onSelect({
          name: address,
          lat,
          lng,
          coordinates: [lng, lat]
        });
      },
    });
    return marker ? <Marker position={marker} /> : null;
  }

  function MapController({ center }: { center: [number, number] | null }) {
    const map = useMap();
    useEffect(() => {
      if (center) {
        map.setView(center, 15);
      }
    }, [center, map]);
    return null;
  }

  const getCurrentLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(async (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        if (!isWithinRanchi(lat, lng)) {
          setError("Your current location is outside Ranchi. This app works only for Ranchi city.");
          return;
        }
        setError(null);
        setMarker([lat, lng]);
        const address = await reverseGeocode(lat, lng);
        onSelect({
          name: address,
          lat,
          lng,
          coordinates: [lng, lat]
        });
      });
    }
  };

  return (
    <div className="relative rounded-2xl overflow-hidden border border-slate-100 shadow-inner">
      <MapContainer
        center={initialPos || [23.3441, 85.3096]}
        zoom={13}
        style={{ height: "350px", width: "100%" }}
        zoomControl={false}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <LocationSelector />
        <MapController center={marker} />
      </MapContainer>

      <button
        onClick={getCurrentLocation}
        className="absolute bottom-4 right-4 p-3 bg-white rounded-full shadow-lg hover:bg-slate-50 transition-colors z-[1000] border border-slate-100"
        title="Get Current Location"
      >
        <Navigation className="w-5 h-5 text-primary" />
      </button>

      {error && (
        <div className="absolute top-4 left-4 right-4 z-[1000] bg-white/95 backdrop-blur border border-slate-100 rounded-2xl p-3 shadow-lg">
          <p className="text-sm font-bold text-rose-600">{error}</p>
          <p className="text-xs text-slate-500 mt-1">
            Ranchi bounds: {RANCHI_BOUNDS.south.toFixed(3)}–{RANCHI_BOUNDS.north.toFixed(3)} lat, {RANCHI_BOUNDS.west.toFixed(3)}–{RANCHI_BOUNDS.east.toFixed(3)} lng.
          </p>
        </div>
      )}
    </div>
  );
}
