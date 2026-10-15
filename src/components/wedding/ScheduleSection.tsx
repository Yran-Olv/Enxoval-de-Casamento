import type { WeddingThemeConfig } from './ThemeDefinitions';
import type { ScheduleItem } from '../../../server/domain';
import { Clock } from 'lucide-react';

type Props = {
  theme: WeddingThemeConfig;
  schedule: ScheduleItem[];
};

export default function ScheduleSection({ theme, schedule }: Props) {
  const p = theme.palette;
  const items = schedule.length > 0 ? schedule : [
    { time: '16:00', title: 'Chegada dos Convidados', detail: 'Boas-vindas com música ambiente e recepção.' },
    { time: '16:30', title: 'Início da Cerimônia', detail: 'Entrada dos padrinhos e cortejo dos noivos.' },
    { time: '17:30', title: 'Bênção & Troca de Alianças', detail: 'O momento mais emocionante do nosso sim.' },
    { time: '18:30', title: 'Coquetel & Fotos', detail: 'Brinde com os convidados e sessão de fotos.' },
    { time: '19:30', title: 'Jantar Especial', detail: 'Serviço gastronômico completo.' },
    { time: '21:00', title: 'Abertura da Pista', detail: 'Música, dança e celebração até tarde!' },
  ];

  return (
    <section className="py-20 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-16">
          <span className="text-xs uppercase tracking-[0.25em] font-semibold opacity-60">Linha do Tempo do Dia</span>
          <h2 className="text-3xl sm:text-5xl font-serif mt-2" style={{ fontFamily: theme.fontTitle }}>
            Programação do Evento
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {items.map((item, i) => (
            <div
              key={`${item.time}-${i}`}
              className={`p-6 sm:p-8 ${theme.cardClass} flex flex-col justify-between`}
            >
              <div>
                <span
                  className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider mb-4"
                  style={{ background: `${p.accent}15`, color: p.accent }}
                >
                  <Clock size={13} /> {item.time}
                </span>

                <h3 className="text-xl font-serif font-semibold mb-2" style={{ fontFamily: theme.fontTitle }}>
                  {item.title}
                </h3>

                {item.detail && (
                  <p className="text-sm opacity-80 leading-relaxed">
                    {item.detail}
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
