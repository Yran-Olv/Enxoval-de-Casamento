import { useEffect, useRef, useState } from 'react';
import { Music2, Pause, Play, Volume2, VolumeX } from 'lucide-react';

export default function WeddingMusic() {
  const audioRef = useRef<HTMLAudioElement>(null);
  const pausedByUser = useRef(false);
  const [playing, setPlaying] = useState(false);
  const [muted, setMuted] = useState(false);
  const [unavailable, setUnavailable] = useState(false);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.loop = true;
    audio.volume = 0.38;

    const syncPlaying = () => setPlaying(!audio.paused && !audio.ended);
    const failed = () => {
      setUnavailable(true);
      setPlaying(false);
    };
    const startFromGesture = () => {
      if (pausedByUser.current || unavailable) return;
      // Executado diretamente dentro do gesto do usuário para respeitar autoplay policy.
      void audio.play().then(() => {
        setUnavailable(false);
        setPlaying(true);
      }).catch(() => setPlaying(false));
    };

    audio.addEventListener('play', syncPlaying);
    audio.addEventListener('pause', syncPlaying);
    audio.addEventListener('ended', syncPlaying);
    audio.addEventListener('error', failed);
    window.addEventListener('pointerdown', startFromGesture, { passive: true });
    window.addEventListener('keydown', startFromGesture);

    return () => {
      window.removeEventListener('pointerdown', startFromGesture);
      window.removeEventListener('keydown', startFromGesture);
      audio.removeEventListener('play', syncPlaying);
      audio.removeEventListener('pause', syncPlaying);
      audio.removeEventListener('ended', syncPlaying);
      audio.removeEventListener('error', failed);
    };
  }, [unavailable]);

  const toggle = () => {
    const audio = audioRef.current;
    if (!audio) return;
    if (!audio.paused) {
      pausedByUser.current = true;
      audio.pause();
      setPlaying(false);
      return;
    }
    pausedByUser.current = false;
    audio.muted = muted;
    void audio.play().then(() => {
      setUnavailable(false);
      setPlaying(true);
    }).catch(() => setPlaying(false));
  };

  const toggleMuted = () => {
    const audio = audioRef.current;
    const next = !muted;
    setMuted(next);
    if (audio) audio.muted = next;
  };

  return (
    <>
      <audio ref={audioRef} src="/api/music" preload="auto" loop onError={() => setUnavailable(true)} />
      <div className="fixed bottom-4 right-4 z-[70] flex items-center gap-1 rounded-full border px-2 py-1 shadow-lg backdrop-blur-md" style={{ background: 'rgba(255,253,249,.96)', borderColor: '#d9c9b7', color: '#49382b' }}>
        <button
          type="button"
          onClick={toggle}
          aria-pressed={playing}
          aria-label={playing ? 'Pausar música' : 'Tocar música'}
          title={playing ? 'Pausar música' : 'Tocar música'}
          className="inline-flex min-h-10 items-center gap-2 rounded-full px-3 text-xs font-semibold"
        >
          {playing ? <Pause size={16} /> : <Play size={16} />}
          <span>{playing ? 'Música' : 'Ouvir música'}</span>
        </button>
        <button type="button" onClick={toggleMuted} aria-pressed={muted} aria-label={muted ? 'Ativar som' : 'Silenciar música'} title={muted ? 'Ativar som' : 'Silenciar música'} className="grid min-h-10 min-w-10 place-items-center rounded-full">
          {muted ? <VolumeX size={16} /> : <Volume2 size={16} />}
        </button>
        {unavailable && <span role="status" className="sr-only">Música indisponível no momento.</span>}
      </div>
    </>
  );
}
