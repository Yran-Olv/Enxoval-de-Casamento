import { useEffect, useMemo, useRef, useState, type InputHTMLAttributes, type ReactNode } from 'react';
import { motion } from 'motion/react';
import { api } from '../api';
import InvitationEnvelope from './InvitationEnvelope';
import FallingHearts from './FallingHearts';
import {
  INVITE_PALETTES,
  coupleInitials,
  googleCalendarUrl,
  invitationUrl,
  isInviteToken,
  isRsvpClosed,
  parseInviteTheme,
  readInviteContent,
  type InviteTheme,
} from '../../server/domain';
import { CalendarDays, CheckCircle2, Gift, Heart, MapPin } from 'lucide-react';

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
} & ReturnType<typeof readInviteContent>;

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
  ...readInviteContent(null),
};

function formattedDate(date: string) {
  if (!date) return 'Data a definir';
  return new Date(`${date}T12:00:00`).toLocaleDateString('pt-BR', {
    weekday: 'long', day: '2-digit', month: 'long', year: 'numeric',
  });
}

function go(path: string) {
  window.history.pushState({}, '', path);
  window.dispatchEvent(new PopStateEvent('popstate'));
}

function readToken() {
  const match = /^\/c\/([A-Za-z0-9_-]{22,80})$/.exec(window.location.pathname);
  return match && isInviteToken(match[1]) ? match[1] : '';
}

