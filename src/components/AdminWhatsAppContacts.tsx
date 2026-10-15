import { useEffect, useMemo, useState } from 'react';
import { api } from '../api';
import { buildInviteWebviewUrl } from '../../server/domain';
import {
  Phone,
  Send,
  Copy,
  RefreshCw,
  CheckCircle2,
  Clock,
  AlertCircle,
  Plus,
  Users,
  UserCheck,
  Sparkles,
  Search,
  ExternalLink,
  CheckSquare,
  Square,
  X,
  MessageCircle,
  AlertTriangle,
  Edit3,
  MessageSquare,
} from 'lucide-react';
import AdminInviteMessageModal from './AdminInviteMessageModal';

export type ContactItem = {
  phone: string;
  name: string;
  source: 'whatsapp' | 'guest_list' | 'both';
  isGuest: boolean;
  guestId: string | null;
  token: string | null;
  alreadySent: boolean;
  lastSentAt: string | null;
  rsvp: { attending: boolean; guests: number } | null;
  groupName?: string;
  seats?: number;
};

type ContactsResponse = {
  contacts: ContactItem[];
  total: number;
  alreadySentCount: number;
  pendingCount: number;
  whatsappConnected: boolean;
  connectedPhone: string | null;
};

const campaigns = [
  { id: 'official', label: 'Convite oficial' },
  { id: 'save-the-date', label: 'Save the date' },
  { id: 'reminder', label: 'Lembrete de resposta' },
  { id: 'soon', label: 'Lembrete da data' },
];

