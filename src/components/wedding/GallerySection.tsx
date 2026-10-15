import { useState } from 'react';
import type { WeddingThemeConfig } from './ThemeDefinitions';
import type { GalleryItem } from '../../../server/domain';
import { Camera, X, ChevronLeft, ChevronRight } from 'lucide-react';

type Props = {
  theme: WeddingThemeConfig;
  styleVariant?: string;
  gallery: GalleryItem[];
};

const sampleGallery: GalleryItem[] = [
  { url: 'https://images.unsplash.com/photo-1519741497674-611481863552?auto=format&fit=crop&w=800&q=80', alt: 'Ensaio fotográfico no campo' },
  { url: 'https://images.unsplash.com/photo-1583939003579-730e3918a45a?auto=format&fit=crop&w=800&q=80', alt: 'Sorrisos e cumplicidade' },
  { url: 'https://images.unsplash.com/photo-1511285560929-80b456fea0bc?auto=format&fit=crop&w=800&q=80', alt: 'O pôr do sol do nosso ensaio' },
  { url: 'https://images.unsplash.com/photo-1465495976277-4387d4b0b4c6?auto=format&fit=crop&w=800&q=80', alt: 'Caminhando de mãos dadas' },
  { url: 'https://images.unsplash.com/photo-1544078751-58fee2d8a03b?auto=format&fit=crop&w=800&q=80', alt: 'O pedido de casamento' },
  { url: 'https://images.unsplash.com/photo-1519225424987-a2f2dd9c9b5f?auto=format&fit=crop&w=800&q=80', alt: 'Olhares de amor' },
];

