import { useState } from 'react';
import { motion } from 'motion/react';
import type { InviteTheme } from '../../server/domain';
import { INVITE_PALETTES } from '../../server/domain';
import FallingHearts from './FallingHearts';

type Props = {
  theme: InviteTheme;
  initials: string;
  coupleNames?: string;
  weddingDate?: string;
  ceremonyTime?: string;
  guestName?: string;
  openingText?: string;
  phase: 'sealed' | 'opening';
  onOpen: () => void;
  onSkip: () => void;
};

function formatDate(iso?: string) {
  if (!iso || !/^\d{4}-\d{2}-\d{2}$/.test(iso)) return 'Nosso Casamento';
  return new Date(`${iso}T12:00:00`).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });
}

export default function InvitationEnvelope({
  theme,
  initials,
  coupleNames = 'Tais & Yran',
  weddingDate,
  ceremonyTime,
  guestName,
  openingText,
  phase,
  onOpen,
  onSkip,
}: Props) {
  const palette = INVITE_PALETTES[theme] ?? INVITE_PALETTES.romantico;
  const opening = phase === 'opening';
  const [heartsActive, setHeartsActive] = useState(false);

  const handleOpen = () => {
    if (opening) return;
    setHeartsActive(true);
    onOpen();
  };

  return (
    <section
      className="fixed inset-0 z-50 flex min-h-[100dvh] w-full flex-col items-center justify-center overflow-y-auto overflow-x-hidden px-4 py-8 select-none"
      style={{ background: palette.bg, color: palette.ink }}
      aria-label="Abertura do convite de casamento"
    >
      {/* Chuva de corações caindo pela tela quando abrir */}
      <FallingHearts active={opening || heartsActive} theme={theme} count={42} />

      <div className="relative z-10 flex w-full max-w-[430px] flex-col items-center justify-center">
        {/* Título elegante acima do envelope */}
        <motion.p
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="mb-6 w-full text-center font-serif text-2xl italic leading-snug sm:text-3xl"
          style={{ color: palette.muted }}
        >
          {openingText || 'Você recebeu um convite especial'}
        </motion.p>

        {/* Envelope interativo com proporções geométricas perfeitas (400 x 260) */}
        <button
          type="button"
          onClick={handleOpen}
          disabled={opening}
          aria-label={guestName ? `Abrir o convite de ${guestName}` : 'Abrir o convite'}
          className="group relative block w-full touch-manipulation text-left outline-none focus-visible:ring-2 focus-visible:ring-offset-4"
          style={{ cursor: opening ? 'default' : 'pointer' }}
        >
          <div
            className="relative mx-auto w-full transition-transform duration-300 group-hover:scale-[1.01]"
            style={{
              aspectRatio: '400 / 260',
              perspective: '1200px',
            }}
          >
            {/* 1. Base / Fundo do envelope (Back wall) */}
            <div
              className="absolute inset-0 rounded-2xl shadow-[0_20px_50px_-10px_rgba(40,20,25,0.18)]"
              style={{
                background: palette.paper,
                border: `1px solid ${palette.line}`,
              }}
            >
              {/* Forro interno decorativo (visível quando o envelope abre) */}
              <div
                className="absolute inset-2 rounded-xl opacity-80"
                style={{
                  background: `linear-gradient(145deg, ${palette.line}44 0%, ${palette.accent}18 100%)`,
                  border: `1px dashed ${palette.line}`,
                }}
              />
            </div>

            {/* 2. Cartão da carta do convite (desliza para cima quando abre) */}
            <motion.div
              className="absolute left-[5%] right-[5%] top-[5%] flex h-[90%] flex-col items-center justify-between rounded-xl p-4 text-center shadow-lg"
              style={{
                background: palette.paper,
                border: `1px solid ${palette.line}`,
                color: palette.ink,
              }}
              initial={false}
              animate={{
                y: opening ? '-60%' : '0%',
                scale: opening ? 1.04 : 0.98,
                zIndex: opening ? 45 : 20,
              }}
              transition={{
                duration: 0.95,
                delay: opening ? 0.35 : 0,
                ease: [0.16, 1, 0.3, 1],
              }}
            >
              <div className="flex flex-col items-center">
                <span
                  className="text-3xl sm:text-4xl leading-none"
                  style={{
                    fontFamily: '"Great Vibes", cursive',
                    color: palette.accent,
                  }}
                >
                  {initials}
                </span>
                <span className="mt-1 block h-[1px] w-12" style={{ background: palette.line }} />
              </div>

              <div className="my-1 flex flex-col items-center px-2">
                <p className="text-[10px] sm:text-xs uppercase tracking-[0.2em]" style={{ color: palette.muted }}>
                  Convidam para o casamento
                </p>
                <h3 className="mt-1 font-serif text-xl sm:text-2xl font-normal leading-tight">
                  {coupleNames}
                </h3>
                {guestName && (
                  <p
                    className="mt-2 inline-block rounded-full px-3 py-0.5 text-[11px] font-medium uppercase tracking-wider"
                    style={{ background: `${palette.accent}18`, color: palette.accent }}
                  >
                    Para {guestName}
                  </p>
                )}
              </div>

              <div className="text-[10px] sm:text-xs uppercase tracking-widest" style={{ color: palette.muted }}>
                {formatDate(weddingDate)} {ceremonyTime ? `· ${ceremonyTime}` : ''}
              </div>
            </motion.div>

            {/* 3. Bolso frontal do envelope (cobre a parte inferior e laterais do cartão) */}
            <svg
              viewBox="0 0 400 260"
              className="pointer-events-none absolute inset-0 z-30 h-full w-full overflow-hidden rounded-2xl"
              preserveAspectRatio="none"
              aria-hidden="true"
            >
              {/* Dobra lateral esquerda */}
              <polygon
                points="0,0 200,135 0,260"
                fill={palette.paper}
                style={{ filter: 'brightness(0.97)' }}
              />
              {/* Dobra lateral direita */}
              <polygon
                points="400,0 200,135 400,260"
                fill={palette.paper}
                style={{ filter: 'brightness(0.97)' }}
              />
              {/* Dobra inferior (frente central) */}
              <polygon
                points="0,260 200,122 400,260"
                fill={palette.paper}
              />
              {/* Linhas de dobra finas e elegantes */}
              <path
                d="M 0 0 L 200 135 L 400 0"
                stroke={palette.line}
                strokeWidth="1.2"
                fill="none"
                opacity="0.6"
              />
              <path
                d="M 0 260 L 200 122 L 400 260"
                stroke={palette.line}
                strokeWidth="1.2"
                fill="none"
                opacity="0.8"
              />
            </svg>

            {/* 4. Aba superior do envelope (dobrável em 3D, gira para cima ao abrir) */}
            <motion.div
              className="absolute left-0 right-0 top-0 h-[56%] origin-top"
              style={{
                transformOrigin: 'top center',
                transformStyle: 'preserve-3d',
              }}
              initial={false}
              animate={{
                rotateX: opening ? -180 : 0,
                zIndex: opening ? 15 : 35,
              }}
              transition={{
                duration: 0.8,
                ease: [0.4, 0, 0.2, 1],
              }}
              aria-hidden="true"
            >
              <svg
                viewBox="0 0 400 145"
                className="block h-full w-full overflow-visible drop-shadow-[0_4px_10px_rgba(0,0,0,0.12)]"
                preserveAspectRatio="none"
              >
                <polygon
                  points="0,0 400,0 200,145"
                  fill={palette.seal}
                  stroke={palette.line}
                  strokeWidth="1"
                />
              </svg>
            </motion.div>

            {/* 5. Lacre de cera (senta exatamente sobre a ponta da aba em 55.7%) */}
            <motion.div
              className="absolute left-1/2 z-40 grid h-14 w-14 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full text-base sm:h-16 sm:w-16 sm:text-lg"
              style={{
                top: '55.7%',
                background: `radial-gradient(circle at 35% 35%, ${palette.accent}, ${palette.seal})`,
                color: palette.onAccent,
                fontFamily: '"Great Vibes", cursive',
                border: '2px solid rgba(255, 255, 255, 0.35)',
                boxShadow: '0 8px 24px rgba(0, 0, 0, 0.22), inset 0 2px 4px rgba(255,255,255,0.3)',
              }}
              initial={false}
              animate={{
                scale: opening ? [1, 1.35, 0] : [1, 1.05, 1],
                opacity: opening ? [1, 1, 0] : 1,
                rotate: opening ? [0, 15, -25] : [0, 2, -2, 0],
              }}
              transition={{
                duration: opening ? 0.35 : 3.5,
                repeat: opening ? 0 : Infinity,
                ease: 'easeInOut',
              }}
              aria-hidden="true"
            >
              <span className="leading-none drop-shadow-sm">
                {initials.replaceAll(' ', '').slice(0, 3)}
              </span>
            </motion.div>
          </div>
        </button>

        {/* Nome do convidado abaixo do envelope se presente */}
        {guestName && (
          <p className="mt-5 text-center text-sm font-medium" style={{ color: palette.muted }}>
            Especialmente para <span className="font-semibold" style={{ color: palette.ink }}>{guestName}</span>
          </p>
        )}

        {/* Indicador de ação e toque */}
        <p
          className={`mt-4 text-center text-xs font-semibold uppercase tracking-[0.24em] ${opening ? '' : 'animate-pulse'}`}
          style={{ color: palette.accent }}
        >
          {opening ? 'Abrindo seu convite… 💌' : 'Toque para abrir'}
        </p>

        {/* Opção para abrir direto */}
        <button
          type="button"
          onClick={onSkip}
          className="mt-3 min-h-11 rounded-lg px-4 text-xs uppercase tracking-wider underline underline-offset-4 opacity-70 transition-opacity hover:opacity-100"
          style={{ color: palette.muted }}
        >
          Abrir direto
        </button>
      </div>
    </section>
  );
}
