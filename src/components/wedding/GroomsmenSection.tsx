import { useState } from 'react';
import type { WeddingThemeConfig } from './ThemeDefinitions';
import type { GroomsmanItem } from '../../../server/domain';
import { Heart, Users } from 'lucide-react';

type Props = {
  theme: WeddingThemeConfig;
  groomsmen: GroomsmanItem[];
};

const defaultGroomsmen: GroomsmanItem[] = [
  { id: '1', name: 'Lucas & Mariana', role: 'padrinho', photoUrl: '', description: 'Amigos de infância que acompanharam desde o primeiro dia de namoro.' },
  { id: '2', name: 'Rodrigo & Beatriz', role: 'padrinho', photoUrl: '', description: 'Parceiros de viagens e conselheiros de todas as horas.' },
  { id: '3', name: 'Camila Santos', role: 'madrinha', photoUrl: '', description: 'Irmã de coração e confidente dos noivos.' },
  { id: '4', name: 'Felipe Oliveira', role: 'padrinho', photoUrl: '', description: 'Irmão do noivo e melhor parceiro de vida.' },
];

export default function GroomsmenSection({ theme, groomsmen }: Props) {
  const p = theme.palette;
  const list = groomsmen && groomsmen.length > 0 ? groomsmen : defaultGroomsmen;

  const roleLabel: Record<string, string> = {
    padrinho: 'Padrinho',
    madrinha: 'Madrinha',
    dama: 'Daminha',
    pajem: 'Pajem',
    outro: 'Pessoa Especial',
  };

  return (
    <section className="py-20 px-4">
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-16">
          <span className="flex items-center justify-center gap-2 text-xs uppercase tracking-[0.25em] font-semibold opacity-60">
            <Users size={14} /> Nossas Testemunhas de Amor
          </span>
          <h2 className="text-3xl sm:text-5xl font-serif mt-2" style={{ fontFamily: theme.fontTitle }}>
            Padrinhos & Madrinhas
          </h2>
          <p className="mt-3 text-sm sm:text-base opacity-75 max-w-lg mx-auto">
            Aqueles que caminham ao nosso lado, guardam nossos segredos e abençoam essa nova etapa.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {list.map((person) => (
            <div
              key={person.id}
              className={`p-6 ${theme.cardClass} flex flex-col items-center text-center`}
            >
              <div className="relative w-24 h-24 mb-4 rounded-full overflow-hidden border-2 border-current/20 shadow-md">
                {person.photoUrl ? (
                  <img src={person.photoUrl} alt={person.name} className="w-full h-full object-cover" />
                ) : (
                  <div
                    className="w-full h-full grid place-items-center text-2xl font-serif font-bold text-white"
                    style={{ background: p.accent }}
                  >
                    {person.name.charAt(0)}
                  </div>
                )}
              </div>

              <span
                className="text-[10px] uppercase font-bold tracking-widest px-3 py-0.5 rounded-full mb-2"
                style={{ background: `${p.accent}18`, color: p.accent }}
              >
                {roleLabel[person.role] || 'Padrinhos'}
              </span>

              <h3 className="text-xl font-serif font-semibold" style={{ fontFamily: theme.fontTitle }}>
                {person.name}
              </h3>

              {person.description && (
                <p className="mt-2 text-xs opacity-75 leading-relaxed">
                  {person.description}
                </p>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
