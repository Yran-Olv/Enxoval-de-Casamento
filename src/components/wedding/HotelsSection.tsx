import type { WeddingThemeConfig } from './ThemeDefinitions';
import type { HotelItem } from '../../../server/domain';
import { Building2, MapPin, Phone, ExternalLink, Tag } from 'lucide-react';

type Props = {
  theme: WeddingThemeConfig;
  hotels: HotelItem[];
};

const defaultHotels: HotelItem[] = [
  {
    id: 'h1',
    name: 'Hotel Boutique Jardins',
    address: 'Av. das Flores, 1200 — Bairro Nobre (a 5 min da cerimônia)',
    phone: '(34) 3322-1100',
    link: 'https://booking.com',
    discountCode: 'CASAMENTOTAISYRAN',
    notes: 'Tarifa especial com café da manhã incluso ao informar o código.',
  },
  {
    id: 'h2',
    name: 'Grand Palace Hotel & Spa',
    address: 'Rua Central, 450 — Centro',
    phone: '(34) 3311-5500',
    link: 'https://booking.com',
    discountCode: 'TAISEYRAN15',
    notes: 'Excelente localização com translado para o local da recepção.',
  },
];

export default function HotelsSection({ theme, hotels }: Props) {
  const p = theme.palette;
  const list = hotels && hotels.length > 0 ? hotels : defaultHotels;

  return (
    <section className="py-20 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-16">
          <span className="flex items-center justify-center gap-2 text-xs uppercase tracking-[0.25em] font-semibold opacity-60">
            <Building2 size={14} /> Para Quem Vem de Fora
          </span>
          <h2 className="text-3xl sm:text-5xl font-serif mt-2" style={{ fontFamily: theme.fontTitle }}>
            Hospedagem & Hotéis
          </h2>
          <p className="mt-3 text-sm opacity-75 max-w-lg mx-auto">
            Selecionamos as melhores opções com tarifas especiais para você aproveitar a festa com total conforto.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {list.map((hotel) => (
            <div key={hotel.id} className={`p-8 ${theme.cardClass} flex flex-col justify-between`}>
              <div>
                <h3 className="text-2xl font-serif font-bold mb-3" style={{ fontFamily: theme.fontTitle }}>
                  {hotel.name}
                </h3>

                <p className="text-sm opacity-85 flex items-start gap-2 mb-3">
                  <MapPin size={16} className="mt-0.5 shrink-0" style={{ color: p.accent }} />
                  <span>{hotel.address}</span>
                </p>

                {hotel.phone && (
                  <p className="text-sm opacity-80 flex items-center gap-2 mb-3">
                    <Phone size={15} className="shrink-0" style={{ color: p.accent }} />
                    <span>{hotel.phone}</span>
                  </p>
                )}

                {hotel.discountCode && (
                  <div
                    className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-mono font-bold mb-3"
                    style={{ background: `${p.accent}15`, color: p.accent }}
                  >
                    <Tag size={13} />
                    <span>Cupom: {hotel.discountCode}</span>
                  </div>
                )}

                {hotel.notes && (
                  <p className="text-xs italic opacity-75 leading-relaxed">
                    {hotel.notes}
                  </p>
                )}
              </div>

              {hotel.link && (
                <div className="mt-8 pt-4 border-t border-current/10">
                  <a
                    href={hotel.link}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-2 text-xs uppercase font-bold tracking-wider hover:underline"
                    style={{ color: p.accent }}
                  >
                    <span>Ver no Booking / Reservar</span>
                    <ExternalLink size={13} />
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
