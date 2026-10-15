import { useEffect, useMemo, useRef, useState } from 'react';
import { motion } from 'motion/react';
import { api } from '../api';
import { buildIcs, googleCalendarUrl, invitationUrl, isRsvpClosed } from '../../server/domain';
import { CalendarDays, CheckCircle2, Clock3, Heart, MapPin, MessageCircle, Music2, Share2, Sparkles } from 'lucide-react';

type InvitationSettings = {
  coupleNames: string;
  weddingDate: string;
  ceremonyTime: string;
  ceremonyVenue: string;
  ceremonyAddress: string;
  receptionVenue: string;
  receptionAddress: string;
  invitationMessage: string;
  rsvpDeadline: string;
  dressCode: string;
  coupleStory: string;
};

const defaults: InvitationSettings = {
  coupleNames: 'Tais & Yran',
  weddingDate: '2027-02-02',
  ceremonyTime: '16:00',
  ceremonyVenue: '',
  ceremonyAddress: '',
  receptionVenue: '',
  receptionAddress: '',
  invitationMessage: 'Com muito amor, queremos compartilhar esse momento especial com você. Sua presença tornará nosso dia ainda mais inesquecível.',
  rsvpDeadline: '',
  dressCode: '',
  coupleStory: '',
};

function formattedDate(date: string) {
  if (!date) return 'Data a definir';
  return new Date(`${date}T12:00:00`).toLocaleDateString('pt-BR', {
    weekday: 'long', day: '2-digit', month: 'long', year: 'numeric',
  });
}