export default function AdminWhatsAppContacts({
  onNotice,
  onSwitchToOfficialList,
}: {
  onNotice: (type: 'success' | 'error', message: string) => void;
  onSwitchToOfficialList?: () => void;
}) {
  const [data, setData] = useState<ContactsResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<'all' | 'pending' | 'sent' | 'guests'>('all');
  const [selectedPhones, setSelectedPhones] = useState<string[]>([]);
  const [campaign, setCampaign] = useState('official');
  const [busy, setBusy] = useState(false);
  const [sendingPhone, setSendingPhone] = useState<string | null>(null);

  // Envio manual rápido
  const [manualPhone, setManualPhone] = useState('');
  const [manualName, setManualName] = useState('');

  // Modal de confirmação
  const [confirmModal, setConfirmModal] = useState<{
    phones: string[];
    hasAlreadySent: boolean;
    alreadySentCount: number;
    pendingCount: number;
  } | null>(null);

  // Modal para editar mensagem do convite
  const [messageModalOpen, setMessageModalOpen] = useState(false);

  const fetchContacts = async () => {
    setLoading(true);
    try {
      const res = await api.get('/admin/whatsapp/contacts');
      setData(res);
    } catch (err: any) {
      onNotice('error', err?.message || 'Não foi possível carregar os contatos do WhatsApp.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchContacts();
  }, []);

  const contacts = data?.contacts || [];

  const visibleContacts = useMemo(() => {
    return contacts.filter((item) => {
      const haystack = `${item.name} ${item.phone}`.toLowerCase();
      if (query && !haystack.includes(query.toLowerCase())) return false;
      if (filter === 'pending' && item.alreadySent) return false;
      if (filter === 'sent' && !item.alreadySent) return false;
      if (filter === 'guests' && !item.isGuest) return false;
      return true;
    });
  }, [contacts, query, filter]);

  const allVisibleSelected = useMemo(() => {
    if (!visibleContacts.length) return false;
    return visibleContacts.every((c) => selectedPhones.includes(c.phone));
  }, [visibleContacts, selectedPhones]);

  const toggleSelectAll = () => {
    if (allVisibleSelected) {
      setSelectedPhones([]);
    } else {
      setSelectedPhones(visibleContacts.map((c) => c.phone));
    }
  };

  const formatPhone = (phone: string) => {
    const clean = phone.replace(/\D/g, '');
    if (clean.length === 13 && clean.startsWith('55')) {
      return `+55 (${clean.slice(2, 4)}) ${clean.slice(4, 9)}-${clean.slice(9)}`;
    }
    if (clean.length === 11) {
      return `(${clean.slice(0, 2)}) ${clean.slice(2, 7)}-${clean.slice(7)}`;
    }
    if (clean.length === 10) {
      return `(${clean.slice(0, 2)}) ${clean.slice(2, 6)}-${clean.slice(6)}`;
    }
    return phone;
  };

  const copyWebviewLink = async (item: ContactItem) => {
    const url = buildInviteWebviewUrl(window.location.origin, {
      token: item.token || undefined,
      name: item.name || undefined,
      whatsapp: item.phone,
    });
    try {
      await navigator.clipboard.writeText(url);
      onNotice('success', `Link Webview copiado para ${item.name || item.phone}!`);
    } catch {
      onNotice('error', 'Falha ao copiar link.');
    }
  };

  const sendSingle = async (item: ContactItem, force = false) => {
    setSendingPhone(item.phone);
    try {
      const res = await api.post('/admin/whatsapp/contacts/send', {
        numbers: [item.phone],
        names: { [item.phone]: item.name },
        campaign,
        force,
      });

      const first = res.results?.[0];
      if (first?.status === 'skipped') {
        onNotice('error', first.reason || 'Este contato já recebeu convite.');
      } else if (first?.status === 'failed') {
        onNotice('error', first.reason || 'Falha ao disparar convite.');
      } else {
        onNotice('success', `Convite com botão Webview enviado com sucesso para ${item.name || item.phone}!`);
      }
      await fetchContacts();
    } catch (err: any) {
      onNotice('error', err?.message || 'Falha no envio.');
    } finally {
      setSendingPhone(null);
    }
  };

  const handleManualSend = async () => {
    const rawList = manualPhone
      .split(/[\n,;]+/)
      .map((s) => s.replace(/\D/g, ''))
      .filter((s) => s.length >= 8);

    if (!rawList.length) {
      onNotice('error', 'Digite ao menos um número de telefone válido com DDD.');
      return;
    }

    // Normaliza
    const normalized = rawList.map((p) => (p.length === 10 || p.length === 11 ? `55${p}` : p));

    // Checa se algum já foi enviado
    const alreadySentInList = contacts.filter((c) => normalized.includes(c.phone) && c.alreadySent);

    if (alreadySentInList.length > 0) {
      setConfirmModal({
        phones: normalized,
        hasAlreadySent: true,
        alreadySentCount: alreadySentInList.length,
        pendingCount: normalized.length - alreadySentInList.length,
      });
      return;
    }

    await executeSend(normalized, false);
  };

  const handleBulkSendClick = () => {
    if (!selectedPhones.length) return;
    const selectedContacts = contacts.filter((c) => selectedPhones.includes(c.phone));
    const alreadySentCount = selectedContacts.filter((c) => c.alreadySent).length;
    const pendingCount = selectedContacts.length - alreadySentCount;

    setConfirmModal({
      phones: selectedPhones,
      hasAlreadySent: alreadySentCount > 0,
      alreadySentCount,
      pendingCount,
    });
  };

  const executeSend = async (phones: string[], force: boolean) => {
    setBusy(true);
    try {
      const namesMap: Record<string, string> = {};
      for (const p of phones) {
        const found = contacts.find((c) => c.phone === p);
        if (found?.name) namesMap[p] = found.name;
        else if (manualName.trim() && phones.length === 1) namesMap[p] = manualName.trim();
      }

      const res = await api.post('/admin/whatsapp/contacts/send', {
        numbers: phones,
        names: namesMap,
        campaign,
        force,
      });

      onNotice(
        'success',
        `${res.sent} convite(s) enviado(s) para a fila do WhatsApp com botão Webview! (${res.skipped} ignorado(s)/já enviados).`
      );
      setConfirmModal(null);
      setSelectedPhones([]);
      setManualPhone('');
      setManualName('');
      await fetchContacts();
    } catch (err: any) {
      onNotice('error', err?.message || 'Falha ao disparar convites.');
    } finally {
      setBusy(false);
    }
  };

  const importToGuests = async (item: ContactItem) => {
    try {
      await api.post('/admin/whatsapp/contacts/import', {
        contacts: [{ phone: item.phone, name: item.name, groupName: 'amigos', seats: 2 }],
      });
      onNotice('success', `${item.name || item.phone} adicionado à lista oficial de convidados!`);
      await fetchContacts();
    } catch (err: any) {
      onNotice('error', err?.message || 'Falha ao importar contato.');
    }
  };

  const importSelectedToGuests = async () => {
    if (!selectedPhones.length) return;
    setBusy(true);
    try {
      const toImport = contacts
        .filter((c) => selectedPhones.includes(c.phone))
        .map((c) => ({ phone: c.phone, name: c.name, groupName: 'amigos', seats: 2 }));

      const res = await api.post('/admin/whatsapp/contacts/import', { contacts: toImport });
      onNotice('success', res.message || 'Contatos importados com sucesso!');
      setSelectedPhones([]);
      await fetchContacts();
    } catch (err: any) {
      onNotice('error', err?.message || 'Falha ao importar contatos.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Banner Principal com Status da Conexão e Métricas */}
      <div className="rounded-3xl border border-gold/20 bg-gradient-to-br from-white/95 via-amber-50/30 to-white/90 p-6 shadow-sm backdrop-blur">
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              {data?.whatsappConnected ? (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/15 px-3 py-1 text-xs font-bold text-emerald-800 border border-emerald-500/20">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  WhatsApp Conectado ({data.connectedPhone ? formatPhone(data.connectedPhone) : 'Ativo'})
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-500/15 px-3 py-1 text-xs font-bold text-amber-800 border border-amber-500/20">
                  <AlertCircle size={14} className="text-amber-600" />
                  WhatsApp Desconectado (conecte na aba WhatsApp)
                </span>
              )}
              <span className="inline-flex items-center gap-1 rounded-full bg-gold/10 px-3 py-1 text-xs font-semibold text-gold border border-gold/20">
                <Sparkles size={13} />
                Disparos com Botão Webview (cta_url)
              </span>
            </div>

            <h3 className="font-serif text-2xl text-ink">Agenda do WhatsApp & Disparador Direto</h3>
            <p className="text-sm text-ink/70 max-w-3xl leading-relaxed">
              Aqui você visualiza os contatos da sua conta conectada do WhatsApp, confere quais números{' '}
              <strong className="text-emerald-800 font-semibold">já receberam o convite</strong> e dispara novas mensagens individuais ou em lote diretamente, sem perder o controle.
            </p>
          </div>

          <div className="flex flex-wrap gap-2.5 shrink-0">
            <button
              type="button"
              onClick={() => setMessageModalOpen(true)}
              className="px-4 py-2.5 rounded-xl border border-gold/30 bg-gold text-white hover:brightness-110 text-xs font-bold uppercase tracking-wider flex items-center gap-2 shadow-sm transition"
            >
              <Edit3 size={14} /> Editar Mensagem do Convite
            </button>
            <button
              type="button"
              disabled={loading}
              onClick={() => void fetchContacts()}
              className="px-4 py-2.5 rounded-xl border border-gold/30 bg-white hover:bg-amber-50 text-xs font-bold uppercase tracking-wider text-ink flex items-center gap-2 shadow-sm transition disabled:opacity-50"
            >
              <RefreshCw size={14} className={`text-gold ${loading ? 'animate-spin' : ''}`} />
              {loading ? 'Buscando...' : 'Atualizar Contatos'}
            </button>
            {onSwitchToOfficialList && (
              <button
                type="button"
                onClick={onSwitchToOfficialList}
                className="px-4 py-2.5 rounded-xl border border-gold/20 bg-white/70 hover:bg-white text-xs font-bold uppercase tracking-wider text-ink/70 flex items-center gap-1.5 transition"
              >
                <Users size={14} /> Ver Lista Oficial
              </button>
            )}
          </div>
        </div>

        {/* Métricas Rápidas */}
        <div className="mt-5 pt-4 border-t border-gold/15 grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="rounded-2xl border border-gold/10 bg-white/60 p-4">
            <p className="text-[10px] uppercase font-bold tracking-widest text-ink/50">Total de Números</p>
            <p className="mt-1 font-serif text-3xl text-ink">{data?.total ?? 0}</p>
          </div>
          <div className="rounded-2xl border border-emerald-500/20 bg-emerald-50/50 p-4">
            <p className="text-[10px] uppercase font-bold tracking-widest text-emerald-800/70">Já Enviados</p>
            <p className="mt-1 font-serif text-3xl text-emerald-800">{data?.alreadySentCount ?? 0}</p>
          </div>
          <div className="rounded-2xl border border-amber-500/20 bg-amber-50/50 p-4">
            <p className="text-[10px] uppercase font-bold tracking-widest text-amber-800/70">Pendentes</p>
            <p className="mt-1 font-serif text-3xl text-amber-800">{data?.pendingCount ?? 0}</p>
          </div>
          <div className="rounded-2xl border border-gold/10 bg-white/60 p-4">
            <p className="text-[10px] uppercase font-bold tracking-widest text-ink/50">Na Lista Oficial</p>
            <p className="mt-1 font-serif text-3xl text-ink">
              {contacts.filter((c) => c.isGuest).length}
            </p>
          </div>
        </div>
      </div>

      {/* Caixa de Disparo Rápido / Digitar Números Manualmente */}
      <div className="rounded-3xl border border-gold/15 bg-white/70 p-6 backdrop-blur shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 pb-3 border-b border-gold/10">
          <div className="flex items-center gap-2">
            <Phone size={18} className="text-emerald-600" />
            <h4 className="font-serif text-xl">Disparar Convite Imediato para Qualquer Número</h4>
          </div>
          <span className="text-xs text-ink/50">Cole um ou vários números com DDD</span>
        </div>

        <div className="grid gap-3 sm:grid-cols-3">
          <div className="sm:col-span-2 space-y-1">
            <label className="text-[10px] uppercase font-bold tracking-wider text-ink/60 ml-2">
              Número(s) de WhatsApp com DDD
            </label>
            <textarea
              rows={2}
              value={manualPhone}
              onChange={(e) => setManualPhone(e.target.value)}
              placeholder="Ex.: 34999122805 ou cole vários separados por vírgula ou linha..."
              className="w-full rounded-2xl border border-gold/20 bg-white/90 px-4 py-3 text-sm outline-none focus:border-gold resize-none"
            />
          </div>
          <div className="space-y-3 flex flex-col justify-between">
            <div className="space-y-1">
              <label className="text-[10px] uppercase font-bold tracking-wider text-ink/60 ml-2">
                Nome (Opcional)
              </label>
              <input
                type="text"
                value={manualName}
                onChange={(e) => setManualName(e.target.value)}
                placeholder="Ex.: Maria Clara"
                className="w-full min-h-11 rounded-2xl border border-gold/20 bg-white/90 px-4 text-sm outline-none focus:border-gold"
              />
            </div>
            <button
              type="button"
              disabled={busy || !manualPhone.trim()}
              onClick={() => void handleManualSend()}
              className="min-h-11 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 px-6 text-xs font-bold uppercase tracking-wider text-white shadow-md hover:brightness-110 disabled:opacity-40 flex items-center justify-center gap-2 transition"
            >
              <Send size={14} /> Disparar Convite Webview
            </button>
          </div>
        </div>
      </div>

      {/* Barra de Busca e Filtros da Agenda */}
      <div className="flex flex-col gap-3 lg:flex-row items-stretch lg:items-center">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-ink/40" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar por nome ou número..."
            className="w-full min-h-11 rounded-2xl border border-gold/15 bg-white/80 pl-11 pr-4 text-sm outline-none focus:border-gold"
          />
        </div>

        {/* Filtros de Status */}
        <div className="flex flex-wrap gap-1.5 p-1 rounded-2xl border border-gold/15 bg-white/80">
          <button
            type="button"
            onClick={() => setFilter('all')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold uppercase tracking-wider transition ${
              filter === 'all' ? 'bg-gold text-white shadow-sm' : 'text-ink/60 hover:text-ink'
            }`}
          >
            Todos ({contacts.length})
          </button>
          <button
            type="button"
            onClick={() => setFilter('pending')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold uppercase tracking-wider transition ${
              filter === 'pending' ? 'bg-amber-600 text-white shadow-sm' : 'text-amber-800/80 hover:text-amber-900'
            }`}
          >
            🟡 Pendentes ({data?.pendingCount ?? 0})
          </button>
          <button
            type="button"
            onClick={() => setFilter('sent')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold uppercase tracking-wider transition ${
              filter === 'sent' ? 'bg-emerald-600 text-white shadow-sm' : 'text-emerald-800/80 hover:text-emerald-900'
            }`}
          >
            🟢 Já Enviados ({data?.alreadySentCount ?? 0})
          </button>
          <button
            type="button"
            onClick={() => setFilter('guests')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold uppercase tracking-wider transition ${
              filter === 'guests' ? 'bg-ink text-white shadow-sm' : 'text-ink/60 hover:text-ink'
            }`}
          >
            Lista Oficial ({contacts.filter((c) => c.isGuest).length})
          </button>
        </div>

        <div className="flex items-center gap-2">
          <select
            value={campaign}
            onChange={(e) => setCampaign(e.target.value)}
            className="min-h-11 rounded-2xl border border-gold/15 bg-white/80 px-4 text-sm font-semibold text-gold outline-none focus:border-gold"
          >
            {campaigns.map((item) => (
              <option key={item.id} value={item.id}>
                {item.label}
              </option>
            ))}
          </select>

          <button
            type="button"
            onClick={() => setMessageModalOpen(true)}
            className="min-h-11 px-4 py-2 rounded-2xl border border-gold/25 bg-white/90 hover:bg-white text-xs font-bold uppercase tracking-wider text-gold flex items-center gap-1.5 shadow-sm transition shrink-0"
          >
            <Edit3 size={14} /> Editar Modelo
          </button>
        </div>
      </div>

      {/* Barra de Ações em Massa */}
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
                <Square size={16} className="opacity-40" /> Selecionar Todos ({visibleContacts.length})
              </>
            )}
          </button>
          <span className="text-xs text-ink/60">
            {selectedPhones.length} {selectedPhones.length === 1 ? 'contato selecionado' : 'contatos selecionados'}
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            disabled={!selectedPhones.length || busy}
            onClick={importSelectedToGuests}
            className="min-h-11 rounded-xl border border-gold/25 bg-white/80 px-4 text-xs font-bold uppercase tracking-wider text-ink hover:bg-white disabled:opacity-40 flex items-center gap-2 transition"
          >
            <Plus size={15} className="text-gold" /> Importar para Convidados ({selectedPhones.length})
          </button>

          <button
            type="button"
            disabled={!selectedPhones.length || busy}
            onClick={handleBulkSendClick}
            className="min-h-11 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 px-6 text-xs font-bold uppercase tracking-widest text-white shadow-lg shadow-emerald-600/20 hover:brightness-110 disabled:opacity-40 flex items-center gap-2 transition"
          >
            <Send size={15} /> Disparar Selecionados ({selectedPhones.length})
          </button>
        </div>
      </div>

      {/* Lista de Contatos */}
      <div className="space-y-3">
        {visibleContacts.map((item) => {
          const isSelected = selectedPhones.includes(item.phone);
          const isSending = sendingPhone === item.phone;
          const webviewUrl = buildInviteWebviewUrl(window.location.origin, {
            token: item.token || undefined,
            name: item.name || undefined,
            whatsapp: item.phone,
          });

          return (
            <article
              key={item.phone}
              className={`rounded-2xl border transition-all p-4 backdrop-blur ${
                isSelected
                  ? 'border-gold/40 bg-amber-50/40 shadow-md ring-1 ring-gold/30'
                  : item.alreadySent
                  ? 'border-emerald-500/20 bg-emerald-50/20 hover:bg-white/90'
                  : 'border-gold/10 bg-white/70 hover:border-gold/30 hover:bg-white/90'
              }`}
            >
              <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
                {/* Checkbox e Detalhes */}
                <div className="flex items-center gap-3.5 flex-1 min-w-0">
                  <button
                    type="button"
                    onClick={() =>
                      setSelectedPhones((curr) =>
                        curr.includes(item.phone) ? curr.filter((p) => p !== item.phone) : [...curr, item.phone]
                      )
                    }
                    className="text-gold hover:scale-105 transition shrink-0"
                    aria-label={`Selecionar ${item.name || item.phone}`}
                  >
                    {isSelected ? <CheckSquare size={20} className="text-gold" /> : <Square size={20} className="opacity-40" />}
                  </button>

                  <div className="space-y-1 min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <strong className="font-serif text-xl text-ink truncate">
                        {item.name || 'Contato WhatsApp'}
                      </strong>
                      <span className="font-mono text-xs text-ink/75 bg-black/5 px-2 py-0.5 rounded-lg">
                        {formatPhone(item.phone)}
                      </span>
                      {item.isGuest && (
                        <span className="rounded-full bg-gold/10 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-gold">
                          Lista Oficial
                        </span>
                      )}
                    </div>

                    {/* Status de Envio */}
                    <div className="flex flex-wrap items-center gap-2 text-xs">
                      {item.alreadySent ? (
                        <span className="inline-flex items-center gap-1 text-emerald-800 font-semibold bg-emerald-500/15 px-2.5 py-0.5 rounded-full border border-emerald-500/30">
                          <CheckCircle2 size={13} className="text-emerald-700" />
                          Já Enviado
                          {item.lastSentAt && (
                            <span className="font-normal opacity-75 ml-1">
                              em {new Date(item.lastSentAt).toLocaleDateString('pt-BR')} às{' '}
                              {new Date(item.lastSentAt).toLocaleTimeString('pt-BR', {
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </span>
                          )}
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-amber-800 bg-amber-50 px-2.5 py-0.5 rounded-full border border-amber-200">
                          <Clock size={12} className="text-amber-600" />
                          Pendente de Envio
                        </span>
                      )}

                      {item.rsvp?.attending && (
                        <span className="inline-flex items-center gap-1 text-teal-800 bg-teal-50 px-2.5 py-0.5 rounded-full border border-teal-200 font-medium">
                          <UserCheck size={12} /> Confirmou presença ({item.rsvp.guests} pessoas)
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Botões de Ação */}
                <div className="flex flex-wrap items-center gap-2 self-stretch sm:self-auto justify-end pt-2 md:pt-0 border-t md:border-t-0 border-gold/10">
                  {/* Botão Enviar WhatsApp */}
                  <button
                    type="button"
                    disabled={isSending || busy}
                    onClick={() => void sendSingle(item, item.alreadySent)}
                    className={`min-h-9 px-3.5 rounded-xl text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 shadow-sm transition ${
                      item.alreadySent
                        ? 'border border-emerald-600/30 bg-white hover:bg-emerald-50 text-emerald-800'
                        : 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-600/20'
                    }`}
                    title="Disparar convite com botão Webview para este número"
                  >
                    {isSending ? (
                      <>
                        <RefreshCw size={13} className="animate-spin" /> Enviando...
                      </>
                    ) : item.alreadySent ? (
                      <>
                        <RefreshCw size={13} /> Reenviar
                      </>
                    ) : (
                      <>
                        <Send size={13} /> Enviar WhatsApp
                      </>
                    )}
                  </button>

                  {/* Copiar Link Webview */}
                  <button
                    type="button"
                    onClick={() => void copyWebviewLink(item)}
                    className="min-h-9 px-3 rounded-xl border border-gold/20 bg-white hover:bg-amber-50 text-xs font-bold uppercase tracking-wider text-ink flex items-center gap-1 transition"
                    title="Copia link individual já parametrizado"
                  >
                    <Copy size={13} className="text-gold" /> Copiar Link
                  </button>

                  {/* Testar */}
                  <a
                    href={webviewUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="min-h-9 px-2.5 rounded-xl border border-gold/15 bg-white hover:bg-amber-50 text-xs font-bold uppercase tracking-wider text-ink/70 flex items-center gap-1 transition"
                    title="Abrir prévia simulada no navegador"
                  >
                    <ExternalLink size={12} />
                  </a>

                  {/* Importar para a Lista Oficial */}
                  {!item.isGuest && (
                    <button
                      type="button"
                      onClick={() => void importToGuests(item)}
                      className="min-h-9 px-2.5 rounded-xl border border-gold/20 bg-white hover:bg-amber-50 text-xs font-bold uppercase tracking-wider text-gold hover:text-ink flex items-center gap-1 transition"
                      title="Adicionar à lista oficial de convidados"
                    >
                      <Plus size={13} /> Convidado
                    </button>
                  )}
                </div>
              </div>
            </article>
          );
        })}

        {visibleContacts.length === 0 && (
          <div className="text-center py-12 rounded-3xl border border-gold/15 bg-white/40 p-8 space-y-2">
            <MessageCircle size={32} className="mx-auto text-gold/40" />
            <p className="font-serif text-xl text-ink">Nenhum contato encontrado com este filtro</p>
            <p className="text-xs text-ink/60">
              Clique em "Atualizar Contatos" para sincronizar com seu WhatsApp ou digite números na caixa acima.
            </p>
          </div>
        )}
      </div>

      {/* Modal de Confirmação com Alerta de "Já Enviado" */}
      {confirmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-fade-in">
          <div className="bg-[#FAF8F5] border border-gold/20 rounded-3xl p-6 sm:p-8 max-w-lg w-full shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-gold/15">
              <h4 className="font-serif text-2xl text-ink">Confirmar Disparo de Convites</h4>
              <button
                type="button"
                onClick={() => setConfirmModal(null)}
                className="w-7 h-7 rounded-full bg-black/5 hover:bg-black/10 flex items-center justify-center transition"
              >
                <X size={15} />
              </button>
            </div>

            <p className="text-sm text-ink/75 leading-relaxed">
              Você selecionou{' '}
              <strong className="text-emerald-800 text-base">
                {confirmModal.phones.length}{' '}
                {confirmModal.phones.length === 1 ? 'destinatário' : 'destinatários'}
              </strong>{' '}
              com a campanha <strong>"{campaigns.find((c) => c.id === campaign)?.label}"</strong>.
            </p>

            {confirmModal.hasAlreadySent && (
              <div className="rounded-2xl border border-amber-300 bg-amber-50 p-4 space-y-2 text-xs text-amber-900">
                <div className="flex items-center gap-2 font-bold text-amber-950">
                  <AlertTriangle size={16} className="text-amber-600 shrink-0" />
                  Atenção: Números que já receberam convite!
                </div>
                <p>
                  Dos contatos selecionados, <strong>{confirmModal.alreadySentCount}</strong> já receberam mensagem anteriormente e{' '}
                  <strong>{confirmModal.pendingCount}</strong> ainda estão pendentes.
                </p>
                <p className="text-[11px] opacity-80">
                  Você pode escolher disparar apenas para os que ainda não receberam (recomendado) ou reenviar para todos.
                </p>
              </div>
            )}

            <div className="pt-2 flex flex-col gap-2.5">
              {confirmModal.hasAlreadySent && confirmModal.pendingCount > 0 && (
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => {
                    const onlyPending = confirmModal.phones.filter((p) => {
                      const c = contacts.find((item) => item.phone === p);
                      return !c?.alreadySent;
                    });
                    void executeSend(onlyPending, false);
                  }}
                  className="w-full min-h-12 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-xs font-bold uppercase tracking-widest text-white shadow-md transition"
                >
                  Enviar Apenas para os Pendentes ({confirmModal.pendingCount})
                </button>
              )}

              <button
                type="button"
                disabled={busy}
                onClick={() => void executeSend(confirmModal.phones, true)}
                className={`w-full min-h-12 rounded-xl text-xs font-bold uppercase tracking-widest transition ${
                  confirmModal.hasAlreadySent
                    ? 'border border-gold/40 hover:bg-amber-50 text-ink'
                    : 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-md'
                }`}
              >
                {confirmModal.hasAlreadySent ? 'Reenviar para Todos os Selecionados' : 'Confirmar Envio'}
              </button>

              <button
                type="button"
                onClick={() => setConfirmModal(null)}
                className="w-full min-h-10 text-xs uppercase tracking-widest opacity-60 hover:opacity-100"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Personalização da Mensagem do WhatsApp */}
      <AdminInviteMessageModal
        isOpen={messageModalOpen}
        onClose={() => setMessageModalOpen(false)}
        onNotice={onNotice}
        initialCampaign={campaign}
      />
    </div>
  );
}
