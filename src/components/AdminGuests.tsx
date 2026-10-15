import { useEffect, useMemo, useState } from 'react';
import { api } from '../api';
import { buildInviteArtSvg, inviteStatusLabel, parseInviteTheme } from '../../server/domain';

type Attempt = { id: string; campaign: string; status: string; createdAt: string };
type Guest = {
  id: string;
  token: string;
  name: string;
  whatsapp: string;
  groupName: string;
  seats: number;
  notes: string;
  optedOut: boolean;
  status: string;
  lastError: string;
  attemptCount: number;
  sentAt: string | null;
  rsvp: { attending: boolean; guests: number } | null;
  attempts: Attempt[];
};

const groups = [
  { id: 'familia', label: 'Família' },
  { id: 'amigos', label: 'Amigos' },
  { id: 'padrinhos', label: 'Padrinhos' },
  { id: 'outros', label: 'Outros' },
];
const campaigns = [
  { id: 'official', label: 'Convite oficial' },
  { id: 'save-the-date', label: 'Save the date' },
  { id: 'reminder', label: 'Lembrete de resposta' },
  { id: 'soon', label: 'Lembrete da data' },
];

const emptyForm = { name: '', whatsapp: '', groupName: 'amigos', seats: 2, notes: '', optedOut: false };