export default function WeddingInvitation() {
  const [settings, setSettings] = useState<InvitationSettings>(defaults);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [guests, setGuests] = useState('1');
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<'yes' | 'no' | null>(null);
  const [error, setError] = useState('');
  const [shareNote, setShareNote] = useState('');
  const sending = useRef(false);

  useEffect(() => {
    api.get('/settings').then((data) => {
      setSettings({
        ...defaults,
        ...Object.fromEntries(Object.keys(defaults).map((key) => [key, data?.[key] ?? defaults[key as keyof InvitationSettings]])),
      } as InvitationSettings);
    }).catch(() => {
      // A página continua acessível mesmo se a API estiver indisponível.
    }).finally(() => setLoading(false));
  }, []);

  const mapsLink = (address: string) => address.trim()
    ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`
    : '';

  const location = settings.ceremonyAddress || settings.ceremonyVenue;
  const shareUrl = invitationUrl(window.location.origin);
  const calendarLink = useMemo(() => googleCalendarUrl({
    coupleNames: settings.coupleNames,
    weddingDate: settings.weddingDate,
    ceremonyTime: settings.ceremonyTime || '16:00',
    invitationMessage: settings.invitationMessage,
    location,
  }), [location, settings]);
  const deadlineClosed = isRsvpClosed(settings.rsvpDeadline);

  const downloadCalendar = () => {
    const ics = buildIcs({
      coupleNames: settings.coupleNames,
      weddingDate: settings.weddingDate,
      ceremonyTime: settings.ceremonyTime || '16:00',
      invitationMessage: settings.invitationMessage,
      location,
    });
    const blob = new Blob([ics], { type: 'text/calendar;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'casamento.ics';
    link.click();
    URL.revokeObjectURL(url);
  };

  const shareInvite = async () => {
    const payload = { title: `Casamento — ${settings.coupleNames}`, text: settings.invitationMessage, url: shareUrl };
    try {
      if (navigator.share) {
        await navigator.share(payload);
        return;
      }
      await navigator.clipboard.writeText(shareUrl);
      setShareNote('Link do convite copiado.');
    } catch {
      setShareNote(shareUrl);
    }
  };

  const respond = async (attendance: 'yes' | 'no') => {
    setError('');
    if (sending.current) return;
    if (!name.trim() || !whatsapp.trim()) {
      setError('Informe seu nome e WhatsApp para confirmar a resposta.');
      return;
    }
    sending.current = true;
    setSubmitting(true);
    try {
      await api.post('/rsvp', {
        name: name.trim(),
        whatsapp: whatsapp.replace(/\D/g, ''),
        guests: attendance === 'yes' ? Number(guests) : 0,
        attending: attendance === 'yes',
        message: message.trim(),
      });
      setResult(attendance);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Não foi possível enviar sua resposta. Tente novamente.');
    } finally {
      sending.current = false;
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#fbf8f3] text-[#44382f]">
      <section className="relative overflow-hidden px-6 pb-16 pt-32 md:pb-24 md:pt-40">
        <div className="pointer-events-none absolute inset-0 opacity-50" aria-hidden="true">
          <div className="absolute -left-24 top-16 h-72 w-72 rounded-full bg-[#e9d8c8] blur-3xl" />
          <div className="absolute -right-24 bottom-0 h-80 w-80 rounded-full bg-[#d8c8ae] blur-3xl" />
        </div>
        <div className="relative mx-auto max-w-4xl text-center">
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: .7 }}>
            <div className="mb-6 flex items-center justify-center gap-2 text-xs uppercase tracking-[.32em] text-[#9b7951]"><Sparkles size={14} /> Um convite feito com amor</div>
            <Heart className="mx-auto mb-5 text-[#ad8b62]" size={27} strokeWidth={1.2} />
            <p className="font-serif text-xl italic text-[#88735e]">Vamos celebrar o amor</p>
            <h1 className="mt-4 break-words font-serif text-6xl leading-[.98] text-[#66513e] md:text-8xl">{settings.coupleNames}</h1>
            <div className="mx-auto my-8 flex max-w-sm items-center gap-4 text-[#b39a7a]"><span className="h-px flex-1 bg-current" /><Heart size={15} /><span className="h-px flex-1 bg-current" /></div>
            <p className="mx-auto max-w-xl font-serif text-xl leading-relaxed text-[#88735e]">{settings.invitationMessage}</p>
            <div className="mx-auto mt-9 inline-flex items-center gap-3 rounded-full border border-[#d8c8ae] bg-white/70 px-6 py-3 text-sm text-[#806748]"><CalendarDays size={18} /> {formattedDate(settings.weddingDate)}</div>
          </motion.div>
          <div className="mx-auto mt-10 grid max-w-2xl grid-cols-2 gap-3 text-center md:grid-cols-4">
            {[
              { icon: Clock3, label: 'Horário', value: settings.ceremonyTime || 'A definir' },
              { icon: MapPin, label: 'Cerimônia', value: settings.ceremonyVenue || 'Local a definir' },
              { icon: Music2, label: 'Recepção', value: settings.receptionVenue || 'A definir' },
              { icon: Heart, label: 'Traje', value: settings.dressCode || 'Como preferir' },
            ].map(({ icon: Icon, label, value }) => <div key={label} className="rounded-2xl border border-[#e7ddd0] bg-white/65 p-4"><Icon className="mx-auto mb-2 text-[#aa8c67]" size={19} /><p className="text-[10px] uppercase tracking-[.18em] text-[#a18d77]">{label}</p><p className="mt-1 text-sm font-medium">{value}</p></div>)}
          </div>
          <div className="mt-7 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <a href={calendarLink} target="_blank" rel="noreferrer" className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-[#82694f] px-6 py-3 text-xs font-semibold uppercase tracking-[.16em] text-white transition hover:bg-[#6c543d]"><CalendarDays size={16} /> Google Agenda</a>
            <button type="button" onClick={downloadCalendar} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full border border-[#d8c8ae] bg-white px-6 py-3 text-xs font-semibold uppercase tracking-[.16em] text-[#82694f]">Arquivo de agenda</button>
            <button type="button" onClick={() => void shareInvite()} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full border border-[#d8c8ae] bg-white px-6 py-3 text-xs font-semibold uppercase tracking-[.16em] text-[#82694f]"><Share2 size={16} /> Compartilhar</button>
          </div>
          {shareNote && <p className="mt-3 text-sm text-[#806748]" role="status">{shareNote}</p>}
        </div>
      </section>

      {settings.coupleStory.trim() && (
        <section className="px-6 pb-6">
          <div className="mx-auto max-w-3xl rounded-[2rem] border border-[#e5d8c8] bg-white px-7 py-8 text-center md:px-12">
            <p className="text-xs uppercase tracking-[.25em] text-[#ad8b62]">Nossa história</p>
            <p className="mt-4 whitespace-pre-line font-serif text-2xl leading-relaxed text-[#66513e]">{settings.coupleStory}</p>
          </div>
        </section>
      )}

      <section className="px-6 pb-24">
        <div className="mx-auto grid max-w-5xl gap-6 md:grid-cols-2">
          <div className="rounded-[2rem] border border-[#e5d8c8] bg-white p-7 shadow-sm md:p-10">
            <span className="text-xs uppercase tracking-[.25em] text-[#ad8b62]">Será uma alegria ter você</span>
            <h2 className="mt-3 font-serif text-4xl text-[#66513e]">Confirme sua presença</h2>
            {result ? (
              <div className="mt-8 rounded-2xl bg-[#f4f0e8] p-6 text-center">
                <CheckCircle2 className="mx-auto mb-3 text-[#7b8d68]" size={36} />
                <p className="font-serif text-2xl">{result === 'yes' ? 'Presença confirmada!' : 'Resposta registrada'}</p>
                <p className="mt-2 text-sm text-[#887b6d]">{result === 'yes' ? 'Obrigado por celebrar esse momento com a gente.' : 'Obrigado por nos avisar. Sentiremos sua falta!'}</p>
                <button type="button" onClick={() => setResult(null)} className="mt-5 min-h-11 text-xs font-semibold uppercase tracking-widest text-[#9b7951] underline">Atualizar resposta</button>
              </div>
            ) : loading ? <p className="mt-7 text-sm text-[#887b6d]" role="status">Preparando o convite…</p> : deadlineClosed ? (
              <p className="mt-7 rounded-2xl bg-[#f4f0e8] p-6 text-sm leading-relaxed text-[#66513e]" role="status">O prazo para confirmar presença encerrou em {formattedDate(settings.rsvpDeadline)}. Se precisar alterar sua resposta, fale diretamente com os noivos.</p>
            ) : (
              <form className="mt-7 space-y-4" onSubmit={(event) => event.preventDefault()}>
                <label className="block text-xs font-semibold uppercase tracking-wider text-[#887b6d]">Seu nome completo<input value={name} onChange={(e) => setName(e.target.value)} required maxLength={120} autoComplete="name" className="mt-2 w-full rounded-xl border border-[#e5d8c8] bg-[#fdfbf8] px-4 py-3 text-sm normal-case tracking-normal outline-none focus:border-[#ad8b62]" placeholder="Digite seu nome" /></label>
                <label className="block text-xs font-semibold uppercase tracking-wider text-[#887b6d]">WhatsApp<input value={whatsapp} onChange={(e) => setWhatsapp(e.target.value)} required maxLength={24} inputMode="tel" autoComplete="tel" className="mt-2 w-full rounded-xl border border-[#e5d8c8] bg-[#fdfbf8] px-4 py-3 text-sm normal-case tracking-normal outline-none focus:border-[#ad8b62]" placeholder="(34) 99999-9999" /></label>
                <label className="block text-xs font-semibold uppercase tracking-wider text-[#887b6d]">Quantas pessoas irão?<select value={guests} onChange={(e) => setGuests(e.target.value)} className="mt-2 w-full rounded-xl border border-[#e5d8c8] bg-[#fdfbf8] px-4 py-3 text-sm normal-case tracking-normal outline-none focus:border-[#ad8b62]">{[1,2,3,4,5,6].map((n) => <option key={n} value={n}>{n} {n===1?'pessoa':'pessoas'}</option>)}</select></label>
                <label className="block text-xs font-semibold uppercase tracking-wider text-[#887b6d]">Recado para os noivos (opcional)<textarea value={message} onChange={(e) => setMessage(e.target.value)} maxLength={1000} rows={3} className="mt-2 w-full rounded-xl border border-[#e5d8c8] bg-[#fdfbf8] px-4 py-3 text-sm normal-case tracking-normal outline-none focus:border-[#ad8b62]" placeholder="Deixe uma mensagem carinhosa" /></label>
                {error && <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p>}
                <div className="grid gap-3 sm:grid-cols-2">
                  <button type="button" disabled={submitting} onClick={() => void respond('yes')} className="flex items-center justify-center gap-2 rounded-xl bg-[#82694f] px-4 py-3 text-xs font-semibold uppercase tracking-wider text-white disabled:opacity-50"><CheckCircle2 size={16} /> {submitting ? 'Enviando…' : 'Estarei presente'}</button>
                  <button type="button" disabled={submitting} onClick={() => void respond('no')} className="rounded-xl border border-[#d8c8ae] px-4 py-3 text-xs font-semibold uppercase tracking-wider text-[#82694f] disabled:opacity-50">Não poderei ir</button>
                </div>
                {settings.rsvpDeadline && <p className="text-xs text-[#9a8876]">Por favor, responda até {formattedDate(settings.rsvpDeadline)}.</p>}
                <p className="text-[11px] leading-relaxed text-[#a09283]">Usamos nome, WhatsApp, quantidade de pessoas e recado só para organizar o casamento e falar com você sobre o convite. Uma nova resposta com o mesmo WhatsApp atualiza a anterior. Os noivos podem apagar esses dados no painel quando o evento terminar.</p>
              </form>
            )}
          </div>

          <div className="space-y-6">
            <div className="rounded-[2rem] border border-[#e5d8c8] bg-[#f3ece2] p-7 md:p-9">
              <span className="text-xs uppercase tracking-[.25em] text-[#ad8b62]">Como chegar</span>
              <h2 className="mt-3 font-serif text-3xl text-[#66513e]">Cerimônia</h2>
              <p className="mt-3 font-medium">{settings.ceremonyVenue || 'Local a confirmar'}</p>
              <p className="mt-1 text-sm text-[#887b6d]">{settings.ceremonyAddress || 'O endereço será divulgado em breve.'}</p>
              {mapsLink(settings.ceremonyAddress || settings.ceremonyVenue) && <a href={mapsLink(settings.ceremonyAddress || settings.ceremonyVenue)} target="_blank" rel="noreferrer" className="mt-5 inline-flex items-center gap-2 rounded-full border border-[#d8c8ae] bg-white px-5 py-3 text-xs font-semibold uppercase tracking-wider text-[#82694f]"><MapPin size={15} /> Abrir no mapa</a>}
            </div>
            <div className="rounded-[2rem] border border-[#e5d8c8] bg-white p-7 md:p-9">
              <span className="text-xs uppercase tracking-[.25em] text-[#ad8b62]">Depois da cerimônia</span>
              <h2 className="mt-3 font-serif text-3xl text-[#66513e]">Recepção</h2>
              <p className="mt-3 font-medium">{settings.receptionVenue || 'Informações em breve'}</p>
              <p className="mt-1 text-sm text-[#887b6d]">{settings.receptionAddress || 'Estamos preparando cada detalhe com carinho.'}</p>
              {mapsLink(settings.receptionAddress || settings.receptionVenue) && <a href={mapsLink(settings.receptionAddress || settings.receptionVenue)} target="_blank" rel="noreferrer" className="mt-5 inline-flex items-center gap-2 rounded-full border border-[#e5d8c8] px-5 py-3 text-xs font-semibold uppercase tracking-wider text-[#82694f]"><MapPin size={15} /> Abrir no mapa</a>}
            </div>
            <div className="rounded-[2rem] bg-[#82694f] p-7 text-white md:p-9">
              <MessageCircle className="mb-4" size={24} />
              <h3 className="font-serif text-3xl">Sua presença é nosso presente</h3>
              <p className="mt-3 text-sm leading-relaxed text-white/80">Mais do que qualquer coisa, queremos compartilhar esse dia com pessoas especiais. Obrigado por fazer parte da nossa história.</p>
            </div>
          </div>
        </div>
      </section>
      <footer className="border-t border-[#e5d8c8] px-6 py-10 text-center"><p className="font-serif text-3xl">{settings.coupleNames}</p><p className="mt-2 text-[10px] uppercase tracking-[.25em] text-[#a18d77]">Feito com amor · {formattedDate(settings.weddingDate)}</p></footer>
    </div>
  );
}
