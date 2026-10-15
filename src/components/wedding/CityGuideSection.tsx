import { useState } from 'react';
import type { WeddingThemeConfig } from './ThemeDefinitions';
import type { CityGuideItem } from '../../../server/domain';
import { Compass, Sparkles, Utensils, MapPin, Coffee, ExternalLink } from 'lucide-react';

type Props = {
  theme: WeddingThemeConfig;
  cityGuide: CityGuideItem[];
};

const defaultGuide: CityGuideItem[] = [
  {
    id: 'g1',
    category: 'beleza',
    name: 'Espaço Glamour & Beleza',
    tip: 'Nosso salão favorito para maquiagem e cabelo de convidadas e madrinhas. Agende com antecedência!',
    address: 'Rua das Camélias, 300',
    link: 'https://instagram.com',
  },
  {
    id: 'g2',
    category: 'restaurante',
    name: 'Bistrô do Lago',
    tip: 'Perfeito para um almoço relaxante no sábado antes da cerimônia com vista agradável.',
    address: 'Parque das Águas, s/n',
    link: 'https://google.com',
  },
  {
    id: 'g3',
    category: 'passeio',
    name: 'Mirante da Colina',
    tip: 'Pôr do sol cinematográfico e melhor vista panorâmica da cidade.',
    address: 'Alto da Boa Vista',
    link: '',
  },
];

export default function CityGuideSection({ theme, cityGuide }: Props) {
  const [filter, setFilter] = useState<string>('todos');
  const p = theme.palette;
  const list = cityGuide && cityGuide.length > 0 ? cityGuide : defaultGuide;

  const categories = [
    { id: 'todos', label: 'Todas as Dicas' },
    { id: 'beleza', label: 'Cabelo & Make' },
    { id: 'restaurante', label: 'Onde Comer' },
    { id: 'passeio', label: 'Passeios' },
  ];

  const filtered = filter === 'todos' ? list : list.filter((it) => it.category === filter);

  return (
    <section className="py-20 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-12">
          <span className="flex items-center justify-center gap-2 text-xs uppercase tracking-[0.25em] font-semibold opacity-60">
            <Compass size={14} /> Dicas dos Noivos
          </span>
          <h2 className="text-3xl sm:text-5xl font-serif mt-2" style={{ fontFamily: theme.fontTitle }}>
            Guia da Cidade
          </h2>
          <p className="mt-3 text-sm opacity-75 max-w-md mx-auto">
            Lugares especiais que amamos e recomendamos para você aproveitar sua estadia ao máximo.
          </p>
        </div>

        {/* Filtros */}
        <div className="flex flex-wrap justify-center gap-2 mb-10">
          {categories.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => setFilter(c.id)}
              className={`px-4 py-1.5 text-xs uppercase tracking-wider font-semibold transition-all ${
                filter === c.id
                  ? 'rounded-full text-white shadow-sm'
                  : 'rounded-full bg-current/5 opacity-70 hover:opacity-100'
              }`}
              style={{
                background: filter === c.id ? p.accent : undefined,
                color: filter === c.id ? p.onAccent : undefined,
              }}
            >
              {c.label}
            </button>
          ))}
        </div>

        {/* Grade de Dicas */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {filtered.map((item) => (
            <div key={item.id} className={`p-6 ${theme.cardClass} flex flex-col justify-between`}>
              <div>
                <span
                  className="text-[10px] uppercase font-bold tracking-wider px-2.5 py-0.5 rounded-full inline-block mb-3"
                  style={{ background: `${p.accent}15`, color: p.accent }}
                >
                  {item.category === 'beleza' ? 'Salão & Make' : item.category === 'restaurante' ? 'Gastronomia' : 'Passeio'}
                </span>

                <h3 className="text-lg font-serif font-bold mb-2" style={{ fontFamily: theme.fontTitle }}>
                  {item.name}
                </h3>

                <p className="text-xs opacity-80 leading-relaxed mb-4">
                  {item.tip}
                </p>

                {item.address && (
                  <p className="text-[11px] opacity-70 flex items-center gap-1.5">
                    <MapPin size={12} className="shrink-0" style={{ color: p.accent }} />
                    <span>{item.address}</span>
                  </p>
                )}
              </div>

              {item.link && (
                <div className="mt-6 pt-3 border-t border-current/10">
                  <a
                    href={item.link}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 text-[11px] uppercase font-bold tracking-wider hover:underline"
                    style={{ color: p.accent }}
                  >
                    <span>Ver no Maps / Perfil</span>
                    <ExternalLink size={12} />
                  </a>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
