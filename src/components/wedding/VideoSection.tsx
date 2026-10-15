import { useState } from 'react';
import type { WeddingThemeConfig } from './ThemeDefinitions';
import { Play, Film } from 'lucide-react';

type Props = {
  theme: WeddingThemeConfig;
  videoUrl?: string;
  coupleNames: string;
};

function getEmbedUrl(url: string): { type: 'youtube' | 'vimeo' | 'mp4' | 'invalid'; src: string } {
  const trimmed = url.trim();
  if (!trimmed) return { type: 'invalid', src: '' };

  // YouTube match: youtube.com/watch?v=... ou youtu.be/... ou youtube.com/shorts/...
  const ytMatch = /(?:youtube\.com\/(?:watch\?v=|shorts\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/.exec(trimmed);
  if (ytMatch && ytMatch[1]) {
    return { type: 'youtube', src: `https://www.youtube.com/embed/${ytMatch[1]}?autoplay=1&rel=0` };
  }

  // Vimeo match: vimeo.com/123456789
  const vimeoMatch = /vimeo\.com\/(\d+)/.exec(trimmed);
  if (vimeoMatch && vimeoMatch[1]) {
    return { type: 'vimeo', src: `https://player.vimeo.com/video/${vimeoMatch[1]}?autoplay=1` };
  }

  // Direct MP4
  if (trimmed.endsWith('.mp4') || trimmed.includes('/uploads/')) {
    return { type: 'mp4', src: trimmed };
  }

  return { type: 'invalid', src: trimmed };
}

export default function VideoSection({ theme, videoUrl, coupleNames }: Props) {
  const [playing, setPlaying] = useState(false);
  if (!videoUrl || !videoUrl.trim()) return null;

  const embed = getEmbedUrl(videoUrl);
  if (embed.type === 'invalid') return null;

  return (
    <section className="py-20 px-4">
      <div className="max-w-4xl mx-auto text-center">
        <span className="flex items-center justify-center gap-2 text-xs uppercase tracking-[0.25em] font-semibold opacity-60 mb-2">
          <Film size={14} /> Momentos Especiais
        </span>
        <h2 className="text-3xl sm:text-5xl font-serif mb-8" style={{ fontFamily: theme.fontTitle }}>
          Nosso Amor em Movimento
        </h2>

        <div className={`relative aspect-video w-full overflow-hidden shadow-2xl ${theme.cardClass} p-0`}>
          {!playing ? (
            <div className="relative w-full h-full group cursor-pointer" onClick={() => setPlaying(true)}>
              <img
                src={theme.samplePhoto}
                alt={`Vídeo de ${coupleNames}`}
                className="w-full h-full object-cover brightness-75 group-hover:scale-105 transition-transform duration-700"
              />
              <div className="absolute inset-0 grid place-items-center bg-black/30 backdrop-blur-[2px]">
                <div className="flex flex-col items-center gap-3">
                  <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full grid place-items-center bg-white/90 text-black shadow-2xl group-hover:scale-110 transition-transform">
                    <Play size={28} className="translate-x-0.5 fill-black" />
                  </div>
                  <span className="text-white text-xs uppercase font-semibold tracking-widest drop-shadow-md">
                    Assistir ao Teaser
                  </span>
                </div>
              </div>
            </div>
          ) : embed.type === 'mp4' ? (
            <video src={embed.src} controls autoPlay className="w-full h-full object-cover" />
          ) : (
            <iframe
              src={embed.src}
              title={`Vídeo do casamento de ${coupleNames}`}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              className="w-full h-full border-0"
            />
          )}
        </div>
      </div>
    </section>
  );
}
