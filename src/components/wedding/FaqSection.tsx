import { useState } from 'react';
import type { WeddingThemeConfig } from './ThemeDefinitions';
import type { FaqItem } from '../../../server/domain';
import { HelpCircle, ChevronDown, MessageCircle } from 'lucide-react';

type Props = {
  theme: WeddingThemeConfig;
  styleVariant?: string;
  faq: FaqItem[];
};

const defaultFaq: FaqItem[] = [
  {
    id: 'f1',
    question: 'Posso levar acompanhante?',
    answer: 'Por favor, consulte o número de assentos no seu convite individual. Se tiver dúvidas, fale diretamente com os noivos!',
  },
  {
    id: 'f2',
    question: 'Haverá estacionamento no local?',
    answer: 'Sim, o local possui serviço de vallet e estacionamento privativo gratuito para os nossos convidados.',
  },
  {
    id: 'f3',
    question: 'Qual é o traje recomendado?',
    answer: 'Traje Passeio Completo ou Esporte Fino. Recomendamos sapatos confortáveis para aproveitar a pista de dança até o final!',
  },
  {
    id: 'f4',
    question: 'Posso tirar fotos durante a cerimônia?',
    answer: 'Pedimos apenas que durante a entrada dos noivos os celulares fiquem abaixados para não atrapalhar os fotógrafos oficiais. Na festa, tire muitas fotos e marque a gente!',
  },
];

export default function FaqSection({ theme, styleVariant = 'accordion', faq }: Props) {
  const [openIds, setOpenIds] = useState<Record<string, boolean>>({ f1: true });
  const p = theme.palette;
  const list = faq && faq.length > 0 ? faq : defaultFaq;

  const toggle = (id: string) => {
    setOpenIds((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  // 1. Variação CHAT (Estilo conversa de mensageiro)
  if (styleVariant === 'chat') {
    return (
      <section className="py-20 px-4">
        <div className="max-w-2xl mx-auto">
          <div className="text-center mb-12">
            <span className="flex items-center justify-center gap-2 text-xs uppercase tracking-[0.25em] font-semibold opacity-60">
              <MessageCircle size={14} /> Dúvidas Comuns
            </span>
            <h2 className="text-3xl sm:text-5xl font-serif mt-2" style={{ fontFamily: theme.fontTitle }}>
              Perguntas & Respostas
            </h2>
          </div>

          <div className="space-y-6">
            {list.map((item) => (
              <div key={item.id} className="space-y-3">
                {/* Pergunta (balão à direita) */}
                <div className="flex justify-end">
                  <div
                    className="max-w-[85%] rounded-2xl rounded-tr-none px-5 py-3 text-sm font-semibold shadow-sm text-white"
                    style={{ background: p.accent }}
                  >
                    {item.question}
                  </div>
                </div>

                {/* Resposta dos noivos (balão à esquerda) */}
                <div className="flex justify-start">
                  <div className={`max-w-[85%] rounded-2xl rounded-tl-none px-5 py-3.5 text-sm leading-relaxed shadow-sm ${theme.cardClass}`}>
                    <span className="text-[10px] font-bold uppercase tracking-wider block opacity-50 mb-1">
                      Resposta dos Noivos
                    </span>
                    {item.answer}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    );
  }

  // 2. Variação CARTÕES (Grade estática)
  if (styleVariant === 'cartoes') {
    return (
      <section className="py-20 px-4">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-14">
            <span className="text-xs uppercase tracking-[0.25em] font-semibold opacity-60">Tire Suas Dúvidas</span>
            <h2 className="text-3xl sm:text-5xl font-serif mt-2" style={{ fontFamily: theme.fontTitle }}>
              Perguntas Frequentes
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {list.map((item) => (
              <div key={item.id} className={`p-6 sm:p-8 ${theme.cardClass}`}>
                <h3 className="text-lg font-serif font-bold mb-3" style={{ fontFamily: theme.fontTitle }}>
                  {item.question}
                </h3>
                <p className="text-sm opacity-80 leading-relaxed">
                  {item.answer}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>
    );
  }

  // 3. Variação ACCORDION (Sanfona expansível)
  return (
    <section className="py-20 px-4">
      <div className="max-w-3xl mx-auto">
        <div className="text-center mb-14">
          <span className="flex items-center justify-center gap-2 text-xs uppercase tracking-[0.25em] font-semibold opacity-60">
            <HelpCircle size={14} /> Informações Práticas
          </span>
          <h2 className="text-3xl sm:text-5xl font-serif mt-2" style={{ fontFamily: theme.fontTitle }}>
            Perguntas Frequentes
          </h2>
        </div>

        <div className="space-y-4">
          {list.map((item) => {
            const isOpen = Boolean(openIds[item.id]);

            return (
              <div key={item.id} className={`overflow-hidden transition-all ${theme.cardClass}`}>
                <button
                  type="button"
                  onClick={() => toggle(item.id)}
                  className="w-full p-5 sm:p-6 text-left flex items-center justify-between gap-4 font-serif text-lg sm:text-xl font-medium focus:outline-none"
                  style={{ fontFamily: theme.fontTitle }}
                >
                  <span>{item.question}</span>
                  <ChevronDown
                    size={20}
                    className={`shrink-0 transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`}
                    style={{ color: p.accent }}
                  />
                </button>

                {isOpen && (
                  <div className="px-5 sm:px-6 pb-6 text-sm leading-relaxed opacity-85 pt-1 border-t border-current/10">
                    {item.answer}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
