import { useEffect, useMemo, useRef, useState, type InputHTMLAttributes, type ReactNode } from 'react';
import { motion } from 'motion/react';
import { api } from '../api';
import InvitationEnvelope from './InvitationEnvelope';
import FallingHearts from './FallingHearts';
import WeddingSectionsRenderer from './wedding/WeddingSectionsRenderer';
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
  const searchParams = useMemo(() => new URLSearchParams(window.location.search), []);
  const preview = searchParams.get('preview') === '1';
  const urlName = (searchParams.get('nome') || searchParams.get('name') || '').trim();
  const urlPhone = (searchParams.get('whatsapp') || searchParams.get('phone') || searchParams.get('numero') || '').trim();
  const isWaWebview = searchParams.get('wa') === '1' || Boolean(urlPhone || urlName);

  const token = readToken();
  const [settings, setSettings] = useState<InvitationSettings>(defaults);
  const [phase, setPhase] = useState<'sealed' | 'opening' | 'revealed'>('sealed');
  const [guestName, setGuestName] = useState(urlName);
  const [seatLimit, setSeatLimit] = useState(6);
  const [tokenMissing, setTokenMissing] = useState(false);
  const [name, setName] = useState(urlName);
  const [whatsapp, setWhatsapp] = useState(urlPhone);
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
    if (urlName) {
      setGuestName((prev) => prev || urlName);
      setName((prev) => prev || urlName);
    }
    if (urlPhone) {
      setWhatsapp((prev) => prev || urlPhone);
    }
  }, [urlName, urlPhone]);

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
    if (!token) {
      if (urlPhone) {
        api.get(`/invite-lookup?phone=${encodeURIComponent(urlPhone)}`).then((data) => {
          const guest = data?.guest;
          if (guest) {
            if (guest.name) {
              setGuestName(guest.name);
              setName(guest.rsvp?.name || guest.name);
            }
            setSeatLimit(Math.max(1, Math.min(12, Number(guest.seats) || 1)));
            if (guest.rsvp) {
              setResult(guest.rsvp.attending ? 'yes' : 'no');
              setGuests(String(guest.rsvp.guests || 1));
              setMessage(guest.rsvp.message || '');
            }
          }
        }).catch(() => undefined);
      }
      return;
    }
    api.get(`/invite/${token}`).then((data) => {
      const guest = data?.guest;
      if (!guest?.name) {
        setTokenMissing(true);
        return;
      }
      setGuestName(guest.name);
      setName(guest.rsvp?.name || urlName || guest.name);
      if (urlPhone) setWhatsapp(urlPhone);
      setSeatLimit(Math.max(1, Math.min(12, Number(guest.seats) || 1)));
      if (guest.rsvp) {
        setResult(guest.rsvp.attending ? 'yes' : 'no');
        setGuests(String(guest.rsvp.guests || 1));
        setMessage(guest.rsvp.message || '');
      }
    }).catch(() => setTokenMissing(true));
  }, [token, urlPhone, urlName]);

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

  return (
    <div className="relative">
      <FallingHearts active={welcomeHearts} theme={parseInviteTheme(settings.inviteTheme)} count={32} />
      {preview && (
        <div className="fixed top-0 left-0 right-0 z-50 bg-amber-500 text-stone-900 text-center py-2 px-4 text-xs font-semibold uppercase tracking-wider shadow">
          Modo Pré-visualização — Nenhuma resposta real será gravada
        </div>
      )}
      {tokenMissing && (
        <div className="fixed top-0 left-0 right-0 z-50 bg-rose-600 text-white text-center py-2 px-4 text-xs font-semibold tracking-wider shadow">
          Não encontramos este convite personalizado. Exibindo convite geral.
        </div>
      )}
      {isWaWebview && (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-40 bg-stone-900/90 backdrop-blur-md text-white text-xs px-4 py-2 rounded-full shadow-2xl flex items-center gap-2 border border-white/10 pointer-events-none">
          <span className="inline-block w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span className="tracking-wide">Aberto no WhatsApp</span>
          {guestName && (
            <span className="opacity-90">· Olá, <strong className="font-semibold text-white">{guestName}</strong>!</span>
          )}
        </div>
      )}
      <WeddingSectionsRenderer
        settings={settings}
        guestName={guestName}
        token={token}
        seatLimit={seatLimit}
        preview={preview}
        name={name}
        setName={setName}
        whatsapp={whatsapp}
        setWhatsapp={setWhatsapp}
        guests={guests}
        setGuests={setGuests}
        message={message}
        setMessage={setMessage}
        submitting={submitting}
        result={result}
        setResult={setResult}
        error={error}
        onRespond={(attendance) => void respond(attendance)}
        onShare={() => void shareInvite()}
        shareNote={shareNote}
        onNavigateToRegistry={() => go('/enxoval')}
      />
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
