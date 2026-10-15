import type { WeddingThemeConfig } from './ThemeDefinitions';
import { Shirt, Sparkles, HeartHandshake, AlertCircle } from 'lucide-react';

type Props = {
  theme: WeddingThemeConfig;
  dressCode?: string;
  extraInfo?: string;
};

export default function ManualSection({ theme, dressCode, extraInfo }: Props) {
  const p = theme.palette;
  const dc = dressCode?.trim() || 'Traje Passeio Completo / Esporte Fino';

  const suggestedColors = [
    { name: 'Terracota', hex: '#b85d38' },
    { name: 'Verde Sálvia', hex: '#6b8e73' },
    { name: 'Azul Serenity', hex: '#8ea8c3' },
    { name: 'Rosé Suave', hex: '#c58296' },
    { name: 'Lavanda', hex: '#a29bfe' },
    { name: 'Champagne', hex: '#e8d8b8' },
  ];

  return (
    <section className="py-20 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-14">
          <span className="flex items-center justify-center gap-2 text-xs uppercase tracking-[0.25em] font-semibold opacity-60">
            <Shirt size={14} /> Guia de Traje & Dicas
          </span>
          <h2 className="text-3xl sm:text-5xl font-serif mt-2" style={{ fontFamily: theme.fontTitle }}>
            Manual dos Convidados
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Cartão 1: Dress Code */}
          <div className={`p-8 ${theme.cardClass}`}>
            <span
              className="inline-block text-[10px] uppercase font-bold tracking-widest px-3 py-0.5 rounded-full mb-3"
              style={{ background: `${p.accent}15`, color: p.accent }}
            >
              Dress Code
            </span>

            <h3 className="text-2xl font-serif font-bold mb-3" style={{ fontFamily: theme.fontTitle }}>
              {dc}
            </h3>

            <p className="text-sm opacity-80 leading-relaxed mb-6">
              Para estarem confortáveis e elegantes nesse dia inesquecível. Recomendamos sapatos adequados para gramado ou piso de madeira e traje social.
            </p>

            <div className="pt-4 border-t border-current/10">
              <span className="text-xs uppercase font-semibold tracking-wider block opacity-70 mb-3">
                Paleta de Cores Inspiradora:
              </span>
              <div className="flex flex-wrap gap-3">
                {suggestedColors.map((col) => (
                  <div key={col.name} className="flex flex-col items-center gap-1">
                    <span
                      className="w-7 h-7 rounded-full border border-black/15 shadow-sm"
                      style={{ backgroundColor: col.hex }}
                    />
                    <span className="text-[10px] opacity-70 font-medium">{col.name}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-6 flex items-start gap-2 text-xs text-rose-800 bg-rose-500/10 p-3 rounded-lg border border-rose-500/20">
              <AlertCircle size={15} className="shrink-0 mt-0.5" />
              <span>Pedimos com carinho que evitem roupas totalmente brancas, off-white ou marfim (exclusivas da noiva).</span>
            </div>
          </div>

          {/* Cartão 2: Dicas Práticas & Conforto */}
          <div className={`p-8 ${theme.cardClass} flex flex-col justify-between`}>
            <div>
              <span
                className="inline-block text-[10px] uppercase font-bold tracking-widest px-3 py-0.5 rounded-full mb-3"
                style={{ background: `${p.accent}15`, color: p.accent }}
              >
                Recomendações
              </span>

              <h3 className="text-2xl font-serif font-bold mb-4" style={{ fontFamily: theme.fontTitle }}>
                Para Curtir ao Máximo
              </h3>

              <ul className="space-y-4 text-sm opacity-85 leading-relaxed">
                <li className="flex items-start gap-2.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-current mt-2 shrink-0 opacity-60" />
                  <span><strong>Pontualidade:</strong> A cerimônia começará no horário marcado. Chegue com 20 minutinhos de antecedência para se acomodar!</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-current mt-2 shrink-0 opacity-60" />
                  <span><strong>Desconecte-se na entrada:</strong> Guarde os celulares durante a entrada dos noivos para viver a emoção com seus próprios olhos.</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-current mt-2 shrink-0 opacity-60" />
                  <span><strong>Sorria muito e dance bastante:</strong> A festa foi pensada em cada detalhe para comemorarmos até o último segundo!</span>
                </li>
              </ul>
            </div>

            {extraInfo && (
              <div className="mt-6 pt-4 border-t border-current/10 text-xs italic opacity-75">
                {extraInfo}
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