export default function GallerySection({ theme, styleVariant = 'grade', gallery }: Props) {
  const [selectedIdx, setSelectedIdx] = useState<number | null>(null);
  const p = theme.palette;
  const photos = gallery && gallery.length > 0 ? gallery : sampleGallery;

  // 1. Variação VARAL (Fotos estilo Polaroid penduradas / Boho)
  if (styleVariant === 'varal' || theme.id === 'boho') {
    return (
      <section className="py-20 px-4">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16">
            <span className="flex items-center justify-center gap-2 text-xs uppercase tracking-[0.25em] font-semibold opacity-60">
              <Camera size={14} /> Memórias em Polaroid
            </span>
            <h2 className="text-3xl sm:text-5xl font-serif mt-2" style={{ fontFamily: theme.fontTitle }}>
              Varal de Momentos
            </h2>
          </div>

          {/* Fio do varal */}
          <div className="relative pt-6">
            <div className="absolute top-8 inset-x-0 h-[2px] bg-amber-900/20" />

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-8 relative z-10">
              {photos.map((item, idx) => {
                const tilts = ['-rotate-2', 'rotate-1', '-rotate-1', 'rotate-2', '-rotate-3', 'rotate-3'];
                const tilt = tilts[idx % tilts.length];

                return (
                  <div
                    key={item.url + idx}
                    onClick={() => setSelectedIdx(idx)}
                    className={`bg-white p-3.5 pb-8 shadow-xl cursor-pointer hover:scale-105 hover:rotate-0 transition-all duration-300 ${tilt} border border-amber-900/10 rounded-sm relative`}
                  >
                    {/* Pregador */}
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 w-3.5 h-6 bg-[#b5835a] rounded-sm shadow-md" />

                    <div className="aspect-[4/3] w-full overflow-hidden bg-neutral-100">
                      <img src={item.url} alt={item.alt} className="w-full h-full object-cover" />
                    </div>

                    <p className="mt-3 text-center text-xs font-serif italic text-neutral-600">
                      {item.alt || 'Nosso amor'}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Lightbox Modal */}
        {selectedIdx !== null && (
          <div className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4">
            <button
              type="button"
              onClick={() => setSelectedIdx(null)}
              className="absolute top-6 right-6 text-white p-2 rounded-full bg-white/10 hover:bg-white/20"
            >
              <X size={24} />
            </button>
            <img src={photos[selectedIdx].url} alt="" className="max-w-full max-h-[85vh] object-contain rounded" />
          </div>
        )}
      </section>
    );
  }

  // 2. Variação PELÍCULA (Estilo filme cinematográfico / Editorial)
  if (styleVariant === 'pelicula' || theme.id === 'editorial') {
    return (
      <section className="py-20 px-4 bg-black/5">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-14">
            <span className="text-xs uppercase tracking-[0.3em] font-bold opacity-60">
              Fotografia & Arte
            </span>
            <h2 className="text-3xl sm:text-5xl font-serif mt-2" style={{ fontFamily: theme.fontTitle }}>
              Rolo de Filme
            </h2>
          </div>

          <div className="space-y-4">
            {/* Tira de filme */}
            <div className="bg-[#111111] p-4 sm:p-6 rounded-md shadow-2xl overflow-x-auto">
              {/* Perfurações de filme superiores */}
              <div className="flex gap-4 mb-4 pb-2 border-b border-white/20 overflow-hidden">
                {Array.from({ length: 24 }).map((_, i) => (
                  <div key={i} className="w-4 h-3 bg-white/30 rounded-xs shrink-0" />
                ))}
              </div>

              {/* Fotos na tira */}
              <div className="flex gap-6 overflow-x-auto pb-4">
                {photos.map((item, idx) => (
                  <div
                    key={item.url + idx}
                    onClick={() => setSelectedIdx(idx)}
                    className="shrink-0 w-64 sm:w-72 aspect-[3/4] overflow-hidden bg-neutral-800 cursor-pointer group relative"
                  >
                    <img
                      src={item.url}
                      alt={item.alt}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                    <div className="absolute bottom-0 inset-x-0 p-3 bg-gradient-to-t from-black/80 to-transparent text-white text-[11px] font-mono">
                      FRAME #{String(idx + 1).padStart(2, '0')}
                    </div>
                  </div>
                ))}
              </div>

              {/* Perfurações de filme inferiores */}
              <div className="flex gap-4 mt-4 pt-2 border-t border-white/20 overflow-hidden">
                {Array.from({ length: 24 }).map((_, i) => (
                  <div key={i} className="w-4 h-3 bg-white/30 rounded-xs shrink-0" />
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Lightbox Modal */}
        {selectedIdx !== null && (
          <div className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4">
            <button
              type="button"
              onClick={() => setSelectedIdx(null)}
              className="absolute top-6 right-6 text-white p-2 rounded-full bg-white/10 hover:bg-white/20"
            >
              <X size={24} />
            </button>
            <img src={photos[selectedIdx].url} alt="" className="max-w-full max-h-[85vh] object-contain rounded" />
          </div>
        )}
      </section>
    );
  }

  // 3. Variação GRADE (Grade clássica harmoniosa)
  return (
    <section className="py-20 px-4">
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-14">
          <span className="flex items-center justify-center gap-2 text-xs uppercase tracking-[0.25em] font-semibold opacity-60">
            <Camera size={14} /> Nossos Momentos
          </span>
          <h2 className="text-3xl sm:text-5xl font-serif mt-2" style={{ fontFamily: theme.fontTitle }}>
            Galeria do Casal
          </h2>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 sm:gap-6">
          {photos.map((item, idx) => (
            <div
              key={item.url + idx}
              onClick={() => setSelectedIdx(idx)}
              className="relative aspect-square overflow-hidden rounded-xl shadow-md cursor-pointer group border border-current/10"
            >
              <img
                src={item.url}
                alt={item.alt}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
              />
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-end p-4">
                <span className="text-white text-xs font-serif italic opacity-0 group-hover:opacity-100 transition-opacity">
                  {item.alt || 'Ver foto'}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Lightbox Modal */}
      {selectedIdx !== null && (
        <div className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4">
          <button
            type="button"
            onClick={() => setSelectedIdx(null)}
            className="absolute top-6 right-6 text-white p-2 rounded-full bg-white/10 hover:bg-white/20"
          >
            <X size={24} />
          </button>
          <img src={photos[selectedIdx].url} alt="" className="max-w-full max-h-[85vh] object-contain rounded" />
        </div>
      )}
    </section>
  );
}
