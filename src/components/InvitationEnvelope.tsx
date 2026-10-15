import { motion } from 'motion/react';
import type { InviteTheme } from '../../server/domain';
import { INVITE_PALETTES } from '../../server/domain';

type Props = {
  theme: InviteTheme;
  initials: string;
  guestName: string;
  openingText: string;
  phase: 'sealed' | 'opening';
  onOpen: () => void;
  onSkip: () => void;
};

export default function InvitationEnvelope({ theme, initials, guestName, openingText, phase, onOpen, onSkip }: Props) {
  const palette = INVITE_PALETTES[theme];
  const opening = phase === 'opening';

  return (
    <section className="flex min-h-screen flex-col items-center justify-center px-4 py-16" style={{ background: palette.bg, color: palette.ink }}>
      <p className="mb-6 text-center font-serif text-2xl italic" style={{ color: palette.muted }}>{openingText}</p>
      <button
        type="button"
        onClick={onOpen}
        className="relative w-[min(100%,22rem)] text-left"
        aria-label={guestName ? `Abrir o convite de ${guestName}` : 'Abrir o convite'}
      >
        <span className="sr-only">Toque para abrir</span>
        <span className="relative block h-72" style={{ perspective: '1000px' }}>
          <motion.span
            className="absolute inset-x-6 top-8 flex h-40 flex-col items-center justify-center rounded-sm px-4 text-center shadow-md"
            style={{ background: palette.paper, color: palette.ink }}
            animate={{ y: opening ? -78 : 18 }}
            transition={{ duration: 0.8, delay: 0.25, ease: 'easeOut' }}
          >
            <span className="text-3xl" style={{ fontFamily: '"Great Vibes", cursive' }}>{initials}</span>
            {guestName && <span className="mt-2 text-sm">Para {guestName}</span>}
          </motion.span>
          <span className="absolute inset-x-0 bottom-0 h-44 rounded-b-md rounded-t-sm shadow-xl" style={{ background: palette.paper, border: `1px solid ${palette.line}` }} />
          <motion.span
            aria-hidden="true"
            className="absolute inset-x-0 top-0 h-36 origin-top"
            style={{
              background: palette.seal,
              clipPath: 'polygon(0 0, 100% 0, 50% 100%)',
              transformStyle: 'preserve-3d',
            }}
            animate={{ rotateX: opening ? -168 : 0 }}
            transition={{ duration: 0.7, ease: 'easeInOut' }}
          />
          <motion.span
            aria-hidden="true"
            className="absolute left-1/2 top-[4.6rem] grid h-16 w-16 -translate-x-1/2 place-items-center rounded-full text-lg shadow-lg"
            style={{ background: palette.accent, color: palette.onAccent, fontFamily: '"Great Vibes", cursive' }}
            animate={{ scale: opening ? 0.2 : 1, opacity: opening ? 0 : 1 }}
            transition={{ duration: 0.35 }}
          >
            {initials.replaceAll(' ', '').slice(0, 3)}
          </motion.span>
        </span>
      </button>
      <p className="mt-6 text-xs uppercase tracking-[.28em]" style={{ color: palette.accent }}>Toque para abrir</p>
      <button type="button" onClick={onSkip} className="mt-4 min-h-11 px-4 text-sm underline" style={{ color: palette.muted }}>
        Abrir direto
      </button>
    </section>
  );
}
