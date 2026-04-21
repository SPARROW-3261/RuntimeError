import { useState, useRef, useEffect } from "react";
import { Search, MapPin, X, Loader2 } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { Location } from "../types";
import { RANCHI_BOUNDS, isWithinRanchi } from "../utils/ranchiBounds";

interface LocationSearchProps {
  onSelect: (loc: Location) => void;
  placeholder?: string;
  initialValue?: string;
}

export default function LocationSearch({ onSelect, placeholder = "Search location...", initialValue = "" }: LocationSearchProps) {
  const [query, setQuery] = useState(initialValue);
  const [results, setResults] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const searchTimeout = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    setQuery(initialValue);
  }, [initialValue]);

  const searchLocation = async (value: string) => {
    setQuery(value);
    
    if (searchTimeout.current) clearTimeout(searchTimeout.current);

    if (value.length < 3) {
      setResults([]);
      setShowResults(false);
      return;
    }

    setIsLoading(true);
    searchTimeout.current = setTimeout(async () => {
      try {
        const viewbox = `${RANCHI_BOUNDS.west},${RANCHI_BOUNDS.north},${RANCHI_BOUNDS.east},${RANCHI_BOUNDS.south}`;
        const res = await fetch(
          `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(value)}&limit=8&addressdetails=1&accept-language=en&countrycodes=in&viewbox=${encodeURIComponent(viewbox)}&bounded=1`,
          {
            headers: {
              'Accept': 'application/json',
            }
          }
        );
        if (!res.ok) throw new Error('Search failed');
        const data = await res.json();
        const filtered = Array.isArray(data)
          ? data.filter((p: any) => isWithinRanchi(parseFloat(p.lat), parseFloat(p.lon)))
          : [];
        setResults(filtered);
        setShowResults(true);
      } catch (error) {
        console.error("Nominatim search error:", error);
        setResults([]);
      } finally {
        setIsLoading(false);
      }
    }, 500);
  };

  const handleSelect = (place: any) => {
    const lat = parseFloat(place.lat);
    const lng = parseFloat(place.lon);
    if (!isWithinRanchi(lat, lng)) {
      setResults([]);
      setShowResults(false);
      return;
    }
    const loc: Location = {
      name: place.display_name,
      lat,
      lng,
      coordinates: [lng, lat]
    };
    onSelect(loc);
    setResults([]);
    setShowResults(false);
    setQuery(place.display_name);
  };

  return (
    <div className="relative w-full">
      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
        <input
          value={query}
          onChange={(e) => searchLocation(e.target.value)}
          placeholder={placeholder}
          className="w-full pl-12 pr-10 py-4 bg-slate-50 border border-slate-100 rounded-2xl focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all font-medium shadow-sm"
          onFocus={() => query.length >= 3 && setShowResults(true)}
        />
        {query && (
          <button 
            onClick={() => { setQuery(""); setResults([]); setShowResults(false); }}
            className="absolute right-4 top-1/2 -translate-y-1/2 p-1 hover:bg-slate-200 rounded-full transition-colors"
          >
            <X className="w-4 h-4 text-slate-400" />
          </button>
        )}
      </div>

      <AnimatePresence>
        {showResults && (results.length > 0 || isLoading) && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="absolute z-[6000] left-0 right-0 mt-2 bg-white border border-slate-100 rounded-2xl shadow-xl overflow-hidden max-h-64 overflow-y-auto"
          >
            {isLoading ? (
              <div className="p-4 flex items-center justify-center gap-2 text-slate-400">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span className="text-sm font-medium">Searching...</span>
              </div>
            ) : (
              results.map((place) => (
                <button
                  key={place.place_id}
                  onClick={() => handleSelect(place)}
                  className="w-full text-left p-4 hover:bg-slate-50 flex items-start gap-3 border-b border-slate-50 last:border-0 transition-colors"
                >
                  <MapPin className="w-5 h-5 text-slate-400 shrink-0 mt-0.5" />
                  <span className="text-sm font-medium text-slate-700 line-clamp-2">
                    {place.display_name}
                  </span>
                </button>
              ))
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
