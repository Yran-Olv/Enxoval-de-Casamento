import { useEffect, useMemo, useState } from 'react';
import { api } from '../api';
import {
  buildInviteArtSvg,
  inviteStatusLabel,
  parseInviteTheme,
  buildInviteWebviewUrl,
} from '../../server/domain';
import {
  Send,
  Copy,
  ExternalLink,
  CheckSquare,
  Square,
  Eye,
  Download,
  Edit2,
  Trash2,
  CheckCircle2,
  Clock,
  AlertCircle,
  Sparkles,
  MessageCircle,
  RefreshCw,
  X,
  UserCheck,
} from 'lucide-react';

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

export default function AdminGuests({
  onNotice,
  coupleNames,
  weddingDate,
  ceremonyTime,
  ceremonyVenue,
  theme,
}: {
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
  const [preview, setPreview] = useState<string | null>(null);
  const [previewGuest, setPreviewGuest] = useState<Guest | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [sendingGuestId, setSendingGuestId] = useState<string | null>(null);

  const load = () =>
    api
      .get('/guests')
      .then((data) => setGuests(Array.isArray(data?.guests) ? data.guests : []))
      .catch(() => onNotice('error', 'Não foi possível carregar os convidados.'));

  useEffect(() => {
    void load();
  }, []);

  const visible = useMemo(() => {
    return guests.filter((guest) => {
      const haystack = `${guest.name} ${guest.whatsapp} ${guest.notes}`.toLowerCase();
      if (query && !haystack.includes(query.toLowerCase())) return false;
      if (group !== 'all' && guest.groupName !== group) return false;
      if (status !== 'all' && guest.status !== status) return false;
      return true;
    });
  }, [guests, query, group, status]);

  const allVisibleSelected = useMemo(() => {
    if (!visible.length) return false;
    return visible.every((g) => selected.includes(g.id));
  }, [visible, selected]);

  const toggleSelectAll = () => {
    if (allVisibleSelected) {
      setSelected([]);
    } else {
      setSelected(visible.map((g) => g.id));
    }
  };

  const save = async () => {
    setBusy(true);
    try {
      if (editing) await api.put(`/guests/${editing}`, form);
      else await api.post('/guests', form);
      setForm(emptyForm);
      setEditing(null);
      onNotice('success', editing ? 'Convidado atualizado.' : 'Convidado cadastrado com sucesso.');
      await load();
    } catch (err) {
      onNotice('error', err instanceof Error ? err.message : 'Não foi possível salvar o convidado.');
    } finally {
      setBusy(false);
    }
  };

  const getGuestWebviewUrl = (guest: Guest) => {
    return buildInviteWebviewUrl(window.location.origin, {
      token: guest.token,
      name: guest.name,
      whatsapp: guest.whatsapp,
    });
  };

  const copyWebviewLink = async (guest: Guest) => {
    try {
      const url = getGuestWebviewUrl(guest);
      await navigator.clipboard.writeText(url);
      onNotice('success', `Link Webview de ${guest.name} copiado com sucesso!`);
    } catch {
      onNotice('error', 'Falha ao copiar link para a área de transferência.');
    }
  };

  const showPreview = async (guest?: Guest) => {
    try {
      const data = await api.post('/guests/preview', { campaign, guestId: guest?.id });
      setPreview(data.message);
      setPreviewGuest(guest || null);
    } catch (err) {
      onNotice('error', err instanceof Error ? err.message : 'Não foi possível montar a prévia.');
    }
  };

  const sendSingle = async (guest: Guest, force = true) => {
    setSendingGuestId(guest.id);
    try {
      const data = await api.post(`/guests/${guest.id}/send`, {
        campaign,
        force,
        requestId: crypto.randomUUID().replaceAll('-', '').slice(0, 20),
      });
      if (data.status === 'failed') {
        onNotice('error', data.reason || `Falha ao enviar convite para ${guest.name}.`);
      } else {
        onNotice('success', `Convite de ${guest.name} enviado para a fila do WhatsApp com botão Webview!`);
      }
      await load();
    } catch (err) {
      onNotice('error', err instanceof Error ? err.message : 'Falha ao enviar convite.');
    } finally {
      setSendingGuestId(null);
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
      onNotice('success', `${data.sent} convite(s) enviado(s) para a fila do WhatsApp com botão Webview!`);
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
    link.download = guest ? `convite-${guest.name.toLowerCase().replace(/\s+/g, '-')}.svg` : 'convite.svg';
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-8">
      {/* Banner Explicativo do Envio Webview */}
      <div className="rounded-3xl border border-gold/20 bg-gradient-to-br from-white/90 via-amber-50/30 to-white/80 p-6 shadow-sm backdrop-blur">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-800 border border-emerald-500/20">
              <Sparkles size={14} className="text-emerald-600" />
              Botão Nativo WhatsApp Webview (cta_url) Ativo
            </div>
            <h3 className="font-serif text-2xl text-ink">Envio de Convites com Abertura Direta no WhatsApp</h3>
            <p className="text-sm text-ink/70 max-w-3xl leading-relaxed">
              Ao enviar um convite pelo sistema, o WhatsApp entrega a mensagem com um botão interativo oficial:{' '}
              <strong className="text-ink font-semibold">"Abrir Convite 💌"</strong>. Quando o convidado clica, o convite abre em tela cheia diretamente dentro do aplicativo, sem sair da conversa, com o envelope endereçado com o nome dele e confirmação de presença (RSVP) já preenchida!
            </p>
          </div>
          <div className="shrink-0 flex flex-col sm:flex-row gap-2">
            <button
              type="button"
              onClick={() => void showPreview(visible[0])}
              className="px-4 py-2.5 rounded-xl border border-gold/30 bg-white/70 hover:bg-white text-xs font-bold uppercase tracking-wider text-ink flex items-center gap-2 transition"
            >
              <Eye size={14} className="text-gold" /> Ver Exemplo do Botão
            </button>
          </div>
        </div>

        <div className="mt-4 pt-4 border-t border-gold/10 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 text-xs text-ink/75">
          <div className="flex items-start gap-2 bg-white/50 p-3 rounded-xl border border-gold/10">
            <Send size={16} className="text-emerald-600 shrink-0 mt-0.5" />
            <span><strong>Envio 1-Clique:</strong> Use o botão verde "Enviar WhatsApp" no cartão de qualquer convidado para disparo imediato.</span>
          </div>
          <div className="flex items-start gap-2 bg-white/50 p-3 rounded-xl border border-gold/10">
            <Copy size={16} className="text-amber-600 shrink-0 mt-0.5" />
            <span><strong>Link Webview:</strong> Copie o link individual com parâmetros prontos (<code className="bg-black/5 px-1 rounded">?wa=1</code>) para colar onde quiser.</span>
          </div>
          <div className="flex items-start gap-2 bg-white/50 p-3 rounded-xl border border-gold/10 sm:col-span-2 lg:col-span-1">
            <MessageCircle size={16} className="text-sky-600 shrink-0 mt-0.5" />
            <span><strong>No Whaticket:</strong> Crie um nó "Webview" no FlowBuilder selecionando "💍 Convite de Casamento".</span>
          </div>
        </div>
      </div>

      {/* Formulário de Cadastro / Edição */}
      <form
        className="grid gap-4 md:grid-cols-2 rounded-3xl border border-gold/15 bg-white/60 p-6 backdrop-blur shadow-sm"
        onSubmit={(event) => {
          event.preventDefault();
          void save();
        }}
      >
        <div className="md:col-span-2 flex items-center justify-between">
          <h4 className="font-serif text-xl">{editing ? 'Editar Convidado' : 'Cadastrar Novo Convidado'}</h4>
          {editing && (
            <button
              type="button"
              onClick={() => {
                setEditing(null);
                setForm(emptyForm);
              }}
              className="text-xs uppercase tracking-wider opacity-60 hover:opacity-100 flex items-center gap-1"
            >
              <X size={14} /> Cancelar edição
            </button>
          )}
        </div>
        <div className="space-y-1">
          <label className="text-[10px] uppercase font-bold tracking-wider opacity-60 ml-2">Nome ou Família</label>
          <input
            required
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            placeholder="Ex.: Lucas e Maria / Família Silva"
            className="w-full min-h-11 rounded-2xl border border-gold/20 bg-white/80 px-4 text-sm outline-none focus:border-gold"
          />
        </div>
        <div className="space-y-1">
          <label className="text-[10px] uppercase font-bold tracking-wider opacity-60 ml-2">WhatsApp com DDD</label>
          <input
            required
            value={form.whatsapp}
            onChange={(e) => setForm({ ...form, whatsapp: e.target.value })}
            placeholder="Ex.: 34999122805 ou 5534999122805"
            className="w-full min-h-11 rounded-2xl border border-gold/20 bg-white/80 px-4 text-sm outline-none focus:border-gold"
          />
        </div>
        <div className="space-y-1">
          <label className="text-[10px] uppercase font-bold tracking-wider opacity-60 ml-2">Grupo</label>
          <select
            value={form.groupName}
            onChange={(e) => setForm({ ...form, groupName: e.target.value })}
            className="w-full min-h-11 rounded-2xl border border-gold/20 bg-white/80 px-4 text-sm outline-none focus:border-gold"
          >
            {groups.map((item) => (
              <option key={item.id} value={item.id}>
                {item.label}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-1">
          <label className="text-[10px] uppercase font-bold tracking-wider opacity-60 ml-2">Total de Pessoas Autorizadas</label>
          <input
            type="number"
            min={1}
            max={12}
            value={form.seats}
            onChange={(e) => setForm({ ...form, seats: Number(e.target.value) })}
            className="w-full min-h-11 rounded-2xl border border-gold/20 bg-white/80 px-4 text-sm outline-none focus:border-gold"
          />
        </div>
        <div className="md:col-span-2 space-y-1">
          <label className="text-[10px] uppercase font-bold tracking-wider opacity-60 ml-2">Observações Internas (Opcional)</label>
          <textarea
            value={form.notes}
            onChange={(e) => setForm({ ...form, notes: e.target.value })}
            placeholder="Ex.: Padrinho do noivo, mesa 4, restrição alimentar..."
            rows={2}
            className="w-full rounded-2xl border border-gold/20 bg-white/80 px-4 py-3 text-sm outline-none focus:border-gold resize-none"
          />
        </div>
        <label className="flex items-center gap-2 text-sm text-ink/80 select-none">
          <input
            type="checkbox"
            checked={form.optedOut}
            onChange={(e) => setForm({ ...form, optedOut: e.target.checked })}
            className="rounded border-gold/30 text-gold focus:ring-gold"
          />
          Não enviar mensagens para este contato (opt-out)
        </label>
        <div className="flex justify-end">
          <button
            type="submit"
            disabled={busy}
            className="min-h-11 rounded-2xl bg-ink px-8 text-xs font-bold uppercase tracking-widest text-white shadow-md hover:bg-ink/90 disabled:opacity-50 transition"
          >
            {editing ? 'Salvar Convidado' : 'Adicionar Convidado'}
          </button>
        </div>
      </form>

      {/* Barra de Filtros e Busca */}
      <div className="flex flex-col gap-3 lg:flex-row items-stretch lg:items-center">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Buscar por nome, WhatsApp ou observações..."
          className="min-h-11 flex-1 rounded-2xl border border-gold/15 bg-white/80 px-4 text-sm outline-none focus:border-gold"
        />
        <select
          value={group}
          onChange={(e) => setGroup(e.target.value)}
          className="min-h-11 rounded-2xl border border-gold/15 bg-white/80 px-4 text-sm outline-none focus:border-gold"
        >
          {[['all', 'Todos os grupos'], ...groups.map((item) => [item.id, item.label])].map(([id, label]) => (
            <option key={id} value={id}>
              {label}
            </option>
          ))}
        </select>
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          className="min-h-11 rounded-2xl border border-gold/15 bg-white/80 px-4 text-sm outline-none focus:border-gold"
        >
          <option value="all">Todos os envios</option>
          <option value="pending">Pendentes</option>
          <option value="sent">Enviados ao WhatsApp</option>
          <option value="failed">Falhas de envio</option>
        </select>
        <select
          value={campaign}
          onChange={(e) => setCampaign(e.target.value)}
          className="min-h-11 rounded-2xl border border-gold/15 bg-white/80 px-4 text-sm font-semibold text-gold outline-none focus:border-gold"
        >
          {campaigns.map((item) => (
            <option key={item.id} value={item.id}>
              Campanha: {item.label}
            </option>
          ))}
        </select>
      </div>

      {/* Barra de Ações em Lote */}
      <div className="rounded-2xl border border-gold/10 bg-white/60 p-4 flex flex-wrap items-center justify-between gap-3 shadow-sm">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={toggleSelectAll}
            className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold uppercase tracking-wider border border-gold/20 hover:bg-white transition"
          >
            {allVisibleSelected ? (
              <>
                <CheckSquare size={16} className="text-gold" /> Desmarcar Todos
              </>
            ) : (
              <>
                <Square size={16} className="opacity-40" /> Selecionar Todos ({visible.length})
              </>
            )}
          </button>
          <span className="text-xs text-ink/60">
            {selected.length} {selected.length === 1 ? 'convidado selecionado' : 'convidados selecionados'}
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => void showPreview(selected.length ? guests.find((g) => g.id === selected[0]) : visible[0])}
            className="min-h-11 rounded-xl border border-gold/20 bg-white/80 px-4 text-xs font-bold uppercase tracking-widest text-ink hover:bg-white flex items-center gap-2 transition"
          >
            <Eye size={15} /> Prévia da Mensagem
          </button>
          <button
            type="button"
            disabled={!selected.length || busy}
            onClick={() => {
              setConfirming(true);
              void showPreview(guests.find((g) => g.id === selected[0]));
            }}
            className="min-h-11 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 px-6 text-xs font-bold uppercase tracking-widest text-white shadow-lg shadow-emerald-600/20 hover:brightness-110 disabled:opacity-40 flex items-center gap-2 transition"
          >
            <Send size={15} /> Disparar Selecionados ({selected.length})
          </button>
          <button
            type="button"
            onClick={() => downloadArt()}
            className="min-h-11 rounded-xl border border-gold/20 bg-white/80 px-4 text-xs font-bold uppercase tracking-widest text-ink hover:bg-white flex items-center gap-2 transition"
          >
            <Download size={15} /> Baixar Arte Geral
          </button>
        </div>
      </div>

      {/* Modal de Prévia Visual da Mensagem com Botão Interativo */}
      {preview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-fade-in">
          <div className="bg-[#FAF8F5] border border-gold/20 rounded-3xl p-6 sm:p-8 max-w-xl w-full shadow-2xl space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-gold/15">
              <div className="flex items-center gap-2">
                <MessageCircle size={20} className="text-emerald-600" />
                <h4 className="font-serif text-2xl">Prévia do WhatsApp (Webview)</h4>
              </div>
              <button
                type="button"
                onClick={() => setPreview(null)}
                className="w-8 h-8 rounded-full bg-black/5 hover:bg-black/10 flex items-center justify-center transition"
              >
                <X size={16} />
              </button>
            </div>

            <p className="text-xs text-ink/60">
              Veja exatamente como a mensagem chegará no WhatsApp de{' '}
              <strong>{previewGuest?.name || 'seu convidado'}</strong>:
            </p>

            {/* Simulação de Balão do WhatsApp */}
            <div className="rounded-2xl bg-[#EFEAE2] p-4 space-y-3">
              <div className="rounded-2xl bg-white p-4 shadow-sm text-sm space-y-3 border border-emerald-900/5">
                <pre className="font-sans whitespace-pre-wrap text-sm text-ink leading-relaxed">{preview}</pre>
                <div className="text-[10px] text-right text-black/40">14:30 ✓✓</div>
              </div>

              {/* Botão Interativo Nativo (CTA URL) */}
              <div className="space-y-1.5">
                <div className="w-full py-3.5 px-4 bg-white hover:bg-emerald-50 text-emerald-800 border border-emerald-600/30 rounded-2xl font-bold text-center text-sm shadow-sm flex items-center justify-center gap-2 select-none">
                  <Sparkles size={16} className="text-emerald-600" />
                  Abrir Convite 💌
                  <span className="text-[10px] font-normal text-emerald-600/70 ml-1">(abre em tela cheia no app)</span>
                </div>
                <p className="text-[10px] text-center text-ink/50">
                  Botão nativo WhatsApp CTA URL Webview com hidratação automática de parâmetros.
                </p>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-2">
              {previewGuest && (
                <button
                  type="button"
                  onClick={() => {
                    const guest = previewGuest;
                    setPreview(null);
                    void sendSingle(guest);
                  }}
                  className="px-6 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold uppercase tracking-wider flex items-center gap-2 shadow"
                >
                  <Send size={14} /> Enviar para {previewGuest.name} Agora
                </button>
              )}
              <button
                type="button"
                onClick={() => setPreview(null)}
                className="px-6 py-3 rounded-xl bg-ink text-white text-xs font-bold uppercase tracking-wider"
              >
                Fechar Prévia
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Confirmação de Disparo em Lote */}
      {confirming && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-fade-in"
          role="dialog"
          aria-label="Confirmar envio"
        >
          <div className="bg-[#FAF8F5] border border-gold/20 rounded-3xl p-6 sm:p-8 max-w-lg w-full shadow-2xl space-y-4">
            <h4 className="font-serif text-3xl">Confirmar Disparo de Convites</h4>
            <p className="text-sm text-ink/75 leading-relaxed">
              Você está prestes a enviar para{' '}
              <strong className="text-emerald-800 text-base">{selected.length} {selected.length === 1 ? 'convidado' : 'convidados'}</strong>{' '}
              usando a campanha <strong>"{campaigns.find((c) => c.id === campaign)?.label}"</strong>.
            </p>
            <p className="text-xs text-ink/60 bg-amber-50 p-3 rounded-xl border border-amber-200">
              Cada mensagem terá o botão interativo nativo <strong>"Abrir Convite 💌"</strong> (Webview). Contatos marcados com opt-out serão automaticamente ignorados.
            </p>
            <div className="pt-2 flex flex-col sm:flex-row gap-3">
              <button
                type="button"
                disabled={busy}
                onClick={() => void sendSelected(false)}
                className="flex-1 min-h-12 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-xs font-bold uppercase tracking-widest text-white shadow-lg shadow-emerald-600/20 disabled:opacity-50 transition"
              >
                {busy ? 'Enviando para a fila...' : 'Confirmar Envio'}
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={() => void sendSelected(true)}
                className="min-h-12 rounded-xl border border-gold/30 hover:bg-white px-4 text-xs font-bold uppercase tracking-widest text-ink disabled:opacity-50 transition"
              >
                Reenviar a Todos
              </button>
              <button
                type="button"
                onClick={() => setConfirming(false)}
                className="min-h-12 px-4 text-xs uppercase tracking-widest opacity-60 hover:opacity-100"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Lista de Cartões de Convidados */}
      <div className="space-y-4">
        {visible.map((guest) => {
          const isSelected = selected.includes(guest.id);
          const isSending = sendingGuestId === guest.id;
          const webviewUrl = getGuestWebviewUrl(guest);

          return (
            <article
              key={guest.id}
              className={`rounded-3xl border transition-all p-5 backdrop-blur ${
                isSelected
                  ? 'border-gold/40 bg-amber-50/40 shadow-md ring-1 ring-gold/30'
                  : 'border-gold/10 bg-white/70 hover:border-gold/30 hover:bg-white/90 shadow-sm'
              }`}
            >
              <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
                {/* Checkbox e Dados do Convidado */}
                <div className="flex items-start gap-3.5 flex-1 min-w-0">
                  <button
                    type="button"
                    onClick={() =>
                      setSelected((curr) =>
                        curr.includes(guest.id) ? curr.filter((id) => id !== guest.id) : [...curr, guest.id]
                      )
                    }
                    className="mt-1 text-gold hover:scale-105 transition shrink-0"
                    aria-label={`Selecionar ${guest.name}`}
                  >
                    {isSelected ? <CheckSquare size={22} className="text-gold" /> : <Square size={22} className="opacity-40" />}
                  </button>

                  <div className="space-y-1.5 min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <strong className="font-serif text-2xl text-ink truncate">{guest.name}</strong>
                      <span className="rounded-full bg-gold/10 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-gold">
                        {groups.find((item) => item.id === guest.groupName)?.label || guest.groupName}
                      </span>
                      <span className="text-xs text-ink/50">
                        · até {guest.seats} {guest.seats === 1 ? 'pessoa' : 'pessoas'}
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center gap-3 text-xs text-ink/70">
                      <span className="font-mono bg-black/5 px-2 py-0.5 rounded-lg text-ink font-medium">
                        {guest.whatsapp}
                      </span>

                      {/* Status Badges */}
                      {guest.rsvp ? (
                        <span className="inline-flex items-center gap-1 text-emerald-800 font-semibold bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                          <UserCheck size={12} />
                          {guest.rsvp.attending ? `Confirmou ${guest.rsvp.guests} pessoa(s)` : 'Não poderá ir'}
                        </span>
                      ) : null}

                      {guest.status === 'sent' && (
                        <span className="inline-flex items-center gap-1 text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                          <CheckCircle2 size={12} /> Enviado no WhatsApp
                        </span>
                      )}

                      {guest.status === 'pending' && (
                        <span className="inline-flex items-center gap-1 text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                          <Clock size={12} /> Pendente de envio
                        </span>
                      )}

                      {guest.status === 'failed' && (
                        <span className="inline-flex items-center gap-1 text-red-700 bg-red-50 px-2 py-0.5 rounded-full border border-red-200">
                          <AlertCircle size={12} /> Falha no envio
                        </span>
                      )}

                      {guest.optedOut && (
                        <span className="text-red-600 bg-red-50 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase">
                          Não receber
                        </span>
                      )}
                    </div>

                    {guest.notes && <p className="text-xs text-ink/60 italic">Obs: {guest.notes}</p>}
                    {guest.lastError && (
                      <p className="text-xs text-red-700 bg-red-50 p-2 rounded-xl border border-red-200">
                        Erro: {guest.lastError}
                      </p>
                    )}
                  </div>
                </div>

                {/* Botões de Ação Diretos */}
                <div className="flex flex-wrap items-center gap-2 self-stretch sm:self-auto justify-end pt-2 lg:pt-0 border-t lg:border-t-0 border-gold/10">
                  {/* BOTÃO PRINCIPAL: ENVIAR WHATSAPP (WEBVIEW) */}
                  <button
                    type="button"
                    disabled={isSending || busy || guest.optedOut}
                    onClick={() => void sendSingle(guest)}
                    className="min-h-10 px-4 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 text-white hover:brightness-110 text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 shadow-md shadow-emerald-600/20 disabled:opacity-40 transition"
                    title="Dispara o convite no WhatsApp com botão interativo Webview"
                  >
                    {isSending ? (
                      <>
                        <RefreshCw size={14} className="animate-spin" /> Enviando...
                      </>
                    ) : (
                      <>
                        <Send size={14} /> Enviar WhatsApp
                      </>
                    )}
                  </button>

                  {/* COPIAR LINK WEBVIEW */}
                  <button
                    type="button"
                    onClick={() => void copyWebviewLink(guest)}
                    className="min-h-10 px-3 rounded-xl border border-gold/20 bg-white hover:bg-amber-50 text-xs font-bold uppercase tracking-wider text-ink flex items-center gap-1.5 transition"
                    title="Copia o link completo já parametrizado com wa=1, token e nome"
                  >
                    <Copy size={13} className="text-gold" /> Copiar Link Webview
                  </button>

                  {/* ABRIR PRÉVIA NO NAVEGADOR */}
                  <a
                    href={webviewUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="min-h-10 px-3 rounded-xl border border-gold/20 bg-white hover:bg-amber-50 text-xs font-bold uppercase tracking-wider text-ink flex items-center gap-1.5 transition"
                    title="Abre o convite simulando o WhatsApp Webview em nova aba"
                  >
                    <ExternalLink size={13} className="opacity-50" /> Testar
                  </a>

                  {/* EDITAR */}
                  <button
                    type="button"
                    onClick={() => {
                      setEditing(guest.id);
                      setForm({
                        name: guest.name,
                        whatsapp: guest.whatsapp,
                        groupName: guest.groupName,
                        seats: guest.seats,
                        notes: guest.notes,
                        optedOut: guest.optedOut,
                      });
                      window.scrollTo({ top: 0, behavior: 'smooth' });
                    }}
                    className="min-h-10 px-3 rounded-xl border border-gold/15 bg-white/70 hover:bg-white text-xs font-bold uppercase tracking-wider text-ink/70 hover:text-ink flex items-center gap-1 transition"
                  >
                    <Edit2 size={13} />
                  </button>

                  {/* BAIXAR ARTE */}
                  <button
                    type="button"
                    onClick={() => downloadArt(guest)}
                    className="min-h-10 px-3 rounded-xl border border-gold/15 bg-white/70 hover:bg-white text-xs font-bold uppercase tracking-wider text-ink/70 hover:text-ink flex items-center gap-1 transition"
                    title="Baixar imagem SVG personalizada do convite"
                  >
                    <Download size={13} />
                  </button>

                  {/* APAGAR */}
                  <button
                    type="button"
                    onClick={() => {
                      if (confirm(`Tem certeza que deseja apagar o convidado "${guest.name}"?`)) {
                        api
                          .delete(`/guests/${guest.id}`)
                          .then(load)
                          .catch((err: unknown) =>
                            onNotice('error', err instanceof Error ? err.message : 'Falha ao apagar.')
                          );
                      }
                    }}
                    className="min-h-10 px-3 rounded-xl border border-red-200 bg-white/70 hover:bg-red-50 text-xs font-bold uppercase tracking-wider text-red-700 hover:text-red-900 flex items-center gap-1 transition"
                    title="Excluir convidado"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>

              {/* Histórico de Disparos Realizados */}
              {guest.attempts.length > 0 && (
                <div className="mt-3 pt-3 border-t border-gold/10 flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-ink/60">
                  <span className="font-semibold text-ink/70">Histórico de envios:</span>
                  {guest.attempts.map((attempt) => (
                    <span key={attempt.id} className="inline-flex items-center gap-1">
                      <span>{new Date(attempt.createdAt).toLocaleDateString('pt-BR')} às {new Date(attempt.createdAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</span>
                      <span>·</span>
                      <span className="uppercase text-[10px] font-bold">{attempt.campaign}</span>
                      <span>·</span>
                      <span className={attempt.status === 'sent' ? 'text-emerald-700 font-medium' : 'text-red-600'}>
                        {inviteStatusLabel(attempt.status)}
                      </span>
                    </span>
                  ))}
                </div>
              )}
            </article>
          );
        })}

        {visible.length === 0 && (
          <div className="text-center py-12 rounded-3xl border border-gold/15 bg-white/40 p-8 space-y-2">
            <UserCheck size={32} className="mx-auto text-gold/40" />
            <p className="font-serif text-xl text-ink">Nenhum convidado encontrado</p>
            <p className="text-xs text-ink/60">
              Cadastre novos convidados usando o formulário acima para disparar os convites Webview no WhatsApp.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
