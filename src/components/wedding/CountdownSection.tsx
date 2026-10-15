import { useEffect, useState } from 'react';
import type { WeddingThemeConfig } from './ThemeDefinitions';
import { Calendar as CalendarIcon, Clock } from 'lucide-react';

type Props = {
  theme: WeddingThemeConfig;
  styleVariant?: string;
  weddingDate: string;
  ceremonyTime?: string;
};

type TimeLeft = {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  isPast: boolean;
};

function calculateTimeLeft(targetIso: string, time = '16:00'): TimeLeft {
  if (!targetIso || !/^\d{4}-\d{2}-\d{2}$/.test(targetIso)) {
    return { days: 0, hours: 0, minutes: 0, seconds: 0, isPast: false };
  }
  const target = new Date(`${targetIso}T${time}:00`);
  const diff = target.getTime() - Date.now();
  if (diff <= 0) {
    return { days: 0, hours: 0, minutes: 0, seconds: 0, isPast: true };
  }
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
  const minutes = Math.floor((diff / (1000 * 60)) % 60);
  const seconds = Math.floor((diff / 1000) % 60);
  return { days, hours, minutes, seconds, isPast: false };
}

export default function CountdownSection({
  theme,
  styleVariant = 'tradicional',
  weddingDate,
  ceremonyTime = '16:00',
}: Props) {
  const [timeLeft, setTimeLeft] = useState<TimeLeft>(() => calculateTimeLeft(weddingDate, ceremonyTime));
  const p = theme.palette;

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft(calculateTimeLeft(weddingDate, ceremonyTime));
    }, 1000);
    return () => clearInterval(timer);
  }, [weddingDate, ceremonyTime]);

  if (timeLeft.isPast) {
    return (
      <section className="py-12 text-center px-4">
        <p className="text-xl sm:text-2xl font-serif italic" style={{ color: p.accent }}>
          O grande dia já chegou! O amor é para sempre. ✨
        </p>
      </section>
    );
  }

  // 1. Variação PAINEL (Split-Flap estilo aeroporto / Noite de Gala)
  if (styleVariant === 'painel' || theme.id === 'gala') {
    return (
      <section className="py-16 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <p className="text-xs uppercase tracking-[0.3em] font-semibold mb-3 opacity-70">
            Contagem Regressiva para o Sim
          </p>
          <h2 className="text-3xl sm:text-4xl font-serif mb-10" style={{ fontFamily: theme.fontTitle }}>
            Faltam Poucos Momentos
          </h2>

          <div className="flex flex-wrap justify-center items-center gap-3 sm:gap-6">
            {[
              { label: 'DIAS', val: timeLeft.days },
              { label: 'HORAS', val: timeLeft.hours },
              { label: 'MINUTOS', val: timeLeft.minutes },
              { label: 'SEGUNDOS', val: timeLeft.seconds },
            ].map((box) => (
              <div key={box.label} className="flex flex-col items-center">
                <div
                  className="relative grid place-items-center w-20 h-24 sm:w-28 sm:h-32 bg-[#1b1922] text-[#f4ecdf] border-2 border-[#3a3442] shadow-2xl overflow-hidden rounded-md"
                  style={{
                    boxShadow: 'inset 0 2px 4px rgba(255,255,255,0.1), 0 8px 24px rgba(0,0,0,0.6)',
                  }}
                >
                  {/* Linha divisória de split flap */}
                  <div className="absolute inset-x-0 top-1/2 h-[1px] bg-black/60 z-10" />
                  <span className="font-mono text-3xl sm:text-5xl font-bold tracking-tight text-[#c6a36a]">
                    {String(box.val).padStart(2, '0')}
                  </span>
                </div>
                <span className="mt-3 text-[10px] sm:text-xs uppercase font-semibold tracking-[0.25em] opacity-70">
                  {box.label}
                </span>
              </div>
            ))}
          </div>
        </div>
      </section>
    );
  }

  // 2. Variação CALENDÁRIO (Folhinha de mesa com data marcada)
  if (styleVariant === 'calendario') {
    const d = weddingDate ? new Date(`${weddingDate}T12:00:00`) : new Date();
    const monthName = d.toLocaleDateString('pt-BR', { month: 'long' });
    const dayNum = d.toLocaleDateString('pt-BR', { day: '2-digit' });
    const yearNum = d.getFullYear();

    return (
      <section className="py-16 px-4">
        <div className={`max-w-xl mx-auto p-8 sm:p-10 ${theme.cardClass} text-center flex flex-col items-center`}>
          <div className="w-28 border border-current/20 rounded-xl overflow-hidden shadow-md mb-6 bg-white">
            <div className="py-1 text-center text-xs uppercase font-bold text-white tracking-widest" style={{ background: p.accent }}>
              {monthName}
            </div>
            <div className="py-3 text-center text-4xl font-serif font-bold text-neutral-800">
              {dayNum}
            </div>
            <div className="pb-1 text-center text-[10px] uppercase font-semibold tracking-wider text-neutral-500">
              {yearNum}
            </div>
          </div>

          <h3 className="text-2xl font-serif mb-6" style={{ fontFamily: theme.fontTitle }}>
            Guardem Esta Data
          </h3>

          <div className="grid grid-cols-4 gap-3 sm:gap-6 w-full pt-4 border-t border-current/10">
            {[
              { val: timeLeft.days, label: 'dias' },
              { val: timeLeft.hours, label: 'horas' },
              { val: timeLeft.minutes, label: 'min' },
              { val: timeLeft.seconds, label: 'seg' },
            ].map((item) => (
              <div key={item.label} className="text-center">
                <span className="block text-2xl sm:text-3xl font-serif font-medium">{item.val}</span>
                <span className="text-[10px] uppercase tracking-wider opacity-60">{item.label}</span>
              </div>
            ))}
          </div>
        </div>
      </section>
    );
  }

  // 3. Variação TRADICIONAL (Círculos ou cartões sofisticados)
  return (
    <section className="py-16 px-4 text-center">
      <div className="max-w-3xl mx-auto">
        <p className="text-xs uppercase tracking-[0.25em] font-semibold mb-3 opacity-60">
          Contagem Regressiva
        </p>
        <h2 className="text-3xl sm:text-4xl font-serif mb-8" style={{ fontFamily: theme.fontTitle }}>
          Para Sempre Começa Em
        </h2>

        <div className="flex flex-wrap justify-center items-center gap-4 sm:gap-8">
          {[
            { val: timeLeft.days, label: 'dias' },
            { val: timeLeft.hours, label: 'horas' },
            { val: timeLeft.minutes, label: 'minutos' },
            { val: timeLeft.seconds, label: 'segundos' },
          ].map((item) => (
            <div
              key={item.label}
              className={`flex flex-col items-center justify-center w-20 h-20 sm:w-24 sm:h-24 ${theme.cardClass}`}
            >
              <span className="text-2xl sm:text-3xl font-serif font-medium leading-none" style={{ color: p.accent }}>
                {item.val}
              </span>
              <span className="mt-1 text-[10px] uppercase tracking-wider opacity-60">
                {item.label}
              </span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
