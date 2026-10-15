import React, { useState, useEffect } from 'react';
import {
  Phone,
  QrCode,
  Power,
  RefreshCw,
  LogOut,
  Mail,
  AlertTriangle,
  CheckCircle,
  Clock,
  Shield,
  Send,
  RotateCcw,
  Server,
  Layers,
  History,
  Info,
} from 'lucide-react';

interface QueueStats {
  pending: number;
  sending: number;
  sent: number;
  failedTemp: number;
  failedPerm: number;
  total: number;
}

interface WhatsAppStatusData {
  state: 'disconnected' | 'connecting' | 'pairing' | 'connected' | 'reconnecting' | 'auth_error';
  phone: string | null;
  qrCodeDataUrl: string | null;
  lastConnectedAt: string | null;
  lastDisconnectedAt: string | null;
  lastDisconnectReason: string | null;
  isReconnecting: boolean;
  requiresNewPairing: boolean;
  uptimeSeconds: number | null;
  queueStats: QueueStats;
  provider: 'zapo' | 'whaticket';
  dailyAlertCount: number;
  dailyAlertLimit: number;
}

export default function AdminWhatsAppZapo() {
  const [status, setStatus] = useState<WhatsAppStatusData | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionBusy, setActionBusy] = useState(false);
  const [activeSubTab, setActiveSubTab] = useState<'connection' | 'emailAlerts' | 'queue' | 'incidents'>('connection');
  const [notice, setNotice] = useState<{ type: 'success' | 'error' | 'info'; message: string } | null>(null);

  // SMTP Settings form state
  const [settings, setSettings] = useState<any>({});
  const [smtpSaving, setSmtpSaving] = useState(false);
  const [testEmailRecipient, setTestEmailRecipient] = useState('');
  const [testEmailBusy, setTestEmailBusy] = useState(false);

  // Queue state
  const [queueItems, setQueueItems] = useState<any[]>([]);
  const [queueFilter, setQueueFilter] = useState<string>('all');
  const [queueLoading, setQueueLoading] = useState(false);

  // Incidents state
  const [incidents, setIncidents] = useState<any[]>([]);
  const [incidentsLoading, setIncidentsLoading] = useState(false);

  const showNotice = (message: string, type: 'success' | 'error' | 'info' = 'success') => {
    setNotice({ message, type });
    setTimeout(() => setNotice(null), 6000);
  };

  const fetchStatus = async () => {
    try {
      const res = await fetch('/api/admin/whatsapp/status');
      if (res.ok) {
        const data = await res.json();
        setStatus(data);
      }
    } catch (err) {
      console.error('Erro ao buscar status do WhatsApp:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchSettings = async () => {
    try {
      const res = await fetch('/api/settings/admin');
      if (res.ok) {
        const data = await res.json();
        setSettings(data);
        if (data.smtpTo) {
          setTestEmailRecipient(data.smtpTo.split(',')[0].trim());
        }
      }
    } catch (err) {
      console.error('Erro ao buscar configurações:', err);
    }
  };

  const fetchQueue = async () => {
    setQueueLoading(true);
    try {
      const url = queueFilter === 'all' ? '/api/admin/whatsapp/queue' : `/api/admin/whatsapp/queue?status=${queueFilter}`;
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        setQueueItems(data.messages || []);
      }
    } catch (err) {
      console.error('Erro ao buscar fila:', err);
    } finally {
      setQueueLoading(false);
    }
  };

  const fetchIncidents = async () => {
    setIncidentsLoading(true);
    try {
      const res = await fetch('/api/admin/whatsapp/incidents');
      if (res.ok) {
        const data = await res.json();
        setIncidents(data.incidents || []);
      }
    } catch (err) {
      console.error('Erro ao buscar incidentes:', err);
    } finally {
      setIncidentsLoading(false);
    }
  };

  useEffect(() => {
    fetchStatus();
    fetchSettings();
    const interval = setInterval(fetchStatus, 4000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (activeSubTab === 'queue') fetchQueue();
    if (activeSubTab === 'incidents') fetchIncidents();
  }, [activeSubTab, queueFilter]);

  const handleConnect = async () => {
    setActionBusy(true);
    try {
      const res = await fetch('/api/admin/whatsapp/connect', { method: 'POST' });
      if (res.ok) {
        showNotice('Tentativa de conexão iniciada. Aguarde o QR Code se for o primeiro pareamento.', 'info');
        fetchStatus();
      } else {
        const err = await res.json();
        showNotice(err.error || 'Erro ao conectar.', 'error');
      }
    } catch {
      showNotice('Erro de rede ao conectar.', 'error');
    } finally {
      setActionBusy(false);
    }
  };

  const handleDisconnect = async () => {
    setActionBusy(true);
    try {
      const res = await fetch('/api/admin/whatsapp/disconnect', { method: 'POST' });
      if (res.ok) {
        showNotice('WhatsApp desconectado.');
        fetchStatus();
      } else {
        const err = await res.json();
        showNotice(err.error || 'Erro ao desconectar.', 'error');
      }
    } catch {
      showNotice('Erro de rede ao desconectar.', 'error');
    } finally {
      setActionBusy(false);
    }
  };

  const handleLogout = async () => {
    if (!confirm('Deseja realmente deslogar? Isso limpará a sessão salva e exigirá um novo QR Code.')) return;
    setActionBusy(true);
    try {
      const res = await fetch('/api/admin/whatsapp/logout', { method: 'POST' });
      if (res.ok) {
        showNotice('Sessão encerrada com sucesso. Faça novo pareamento quando desejar.');
        fetchStatus();
      } else {
        const err = await res.json();
        showNotice(err.error || 'Erro no logout.', 'error');
      }
    } catch {
      showNotice('Erro de rede no logout.', 'error');
    } finally {
      setActionBusy(false);
    }
  };

  const handleRetryQueueItem = async (id: string) => {
    try {
      const res = await fetch(`/api/admin/whatsapp/queue/${id}/retry`, { method: 'POST' });
      if (res.ok) {
        showNotice('Mensagem recolocada na fila de envio.');
        fetchQueue();
        fetchStatus();
      } else {
        showNotice('Não foi possível reenviar a mensagem.', 'error');
      }
    } catch {
      showNotice('Erro de rede ao reenviar.', 'error');
    }
  };

  const handleSaveSmtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setSmtpSaving(true);
    try {
      const res = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings),
      });
      if (res.ok) {
        const updated = await res.json();
        setSettings(updated);
        showNotice('Configurações salvas com sucesso!');
        fetchStatus();
      } else {
        const err = await res.json();
        showNotice(err.error || 'Erro ao salvar configurações.', 'error');
      }
    } catch {
      showNotice('Erro ao salvar configurações.', 'error');
    } finally {
      setSmtpSaving(false);
    }
  };

  const handleSendTestEmail = async () => {
    setTestEmailBusy(true);
    try {
      const res = await fetch('/api/admin/whatsapp/test-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ recipient: testEmailRecipient }),
      });
      const data = await res.json();
      if (res.ok) {
        showNotice(data.message || 'E-mail de teste enviado com sucesso!');
      } else {
        showNotice(data.error || 'Falha ao enviar e-mail de teste.', 'error');
      }
    } catch {
      showNotice('Erro de comunicação com o servidor SMTP.', 'error');
    } finally {
      setTestEmailBusy(false);
    }
  };

  const formatUptime = (seconds: number | null) => {
    if (seconds == null) return '—';
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    if (h > 0) return `${h}h ${m}m ${s}s`;
    if (m > 0) return `${m}m ${s}s`;
    return `${s}s`;
  };

  const getStateBadge = (state: string) => {
    switch (state) {
      case 'connected':
        return (
          <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            Conectado ao WhatsApp
          </span>
        );
      case 'pairing':
        return (
          <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-purple-500/10 text-purple-600 border border-purple-500/20">
            <span className="w-2 h-2 rounded-full bg-purple-500 animate-ping" />
            Aguardando Leitura do QR Code
          </span>
        );
      case 'connecting':
        return (
          <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-amber-500/10 text-amber-600 border border-amber-500/20">
            <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
            Conectando...
          </span>
        );
      case 'reconnecting':
        return (
          <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-blue-500/10 text-blue-600 border border-blue-500/20">
            <span className="w-2 h-2 rounded-full bg-blue-500 animate-spin" />
            Tentando Reconectar
          </span>
        );
      case 'auth_error':
        return (
          <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-rose-500/10 text-rose-600 border border-rose-500/20">
            <AlertTriangle size={12} />
            Sessão Revogada (Exige Novo Pareamento)
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-slate-500/10 text-slate-600 border border-slate-500/20">
            <span className="w-2 h-2 rounded-full bg-slate-400" />
            Desconectado
          </span>
        );
    }
  };

  if (loading && !status) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-gold/60">
        <RefreshCw className="w-8 h-8 animate-spin mb-4" />
        <p className="text-xs uppercase tracking-widest font-bold">Carregando status do WhatsApp...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {notice && (
        <div
          className={`p-4 rounded-2xl text-xs font-bold tracking-wide transition-all ${
            notice.type === 'error'
              ? 'bg-rose-50 text-rose-700 border border-rose-200'
              : notice.type === 'info'
              ? 'bg-blue-50 text-blue-700 border border-blue-200'
              : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
          }`}
        >
          {notice.message}
        </div>
      )}

      {/* Sub-navegação */}
      <div className="flex flex-wrap gap-2 border-b border-gold/10 pb-4">
        {[
          { id: 'connection', label: 'Conexão e Pareamento', icon: Phone },
          { id: 'emailAlerts', label: 'Alertas de Conexão (SMTP)', icon: Mail },
          { id: 'queue', label: `Fila de Mensagens (${status?.queueStats?.pending ?? 0})`, icon: Layers },
          { id: 'incidents', label: 'Histórico & Auditoria', icon: History },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveSubTab(tab.id as any)}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-all ${
              activeSubTab === tab.id
                ? 'bg-gold text-white shadow-md shadow-gold/20'
                : 'bg-white/40 text-gold/60 hover:bg-white/80'
            }`}
          >
            <tab.icon size={15} />
            {tab.label}
          </button>
        ))}
      </div>

      {/* TAB 1: CONEXÃO E PAREAMENTO */}
      {activeSubTab === 'connection' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Card Principal de Conexão */}
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white/60 backdrop-blur-sm rounded-3xl p-6 md:p-8 border border-gold/15 shadow-sm space-y-6">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <h4 className="text-xl font-serif text-slate-800">WhatsApp do Enxoval</h4>
                  <p className="text-xs text-slate-500 mt-1">
                    Conexão nativa independente do Whaticket gerenciada via biblioteca Zapo
                  </p>
                </div>
                {status && getStateBadge(status.state)}
              </div>

              {/* Métricas Rápidas */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-2">
                <div className="bg-white/80 p-4 rounded-2xl border border-gold/10">
                  <span className="text-[10px] uppercase tracking-wider text-slate-400 font-bold block mb-1">
                    Número Conectado
                  </span>
                  <span className="text-sm font-bold text-slate-800">
                    {status?.phone ? `+${status.phone}` : 'Nenhum'}
                  </span>
                </div>

                <div className="bg-white/80 p-4 rounded-2xl border border-gold/10">
                  <span className="text-[10px] uppercase tracking-wider text-slate-400 font-bold block mb-1">
                    Tempo Conectado
                  </span>
                  <span className="text-sm font-bold text-emerald-600">
                    {formatUptime(status?.uptimeSeconds ?? null)}
                  </span>
                </div>

                <div className="bg-white/80 p-4 rounded-2xl border border-gold/10">
                  <span className="text-[10px] uppercase tracking-wider text-slate-400 font-bold block mb-1">
                    Fila Pendente
                  </span>
                  <span className="text-sm font-bold text-amber-600">
                    {status?.queueStats?.pending ?? 0} msgs
                  </span>
                </div>

                <div className="bg-white/80 p-4 rounded-2xl border border-gold/10">
                  <span className="text-[10px] uppercase tracking-wider text-slate-400 font-bold block mb-1">
                    Alertas Hoje
                  </span>
                  <span className="text-sm font-bold text-slate-700">
                    {status?.dailyAlertCount ?? 0} / {status?.dailyAlertLimit ?? 3}
                  </span>
                </div>
              </div>

              {/* Botões de Ação */}
              <div className="flex flex-wrap gap-3 pt-4 border-t border-gold/10">
                {status?.state !== 'connected' && (
                  <button
                    onClick={handleConnect}
                    disabled={actionBusy}
                    className="flex items-center gap-2 px-6 py-3 bg-gold text-white rounded-xl text-xs uppercase tracking-widest font-bold shadow-md hover:bg-gold/90 transition-all disabled:opacity-50"
                  >
                    <Power size={16} />
                    {status?.state === 'pairing' ? 'Atualizar QR Code' : 'Iniciar Conexão'}
                  </button>
                )}

                {status?.state === 'connected' && (
                  <button
                    onClick={handleDisconnect}
                    disabled={actionBusy}
                    className="flex items-center gap-2 px-6 py-3 bg-slate-700 text-white rounded-xl text-xs uppercase tracking-widest font-bold hover:bg-slate-800 transition-all disabled:opacity-50"
                  >
                    <Power size={16} />
                    Desconectar
                  </button>
                )}

                <button
                  onClick={handleLogout}
                  disabled={actionBusy}
                  className="flex items-center gap-2 px-5 py-3 border border-rose-300 text-rose-600 rounded-xl text-xs uppercase tracking-widest font-bold hover:bg-rose-50 transition-all disabled:opacity-50 ml-auto"
                >
                  <LogOut size={16} />
                  Limpar Sessão
                </button>
              </div>

              {/* Informações detalhadas de status */}
              <div className="bg-slate-50/80 rounded-2xl p-4 text-xs space-y-2 text-slate-600 border border-slate-200/60">
                <div className="flex justify-between">
                  <span className="text-slate-400">Provedor ativo:</span>
                  <span className="font-semibold">{status?.provider === 'zapo' ? 'Zapo Nativo (Oficial)' : 'Whaticket Legado'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Última conexão com sucesso:</span>
                  <span>{status?.lastConnectedAt ? new Date(status.lastConnectedAt).toLocaleString('pt-BR') : 'Sem registro recente'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Última queda:</span>
                  <span>{status?.lastDisconnectedAt ? new Date(status.lastDisconnectedAt).toLocaleString('pt-BR') : 'Nenhuma queda registrada'}</span>
                </div>
                {status?.lastDisconnectReason && (
                  <div className="flex justify-between">
                    <span className="text-slate-400">Motivo da última desconexão:</span>
                    <span className="text-rose-600 font-medium">{status.lastDisconnectReason}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-slate-400">Tentativa automática de reconexão:</span>
                  <span className={status?.isReconnecting ? 'text-blue-600 font-bold' : ''}>
                    {status?.isReconnecting ? 'Ativa (com intervalo progressivo)' : 'Inativa'}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Coluna Direita: QR Code ou Card de Ajuda */}
          <div className="space-y-6">
            {status?.state === 'pairing' && status.qrCodeDataUrl ? (
              <div className="bg-white rounded-3xl p-6 border-2 border-purple-300/60 shadow-lg text-center space-y-4">
                <div className="inline-flex p-2 bg-purple-50 rounded-2xl text-purple-600">
                  <QrCode size={28} />
                </div>
                <h5 className="text-lg font-serif text-slate-800">Escanear QR Code</h5>
                <p className="text-xs text-slate-500 leading-relaxed">
                  1. Abra o WhatsApp no celular<br />
                  2. Toque em <strong>Aparelhos Conectados</strong><br />
                  3. Toque em <strong>Conectar um aparelho</strong> e aponte para a imagem abaixo:
                </p>
                <div className="flex justify-center p-2 bg-white rounded-2xl border border-slate-100 shadow-inner">
                  <img src={status.qrCodeDataUrl} alt="WhatsApp QR Code" className="w-56 h-56 rounded-xl" />
                </div>
                <p className="text-[11px] text-purple-600 font-semibold animate-pulse">
                  Atualização automática a cada 20 segundos
                </p>
              </div>
            ) : status?.state === 'connected' ? (
              <div className="bg-gradient-to-br from-emerald-50 to-teal-50 rounded-3xl p-6 border border-emerald-200/60 shadow-sm text-center space-y-4">
                <div className="w-14 h-14 mx-auto rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center shadow-inner">
                  <CheckCircle size={32} />
                </div>
                <h5 className="text-lg font-serif text-slate-800">Sessão Pronta</h5>
                <p className="text-xs text-slate-600 leading-relaxed">
                  O módulo do WhatsApp está conectado e autenticado. As mensagens de convites, reservas e confirmações serão enviadas automaticamente.
                </p>
                <div className="pt-2">
                  <span className="text-[11px] font-mono bg-white/80 px-3 py-1.5 rounded-lg border border-emerald-200 text-emerald-800 block">
                    ./uploads/zapo-session.sqlite (persistido)
                  </span>
                </div>
              </div>
            ) : (
              <div className="bg-white/60 rounded-3xl p-6 border border-gold/15 shadow-sm space-y-4">
                <div className="flex items-center gap-3 text-gold">
                  <Info size={20} />
                  <h5 className="font-serif text-base text-slate-800">Como Parear</h5>
                </div>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Clique no botão <strong>Iniciar Conexão</strong>. Se esta for a primeira vez ou se as credenciais expiraram, o QR Code surgirá aqui para pareamento com o seu celular.
                </p>
                <p className="text-xs text-slate-500 leading-relaxed">
                  As credenciais ficam guardadas de forma persistente. Ao reiniciar o servidor ou atualizar a aplicação, a conexão é restaurada automaticamente sem exigir novo escaneamento.
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 2: ALERTAS DE CONEXÃO (SMTP) */}
      {activeSubTab === 'emailAlerts' && (
        <form onSubmit={handleSaveSmtp} className="space-y-6">
          <div className="bg-white/60 backdrop-blur-sm rounded-3xl p-6 md:p-8 border border-gold/15 shadow-sm space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <h4 className="text-xl font-serif text-slate-800">Alertas de Conexão por E-mail</h4>
                <p className="text-xs text-slate-500 mt-1">
                  Notifique os administradores quando o WhatsApp desconectar, com limite diário configurável e prevenção contra spam
                </p>
              </div>

              <label className="flex items-center gap-3 cursor-pointer bg-white px-4 py-2 rounded-xl border border-gold/20 shadow-sm">
                <input
                  type="checkbox"
                  checked={Boolean(settings.smtpAlertsEnabled)}
                  onChange={(e) => setSettings({ ...settings, smtpAlertsEnabled: e.target.checked })}
                  className="rounded text-gold focus:ring-gold"
                />
                <span className="text-xs font-bold uppercase tracking-wider text-slate-700">
                  Notificações Ativadas
                </span>
              </label>
            </div>

            {/* Provedor de WhatsApp */}
            <div className="p-4 bg-gold/5 rounded-2xl border border-gold/15 space-y-3">
              <label className="text-xs font-bold uppercase tracking-wider text-gold block">
                Provedor de Envio WhatsApp
              </label>
              <div className="flex flex-wrap gap-4">
                <label className="flex items-center gap-2 cursor-pointer text-xs font-medium text-slate-700">
                  <input
                    type="radio"
                    name="whatsappProvider"
                    value="zapo"
                    checked={settings.whatsappProvider !== 'whaticket'}
                    onChange={() => setSettings({ ...settings, whatsappProvider: 'zapo' })}
                    className="text-gold focus:ring-gold"
                  />
                  <span><strong>Zapo Nativo</strong> (Recomendado — Sem dependência do Whaticket)</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer text-xs font-medium text-slate-700">
                  <input
                    type="radio"
                    name="whatsappProvider"
                    value="whaticket"
                    checked={settings.whatsappProvider === 'whaticket'}
                    onChange={() => setSettings({ ...settings, whatsappProvider: 'whaticket' })}
                    className="text-gold focus:ring-gold"
                  />
                  <span><strong>Whaticket API</strong> (Contingência legada)</span>
                </label>
              </div>
            </div>

            {/* Configurações do Servidor SMTP */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="text-[10px] uppercase font-bold tracking-wider text-slate-500 block mb-1">
                  Servidor SMTP (Host)
                </label>
                <input
                  type="text"
                  placeholder="smtp.gmail.com"
                  value={settings.smtpHost || ''}
                  onChange={(e) => setSettings({ ...settings, smtpHost: e.target.value })}
                  className="w-full px-4 py-2.5 bg-white rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-gold focus:outline-none"
                />
              </div>

              <div>
                <label className="text-[10px] uppercase font-bold tracking-wider text-slate-500 block mb-1">
                  Porta SMTP
                </label>
                <input
                  type="number"
                  placeholder="587"
                  value={settings.smtpPort || 587}
                  onChange={(e) => setSettings({ ...settings, smtpPort: parseInt(e.target.value) || 587 })}
                  className="w-full px-4 py-2.5 bg-white rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-gold focus:outline-none"
                />
              </div>

              <div className="flex items-center pt-6">
                <label className="flex items-center gap-2 cursor-pointer text-xs font-medium text-slate-700">
                  <input
                    type="checkbox"
                    checked={Boolean(settings.smtpSecure)}
                    onChange={(e) => setSettings({ ...settings, smtpSecure: e.target.checked })}
                    className="rounded text-gold focus:ring-gold"
                  />
                  <span>Usar SSL/TLS (Normalmente para porta 465)</span>
                </label>
              </div>

              <div>
                <label className="text-[10px] uppercase font-bold tracking-wider text-slate-500 block mb-1">
                  Usuário SMTP
                </label>
                <input
                  type="text"
                  placeholder="seu-email@gmail.com"
                  value={settings.smtpUser || ''}
                  onChange={(e) => setSettings({ ...settings, smtpUser: e.target.value })}
                  className="w-full px-4 py-2.5 bg-white rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-gold focus:outline-none"
                />
              </div>

              <div>
                <label className="text-[10px] uppercase font-bold tracking-wider text-slate-500 block mb-1">
                  Senha SMTP
                </label>
                <input
                  type="password"
                  placeholder="••••••••"
                  value={settings.smtpPassEncrypted || ''}
                  onChange={(e) => setSettings({ ...settings, smtpPassEncrypted: e.target.value })}
                  className="w-full px-4 py-2.5 bg-white rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-gold focus:outline-none"
                />
              </div>

              <div>
                <label className="text-[10px] uppercase font-bold tracking-wider text-slate-500 block mb-1">
                  E-mail do Remetente (De)
                </label>
                <input
                  type="text"
                  placeholder='"Enxoval de Casamento" <noreply@site.com>'
                  value={settings.smtpFrom || ''}
                  onChange={(e) => setSettings({ ...settings, smtpFrom: e.target.value })}
                  className="w-full px-4 py-2.5 bg-white rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-gold focus:outline-none"
                />
              </div>
            </div>

            {/* Destinatários e Regras de Limite */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-gold/10">
              <div className="md:col-span-2">
                <label className="text-[10px] uppercase font-bold tracking-wider text-slate-500 block mb-1">
                  Destinatários dos Alertas (separados por vírgula se houver mais de um)
                </label>
                <input
                  type="text"
                  placeholder="admin@exemplo.com, noivos@exemplo.com"
                  value={settings.smtpTo || ''}
                  onChange={(e) => setSettings({ ...settings, smtpTo: e.target.value })}
                  className="w-full px-4 py-2.5 bg-white rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-gold focus:outline-none"
                />
              </div>

              <div>
                <label className="text-[10px] uppercase font-bold tracking-wider text-slate-500 block mb-1">
                  Limite Máximo de Alertas por Dia
                </label>
                <input
                  type="number"
                  min="1"
                  max="50"
                  value={settings.smtpMaxDailyAlerts ?? 3}
                  onChange={(e) => setSettings({ ...settings, smtpMaxDailyAlerts: parseInt(e.target.value) || 3 })}
                  className="w-full px-4 py-2.5 bg-white rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-gold focus:outline-none"
                />
                <span className="text-[11px] text-slate-400 mt-1 block">
                  Usados hoje: {status?.dailyAlertCount ?? 0} de {settings.smtpMaxDailyAlerts ?? 3}. Reseta à meia-noite (fuso SP).
                </span>
              </div>

              <div>
                <label className="text-[10px] uppercase font-bold tracking-wider text-slate-500 block mb-1">
                  Tolerância de Desconexão (minutos)
                </label>
                <input
                  type="number"
                  min="0"
                  max="60"
                  value={settings.smtpDropToleranceMin ?? 2}
                  onChange={(e) => setSettings({ ...settings, smtpDropToleranceMin: parseInt(e.target.value) || 0 })}
                  className="w-full px-4 py-2.5 bg-white rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-gold focus:outline-none"
                />
                <span className="text-[11px] text-slate-400 mt-1 block">
                  Tempo mínimo de queda antes de disparar o primeiro aviso.
                </span>
              </div>

              <div>
                <label className="text-[10px] uppercase font-bold tracking-wider text-slate-500 block mb-1">
                  Intervalo Mínimo Entre Notificações (minutos)
                </label>
                <input
                  type="number"
                  min="1"
                  max="1440"
                  value={settings.smtpMinIntervalMin ?? 30}
                  onChange={(e) => setSettings({ ...settings, smtpMinIntervalMin: parseInt(e.target.value) || 30 })}
                  className="w-full px-4 py-2.5 bg-white rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-gold focus:outline-none"
                />
                <span className="text-[11px] text-slate-400 mt-1 block">
                  Evita múltiplos e-mails repetidos se a conexão continuar oscilando.
                </span>
              </div>

              <div className="flex items-center pt-5">
                <label className="flex items-center gap-2 cursor-pointer text-xs font-medium text-slate-700">
                  <input
                    type="checkbox"
                    checked={Boolean(settings.smtpSendRecovery ?? true)}
                    onChange={(e) => setSettings({ ...settings, smtpSendRecovery: e.target.checked })}
                    className="rounded text-gold focus:ring-gold"
                  />
                  <span>Enviar aviso de recuperação quando o WhatsApp voltar</span>
                </label>
              </div>
            </div>

            {/* Botões de Salvar e Teste */}
            <div className="flex flex-wrap items-center justify-between gap-4 pt-6 border-t border-gold/10">
              <div className="flex items-center gap-2">
                <input
                  type="email"
                  placeholder="Destinatário para teste"
                  value={testEmailRecipient}
                  onChange={(e) => setTestEmailRecipient(e.target.value)}
                  className="px-3 py-2 bg-white rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-gold focus:outline-none w-56"
                />
                <button
                  type="button"
                  onClick={handleSendTestEmail}
                  disabled={testEmailBusy}
                  className="flex items-center gap-2 px-4 py-2 bg-slate-800 text-white rounded-xl text-xs font-bold uppercase tracking-wider hover:bg-slate-900 transition-all disabled:opacity-50"
                >
                  <Send size={14} />
                  {testEmailBusy ? 'Enviando...' : 'Enviar Teste'}
                </button>
              </div>

              <button
                type="submit"
                disabled={smtpSaving}
                className="flex items-center gap-2 px-8 py-3 bg-gold text-white rounded-xl text-xs uppercase tracking-widest font-bold shadow-md hover:bg-gold/90 transition-all disabled:opacity-50"
              >
                {smtpSaving ? 'Salvando...' : 'Salvar Configurações de Alerta'}
              </button>
            </div>
          </div>
        </form>
      )}

      {/* TAB 3: FILA DE MENSAGENS */}
      {activeSubTab === 'queue' && (
        <div className="bg-white/60 backdrop-blur-sm rounded-3xl p-6 md:p-8 border border-gold/15 shadow-sm space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h4 className="text-xl font-serif text-slate-800">Fila Persistente de Mensagens</h4>
              <p className="text-xs text-slate-500 mt-1">
                Todas as mensagens passam pela fila persistente no PostgreSQL com controle de idempotência e retentativas progressivas
              </p>
            </div>

            <div className="flex items-center gap-2">
              <select
                value={queueFilter}
                onChange={(e) => setQueueFilter(e.target.value)}
                className="px-4 py-2 bg-white rounded-xl border border-slate-200 text-xs font-bold text-slate-700 focus:outline-none"
              >
                <option value="all">Todas as mensagens</option>
                <option value="pending">Apenas Pendentes</option>
                <option value="sending">Apenas Enviando</option>
                <option value="sent">Apenas Enviadas</option>
                <option value="failed_temp">Falhas Temporárias</option>
                <option value="failed_perm">Falhas Definitivas</option>
              </select>

              <button
                onClick={fetchQueue}
                disabled={queueLoading}
                className="p-2.5 bg-white text-slate-700 rounded-xl border border-slate-200 hover:bg-slate-50 transition-all"
                title="Recarregar fila"
              >
                <RefreshCw size={16} className={queueLoading ? 'animate-spin' : ''} />
              </button>
            </div>
          </div>

          {/* Tabela de Mensagens */}
          <div className="overflow-x-auto rounded-2xl border border-gold/10">
            <table className="w-full border-collapse text-left text-xs">
              <thead className="bg-gold/5 uppercase tracking-wider text-[10px] text-gold font-bold">
                <tr>
                  <th className="py-3 px-4">Destinatário</th>
                  <th className="py-3 px-4">Tipo</th>
                  <th className="py-3 px-4">Conteúdo</th>
                  <th className="py-3 px-4">Data</th>
                  <th className="py-3 px-4">Tentativas</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Ação</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gold/10">
                {queueItems.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-slate-400">
                      Nenhuma mensagem encontrada na fila.
                    </td>
                  </tr>
                ) : (
                  queueItems.map((item) => (
                    <tr key={item.id} className="hover:bg-white/40 transition-colors">
                      <td className="py-3 px-4 font-mono font-bold text-slate-700">+{item.recipient}</td>
                      <td className="py-3 px-4 uppercase text-[10px] font-semibold text-slate-500">{item.type}</td>
                      <td className="py-3 px-4 max-w-xs truncate text-slate-600" title={item.content}>
                        {item.content}
                      </td>
                      <td className="py-3 px-4 text-slate-400 whitespace-nowrap">
                        {new Date(item.createdAt).toLocaleString('pt-BR')}
                      </td>
                      <td className="py-3 px-4 font-semibold text-slate-600">{item.attempts}</td>
                      <td className="py-3 px-4">
                        <span
                          className={`inline-block px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                            item.status === 'sent'
                              ? 'bg-emerald-100 text-emerald-700'
                              : item.status === 'sending'
                              ? 'bg-blue-100 text-blue-700'
                              : item.status === 'pending'
                              ? 'bg-amber-100 text-amber-700'
                              : 'bg-rose-100 text-rose-700'
                          }`}
                        >
                          {item.status}
                        </span>
                        {item.error && (
                          <span className="block text-[10px] text-rose-500 truncate max-w-xs mt-0.5" title={item.error}>
                            {item.error}
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-right">
                        {(item.status === 'failed_temp' || item.status === 'failed_perm') && (
                          <button
                            onClick={() => handleRetryQueueItem(item.id)}
                            className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-gold hover:text-gold/80 px-2.5 py-1 bg-gold/10 rounded-lg"
                          >
                            <RotateCcw size={12} />
                            Reenviar
                          </button>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 4: HISTÓRICO DE INCIDENTES & AUDITORIA */}
      {activeSubTab === 'incidents' && (
        <div className="bg-white/60 backdrop-blur-sm rounded-3xl p-6 md:p-8 border border-gold/15 shadow-sm space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h4 className="text-xl font-serif text-slate-800">Histórico de Incidentes & Auditoria</h4>
              <p className="text-xs text-slate-500 mt-1">
                Registro persistente de todas as quedas de conexão, duração, tentativas e e-mails de alerta enviados
              </p>
            </div>

            <button
              onClick={fetchIncidents}
              disabled={incidentsLoading}
              className="p-2.5 bg-white text-slate-700 rounded-xl border border-slate-200 hover:bg-slate-50 transition-all"
              title="Recarregar incidentes"
            >
              <RefreshCw size={16} className={incidentsLoading ? 'animate-spin' : ''} />
            </button>
          </div>

          <div className="overflow-x-auto rounded-2xl border border-gold/10">
            <table className="w-full border-collapse text-left text-xs">
              <thead className="bg-gold/5 uppercase tracking-wider text-[10px] text-gold font-bold">
                <tr>
                  <th className="py-3 px-4">Início da Queda</th>
                  <th className="py-3 px-4">Recuperação</th>
                  <th className="py-3 px-4">Duração</th>
                  <th className="py-3 px-4">Motivo Conhecido</th>
                  <th className="py-3 px-4">Tentativas</th>
                  <th className="py-3 px-4">Alerta Enviado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gold/10">
                {incidents.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-slate-400">
                      Nenhum incidente de desconexão registrado até o momento. Conexão estável!
                    </td>
                  </tr>
                ) : (
                  incidents.map((inc) => (
                    <tr key={inc.id} className="hover:bg-white/40 transition-colors">
                      <td className="py-3 px-4 text-slate-700 font-semibold whitespace-nowrap">
                        {new Date(inc.startedAt).toLocaleString('pt-BR')}
                      </td>
                      <td className="py-3 px-4 text-slate-600 whitespace-nowrap">
                        {inc.endedAt ? (
                          <span className="text-emerald-700 font-medium">
                            {new Date(inc.endedAt).toLocaleString('pt-BR')}
                          </span>
                        ) : (
                          <span className="text-rose-600 font-bold animate-pulse">Em andamento</span>
                        )}
                      </td>
                      <td className="py-3 px-4 font-mono font-bold text-slate-700">
                        {inc.durationSec != null ? `${inc.durationSec}s` : '—'}
                      </td>
                      <td className="py-3 px-4 text-slate-600 max-w-xs truncate" title={inc.reason}>
                        {inc.reason || 'Desconexão inesperada'}
                      </td>
                      <td className="py-3 px-4 text-slate-700 font-semibold">{inc.reconnectAttempts}</td>
                      <td className="py-3 px-4">
                        {inc.alertSent ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-100 text-emerald-800">
                            <CheckCircle size={12} />
                            Enviado ({inc.alertRecipient})
                          </span>
                        ) : (
                          <span className="text-[10px] text-slate-400">Não disparado</span>
                        )}
                        {inc.alertError && (
                          <span className="block text-[10px] text-rose-500 mt-0.5 truncate max-w-xs" title={inc.alertError}>
                            Erro SMTP: {inc.alertError}
                          </span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
