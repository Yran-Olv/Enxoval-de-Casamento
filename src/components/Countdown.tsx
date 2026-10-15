import { useState, useEffect } from 'react';
import { motion } from 'motion/react';

interface CountdownProps {
  weddingDate: string;
  ceremonyTime?: string;
}

export default function Countdown({ weddingDate, ceremonyTime = '16:00' }: CountdownProps) {
  const targetDate = `${weddingDate}T${ceremonyTime || '16:00'}:00`;
  const [isPast, setIsPast] = useState(false);
  const [timeLeft, setTimeLeft] = useState({
    days: 0,
    hours: 0,
    minutes: 0,
    seconds: 0
  });

  useEffect(() => {
    const weddingDateMs = new Date(targetDate).getTime();

    const updateCountdown = () => {
      const now = new Date().getTime();
      const distance = weddingDateMs - now;

      if (distance <= 0) {
        setIsPast(true);
        setTimeLeft({ days: 0, hours: 0, minutes: 0, seconds: 0 });
        return;
      }
      setIsPast(false);

      setTimeLeft({
        days: Math.floor(distance / (1000 * 60 * 60 * 24)),
        hours: Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
        minutes: Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60)),
        seconds: Math.floor((distance % (1000 * 60)) / 1000)
      });
    };

    updateCountdown();
    const timer = setInterval(updateCountdown, 1000);
    return () => clearInterval(timer);
  }, [targetDate]);

  if (isPast) return <p className="font-serif text-2xl italic text-gold md:text-3xl">O grande dia chegou! ❤️</p>;

  return (
    <div className="flex justify-center gap-4 md:gap-8 text-center">
      {Object.entries(timeLeft).map(([label, value]) => (
        <motion.div 
          key={label}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col"
        >
          <span className="text-3xl md:text-5xl font-serif text-gold">{value}</span>
          <span className="text-[10px] md:text-xs uppercase tracking-widest opacity-60 mt-1">
            {label === 'days' ? 'Dias' : label === 'hours' ? 'Horas' : label === 'minutes' ? 'Minutos' : 'Segundos'}
          </span>
        </motion.div>
      ))}
    </div>
  );
}
