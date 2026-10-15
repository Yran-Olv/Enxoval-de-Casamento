import { motion } from 'motion/react';
import Countdown from './Countdown';

interface HeroProps {
  onNavigate: (page: 'home' | 'purchased' | 'registry' | 'admin' | 'invitation') => void;
  weddingDate: string;
  weddingDateLabel: string;
  coupleNames: string;
  ceremonyTime?: string;
  invitationMessage?: string;
  ceremonyVenue?: string;
}

export default function Hero({ onNavigate, weddingDate, weddingDateLabel, coupleNames, ceremonyTime = '16:00', invitationMessage, ceremonyVenue }: HeroProps) {
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
        <h1 className="text-5xl sm:text-6xl md:text-8xl font-serif mb-8 leading-tight break-words">{coupleNames}</h1>
        <p className="text-lg md:text-xl font-serif italic opacity-70 mb-8 max-w-xl mx-auto leading-relaxed">
          {invitationMessage?.trim() || 'O amor não consiste em olhar um para o outro, mas em olhar juntos na mesma direção.'}
        </p>
        <p className="mb-10 text-sm uppercase tracking-[0.18em] text-ink/70">
          {weddingDateLabel}{ceremonyTime ? ` · ${ceremonyTime}` : ''}{ceremonyVenue ? ` · ${ceremonyVenue}` : ''}
        </p>
        
        <div className="mb-16">
          <Countdown weddingDate={weddingDate} ceremonyTime={ceremonyTime} />
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-center gap-4">
          <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} onClick={() => onNavigate('invitation')} className="min-h-12 px-8 py-4 bg-ink text-white rounded-full text-sm uppercase tracking-widest font-medium shadow-xl hover:opacity-90 transition-all">Convite online</motion.button>
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => onNavigate('registry')}
            className="min-h-12 px-8 py-4 bg-gold text-white rounded-full text-sm uppercase tracking-widest font-medium shadow-xl"
          >
            Lista de presentes
          </motion.button>
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => onNavigate('purchased')}
            className="min-h-12 px-8 py-4 border border-gold/30 text-ink rounded-full text-sm uppercase tracking-widest font-medium hover:bg-gold/5 transition-all"
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
