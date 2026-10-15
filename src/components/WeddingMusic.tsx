import { useEffect, useRef, useState } from 'react';
import { Volume2, VolumeX } from 'lucide-react';

export default function WeddingMusic() {
  const audioRef = useRef<HTMLAudioElement>(null);
  const pausedByUser = useRef(false);
  const [playing, setPlaying] = useState(false);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.loop = true;
    audio.volume = 0.55;

    const start = () => {
      if (pausedByUser.current) return;
      audio.play().then(() => setPlaying(true)).catch(() => setPlaying(false));
    };

    start();
    window.addEventListener('pointerdown', start);
    return () => window.removeEventListener('pointerdown', start);
  }, []);

  const toggle = () => {
    const audio = audioRef.current;
    if (!audio) return;
    if (playing) {
      pausedByUser.current = true;
      audio.pause();
      setPlaying(false);
      return;
    }
    pausedByUser.current = false;
    audio.play().then(() => setPlaying(true)).catch(() => setPlaying(false));
  };

  return (
    <>
      <audio ref={audioRef} src="/api/music" preload="auto" loop />
      <button
        type="button"
        onClick={toggle}
        aria-pressed={playing}
        aria-label={playing ? 'Pausar música' : 'Tocar música'}
        className="fixed bottom-4 right-4 z-40 inline-flex min-h-11 items-center gap-2 rounded-full border border-gold/30 bg-beige/95 px-4 py-2 text-xs font-semibold uppercase tracking-widest text-ink shadow-none"
      >
        {playing ? <Volume2 size={16} /> : <VolumeX size={16} />}
        {playing ? 'Música' : 'Ouvir'}
      </button>
    </>
  );
}
