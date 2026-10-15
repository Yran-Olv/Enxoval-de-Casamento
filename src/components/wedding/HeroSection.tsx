import { motion } from 'motion/react';
import type { WeddingThemeConfig } from './ThemeDefinitions';
import { Calendar, MapPin, Heart } from 'lucide-react';

type Props = {
  theme: WeddingThemeConfig;
  styleVariant?: string;
  coupleNames: string;
  weddingDate: string;
  ceremonyTime: string;
  location: string;
  romanticLine: string;
  coverPhotoUrl?: string;
  guestName?: string;
  onRsvpClick: () => void;
};

function formatDate(iso?: string) {
  if (!iso || !/^\d{4}-\d{2}-\d{2}$/.test(iso)) return 'Data a definir';
  return new Date(`${iso}T12:00:00`).toLocaleDateString('pt-BR', {
    weekday: 'long',
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });
}

export default function HeroSection({
  theme,
  styleVariant = 'tradicional',
  coupleNames,
  weddingDate,
  ceremonyTime,
  location,
  romanticLine,
  coverPhotoUrl,
  guestName,
  onRsvpClick,
}: Props) {
  const p = theme.palette;
  const photo = coverPhotoUrl || theme.samplePhoto;

  // 1. Variação FOTOGRÁFICA (Foto de capa em tela cheia com overlay e elegância)
  if (styleVariant === 'fotografica') {
    return (
      <section className="relative min-h-[92vh] flex items-center justify-center text-center px-4 py-20 overflow-hidden">
        <div className="absolute inset-0 z-0">
          <img src={photo} alt={coupleNames} className="w-full h-full object-cover brightness-[0.62]" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-black/30" />
        </div>

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.9 }}
          className="relative z-10 max-w-4xl mx-auto text-white"
        >
          {guestName && (
            <p className="mb-4 inline-block rounded-full bg-white/20 backdrop-blur-md px-4 py-1 text-xs uppercase tracking-[0.25em] font-medium border border-white/30">
              Especialmente para {guestName}
            </p>
          )}

          <p className="text-3xl sm:text-5xl mb-2 text-white/90" style={{ fontFamily: theme.fontScript }}>
            Nosso Casamento
          </p>

          <h1 className="text-5xl sm:text-7xl md:text-8xl font-normal tracking-tight drop-shadow-md" style={{ fontFamily: theme.fontTitle }}>
            {coupleNames}
          </h1>

          {romanticLine && (
            <p className="mt-6 text-lg sm:text-2xl font-serif italic text-white/90 max-w-2xl mx-auto">
              "{romanticLine}"
            </p>
          )}

          <div className="mt-8 flex flex-wrap items-center justify-center gap-4 text-xs sm:text-sm uppercase tracking-widest text-white/80">
            <span className="flex items-center gap-1.5"><Calendar size={16} /> {formatDate(weddingDate)}</span>
            <span>·</span>
            <span>{ceremonyTime || '16:00'}</span>
            {location && (
              <>
                <span>·</span>
                <span className="flex items-center gap-1.5"><MapPin size={16} /> {location}</span>
              </>
            )}
          </div>

          <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
            <button
              type="button"
              onClick={onRsvpClick}
              className="rounded-full bg-white text-black hover:bg-white/90 shadow-2xl px-8 py-3.5 text-xs uppercase font-bold tracking-[0.25em] transition-transform hover:scale-105"
            >
              Confirmar Presença
            </button>
          </div>
        </motion.div>
      </section>
    );
  }

  // 2. Variação EDITORIAL (Inspirada em revistas de moda com proporção assimétrica)
  if (styleVariant === 'editorial' || theme.id === 'editorial') {
    return (
      <section className="min-h-[85vh] flex items-center justify-center px-6 py-20">
        <div className="max-w-6xl w-full mx-auto grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8 }}
            className="lg:col-span-6 flex flex-col justify-center"
          >
            <div className="flex items-center gap-3 mb-6">
              <span className="h-[1px] w-12 bg-current opacity-40" />
              <span className="text-[11px] uppercase tracking-[0.3em] font-semibold opacity-70">
                Edição Especial · {formatDate(weddingDate)}
              </span>
            </div>

            {guestName && (
              <p className="text-xs uppercase tracking-widest font-bold mb-4" style={{ color: p.accent }}>
                Convidado de honra: {guestName}
              </p>
            )}

            <h1 className="text-6xl sm:text-7xl md:text-8xl font-serif uppercase tracking-tighter leading-none" style={{ fontFamily: theme.fontTitle }}>
              {coupleNames.replace('&', '\n& ')}
            </h1>

            <p className="mt-8 text-xl font-serif italic max-w-md leading-relaxed opacity-80">
              {romanticLine || 'O amor é paciente, é bondoso e tudo supera.'}
            </p>

            <div className="mt-8 pt-8 border-t border-current/15 flex items-center justify-between text-xs uppercase tracking-widest opacity-80">
              <span>{ceremonyTime || '16:00'} HRS</span>
              <span>{location || 'Local a confirmar'}</span>
            </div>

            <div className="mt-10">
              <button type="button" onClick={onRsvpClick} className={theme.buttonClass}>
                Confirmar Presença
              </button>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="lg:col-span-6 relative"
          >
            <div className="relative aspect-[3/4] w-full rounded-sm overflow-hidden shadow-2xl border border-current/10">
              <img src={photo} alt={coupleNames} className="w-full h-full object-cover" />
              <div className="absolute bottom-4 left-4 right-4 bg-white/90 backdrop-blur-md p-4 text-black text-center text-xs uppercase tracking-widest font-semibold border border-black/10">
                {coupleNames} — {weddingDate ? new Date(`${weddingDate}T12:00:00`).getFullYear() : '2027'}
              </div>
            </div>
          </motion.div>
        </div>
      </section>
    );
  }

  // 3. Variação TRADICIONAL (Elegância clássica com monograma caligráfico no centro)
  return (
    <section className="relative min-h-[82vh] flex flex-col items-center justify-center text-center px-4 py-20">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8 }}
        className="max-w-3xl mx-auto flex flex-col items-center"
      >
        <span className="text-5xl sm:text-6xl mb-3" style={{ fontFamily: theme.fontScript, color: p.accent }}>
          {coupleNames.split(/\s*(?:&|e)\s*/i).map(w => w.charAt(0)).join(' & ') || 'T & Y'}
        </span>

        {guestName && (
          <span className={`mb-5 ${theme.badgeClass}`}>
            Para {guestName}
          </span>
        )}

        <h1 className="text-5xl sm:text-7xl md:text-8xl font-normal leading-none mb-6" style={{ fontFamily: theme.fontTitle }}>
          {coupleNames}
        </h1>

        <div className="flex items-center gap-4 my-2 opacity-60">
          <span className="h-[1px] w-12" style={{ background: p.accent }} />
          <Heart size={14} className="fill-current text-current" />
          <span className="h-[1px] w-12" style={{ background: p.accent }} />
        </div>

        <p className="mt-5 text-xl sm:text-2xl font-serif italic max-w-xl leading-relaxed" style={{ color: p.muted }}>
          {romanticLine || 'Com muito amor, queremos compartilhar esse momento especial com você.'}
        </p>

        {photo && (
          <motion.div
            initial={{ opacity: 0, scale: 0.97 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.7, delay: 0.2 }}
            className="mt-10 max-w-lg w-full aspect-[16/10] overflow-hidden shadow-xl"
            style={{ borderRadius: theme.id === 'minimal' ? '0' : '1.5rem', border: `1px solid ${p.line}` }}
          >
            <img src={photo} alt={coupleNames} className="w-full h-full object-cover" />
          </motion.div>
        )}

        <div className="mt-8 text-xs sm:text-sm uppercase tracking-[0.2em] font-medium" style={{ color: p.muted }}>
          <p>{formatDate(weddingDate)} · {ceremonyTime || '16:00'}</p>
          {location && <p className="mt-1 text-xs">{location}</p>}
        </div>

        <div className="mt-8">
          <button type="button" onClick={onRsvpClick} className={theme.buttonClass}>
            Confirmar Presença
          </button>
        </div>
      </motion.div>
    </section>
  );
}
