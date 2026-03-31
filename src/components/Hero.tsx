import { motion } from 'motion/react';
import Countdown from './Countdown';

interface HeroProps {
  onNavigate: (page: 'home' | 'purchased' | 'registry' | 'admin') => void;
  weddingDate: string;
  weddingDateLabel: string;
}

export default function Hero({ onNavigate, weddingDate, weddingDateLabel }: HeroProps) {
  return (
    <section className="relative min-h-screen flex flex-col items-center justify-center px-6 pt-20 overflow-hidden">
      {/* Background elements */}
      <div className="absolute top-0 left-0 w-full h-full -z-10 opacity-10 pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-gold rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-gold rounded-full blur-3xl animate-pulse delay-1000" />
      </div>

      <motion.div 
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 1.2, ease: "easeOut" }}
        className="text-center max-w-3xl"
      >
        <span className="text-xs uppercase tracking-[0.3em] text-gold mb-6 block">Nosso Grande Dia</span>
        <h1 className="text-6xl md:text-9xl font-serif mb-8 leading-tight">Tais & Yran</h1>
        <p className="text-lg md:text-xl font-serif italic opacity-70 mb-12 max-w-xl mx-auto leading-relaxed">
          "O amor não consiste em olhar um para o outro, mas em olhar juntos na mesma direção."
        </p>
        
        <div className="mb-16">
          <Countdown weddingDate={weddingDate} />
        </div>

        <p className="text-xs uppercase tracking-[0.25em] text-gold/70 mb-10">{weddingDateLabel}</p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-6">
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => onNavigate('registry')}
            className="px-10 py-4 bg-gold text-white rounded-full text-sm uppercase tracking-widest font-medium shadow-xl hover:shadow-gold/20 transition-all"
          >
            Ver Enxoval
          </motion.button>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => onNavigate('purchased')}
            className="px-10 py-4 border border-gold/30 text-gold rounded-full text-sm uppercase tracking-widest font-medium hover:bg-gold/5 transition-all"
          >
            Itens já comprados
          </motion.button>
        </div>
      </motion.div>

      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.5 }}
        className="absolute bottom-10 left-1/2 -translate-x-1/2"
      >
        <div className="w-[1px] h-20 bg-gradient-to-b from-gold to-transparent" />
      </motion.div>
    </section>
  );
}
