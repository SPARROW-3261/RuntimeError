import { motion } from "motion/react";
import { ChevronLeft, Shuffle } from "lucide-react";
import { useApp } from "../context/AppContext";

interface RanchiLogicScreenProps {
  onBack: () => void;
}

export default function RanchiLogicScreen({ onBack }: RanchiLogicScreenProps) {
  const { settings } = useApp();

  return (
    <div className={`flex flex-col h-screen overflow-y-auto px-6 pt-10 pb-24 transition-colors ${
      settings.darkMode ? "bg-slate-950 text-white" : "bg-slate-50 text-slate-900"
    }`}>
      <header className="flex items-center gap-4 mb-8">
        <motion.button
          whileTap={{ scale: 0.9 }}
          onClick={onBack}
          className={`w-12 h-12 rounded-2xl shadow-lg flex items-center justify-center border transition-colors ${
            settings.darkMode ? "bg-slate-900 border-slate-800 text-white" : "bg-white border-slate-100 text-slate-800"
          }`}
          aria-label="Back"
        >
          <ChevronLeft className="w-6 h-6" />
        </motion.button>
        <div>
          <h1 className={`text-2xl font-black tracking-tight ${settings.darkMode ? "text-white" : "text-slate-900"}`}>
            The &quot;Ranchi Logic&quot; Flowchart
          </h1>
          <p className="text-sm text-slate-400 font-medium">
            How the app decides best routes inside Ranchi.
          </p>
        </div>
      </header>

      <motion.section
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className={`rounded-[28px] border shadow-sm overflow-hidden ${
          settings.darkMode ? "bg-slate-900 border-slate-800" : "bg-white border-slate-100"
        }`}
      >
        <div className="p-6">
          <ol className="space-y-4 text-sm leading-relaxed">
            <li>
              <span className="font-black text-slate-400 mr-2">1.</span>
              <span className="font-bold">Input:</span> User inputs <span className="font-black">&quot;Kanke&quot;</span> to{" "}
              <span className="font-black">&quot;Lalpur&quot;</span>.
            </li>
            <li>
              <span className="font-black text-slate-400 mr-2">2.</span>
              <span className="font-bold">Step 1:</span> System checks available shared autos and buses for this route.
            </li>
            <li>
              <span className="font-black text-slate-400 mr-2">3.</span>
              <span className="font-bold">Step 2:</span> System fetches current AQI of key corridors (example: Kutcheri Road).
            </li>
            <li>
              <span className="font-black text-slate-400 mr-2">4.</span>
              <span className="font-bold">Step 3:</span> System generates options:
              <div className="mt-3 space-y-3">
                <div className={`p-4 rounded-2xl border ${
                  settings.darkMode ? "border-slate-800 bg-slate-950/30" : "border-slate-100 bg-slate-50"
                }`}>
                  <p className="font-black">Option A: Direct Auto</p>
                  <p className="text-slate-400 text-xs mt-1">Fast, but higher CO2 and dust exposure on main roads.</p>
                </div>
                <div className={`p-4 rounded-2xl border ${
                  settings.darkMode ? "border-emerald-900/40 bg-emerald-500/5" : "border-emerald-100 bg-emerald-50/70"
                }`}>
                  <p className="font-black flex items-center gap-2">
                    <Shuffle className="w-4 h-4 text-emerald-500" />
                    Option B: Walk + E-Rickshaw via back-roads
                  </p>
                  <p className="text-slate-400 text-xs mt-1">Slightly longer, but lower local emissions and lower dust.</p>
                </div>
              </div>
            </li>
            <li>
              <span className="font-black text-slate-400 mr-2">5.</span>
              <span className="font-bold">Output:</span> Display options with a <span className="font-black">Health Score</span> (AQI exposure) and an eco score.
            </li>
          </ol>
        </div>
      </motion.section>

      <div className="h-6" />

      <motion.section
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05 }}
        className={`rounded-[28px] border shadow-sm overflow-hidden ${
          settings.darkMode ? "bg-slate-900 border-slate-800" : "bg-white border-slate-100"
        }`}
      >
        <div className="p-6">
          <h2 className={`text-lg font-black ${settings.darkMode ? "text-white" : "text-slate-900"}`}>
            Judge Ko Impress Karne Wala Point
          </h2>
          <div className="mt-4">
            <p className="text-sm font-black text-amber-400">Offline-First Design</p>
            <p className="text-sm text-slate-400 mt-2 leading-relaxed">
              Ranchi ke kai ilaakon mein internet fluctuate karta hai. Isliye app core routing server par chalata hai,
              aur UI side par lightweight JSON + cached results use karta hai so basic history and previously ranked routes
              available rahein even when network is weak.
            </p>
          </div>

          <div className={`mt-5 p-4 rounded-2xl border ${
            settings.darkMode ? "border-slate-800 bg-slate-950/30" : "border-slate-100 bg-slate-50"
          }`}>
            <p className={`text-sm font-bold ${settings.darkMode ? "text-slate-200" : "text-slate-700"}`}>
              Next step (for presentation):
            </p>
            <p className="text-sm text-slate-400 mt-1 leading-relaxed">
              &quot;Tables: Stops, Fares, Emissions&quot; ke liye ek simple database schema define karke
              real-time crowd-sourcing (future) ko plug-in karna.
            </p>
          </div>
        </div>
      </motion.section>
    </div>
  );
}

