import { motion } from 'motion/react';
import type { WeddingThemeConfig } from './ThemeDefinitions';
import { Heart, Sparkles, BookOpen } from 'lucide-react';

type Props = {
  theme: WeddingThemeConfig;
  styleVariant?: string;
  coupleStory: string;
  coupleNames: string;
};

export default function StorySection({
  theme,
  styleVariant = 'cartas',
  coupleStory,
  coupleNames,
}: Props) {
  const p = theme.palette;
  const story = coupleStory.trim() ||
    `Tudo começou de forma inesperada. Entre conversas despretensiosas e risos sinceros, percebemos que a vida fazia muito mais sentido quando estávamos juntos.\n\nCom o passar dos dias, a cumplicidade só cresceu, e cada desafio superado nos uniu ainda mais. Hoje, temos a certeza de que queremos caminhar lado a lado por toda a vida.\n\nEstamos imensamente felizes em celebrar esse capítulo ao lado das pessoas mais especiais das nossas vidas.`;

  // 1. Variação TIMELINE (Linha do tempo dos marcos do amor)
  if (styleVariant === 'timeline') {
    const milestones = [
      { year: 'O Início', title: 'O Primeiro Olhar', text: 'O dia em que nossos caminhos se cruzaram e tudo começou a fazer sentido.' },
      { year: 'A Caminhada', title: 'O Namoro & Cumplicidade', text: 'Descobrimos parceiros de vida, sonhos compartilhados e risadas intermináveis.' },
      { year: 'O Sim', title: 'O Pedido de Casamento', text: 'Com o coração transbordando, decidimos selar para sempre essa união.' },
      { year: 'O Grande Dia', title: 'O Nosso Casamento', text: 'O momento de celebrar nosso amor diante de Deus e com quem mais amamos.' },
    ];

    return (
      <section className="py-20 px-4">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-16">
            <span className="text-xs uppercase tracking-[0.25em] font-semibold opacity-60">Nossa Linha do Tempo</span>
            <h2 className="text-4xl sm:text-5xl font-serif mt-2" style={{ fontFamily: theme.fontTitle }}>
              Como Chegamos Até Aqui
            </h2>
          </div>

          <div className="relative border-l-2 border-current/20 ml-4 sm:ml-32 pl-6 sm:pl-10 space-y-12">
            {milestones.map((m, i) => (
              <motion.div
                key={m.title}
                initial={{ opacity: 0, x: -20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: i * 0.15 }}
                className="relative"
              >
                {/* Marcador na linha */}
                <div
                  className="absolute -left-[31px] sm:-left-[47px] top-1.5 w-4 h-4 rounded-full border-2 border-white shadow"
                  style={{ background: p.accent }}
                />

                <span
                  className="inline-block text-xs uppercase font-bold tracking-widest px-3 py-1 rounded-full mb-2"
                  style={{ background: `${p.accent}20`, color: p.accent }}
                >
                  {m.year}
                </span>

                <h3 className="text-2xl font-serif font-medium" style={{ fontFamily: theme.fontTitle }}>
                  {m.title}
                </h3>

                <p className="mt-2 text-base leading-relaxed opacity-80 max-w-lg">
                  {m.text}
                </p>
              </motion.div>
            ))}
          </div>

          {coupleStory && (
            <div className={`mt-16 p-8 ${theme.cardClass} text-center max-w-2xl mx-auto`}>
              <p className="font-serif text-lg leading-relaxed italic opacity-90 whitespace-pre-line">
                "{coupleStory}"
              </p>
            </div>
          )}
        </div>
      </section>
    );
  }

  // 2. Variação DIÁRIO (Página de diário rústico/artesanal / Boho)
  if (styleVariant === 'diario' || theme.id === 'boho') {
    return (
      <section className="py-20 px-4">
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-10">
            <span className="flex items-center justify-center gap-2 text-xs uppercase tracking-[0.25em] font-semibold opacity-60">
              <BookOpen size={14} /> Páginas de Nós Dois
            </span>
            <h2 className="text-4xl sm:text-5xl font-serif mt-2" style={{ fontFamily: theme.fontTitle }}>
              Nossa História
            </h2>
          </div>

          <div
            className={`p-8 sm:p-14 ${theme.cardClass} relative overflow-hidden`}
            style={{
              backgroundImage: 'radial-gradient(circle at 10% 10%, rgba(0,0,0,0.015) 0%, transparent 80%)',
            }}
          >
            <div className="flex items-center justify-between border-b border-current/15 pb-4 mb-8 text-xs uppercase tracking-widest opacity-60">
              <span>Capítulo 1</span>
              <span>Para Toda a Vida</span>
            </div>

            <p className="font-serif text-xl sm:text-2xl leading-relaxed whitespace-pre-line opacity-90 text-justify">
              {story}
            </p>

            <div className="mt-12 pt-6 border-t border-current/15 flex items-center justify-between">
              <span className="text-xs uppercase tracking-widest opacity-60">Com amor,</span>
              <span className="text-3xl" style={{ fontFamily: theme.fontScript, color: p.accent }}>
                {coupleNames}
              </span>
            </div>
          </div>
        </div>
      </section>
    );
  }

  // 3. Variação CARTAS (Carta de amor com papel de carta romântico)
  return (
    <section className="py-20 px-4">
      <div className="max-w-3xl mx-auto text-center">
        <span className="text-xs uppercase tracking-[0.25em] font-semibold opacity-60">
          Como tudo começou
        </span>
        <h2 className="text-4xl sm:text-5xl font-serif mt-2 mb-10" style={{ fontFamily: theme.fontTitle }}>
          Uma Carta Para Vocês
        </h2>

        <div className={`p-8 sm:p-14 ${theme.cardClass} relative text-center shadow-xl`}>
          <div className="w-10 h-10 mx-auto mb-6 grid place-items-center rounded-full bg-current/5" style={{ color: p.accent }}>
            <Heart size={20} className="fill-current" />
          </div>

          <p className="font-serif text-xl sm:text-2xl italic leading-relaxed whitespace-pre-line opacity-90">
            {story}
          </p>

          <div className="mt-10 flex flex-col items-center">
            <span className="h-[1px] w-16 mb-4 opacity-30 bg-current" />
            <span className="text-3xl sm:text-4xl" style={{ fontFamily: theme.fontScript, color: p.accent }}>
              {coupleNames}
            </span>
          </div>
        </div>
      </div>
    </section>
  );
}
