import { memo, useMemo } from 'react';
import type { InviteTheme } from '../../server/domain';
import { INVITE_PALETTES } from '../../server/domain';

type Props = {
  active: boolean;
  theme?: InviteTheme;
  count?: number;
};

type HeartParticle = {
  id: number;
  left: number;
  size: number;
  duration: number;
  delay: number;
  sway: number;
  rotate: number;
  color: string;
  opacity: number;
};

export const FallingHearts = memo(function FallingHearts({ active, theme = 'romantico', count = 38 }: Props) {
  const palette = INVITE_PALETTES[theme] ?? INVITE_PALETTES.romantico;

  const hearts = useMemo<HeartParticle[]>(() => {
    const colors = [
      palette.accent,
      palette.seal,
      '#e11d48', // ruby rose
      '#f43f5e', // coral rose
      '#fb7185', // soft blush
      '#fda4af', // delicate pink
      '#f59e0b', // warm gold
      '#d97706', // amber gold
    ];

    return Array.from({ length: count }, (_, i) => {
      // Deterministic spread across width to avoid clumping
      const left = ((i * 100) / count) + (Math.sin(i * 99) * 4);
      const size = 14 + (i % 5) * 4 + ((i * 7) % 8); // 14px to 34px
      const duration = 3.2 + (i % 4) * 0.7; // 3.2s to 5.3s
      const delay = (i % 7) * 0.28 + ((i * 3) % 5) * 0.12; // 0s to 2.5s
      const sway = ((i % 2 === 0 ? 1 : -1) * (20 + (i % 6) * 8)); // -60px to +60px
      const rotate = ((i % 3) - 1) * 35;
      const color = colors[i % colors.length];
      const opacity = 0.65 + (i % 4) * 0.08;

      return { id: i, left: Math.max(2, Math.min(98, left)), size, duration, delay, sway, rotate, color, opacity };
    });
  }, [count, palette.accent, palette.seal]);

  if (!active) return null;

  return (
    <div
      className="pointer-events-none fixed inset-0 z-[60] overflow-hidden"
      aria-hidden="true"
    >
      <style>{`
        @keyframes heartFlutterFall {
          0% {
            transform: translateY(-40px) translateX(0) rotate(0deg) scale(0.6);
            opacity: 0;
          }
          12% {
            opacity: 0.95;
          }
          50% {
            transform: translateY(48vh) translateX(var(--sway)) rotate(var(--rotate)) scale(1.05);
            opacity: 0.9;
          }
          85% {
            opacity: 0.75;
          }
          100% {
            transform: translateY(112vh) translateX(calc(var(--sway) * -0.6)) rotate(calc(var(--rotate) * 2)) scale(0.75);
            opacity: 0;
          }
        }
        .falling-heart-node {
          animation-name: heartFlutterFall;
          animation-timing-function: cubic-bezier(0.25, 0.46, 0.45, 0.94);
          animation-iteration-count: infinite;
          will-change: transform, opacity;
        }
      `}</style>

      {hearts.map((h) => (
        <span
          key={h.id}
          className="falling-heart-node absolute top-0 block drop-shadow-sm"
          style={{
            left: `${h.left}%`,
            width: `${h.size}px`,
            height: `${h.size}px`,
            animationDuration: `${h.duration}s`,
            animationDelay: `${h.delay}s`,
            color: h.color,
            opacity: h.opacity,
            // Custom CSS variables for sway and rotation
            ['--sway' as any]: `${h.sway}px`,
            ['--rotate' as any]: `${h.rotate}deg`,
          }}
        >
          <svg viewBox="0 0 24 24" fill="currentColor" className="h-full w-full">
            <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
          </svg>
        </span>
      ))}
    </div>
  );
});

export default FallingHearts;
