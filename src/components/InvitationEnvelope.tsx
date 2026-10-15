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
  const palette = INVITE_PALETTES[theme] ?? INVITE_PALETTES.romantico;
  const opening = phase === 'opening';

  return (
    <section
      className="fixed inset-0 z-50 grid h-[100dvh] w-full place-items-center overflow-y-auto overflow-x-hidden px-4 py-8"
      style={{ background: palette.bg, color: palette.ink, boxSizing: 'border-box' }}
      aria-label="Abertura do convite"
    >
      <div className="flex w-full max-w-[22rem] flex-col items-center justify-center">
        <p className="mb-6 w-full text-center font-serif text-xl italic leading-snug sm:text-2xl" style={{ color: palette.muted }}>
          {openingText || 'Você recebeu um convite especial'}
        </p>

        <button
          type="button"
          onClick={onOpen}
          className="block w-full touch-manipulation rounded-xl text-left outline-offset-4"
          aria-label={guestName ? `Abrir o convite de ${guestName}` : 'Abrir o convite'}
          aria-describedby="envelope-hint"
          disabled={opening}
        >
          <span className="relative mx-auto block w-full" style={{ height: 'clamp(14rem, 56vw, 18rem)', perspective: '900px' }}>
            {/* Cartão: fica atrás da frente do envelope e desliza para cima ao abrir. */}
            <motion.span
              className="absolute left-[7%] top-[8%] z-10 flex h-[56%] w-[86%] flex-col items-center justify-center rounded-sm px-3 text-center shadow-md"
              style={{ background: palette.paper, color: palette.ink, border: `1px solid ${palette.line}`, boxSizing: 'border-box' }}
              animate={{ y: opening ? '-43%' : '18%', opacity: 1 }}
              transition={{ duration: 0.72, delay: opening ? 0.2 : 0, ease: [0.22, 1, 0.36, 1] }}
            >
              <span className="text-3xl" style={{ fontFamily: '"Great Vibes", cursive' }}>{initials}</span>
              {guestName && <span className="mt-2 max-w-full truncate text-sm">{guestName}</span>}
            </motion.span>

            {/* Corpo do envelope; as dobras usam o mesmo eixo central. */}
            <span
              aria-hidden="true"
              className="absolute inset-x-0 bottom-0 z-20 block h-[62%] rounded-b-md"
              style={{ background: palette.paper, border: `1px solid ${palette.line}`, boxShadow: '0 18px 30px rgba(35, 25, 16, .16)', boxSizing: 'border-box' }}
            />
            <span
              aria-hidden="true"
              className="absolute inset-x-0 bottom-0 z-30 block h-[62%]"
              style={{
                background: palette.line,
                clipPath: 'polygon(0 0, 50% 58%, 100% 0, 100% 100%, 0 100%)',
                opacity: 0.9,
              }}
            />
            <motion.span
              aria-hidden="true"
              className="absolute inset-x-0 top-0 z-40 block h-[48%] origin-top"
              style={{ background: palette.seal, clipPath: 'polygon(0 0, 100% 0, 50% 100%)', transformStyle: 'preserve-3d', backfaceVisibility: 'hidden' }}
              animate={{ rotateX: opening ? -175 : 0, zIndex: opening ? 5 : 40 }}
              transition={{ duration: 0.62, ease: [0.4, 0, 0.2, 1] }}
            />
            <motion.span
              aria-hidden="true"
              className="absolute left-1/2 top-[34%] z-50 grid h-14 w-14 -translate-x-1/2 place-items-center rounded-full text-base shadow-lg sm:h-16 sm:w-16"
              style={{ background: palette.accent, color: palette.onAccent, fontFamily: '"Great Vibes", cursive', border: `1px solid ${palette.line}` }}
              animate={{ scale: opening ? 0.35 : 1, opacity: opening ? 0 : 1, y: opening ? 8 : 0 }}
              transition={{ duration: 0.3, ease: 'easeOut' }}
            >
              {initials.replaceAll(' ', '').slice(0, 3)}
            </motion.span>
          </span>
        </button>

        <p id="envelope-hint" className="mt-6 text-center text-[11px] uppercase tracking-[.24em]" style={{ color: palette.accent }}>
          {opening ? 'Abrindo seu convite…' : 'Toque para abrir'}
        </p>
        <button type="button" onClick={onSkip} className="mt-3 min-h-11 rounded-lg px-4 text-sm underline underline-offset-4" style={{ color: palette.muted }}>
          Abrir direto
        </button>
      </div>
    </section>
  );
}