export default function AdminGuests({ onNotice, coupleNames, weddingDate, ceremonyTime, ceremonyVenue, theme }: {
  onNotice: (type: 'success' | 'error', message: string) => void;
  coupleNames: string;
  weddingDate: string;
  ceremonyTime: string;
  ceremonyVenue: string;
  theme: string;
}) {
  const [guests, setGuests] = useState<Guest[]>([]);
  const [query, setQuery] = useState('');
  const [group, setGroup] = useState('all');
  const [status, setStatus] = useState('all');
  const [form, setForm] = useState(emptyForm);
  const [editing, setEditing] = useState<string | null>(null);
  const [selected, setSelected] = useState<string[]>([]);
  const [campaign, setCampaign] = useState('official');
  const [preview, setPreview] = useState('');
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);

  const load = () => api.get('/guests').then((data) => setGuests(Array.isArray(data?.guests) ? data.guests : [])).catch(() => onNotice('error', 'Não foi possível carregar os convidados.'));
  useEffect(() => { void load(); }, []);

  const visible = useMemo(() => guests.filter((guest) => {
    const haystack = `${guest.name} ${guest.whatsapp} ${guest.notes}`.toLowerCase();
    if (query && !haystack.includes(query.toLowerCase())) return false;
    if (group !== 'all' && guest.groupName !== group) return false;
    if (status !== 'all' && guest.status !== status) return false;
    return true;
  }), [guests, query, group, status]);

  const save = async () => {
    setBusy(true);
    try {
      if (editing) await api.put(`/guests/${editing}`, form);
      else await api.post('/guests', form);
      setForm(emptyForm);
      setEditing(null);
      onNotice('success', editing ? 'Convidado atualizado.' : 'Convidado cadastrado.');
      await load();
    } catch (err) {
      onNotice('error', err instanceof Error ? err.message : 'Não foi possível salvar o convidado.');
    } finally {
      setBusy(false);
    }
  };

  const showPreview = async (guestId?: string) => {
    try {
      const data = await api.post('/guests/preview', { campaign, guestId });
      setPreview(data.message);
      setConfirming(false);
    } catch (err) {
      onNotice('error', err instanceof Error ? err.message : 'Não foi possível montar a mensagem.');
    }
  };

  const sendSelected = async (force = false) => {
    const ids = selected.length ? selected : [];
    if (!ids.length) return;
    setBusy(true);
    try {
      const data = await api.post('/guests/send', {
        ids,
        campaign,
        confirm: true,
        force,
        requestId: crypto.randomUUID().replaceAll('-', '').slice(0, 20),
      });
      onNotice('success', `${data.sent} mensagem(ns) aceita(s) pelo Whaticket. O painel não recebe confirmação de entrega ou leitura.`);
      setConfirming(false);
      setSelected([]);
      await load();
    } catch (err) {
      onNotice('error', err instanceof Error ? err.message : 'Falha no envio.');
    } finally {
      setBusy(false);
    }
  };

  const downloadArt = (guest?: Guest) => {
    const dateLabel = weddingDate ? new Date(`${weddingDate}T12:00:00`).toLocaleDateString('pt-BR') : '';
    const svg = buildInviteArtSvg({
      coupleNames: coupleNames || 'Nosso casamento',
      dateLabel,
      time: ceremonyTime || '',
      venue: ceremonyVenue || '',
      guestName: guest?.name,
      theme: parseInviteTheme(theme),
    });
    const blob = new Blob([svg], { type: 'image/svg+xml' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'convite.svg';
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-8">
      <div className="rounded-2xl border border-gold/10 bg-white/50 p-5 text-sm leading-relaxed">
        O envio usa a integração de texto já configurada no Whaticket. Esta API não envia imagem: a arte pode ser baixada e encaminhada pelo celular. O status “Enviado ao provedor” significa apenas que o Whaticket aceitou a mensagem. Entrega e leitura não são informadas por esta integração.
      </div>
      <form className="grid gap-3 md:grid-cols-2" onSubmit={(event) => { event.preventDefault(); void save(); }}>
        <input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Nome ou família" className="min-h-11 rounded-2xl border border-gold/10 px-4" />
        <input required value={form.whatsapp} onChange={(e) => setForm({ ...form, whatsapp: e.target.value })} placeholder="WhatsApp com DDD" className="min-h-11 rounded-2xl border border-gold/10 px-4" />
        <select value={form.groupName} onChange={(e) => setForm({ ...form, groupName: e.target.value })} className="min-h-11 rounded-2xl border border-gold/10 px-4">
          {groups.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}
        </select>
        <label className="flex items-center gap-3 text-sm">Pessoas autorizadas
          <input type="number" min={1} max={12} value={form.seats} onChange={(e) => setForm({ ...form, seats: Number(e.target.value) })} className="min-h-11 w-24 rounded-2xl border border-gold/10 px-3" />
        </label>
        <textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="Observações da família" rows={2} className="md:col-span-2 rounded-2xl border border-gold/10 px-4 py-3" />
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.optedOut} onChange={(e) => setForm({ ...form, optedOut: e.target.checked })} /> Não receber mensagens</label>
        <button type="submit" disabled={busy} className="min-h-11 rounded-2xl bg-ink px-5 text-xs font-bold uppercase tracking-widest text-white disabled:opacity-50">{editing ? 'Salvar convidado' : 'Adicionar convidado'}</button>
      </form>

      <div className="flex flex-col gap-3 lg:flex-row">
        <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Buscar convidado" className="min-h-11 flex-1 rounded-2xl border border-gold/10 px-4" />
        <select value={group} onChange={(e) => setGroup(e.target.value)} className="min-h-11 rounded-2xl border border-gold/10 px-4">{[['all', 'Todos os grupos'], ...groups.map((item) => [item.id, item.label])].map(([id, label]) => <option key={id} value={id}>{label}</option>)}</select>
        <select value={status} onChange={(e) => setStatus(e.target.value)} className="min-h-11 rounded-2xl border border-gold/10 px-4">
          <option value="all">Todos os envios</option>
          <option value="pending">Pendentes</option>
          <option value="sent">Enviados ao provedor</option>
          <option value="failed">Falhas</option>
        </select>
        <select value={campaign} onChange={(e) => setCampaign(e.target.value)} className="min-h-11 rounded-2xl border border-gold/10 px-4">
          {campaigns.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}
        </select>
      </div>
      <div className="flex flex-wrap gap-3">
        <button type="button" onClick={() => void showPreview(selected[0])} className="min-h-11 rounded-xl border border-gold/20 px-4 text-xs font-bold uppercase tracking-widest">Ver mensagem</button>
        <button type="button" disabled={!selected.length || busy} onClick={() => { setConfirming(true); void showPreview(selected[0]); }} className="min-h-11 rounded-xl bg-gold px-4 text-xs font-bold uppercase tracking-widest text-white disabled:opacity-50">Preparar envio ({selected.length})</button>
        <button type="button" onClick={() => downloadArt()} className="min-h-11 rounded-xl border border-gold/20 px-4 text-xs font-bold uppercase tracking-widest">Baixar arte</button>
      </div>
      {preview && <pre className="whitespace-pre-wrap rounded-2xl bg-white/70 p-4 text-sm">{preview}</pre>}
      {confirming && (
        <div className="rounded-2xl border border-gold/20 bg-gold/5 p-4" role="dialog" aria-label="Confirmar envio">
          <p className="font-serif text-2xl">Enviar para {selected.length} {selected.length === 1 ? 'convidado' : 'convidados'}?</p>
          <p className="mt-2 text-sm">Quem pediu para não receber ou já teve o convite aceito pelo Whaticket será ignorado, a menos que você escolha reenviar.</p>
          <div className="mt-4 flex flex-wrap gap-3">
            <button type="button" disabled={busy} onClick={() => void sendSelected(false)} className="min-h-11 rounded-xl bg-ink px-4 text-xs font-bold uppercase tracking-widest text-white">Confirmar envio</button>
            <button type="button" disabled={busy} onClick={() => void sendSelected(true)} className="min-h-11 rounded-xl border border-gold/30 px-4 text-xs font-bold uppercase tracking-widest">Reenviar mesmo os já enviados</button>
            <button type="button" onClick={() => setConfirming(false)} className="min-h-11 px-4 text-sm">Cancelar</button>
          </div>
        </div>
      )}

      <div className="space-y-3">
        {visible.map((guest) => (
          <article key={guest.id} className="rounded-2xl border border-gold/10 bg-white/60 p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <label className="flex items-start gap-3">
                <input type="checkbox" checked={selected.includes(guest.id)} onChange={(e) => setSelected((current) => e.target.checked ? [...current, guest.id] : current.filter((id) => id !== guest.id))} />
                <span>
                  <strong className="font-serif text-2xl">{guest.name}</strong>
                  <span className="mt-1 block text-sm">{groups.find((item) => item.id === guest.groupName)?.label} · até {guest.seats} {guest.seats === 1 ? 'pessoa' : 'pessoas'} · {guest.whatsapp}</span>
                  <span className="mt-1 block text-xs uppercase tracking-widest">{inviteStatusLabel(guest.status)}{guest.optedOut ? ' · não receber' : ''}</span>
                  {guest.rsvp && <span className="mt-1 block text-sm">{guest.rsvp.attending ? `Confirmou ${guest.rsvp.guests}` : 'Não poderá ir'}</span>}
                  {guest.lastError && <span className="mt-1 block text-sm text-red-800">{guest.lastError}</span>}
                </span>
              </label>
              <div className="flex flex-wrap gap-2">
                <button type="button" className="min-h-11 px-3 text-xs uppercase tracking-widest" onClick={() => { setEditing(guest.id); setForm({ name: guest.name, whatsapp: guest.whatsapp, groupName: guest.groupName, seats: guest.seats, notes: guest.notes, optedOut: guest.optedOut }); }}>Editar</button>
                <button type="button" className="min-h-11 px-3 text-xs uppercase tracking-widest" onClick={() => void navigator.clipboard.writeText(`${window.location.origin}/c/${guest.token}`).then(() => onNotice('success', 'Link individual copiado.'))}>Copiar link</button>
                <button type="button" className="min-h-11 px-3 text-xs uppercase tracking-widest" onClick={() => downloadArt(guest)}>Baixar arte</button>
                <button type="button" className="min-h-11 px-3 text-xs uppercase tracking-widest text-red-800" onClick={() => api.delete(`/guests/${guest.id}`).then(load).catch((err: unknown) => onNotice('error', err instanceof Error ? err.message : 'Falha ao apagar.'))}>Apagar</button>
              </div>
            </div>
            {guest.attempts.length > 0 && (
              <ul className="mt-3 space-y-1 text-xs opacity-70">
                {guest.attempts.map((attempt) => <li key={attempt.id}>{new Date(attempt.createdAt).toLocaleString('pt-BR')} · {attempt.campaign} · {inviteStatusLabel(attempt.status)}</li>)}
              </ul>
            )}
          </article>
        ))}
        {visible.length === 0 && <p className="text-sm opacity-60">Nenhum convidado encontrado.</p>}
      </div>
    </div>
  );
}