export default function WeddingInvitation() {
  const preview = new URLSearchParams(window.location.search).get('preview') === '1';
  const token = readToken();
  const [settings, setSettings] = useState<InvitationSettings>(defaults);
  const [phase, setPhase] = useState<'sealed' | 'opening' | 'revealed'>('sealed');
  const [guestName, setGuestName] = useState('');
  const [seatLimit, setSeatLimit] = useState(6);
  const [tokenMissing, setTokenMissing] = useState(false);
  const [name, setName] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [guests, setGuests] = useState('1');
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<'yes' | 'no' | null>(null);
  const [error, setError] = useState('');
  const [shareNote, setShareNote] = useState('');
  const [photo, setPhoto] = useState<number | null>(null);
  const sending = useRef(false);
  const palette = INVITE_PALETTES[settings.inviteTheme as InviteTheme] ?? INVITE_PALETTES.classico;

  useEffect(() => {
    let cancelled = false;
    api.get('/settings').then((data) => {
      if (cancelled || !data) return;
      const visual = readInviteContent(data);
      let draft = visual;
      if (preview) {
        try {
          const stored = sessionStorage.getItem('enxoval-invite-draft');
          if (stored) draft = readInviteContent({ ...visual, ...JSON.parse(stored) });
        } catch {
          draft = visual;
        }
      }
      setSettings({
        ...defaults,
        coupleNames: data.coupleNames || defaults.coupleNames,
        weddingDate: data.weddingDate || defaults.weddingDate,
        ceremonyTime: data.ceremonyTime || defaults.ceremonyTime,
        ceremonyVenue: data.ceremonyVenue || '',
        ceremonyAddress: data.ceremonyAddress || '',
        receptionVenue: data.receptionVenue || '',
        receptionAddress: data.receptionAddress || '',
        invitationMessage: data.invitationMessage || defaults.invitationMessage,
        rsvpDeadline: data.rsvpDeadline || '',
        dressCode: data.dressCode || '',
        coupleStory: data.coupleStory || '',
        ...draft,
        inviteTheme: parseInviteTheme(draft.inviteTheme),
      });
    }).catch(() => undefined);
    return () => { cancelled = true; };
  }, [preview]);

  useEffect(() => {
    if (!token) return;
    api.get(`/invite/${token}`).then((data) => {
      const guest = data?.guest;
      if (!guest?.name) {
        setTokenMissing(true);
        return;
      }
      setGuestName(guest.name);
      setName(guest.rsvp?.name || guest.name);
      setSeatLimit(Math.max(1, Math.min(12, Number(guest.seats) || 1)));
      if (guest.rsvp) {
        setResult(guest.rsvp.attending ? 'yes' : 'no');
        setGuests(String(guest.rsvp.guests || 1));
        setMessage(guest.rsvp.message || '');
      }
    }).catch(() => setTokenMissing(true));
  }, [token]);

  const [welcomeHearts, setWelcomeHearts] = useState(false);

  useEffect(() => {
    if (phase !== 'opening') return;
    setWelcomeHearts(true);
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const timer = window.setTimeout(() => setPhase('revealed'), reduce ? 0 : 2300);
    const heartsTimer = window.setTimeout(() => setWelcomeHearts(false), 9000);
    return () => {
      window.clearTimeout(timer);
      window.clearTimeout(heartsTimer);
    };
  }, [phase]);

  const location = settings.ceremonyAddress || settings.ceremonyVenue;
  const calendarLink = useMemo(() => googleCalendarUrl({
    coupleNames: settings.coupleNames,
    weddingDate: settings.weddingDate,
    ceremonyTime: settings.ceremonyTime || '16:00',
    invitationMessage: settings.invitationMessage,
    location,
  }), [location, settings]);
  const deadlineClosed = isRsvpClosed(settings.rsvpDeadline);
  const shareUrl = token ? `${window.location.origin}/c/${token}` : invitationUrl(window.location.origin);
  const maxGuests = token ? seatLimit : 6;

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
    if (preview) return;
    setError('');
    if (sending.current) return;
    if (!token && (!name.trim() || !whatsapp.trim())) {
      setError('Informe seu nome e WhatsApp para confirmar a resposta.');
      return;
    }
    sending.current = true;
    setSubmitting(true);
    try {
      await api.post('/rsvp', {
        inviteToken: token || undefined,
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

  if (phase !== 'revealed') {
    return (
      <InvitationEnvelope
        theme={parseInviteTheme(settings.inviteTheme)}
        initials={coupleInitials(settings.coupleNames)}
        coupleNames={settings.coupleNames}
        weddingDate={settings.weddingDate}
        ceremonyTime={settings.ceremonyTime}
        guestName={guestName}
        openingText={settings.openingText}
        phase={phase === 'opening' ? 'opening' : 'sealed'}
        onOpen={() => setPhase('opening')}
        onSkip={() => setPhase('revealed')}
      />
    );
  }

  const maps = (address: string) => address.trim() ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}` : '';

  return (
    <div style={{ background: palette.bg, color: palette.ink }}>
      <FallingHearts active={welcomeHearts} theme={parseInviteTheme(settings.inviteTheme)} count={32} />
      {preview && <p className="px-4 py-3 text-center text-sm" style={{ background: palette.accent, color: palette.onAccent }} role="status">Pré-visualização. Nenhuma resposta será gravada.</p>}
      {tokenMissing && <p className="px-4 py-3 text-center text-sm" role="alert">Não encontramos este convite. Você ainda pode ver o convite geral.</p>}
      <section className="mx-auto flex min-h-[80vh] max-w-3xl flex-col items-center justify-center px-4 py-16 text-center">
        <motion.div initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
          <p className="text-4xl" style={{ fontFamily: '"Great Vibes", cursive', color: palette.accent }}>{coupleInitials(settings.coupleNames)}</p>
          {guestName && <p className="mt-4 text-sm uppercase tracking-[.22em]" style={{ color: palette.muted }}>Para {guestName}</p>}
          <h1 className="mt-4 break-words font-serif text-6xl leading-none md:text-8xl">{settings.coupleNames}</h1>
          <p className="mx-auto mt-6 max-w-xl font-serif text-2xl italic" style={{ color: palette.muted }}>{settings.romanticLine || settings.invitationMessage}</p>
          <p className="mt-6 text-sm uppercase tracking-[.18em]">{formattedDate(settings.weddingDate)} · {settings.ceremonyTime || '16:00'}</p>
        </motion.div>
        {settings.coverPhotoUrl && (
          <img src={settings.coverPhotoUrl} alt="Foto do casal" className="mt-8 max-h-80 w-full max-w-xl rounded-[2rem] object-cover" />
        )}
        <InviteCountdown date={settings.weddingDate} time={settings.ceremonyTime || '16:00'} color={palette.ink} />
        <button type="button" onClick={() => document.getElementById('confirmar')?.scrollIntoView({ behavior: 'smooth' })} className="mt-8 min-h-11 rounded-full px-6 text-xs font-semibold uppercase tracking-[.16em]" style={{ background: palette.accent, color: palette.onAccent }}>
          Continuar
        </button>
      </section>

      {settings.showStory && settings.coupleStory.trim() && (
        <Reveal>
          <section className="mx-auto max-w-3xl px-4 py-8 text-center">
            <h2 className="font-serif text-4xl">Nossa história</h2>
            <p className="mt-4 whitespace-pre-line font-serif text-2xl leading-relaxed">{settings.coupleStory}</p>
          </section>
        </Reveal>
      )}

      {settings.showGallery && settings.gallery.length > 0 && (
        <Reveal>
          <section className="mx-auto max-w-5xl px-4 py-8" aria-label="Galeria">
            <h2 className="text-center font-serif text-4xl">Momentos</h2>
            <div className="mt-6 grid grid-cols-2 gap-3 md:grid-cols-3">
              {settings.gallery.map((item, index) => (
                <button key={item.url} type="button" onClick={() => setPhoto(index)} className="overflow-hidden rounded-2xl">
                  <img src={item.url} alt={item.alt || `Foto ${index + 1} do casal`} className="h-40 w-full object-cover md:h-56" />
                </button>
              ))}
            </div>
          </section>
        </Reveal>
      )}

      <section className="mx-auto grid max-w-5xl gap-4 px-4 py-8 md:grid-cols-2">
        <PlaceCard palette={palette} title="Cerimônia" name={settings.ceremonyVenue} address={settings.ceremonyAddress} notes={settings.ceremonyNotes} />
        <PlaceCard palette={palette} title="Recepção" name={settings.receptionVenue} address={settings.receptionAddress} notes={settings.receptionNotes} />
      </section>

      {settings.showSchedule && settings.schedule.length > 0 && (
        <Reveal>
          <section className="mx-auto max-w-3xl px-4 py-8">
            <h2 className="text-center font-serif text-4xl">Programação</h2>
            <ol className="mt-6 space-y-4">
              {settings.schedule.map((item) => (
                <li key={`${item.time}-${item.title}`} className="rounded-2xl border p-4" style={{ borderColor: palette.line, background: palette.paper }}>
                  <p className="text-xs uppercase tracking-[.18em]" style={{ color: palette.accent }}>{item.time}</p>
                  <h3 className="font-serif text-2xl">{item.title}</h3>
                  {item.detail && <p className="mt-1 text-sm" style={{ color: palette.muted }}>{item.detail}</p>}
                </li>
              ))}
            </ol>
          </section>
        </Reveal>
      )}

      {(settings.showDress && (settings.dressCode || settings.extraInfo)) && (
        <section className="mx-auto max-w-3xl px-4 py-8 text-center">
          <h2 className="font-serif text-4xl">Para o grande dia</h2>
          {settings.dressCode && <p className="mt-3">Traje: {settings.dressCode}</p>}
          {settings.extraInfo && <p className="mt-3 whitespace-pre-line text-sm leading-relaxed" style={{ color: palette.muted }}>{settings.extraInfo}</p>}
        </section>
      )}

      <section id="confirmar" className="mx-auto grid max-w-5xl gap-6 px-4 py-10 md:grid-cols-2">
        <div className="rounded-[2rem] border p-6 md:p-8" style={{ borderColor: palette.line, background: palette.paper }}>
          <h2 className="font-serif text-4xl">Confirme sua presença</h2>
          <p className="mt-3 text-sm leading-relaxed" style={{ color: palette.muted }}>{settings.rsvpText}</p>
          {result ? (
            <motion.div initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} className="mt-6 rounded-2xl p-6 text-center" style={{ background: palette.bg }} role="status">
              <CheckCircle2 className="mx-auto mb-3" style={{ color: palette.accent }} />
              <p className="font-serif text-3xl">{result === 'yes' ? 'Presença confirmada' : 'Resposta registrada'}</p>
              <p className="mt-2 text-sm">{result === 'yes' ? 'Que bom que você vem. Guardamos sua resposta com carinho.' : 'Obrigado por nos avisar. Sentiremos sua falta.'}</p>
              {!preview && <button type="button" onClick={() => setResult(null)} className="mt-4 min-h-11 text-sm underline">Corrigir resposta</button>}
            </motion.div>
          ) : deadlineClosed ? (
            <p className="mt-6 text-sm" role="status">O prazo para confirmar presença encerrou em {formattedDate(settings.rsvpDeadline)}. Fale com os noivos se precisar alterar algo.</p>
          ) : (
            <form className="mt-6 space-y-4" onSubmit={(event) => event.preventDefault()}>
              <Field label="Seu nome" value={name} setValue={setName} autoComplete="name" />
              {!token && <Field label="WhatsApp" value={whatsapp} setValue={setWhatsapp} inputMode="tel" autoComplete="tel" />}
              <label className="block text-xs font-semibold uppercase tracking-wider" style={{ color: palette.muted }}>
                Quantas pessoas irão?
                <select value={guests} onChange={(e) => setGuests(e.target.value)} className="mt-2 min-h-11 w-full rounded-xl border px-3 text-sm normal-case" style={{ borderColor: palette.line, background: palette.bg, color: palette.ink }}>
                  {Array.from({ length: maxGuests }, (_, index) => index + 1).map((count) => <option key={count} value={count}>{count} {count === 1 ? 'pessoa' : 'pessoas'}</option>)}
                </select>
              </label>
              <label className="block text-xs font-semibold uppercase tracking-wider" style={{ color: palette.muted }}>
                Recado
                <textarea value={message} onChange={(e) => setMessage(e.target.value)} maxLength={1000} rows={3} className="mt-2 w-full rounded-xl border px-3 py-3 text-sm normal-case" style={{ borderColor: palette.line, background: palette.bg, color: palette.ink }} />
              </label>
              {token && <p className="text-xs" style={{ color: palette.muted }}>{`Este convite autoriza até ${seatLimit} ${seatLimit === 1 ? 'pessoa' : 'pessoas'}.`}</p>}
              {error && <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-800">{error}</p>}
              <div className="grid gap-3 sm:grid-cols-2">
                <button type="button" disabled={submitting || preview} onClick={() => void respond('yes')} className="min-h-11 rounded-xl px-4 text-xs font-semibold uppercase tracking-wider disabled:opacity-50" style={{ background: palette.accent, color: palette.onAccent }}>{submitting ? 'Enviando…' : 'Estarei presente'}</button>
                <button type="button" disabled={submitting || preview} onClick={() => void respond('no')} className="min-h-11 rounded-xl border px-4 text-xs font-semibold uppercase tracking-wider disabled:opacity-50" style={{ borderColor: palette.line, color: palette.ink }}>Não poderei ir</button>
              </div>
            </form>
          )}
        </div>
        <div className="space-y-4">
          {settings.showGifts && (
            <button type="button" onClick={() => go('/enxoval')} className="flex min-h-24 w-full items-center gap-3 rounded-[2rem] px-6 text-left" style={{ background: palette.accent, color: palette.onAccent }}>
              <Gift /> <span><strong className="block font-serif text-3xl">Lista de presentes</strong><span className="text-sm">Escolher um presente do enxoval</span></span>
            </button>
          )}
          <div className="flex flex-wrap gap-3">
            <a href={calendarLink} target="_blank" rel="noreferrer" className="inline-flex min-h-11 items-center gap-2 rounded-full border px-5 text-xs font-semibold uppercase tracking-wider" style={{ borderColor: palette.line }}><CalendarDays size={16} /> Google Agenda</a>
            <button type="button" onClick={() => void shareInvite()} className="inline-flex min-h-11 items-center gap-2 rounded-full border px-5 text-xs font-semibold uppercase tracking-wider" style={{ borderColor: palette.line }}>Compartilhar</button>
          </div>
          {shareNote && <p className="text-sm" role="status">{shareNote}</p>}
          <p className="font-serif text-3xl"><Heart className="mb-3 inline" size={18} /> Obrigado por fazer parte da nossa história.</p>
        </div>
      </section>
      <footer className="px-4 py-10 text-center">
        <p className="font-serif text-3xl">{settings.coupleNames}</p>
        <button type="button" onClick={() => go('/')} className="mt-3 min-h-11 text-sm underline" style={{ color: palette.muted }}>Voltar ao site</button>
      </footer>
      {photo !== null && settings.gallery[photo] && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/80 p-4" role="dialog" aria-modal="true" aria-label="Foto ampliada">
          <img src={settings.gallery[photo].url} alt={settings.gallery[photo].alt || 'Foto do casal'} className="max-h-[80vh] max-w-full rounded-2xl object-contain" />
          <button type="button" onClick={() => setPhoto(null)} className="mt-4 min-h-11 rounded-full bg-white px-5 text-sm text-black">Fechar</button>
        </div>
      )}
    </div>
  );
}

function Reveal({ children }: { children: ReactNode }) {
  return <motion.div initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, amount: 0.3 }} transition={{ duration: 0.5 }}>{children}</motion.div>;
}

function Field({ label, value, setValue, ...props }: { label: string; value: string; setValue: (value: string) => void } & InputHTMLAttributes<HTMLInputElement>) {
  return (
    <label className="block text-xs font-semibold uppercase tracking-wider opacity-80">
      {label}
      <input value={value} onChange={(event) => setValue(event.target.value)} required maxLength={120} className="mt-2 min-h-11 w-full rounded-xl border border-black/10 bg-white/60 px-3 text-sm normal-case tracking-normal text-inherit" {...props} />
    </label>
  );
}

function PlaceCard({ palette, title, name, address, notes }: { palette: (typeof INVITE_PALETTES)[InviteTheme]; title: string; name: string; address: string; notes: string }) {
  const href = (address || name).trim() ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address || name)}` : '';
  return (
    <article className="rounded-[2rem] border p-6" style={{ borderColor: palette.line, background: palette.paper }}>
      <h2 className="font-serif text-3xl">{title}</h2>
      <p className="mt-3 font-medium">{name || 'Local a confirmar'}</p>
      <p className="mt-1 text-sm" style={{ color: palette.muted }}>{address || 'O endereço será divulgado em breve.'}</p>
      {notes && <p className="mt-3 text-sm">{notes}</p>}
      {href && <a href={href} target="_blank" rel="noreferrer" className="mt-4 inline-flex min-h-11 items-center gap-2 text-sm font-semibold uppercase tracking-wider" style={{ color: palette.accent }}><MapPin size={16} /> Abrir no mapa</a>}
    </article>
  );
}

function InviteCountdown({ date, time, color }: { date: string; time: string; color: string }) {
  const [left, setLeft] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0, past: false });
  useEffect(() => {
    const target = new Date(`${date}T${time}:00`).getTime();
    const tick = () => {
      const distance = target - Date.now();
      if (distance <= 0) {
        setLeft({ days: 0, hours: 0, minutes: 0, seconds: 0, past: true });
        return;
      }
      setLeft({
        days: Math.floor(distance / 86400000),
        hours: Math.floor((distance % 86400000) / 3600000),
        minutes: Math.floor((distance % 3600000) / 60000),
        seconds: Math.floor((distance % 60000) / 1000),
        past: false,
      });
    };
    tick();
    const timer = window.setInterval(tick, 1000);
    return () => window.clearInterval(timer);
  }, [date, time]);
  if (left.past) return <p className="mt-8 font-serif text-2xl italic">O grande dia chegou.</p>;
  const items = [['Dias', left.days], ['Horas', left.hours], ['Minutos', left.minutes], ['Segundos', left.seconds]] as const;
  return (
    <div className="mt-8 flex gap-4" role="timer" aria-label={`Faltam ${left.days} dias, ${left.hours} horas e ${left.minutes} minutos`}>
      {items.map(([label, value]) => (
        <div key={label} className="text-center" style={{ color }}>
          <div className="font-serif text-4xl">{value}</div>
          <div className="text-[10px] uppercase tracking-widest opacity-70">{label}</div>
        </div>
      ))}
    </div>
  );
}
