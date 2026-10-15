import { useState } from 'react';
import type { WeddingThemeConfig } from './ThemeDefinitions';
import type { MenuItem } from '../../../server/domain';
import { Utensils, Wine, Coffee, Cake } from 'lucide-react';

type Props = {
  theme: WeddingThemeConfig;
  menu: MenuItem[];
};

const defaultMenu: MenuItem[] = [
  { id: '1', category: 'entradas', title: 'Bruschettas Clássicas & Canapés Nobres', description: 'Tomates confitados com manjericão fresco, queijo brie com geleia de pimenta e carpaccio trufado.' },
  { id: '2', category: 'entradas', title: 'Salada de Folhas Verdes & Figos Grelhados', description: 'Mix de folhas nobres, nozes caramelizadas, queijo de cabra e redução de balsâmico.' },
  { id: '3', category: 'principais', title: 'Filé Mignon ao Molho Roti & Risoto Parmesão', description: 'Corte nobre grelhado no ponto com risoto cremoso de queijo parmesão da Canastra.' },
  { id: '4', category: 'principais', title: 'Salmão Grelhado com Crosta de Ervas', description: 'Acompanhado de mousseline de mandioquinha e legumes salteados na manteiga clarified.' },
  { id: '5', category: 'sobremesas', title: 'Bolo dos Noivos & Mesa de Doces Finos', description: 'Massa amanteigada com recheio de pistache e brigadeiros gourmet belgas variados.' },
  { id: '6', category: 'bebidas', title: 'Bar de Drinks & Carta de Vinhos', description: 'Gin tônica artesanal, moscow mule, espumante brut, vinhos selecionados e bebidas não alcoólicas.' },
];

export default function MenuSection({ theme, menu }: Props) {
  const [activeCategory, setActiveCategory] = useState<string>('todos');
  const p = theme.palette;
  const items = menu && menu.length > 0 ? menu : defaultMenu;

  const categories = [
    { id: 'todos', label: 'Menu Completo' },
    { id: 'entradas', label: 'Entradas' },
    { id: 'principais', label: 'Pratos Principais' },
    { id: 'sobremesas', label: 'Sobremesas' },
    { id: 'bebidas', label: 'Bar & Bebidas' },
  ];

  const filtered = activeCategory === 'todos'
    ? items
    : items.filter((it) => it.category === activeCategory);

  return (
    <section className="py-20 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-12">
          <span className="flex items-center justify-center gap-2 text-xs uppercase tracking-[0.25em] font-semibold opacity-60">
            <Utensils size={14} /> Experiência Gastronômica
          </span>
          <h2 className="text-3xl sm:text-5xl font-serif mt-2" style={{ fontFamily: theme.fontTitle }}>
            Cardápio do Casamento
          </h2>
        </div>

        {/* Abas de Categoria */}
        <div className="flex flex-wrap justify-center gap-2 mb-12">
          {categories.map((cat) => (
            <button
              key={cat.id}
              type="button"
              onClick={() => setActiveCategory(cat.id)}
              className={`px-4 py-2 text-xs uppercase tracking-wider font-semibold transition-all ${
                activeCategory === cat.id
                  ? 'rounded-full shadow-md text-white'
                  : 'rounded-full bg-current/5 opacity-70 hover:opacity-100'
              }`}
              style={{
                background: activeCategory === cat.id ? p.accent : undefined,
                color: activeCategory === cat.id ? p.onAccent : undefined,
              }}
            >
              {cat.label}
            </button>
          ))}
        </div>

        {/* Lista de Itens do Cardápio */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {filtered.map((dish) => (
            <div key={dish.id} className={`p-6 sm:p-8 ${theme.cardClass}`}>
              <div className="flex items-start justify-between gap-4 mb-2">
                <h3 className="text-xl font-serif font-semibold" style={{ fontFamily: theme.fontTitle }}>
                  {dish.title}
                </h3>
                <span
                  className="shrink-0 text-[10px] uppercase font-bold tracking-wider px-2.5 py-0.5 rounded-full"
                  style={{ background: `${p.accent}15`, color: p.accent }}
                >
                  {dish.category}
                </span>
              </div>
              <p className="text-sm opacity-80 leading-relaxed">
                {dish.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
