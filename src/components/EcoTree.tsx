import { motion } from "motion/react";
import { Leaf } from "lucide-react";

interface EcoTreeProps {
  // 0..1
  progress: number;
  darkMode?: boolean;
}

export default function EcoTree({ progress, darkMode }: EcoTreeProps) {
  const p = Math.max(0, Math.min(1, progress || 0));
  const height = 26 + p * 24;

  return (
    <div className="flex items-end gap-2">
      <motion.div
        initial={{ height: 26 }}
        animate={{ height }}
        transition={{ type: "spring", stiffness: 240, damping: 20 }}
        className={`w-2 rounded-full ${darkMode ? "bg-emerald-500/70" : "bg-emerald-500"}`}
      />
      <motion.div
        initial={{ scale: 0.9, opacity: 0.7 }}
        animate={{ scale: 0.9 + p * 0.25, opacity: 0.8 + p * 0.2 }}
        transition={{ type: "spring", stiffness: 240, damping: 18 }}
        className={`${darkMode ? "text-emerald-300" : "text-emerald-600"}`}
      >
        <Leaf className="w-6 h-6 fill-current" />
      </motion.div>
    </div>
  );
}

