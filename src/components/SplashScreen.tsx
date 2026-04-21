import { motion } from 'motion/react';
import { Leaf } from 'lucide-react';

export default function SplashScreen() {
  return (
    <motion.div 
      initial={{ opacity: 1 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.8, ease: "easeInOut" }}
      className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-primary text-white"
    >
      <motion.div
        initial={{ scale: 0.5, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ 
          duration: 0.5,
          type: "spring",
          stiffness: 260,
          damping: 20 
        }}
        className="relative"
      >
        <div className="bg-white p-6 rounded-3xl shadow-2xl">
          <Leaf className="w-16 h-16 text-eco fill-eco" />
        </div>
        <motion.div 
          animate={{ 
            scale: [1, 1.2, 1],
            opacity: [0.3, 0.6, 0.3]
          }}
          transition={{ 
            duration: 2,
            repeat: Infinity,
            ease: "easeInOut"
          }}
          className="absolute inset-0 bg-white/20 rounded-3xl -z-10 blur-xl"
        />
      </motion.div>
      
      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.3 }}
        className="mt-8 text-center"
      >
        <h1 className="text-4xl font-bold tracking-tight">EcoRoute</h1>
        <p className="text-white/70 mt-2 font-medium">Sustainable Travel, Smarter Routes</p>
      </motion.div>
      
      <motion.div 
        initial={{ width: 0 }}
        animate={{ width: 200 }}
        transition={{ delay: 0.5, duration: 1.5 }}
        className="mt-12 h-1 bg-white/20 rounded-full overflow-hidden"
      >
        <motion.div 
          animate={{ x: [-200, 200] }}
          transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
          className="h-full w-1/2 bg-white"
        />
      </motion.div>
    </motion.div>
  );
}
