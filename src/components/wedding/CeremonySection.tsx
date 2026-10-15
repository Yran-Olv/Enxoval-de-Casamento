import type { WeddingThemeConfig } from './ThemeDefinitions';
import { MapPin, Clock, Navigation, Church, Wine, Ticket } from 'lucide-react';

type Props = {
  theme: WeddingThemeConfig;
  styleVariant?: string;
  ceremonyTime: string;
  ceremonyVenue: string;
  ceremonyAddress: string;
  ceremonyNotes: string;
  receptionVenue: string;
  receptionAddress: string;
  receptionNotes: string;
  weddingDate: string;
};

function mapsUrl(address: string) {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`;
}

function wazeUrl(address: string) {
  return `https://waze.com/ul?q=${encodeURIComponent(address)}`;
}

export default function CeremonySection({
  theme,
  styleVariant = 'cartao',
  ceremonyTime = '16:00',
  ceremonyVenue,
  ceremonyAddress,
  ceremonyNotes,
  receptionVenue,
  receptionAddress,
  receptionNotes,
  weddingDate,
}: Props) {
  const p = theme.palette;
  const cVenue = ceremonyVenue || 'Local da Cerimônia';
  const cAddress = ceremonyAddress || 'Endereço a ser confirmado pelos noivos';
  const rVenue = receptionVenue || ceremonyVenue || 'Local da Festa';
  const rAddress = receptionAddress || ceremonyAddress || 'Mesmo local da cerimônia';

  // 1. Variação INGRESSO / PASSE DE GALA (Estilo ticket/credencial)
  if (styleVariant === 'ingresso' || theme.id === 'gala') {
    return (
      <section className="py-20 px-4">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <span className="flex items-center justify-center gap-2 text-xs uppercase tracking-[0.3em] font-semibold opacity-70">
              <Ticket size={14} /> Credencial de Acesso
            </span>
            <h2 className="text-3xl sm:text-5xl font-serif mt-2" style={{ fontFamily: theme.fontTitle }}>
              Locais & Acesso
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Ingresso 1: Cerimônia */}
            <div className="relative bg-[#1f1c24] border-2 border-[#c6a36a]/40 text-[#f4ecdf] p-8 rounded-lg shadow-2xl flex flex-col justify-between overflow-hidden">
              <div className="absolute top-0 right-0 bg-[#c6a36a] text-black text-[10px] font-bold uppercase tracking-widest px-4 py-1">
                Ingresso A
              </div>

              <div>
                <div className="flex items-center gap-2 text-[#c6a36a] mb-2 text-xs uppercase tracking-widest font-semibold">
                  <Church size={16} /> Cerimônia Religiosa
                </div>
                <h3 className="text-2xl font-serif text-white font-bold" style={{ fontFamily: theme.fontTitle }}>
                  {cVenue}
                </h3>
                <p className="mt-2 text-sm text-[#f4ecdf]/80 flex items-start gap-1.5">
                  <MapPin size={16} className="mt-0.5 shrink-0 text-[#c6a36a]" />
                  <span>{cAddress}</span>
                </p>
                <p className="mt-3 text-xs uppercase tracking-widest text-[#c6a36a] flex items-center gap-1.5">
                  <Clock size={14} /> Horário: {ceremonyTime}
                </p>
                {ceremonyNotes && <p className="mt-3 text-xs italic opacity-70">{ceremonyNotes}</p>}
              </div>

              <div className="mt-8 pt-6 border-t border-dashed border-[#c6a36a]/30 flex flex-wrap gap-2">
                <a
                  href={mapsUrl(cAddress)}
                  target="_blank"
                  rel="noreferrer"
                  className="rounded-none bg-[#c6a36a] text-black text-[11px] font-bold uppercase tracking-wider px-4 py-2 hover:bg-white transition-colors"
                >
                  Google Maps
                </a>
                <a
                  href={wazeUrl(cAddress)}
                  target="_blank"
                  rel="noreferrer"
                  className="rounded-none border border-[#c6a36a]/60 text-[#c6a36a] text-[11px] font-bold uppercase tracking-wider px-4 py-2 hover:bg-[#c6a36a]/20 transition-colors"
                >
                  Waze
                </a>
              </div>
            </div>

            {/* Ingresso 2: Recepção */}
            <div className="relative bg-[#1f1c24] border-2 border-[#c6a36a]/40 text-[#f4ecdf] p-8 rounded-lg shadow-2xl flex flex-col justify-between overflow-hidden">
              <div className="absolute top-0 right-0 bg-[#c6a36a] text-black text-[10px] font-bold uppercase tracking-widest px-4 py-1">
                Ingresso B
              </div>

              <div>
                <div className="flex items-center gap-2 text-[#c6a36a] mb-2 text-xs uppercase tracking-widest font-semibold">
                  <Wine size={16} /> Comemoração & Festa
                </div>
                <h3 className="text-2xl font-serif text-white font-bold" style={{ fontFamily: theme.fontTitle }}>
                  {rVenue}
                </h3>
                <p className="mt-2 text-sm text-[#f4ecdf]/80 flex items-start gap-1.5">
                  <MapPin size={16} className="mt-0.5 shrink-0 text-[#c6a36a]" />
                  <span>{rAddress}</span>
                </p>
                <p className="mt-3 text-xs uppercase tracking-widest text-[#c6a36a] flex items-center gap-1.5">
                  <Clock size={14} /> Logo após a cerimônia
                </p>
                {receptionNotes && <p className="mt-3 text-xs italic opacity-70">{receptionNotes}</p>}
              </div>

              <div className="mt-8 pt-6 border-t border-dashed border-[#c6a36a]/30 flex flex-wrap gap-2">
                <a
                  href={mapsUrl(rAddress)}
                  target="_blank"
                  rel="noreferrer"
                  className="rounded-none bg-[#c6a36a] text-black text-[11px] font-bold uppercase tracking-wider px-4 py-2 hover:bg-white transition-colors"
                >
                  Google Maps
                </a>
                <a
                  href={wazeUrl(rAddress)}
                  target="_blank"
                  rel="noreferrer"
                  className="rounded-none border border-[#c6a36a]/60 text-[#c6a36a] text-[11px] font-bold uppercase tracking-wider px-4 py-2 hover:bg-[#c6a36a]/20 transition-colors"
                >
                  Waze
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>
    );
  }

  // 2. Variação FORMAL (Moldura clássica e texto solene)
  if (styleVariant === 'formal') {
    return (
      <section className="py-20 px-4">
        <div className={`max-w-3xl mx-auto p-10 sm:p-14 ${theme.cardClass} text-center border-2 shadow-xl`}>
          <div className="border border-current/20 p-8 sm:p-12">
            <span className="text-xs uppercase tracking-[0.3em] font-bold opacity-60">Celebração & Festa</span>
            <h2 className="text-3xl sm:text-5xl font-serif mt-3 mb-8" style={{ fontFamily: theme.fontTitle }}>
              Onde Celebraremos
            </h2>

            <div className="space-y-8 max-w-lg mx-auto">
              <div>
                <h3 className="text-2xl font-serif font-medium text-current" style={{ color: p.accent }}>
                  {cVenue}
                </h3>
                <p className="mt-1 text-sm font-medium">{cAddress}</p>
                <p className="text-xs uppercase tracking-widest mt-1 opacity-70">Às {ceremonyTime} horas</p>
                {ceremonyNotes && <p className="mt-2 text-xs italic opacity-60">{ceremonyNotes}</p>}
              </div>

              {receptionVenue && receptionVenue !== ceremonyVenue && (
                <div className="pt-6 border-t border-current/15">
                  <h3 className="text-2xl font-serif font-medium text-current" style={{ color: p.accent }}>
                    {rVenue}
                  </h3>
                  <p className="mt-1 text-sm font-medium">{rAddress}</p>
                  <p className="text-xs uppercase tracking-widest mt-1 opacity-70">Recepção dos convidados</p>
                  {receptionNotes && <p className="mt-2 text-xs italic opacity-60">{receptionNotes}</p>}
                </div>
              )}
            </div>

            <div className="mt-10 flex flex-wrap justify-center gap-4">
              <a
                href={mapsUrl(cAddress)}
                target="_blank"
                rel="noreferrer"
                className={theme.buttonClass}
              >
                Como Chegar
              </a>
            </div>
          </div>
        </div>
      </section>
    );
  }

  // 3. Variação CARTÃO (2 cartões elegantes com ícones)
  return (
    <section className="py-20 px-4">
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-14">
          <span className="text-xs uppercase tracking-[0.25em] font-semibold opacity-60">Programação dos Locais</span>
          <h2 className="text-3xl sm:text-5xl font-serif mt-2" style={{ fontFamily: theme.fontTitle }}>
            Cerimônia & Recepção
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Cartão 1: Cerimônia */}
          <div className={`p-8 sm:p-10 ${theme.cardClass} flex flex-col justify-between`}>
            <div>
              <div
                className="w-12 h-12 rounded-2xl grid place-items-center mb-6"
                style={{ background: `${p.accent}18`, color: p.accent }}
              >
                <Church size={24} />
              </div>

              <span className="text-xs uppercase tracking-widest font-semibold opacity-60">O Momento do Sim</span>
              <h3 className="text-2xl sm:text-3xl font-serif mt-1 mb-3" style={{ fontFamily: theme.fontTitle }}>
                {cVenue}
              </h3>

              <p className="text-sm leading-relaxed opacity-85 flex items-start gap-2">
                <MapPin size={16} className="mt-0.5 shrink-0" style={{ color: p.accent }} />
                <span>{cAddress}</span>
              </p>

              <p className="mt-4 text-xs uppercase tracking-widest font-medium opacity-70 flex items-center gap-2">
                <Clock size={15} style={{ color: p.accent }} />
                <span>Início pontual às {ceremonyTime}</span>
              </p>

              {ceremonyNotes && (
                <p className="mt-4 text-xs italic opacity-75 border-l-2 pl-3" style={{ borderColor: p.accent }}>
                  {ceremonyNotes}
                </p>
              )}
            </div>

            <div className="mt-8 pt-6 border-t border-current/10 flex flex-wrap gap-3">
              <a
                href={mapsUrl(cAddress)}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 text-xs uppercase font-semibold tracking-wider hover:underline"
                style={{ color: p.accent }}
              >
                <Navigation size={14} /> Abrir no Maps
              </a>
              <span className="opacity-40">·</span>
              <a
                href={wazeUrl(cAddress)}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 text-xs uppercase font-semibold tracking-wider hover:underline opacity-80"
              >
                Waze
              </a>
            </div>
          </div>

          {/* Cartão 2: Recepção */}
          <div className={`p-8 sm:p-10 ${theme.cardClass} flex flex-col justify-between`}>
            <div>
              <div
                className="w-12 h-12 rounded-2xl grid place-items-center mb-6"
                style={{ background: `${p.accent}18`, color: p.accent }}
              >
                <Wine size={24} />
              </div>

              <span className="text-xs uppercase tracking-widest font-semibold opacity-60">A Comemoração</span>
              <h3 className="text-2xl sm:text-3xl font-serif mt-1 mb-3" style={{ fontFamily: theme.fontTitle }}>
                {rVenue}
              </h3>

              <p className="text-sm leading-relaxed opacity-85 flex items-start gap-2">
                <MapPin size={16} className="mt-0.5 shrink-0" style={{ color: p.accent }} />
                <span>{rAddress}</span>
              </p>

              <p className="mt-4 text-xs uppercase tracking-widest font-medium opacity-70 flex items-center gap-2">
                <Clock size={15} style={{ color: p.accent }} />
                <span>Logo após a bênção</span>
              </p>

              {receptionNotes && (
                <p className="mt-4 text-xs italic opacity-75 border-l-2 pl-3" style={{ borderColor: p.accent }}>
                  {receptionNotes}
                </p>
              )}
            </div>

            <div className="mt-8 pt-6 border-t border-current/10 flex flex-wrap gap-3">
              <a
                href={mapsUrl(rAddress)}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 text-xs uppercase font-semibold tracking-wider hover:underline"
                style={{ color: p.accent }}
              >
                <Navigation size={14} /> Abrir no Maps
              </a>
              <span className="opacity-40">·</span>
              <a
                href={wazeUrl(rAddress)}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 text-xs uppercase font-semibold tracking-wider hover:underline opacity-80"
              >
                Waze
              </a>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
