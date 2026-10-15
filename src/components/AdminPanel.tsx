import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { api } from '../api';
import { whatsappChatUrl } from '../../server/domain';
import { ProdutoComprado, EnxovalItem, SettingsData } from '../types';
import { Plus, Edit2, Trash2, LogIn, LogOut, Shield, ShoppingBag, Gift, MessageSquare, X, Save, Phone, Database, Eye, EyeOff, Download, Upload, CalendarDays, CheckCircle2, Users, Sparkles } from 'lucide-react';
import AdminGuests from './AdminGuests';
import AdminInviteSettings from './AdminInviteSettings';
import AdminVisualEditor from './AdminVisualEditor';
import AdminWhatsAppZapo from './AdminWhatsAppZapo';

export default function AdminPanel() {
  type Notice = { type: 'success' | 'error'; message: string };
  type ConfirmDialog = {
    title: string;
    message: string;
    confirmLabel?: string;
    tone?: 'danger' | 'default';
    onConfirm: () => Promise<void> | void;
  };
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'purchased' | 'registry' | 'reservations' | 'rsvps' | 'guests' | 'siteEditor' | 'whatsapp' | 'settings'>('overview');

  // Data states
  const [purchased, setPurchased] = useState<ProdutoComprado[]>([]);
  const [registry, setRegistry] = useState<EnxovalItem[]>([]);
  const [reservations, setReservations] = useState<any[]>([]);
  const [rsvps, setRsvps] = useState<any[]>([]);
  const [rsvpSummary, setRsvpSummary] = useState({ total: 0, attendingResponses: 0, confirmedGuests: 0, declined: 0 });
  const [rsvpQuery, setRsvpQuery] = useState('');
  const [rsvpFilter, setRsvpFilter] = useState<'all' | 'yes' | 'no'>('all');
  const [registryQuery, setRegistryQuery] = useState('');
  const [musicCustom, setMusicCustom] = useState(false);
  const [musicFile, setMusicFile] = useState<File | null>(null);
  const [musicBusy, setMusicBusy] = useState(false);
  const [musicVersion, setMusicVersion] = useState(0);
  const defaultReservationTemplate =
    '🎁 Nova reserva no site ({couple})\n\n' +
    'Presente: {item}\n' +
    'Convidado(a): {nome}\n' +
    'WhatsApp: {whatsapp}\n' +
    'Recado: {mensagem}\n\n' +
    'Opções de presente: podem comprar o item por conta própria e entregar aos noivos, ou enviar o valor via PIX:\n' +
    'Chave PIX: {pixKey}\n' +
    'Titular: {pixName}';
  const defaultGuestReplyTemplate =
    'Oi, {nome}! Obrigado pelo carinho com {couple}. 💛\n\n' +
    'Recebemos sua reserva do presente: "{item}".\n\n' +
    'Você pode escolher a melhor forma de presentear:\n' +
    '1) Comprar o item por conta própria e entregar aos noivos.\n' +
    '2) Enviar o valor via PIX.\n\n' +
    'Se preferir PIX, mando a chave na próxima mensagem para facilitar copiar e colar.';
  const defaultGuestPixTemplate =
    '{pixKey}';

  const [pixSettings, setPixSettings] = useState<SettingsData>({
    pixKey: '',
    pixName: '',
    coupleNames: 'Tais & Yran',
    weddingDate: '2027-02-02',
    whaticketApiUrl: 'https://api.whaticketup.com.br/api/messages/send',
    whaticketTemplate: defaultReservationTemplate,
    guestReplyTemplate: defaultGuestReplyTemplate,
    guestPixTemplate: defaultGuestPixTemplate,
  });

  // Login states
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loginError, setLoginError] = useState('');

  // Form states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<any>(null);
  const [formData, setFormData] = useState<any>({});
  const [selectedRegistryIds, setSelectedRegistryIds] = useState<string[]>([]);
  const [settingsTab, setSettingsTab] = useState<'account' | 'general' | 'invite' | 'whatsapp' | 'backup'>('general');
  const [adminProfile, setAdminProfile] = useState({
    email: '',
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [notice, setNotice] = useState<Notice | null>(null);
  const [backupFile, setBackupFile] = useState<File | null>(null);
  const [confirmDialog, setConfirmDialog] = useState<ConfirmDialog | null>(null);
  const registryHeaderCheckboxRef = useRef<HTMLInputElement>(null);
  const noticeTimeoutRef = useRef<number | null>(null);

  useEffect(() => {
    checkAuth();
  }, []);

  useEffect(() => {
    if (activeTab !== 'registry') setSelectedRegistryIds([]);
    if (activeTab !== 'settings') setSettingsTab('general');
  }, [activeTab]);

  useEffect(() => {
    const el = registryHeaderCheckboxRef.current;
    if (!el) return;
    el.indeterminate =
      selectedRegistryIds.length > 0 && selectedRegistryIds.length < registry.length;
  }, [selectedRegistryIds, registry.length]);

  useEffect(() => {
    return () => {
      if (noticeTimeoutRef.current) window.clearTimeout(noticeTimeoutRef.current);
    };
  }, []);

  const showNotice = (type: Notice['type'], message: string) => {
    setNotice({ type, message });
    if (noticeTimeoutRef.current) window.clearTimeout(noticeTimeoutRef.current);
    noticeTimeoutRef.current = window.setTimeout(() => setNotice(null), 4500);
  };

  const openConfirm = (dialog: ConfirmDialog) => setConfirmDialog(dialog);

  const checkAuth = async () => {
    try {
      const data = await api.get('/me');
      setUser(data.user);
      setAdminProfile((prev) => ({ ...prev, email: String(data.user?.email ?? '') }));
      fetchData();
    } catch (err) {
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  const fetchData = async () => {
    try {
      const [reg, pur, res, set, rsvpData, musicStatus] = await Promise.all([
        api.get('/registry'),
        api.get('/purchased'),
        api.get('/reservations'),
        api.get('/settings/admin'),
        api.get('/rsvps'),
        api.get('/music/status')
      ]);
      setMusicCustom(Boolean(musicStatus?.custom));
      setRegistry(reg);
      setPurchased(pur);
      setReservations(res);
      setRsvps(Array.isArray(rsvpData?.items) ? rsvpData.items : []);
      setRsvpSummary(rsvpData?.summary ?? { total: 0, attendingResponses: 0, confirmedGuests: 0, declined: 0 });
      setPixSettings(set);
    } catch (err) {
      console.error("Error fetching data:", err);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');
    try {
      const data = await api.post('/login', { email, password });
      setUser(data.user);
      fetchData();
    } catch (err: any) {
      setLoginError(err?.message || 'Não foi possível entrar no painel.');
    }
  };

  const handleLogout = async () => {
    try {
      await api.post('/logout', {});
      setUser(null);
    } catch (err) {
      console.error("Logout error:", err);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const endpoint = activeTab === 'purchased' ? '/purchased' : '/registry';
    const payload = {
      ...formData,
      valor: Number(formData.valor),
    };
    if (!Number.isFinite(payload.valor)) {
      showNotice('error', 'Informe um valor numérico válido.');
      return;
    }
    
    try {
      if (editingItem) {
        await api.put(`${endpoint}/${editingItem.id}`, payload);
      } else {
        await api.post(endpoint, payload);
      }
      setIsModalOpen(false);
      setEditingItem(null);
      setFormData({});
      showNotice('success', editingItem ? 'Item atualizado com sucesso.' : 'Item criado com sucesso.');
      fetchData();
    } catch (error: any) {
      showNotice('error', error?.message || 'Falha ao salvar item.');
    }
  };

  const handleSavePix = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post('/settings', pixSettings);
      showNotice('success', 'Configurações salvas com sucesso.');
    } catch (error: any) {
      showNotice('error', error?.message || 'Erro ao salvar configurações.');
    }
  };

  const handleSaveAdminProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (adminProfile.newPassword && adminProfile.newPassword !== adminProfile.confirmPassword) {
      showNotice('error', 'Nova senha e confirmação não conferem.');
      return;
    }
    try {
      const data = await api.post('/admin/profile', {
        email: adminProfile.email,
        currentPassword: adminProfile.currentPassword,
        newPassword: adminProfile.newPassword || undefined,
      });
      setUser(data.user);
      setAdminProfile((prev) => ({
        ...prev,
        email: data.user?.email || prev.email,
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
      }));
      showNotice('success', 'Conta do administrador atualizada com sucesso.');
    } catch (error: any) {
      showNotice('error', error?.message || 'Não foi possível atualizar a conta.');
    }
  };

  const handleTestWhatsApp = async () => {
    try {
      await api.post('/whatsapp/test', {
        message: 'Teste de integração WhatsApp enviado pelo painel do casal.',
      });
      showNotice('success', 'Mensagem de teste enviada com sucesso.');
    } catch (error: any) {
      showNotice('error', error?.message || 'Falha no teste do WhatsApp.');
    }
  };

  const handleDelete = async (id: string, endpoint: string) => {
    openConfirm({
      title: 'Confirmar exclusão',
      message: 'Tem certeza que deseja excluir este item?',
      confirmLabel: 'Excluir item',
      tone: 'danger',
      onConfirm: async () => {
        try {
          await api.delete(`${endpoint}/${id}`);
          setSelectedRegistryIds((prev) => prev.filter((x) => x !== id));
          showNotice('success', 'Item excluído com sucesso.');
          fetchData();
        } catch (error: any) {
          showNotice('error', error?.message || 'Erro ao excluir item.');
        }
      },
    });
  };

  const toggleRegistrySelect = (id: string) => {
    setSelectedRegistryIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const toggleSelectAllRegistry = () => {
    const visible = registry.filter((item) => item.nome.toLowerCase().includes(registryQuery.trim().toLowerCase()));
    if (visible.length === 0) return;
    if (selectedRegistryIds.length === visible.length) {
      setSelectedRegistryIds([]);
    } else {
      setSelectedRegistryIds(visible.map((r) => r.id));
    }
  };

  const handleBulkDeleteRegistry = async () => {
    const n = selectedRegistryIds.length;
    if (n === 0) return;
    openConfirm({
      title: 'Excluir itens selecionados',
      message: `Excluir ${n} item(ns) do enxoval? As reservas ligadas a estes itens serão removidas.`,
      confirmLabel: `Excluir ${n} item(ns)`,
      tone: 'danger',
      onConfirm: async () => {
        try {
          await Promise.all(selectedRegistryIds.map((id) => api.delete(`/registry/${id}`)));
          setSelectedRegistryIds([]);
          showNotice('success', `${n} item(ns) excluído(s) com sucesso.`);
          fetchData();
        } catch (error: any) {
          showNotice('error', error?.message || 'Erro ao excluir um ou mais itens.');
        }
      },
    });
  };

  const handleExportBackup = async () => {
    try {
      const { backup, savedPath, filename } = await api.getBackupExport();
      const body = JSON.stringify(backup, null, 2);
      const blob = new Blob([body], { type: 'application/json;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download =
        filename?.replace(/[/\\]/g, '') ||
        `enxoval-backup-${new Date().toISOString().replace(/[:.]/g, '-')}.json`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      showNotice(
        'success',
        savedPath
          ? `Download iniciado. Cópia também salva no servidor em ${savedPath}.`
          : 'Download iniciado. (Cópia em pasta backups/ indisponível neste ambiente.)'
      );
    } catch (error: any) {
      showNotice('error', error?.message || 'Falha ao exportar backup.');
    }
  };

  const handleImportBackup = async () => {
    if (!backupFile) {
      showNotice('error', 'Selecione um arquivo de backup (.json).');
      return;
    }
    openConfirm({
      title: 'Importar backup completo',
      message: 'Isso substituirá todos os dados atuais (enxoval, reservas, comprados, confirmações, configurações e usuários). Deseja continuar?',
      confirmLabel: 'Importar e substituir',
      tone: 'danger',
      onConfirm: async () => {
        try {
          const content = await backupFile.text();
          const parsed = JSON.parse(content);
          await api.post('/backup/import', { backup: parsed });
          setBackupFile(null);
          showNotice('success', 'Backup importado com sucesso.');
          fetchData();
        } catch (error: any) {
          showNotice('error', error?.message || 'Falha ao importar backup.');
        }
      },
    });
  };

  const registryTotalValue = registry.reduce((sum, item) => sum + (Number(item.valor) || 0), 0);
  const registryByStatus = registry.reduce(
    (acc, item) => {
      if (item.status === 'Disponível') acc.available += 1;
      if (item.status === 'Reservado') acc.reserved += 1;
      if (item.status === 'Comprado') acc.bought += 1;
      return acc;
    },
    { available: 0, reserved: 0, bought: 0 }
  );
  const boughtProgress = registry.length ? Math.round((registryByStatus.bought / registry.length) * 100) : 0;

  const registryQueryNorm = registryQuery.trim().toLowerCase();
  const visibleRegistry = registryQueryNorm
    ? registry.filter((item) => item.nome.toLowerCase().includes(registryQueryNorm))
    : registry;
  const rsvpQueryNorm = rsvpQuery.trim().toLowerCase();
  const visibleRsvps = rsvps.filter((rsvp) => {
    const matchesFilter = rsvpFilter === 'all' || (rsvpFilter === 'yes' ? rsvp.attending : !rsvp.attending);
    const haystack = `${rsvp.name} ${rsvp.whatsapp} ${rsvp.message || ''}`.toLowerCase();
    return matchesFilter && (!rsvpQueryNorm || haystack.includes(rsvpQueryNorm));
  });

  if (loading) return <div className="min-h-screen flex items-center justify-center text-gold font-serif text-2xl animate-pulse" role="status">Verificando Acesso...</div>;

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center px-6">
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="glass-card w-full max-w-md rounded-[40px] p-6 text-center sm:p-12"
        >
          <div className="w-20 h-20 bg-gold/10 text-gold rounded-full flex items-center justify-center mx-auto mb-8">
            <Shield size={40} />
          </div>
          <h2 className="text-4xl font-serif mb-4">Acesso Restrito</h2>
          <p className="text-sm opacity-60 mb-10">Este painel é exclusivo para os noivos Tais & Yran.</p>
          
          <form onSubmit={handleLogin} className="space-y-4 text-left">
            <div className="space-y-2">
              <label htmlFor="admin-email" className="text-[10px] uppercase tracking-widest font-bold opacity-60 ml-4">E-mail</label>
              <input 
                id="admin-email"
                required 
                type="email" 
                autoComplete="username"
                value={email} 
                onChange={e => setEmail(e.target.value)}
                className="w-full px-6 py-4 bg-white/50 border border-gold/10 rounded-2xl focus:border-gold outline-none text-sm"
              />
            </div>
            <div className="space-y-2 relative">
              <label htmlFor="admin-password" className="text-[10px] uppercase tracking-widest font-bold opacity-60 ml-4">Senha</label>
              <input 
                id="admin-password"
                required 
                type={showPassword ? "text" : "password"}
                autoComplete="current-password"
                value={password} 
                onChange={e => setPassword(e.target.value)}
                className="w-full px-6 py-4 bg-white/50 border border-gold/10 rounded-2xl focus:border-gold outline-none text-sm"
              />
              <button 
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
                className="absolute right-4 bottom-3 min-h-11 min-w-11 text-gold/40 hover:text-gold"
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
            {loginError && <p role="alert" className="text-center text-sm text-red-700">{loginError}</p>}
            <button
              type="submit"
              className="w-full py-4 bg-gold text-white rounded-2xl text-xs uppercase tracking-widest font-bold shadow-xl shadow-gold/20 flex items-center justify-center gap-3"
            >
              <LogIn size={18} /> Entrar no Painel
            </button>
          </form>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pt-32 pb-20 px-6 max-w-7xl mx-auto">
      <AnimatePresence>
        {notice && (
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.98 }}
            className={`fixed top-6 right-6 z-[120] max-w-sm px-5 py-4 rounded-2xl border shadow-2xl backdrop-blur-sm ${
              notice.type === 'success'
                ? 'bg-green-500/90 text-white border-green-200/30'
                : 'bg-red-500/90 text-white border-red-200/30'
            }`}
          >
            <div className="flex items-start gap-3">
              <p className="text-sm leading-relaxed">{notice.message}</p>
              <button
                type="button"
                onClick={() => setNotice(null)}
                className="opacity-80 hover:opacity-100 transition-opacity"
                aria-label="Fechar notificação"
              >
                <X size={16} />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex flex-col md:flex-row justify-between items-center mb-16 gap-8">
        <div>
          <h2 className="text-5xl md:text-7xl font-serif mb-2">Painel de Controle</h2>
          <p className="text-gold/60 uppercase tracking-widest text-xs">Gerencie seu enxoval e lista de presentes (PostgreSQL)</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-3 px-6 py-3 bg-gold/5 rounded-full border border-gold/10">
            <span className="text-[10px] uppercase tracking-widest font-bold text-gold">{user.email}</span>
          </div>
          <button onClick={handleLogout} aria-label="Sair do painel" className="min-h-11 min-w-11 p-3 text-gold/40 hover:text-gold transition-colors">
            <LogOut size={20} />
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap gap-4 mb-12">
        {[
          { id: 'overview', label: 'Visão geral', icon: Shield },
          { id: 'siteEditor', label: 'Editor do Site', icon: Sparkles },
          { id: 'whatsapp', label: 'WhatsApp', icon: Phone },
          { id: 'registry', label: 'Enxoval', icon: Gift },
          { id: 'purchased', label: 'Comprados', icon: ShoppingBag },
          { id: 'reservations', label: 'Presentes reservados', icon: MessageSquare },
          { id: 'rsvps', label: 'Confirmações', icon: CalendarDays },
          { id: 'guests', label: 'Convidados', icon: Users },
          { id: 'settings', label: 'Configurações', icon: Database },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`flex min-h-11 items-center gap-3 rounded-2xl border px-4 py-3 text-[10px] font-bold uppercase tracking-widest transition-all md:px-8 ${
              activeTab === tab.id ? 'bg-gold text-white border-gold shadow-lg shadow-gold/20' : 'bg-white/50 text-gold/60 border-gold/10 hover:border-gold/30'
            }`}
          >
            <tab.icon size={16} />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="glass-card rounded-[40px] p-8 md:p-12">
        <div className="flex justify-between items-center mb-10">
          <h3 className="text-3xl font-serif">
            {activeTab === 'overview'
              ? 'Visão geral'
              : activeTab === 'siteEditor'
              ? 'Editor Visual Amorei Premium'
              : activeTab === 'whatsapp'
              ? 'WhatsApp do Enxoval'
              : activeTab === 'registry'
              ? 'Lista de presentes'
              : activeTab === 'purchased'
              ? 'Itens adquiridos'
              : activeTab === 'reservations'
              ? 'Presentes reservados'
              : activeTab === 'rsvps'
              ? 'Confirmações do convite'
              : activeTab === 'guests'
              ? 'Lista de convidados'
              : 'Configurações gerais'}
          </h3>
          <div className="flex flex-wrap gap-4 justify-end">
            {activeTab === 'registry' && selectedRegistryIds.length > 0 && (
              <button
                type="button"
                onClick={handleBulkDeleteRegistry}
                className="flex items-center gap-2 px-6 py-3 bg-red-500/90 text-white rounded-xl text-[10px] uppercase tracking-widest font-bold shadow-lg"
              >
                <Trash2 size={16} /> Excluir selecionados ({selectedRegistryIds.length})
              </button>
            )}
            {activeTab !== 'reservations' && activeTab !== 'rsvps' && activeTab !== 'settings' && activeTab !== 'overview' && activeTab !== 'siteEditor' && activeTab !== 'guests' && (
              <button
                onClick={() => { setEditingItem(null); setFormData({}); setIsModalOpen(true); }}
                className="flex items-center gap-2 px-6 py-3 bg-gold text-white rounded-xl text-[10px] uppercase tracking-widest font-bold shadow-lg shadow-gold/20"
              >
                <Plus size={16} /> Adicionar Item
              </button>
            )}
          </div>
        </div>

        <div className="overflow-x-auto">
          {activeTab === 'rsvps' && (
            <div className="grid grid-cols-2 gap-4 mb-8 xl:grid-cols-4">
              {[
                { label: 'Respostas recebidas', value: rsvpSummary.total },
                { label: 'Confirmações positivas', value: rsvpSummary.attendingResponses },
                { label: 'Convidados confirmados', value: rsvpSummary.confirmedGuests },
                { label: 'Não poderão comparecer', value: rsvpSummary.declined },
              ].map((stat) => <div key={stat.label} className="rounded-2xl border border-gold/10 bg-white/50 p-5"><p className="text-[10px] uppercase tracking-widest opacity-50">{stat.label}</p><p className="mt-2 font-serif text-3xl">{stat.value}</p></div>)}
            </div>
          )}
          {activeTab === 'rsvps' && (
            <div className="mb-6 flex flex-col gap-3 sm:flex-row">
              <label className="flex-1 text-sm">
                <span className="sr-only">Buscar confirmação</span>
                <input value={rsvpQuery} onChange={(e) => setRsvpQuery(e.target.value)} placeholder="Buscar por nome ou WhatsApp" className="w-full rounded-2xl border border-gold/10 bg-white/70 px-4 py-3 text-sm outline-none" />
              </label>
              <label className="text-sm">
                <span className="sr-only">Filtrar respostas</span>
                <select value={rsvpFilter} onChange={(e) => setRsvpFilter(e.target.value as 'all' | 'yes' | 'no')} className="min-h-11 w-full rounded-2xl border border-gold/10 bg-white/70 px-4 py-3 text-sm sm:w-auto">
                  <option value="all">Todas</option>
                  <option value="yes">Confirmados</option>
                  <option value="no">Não poderão ir</option>
                </select>
              </label>
            </div>
          )}
          {activeTab === 'rsvps' && rsvps.length === 0 && <p className="mb-8 rounded-2xl bg-white/50 p-6 text-sm opacity-60">Ainda não há respostas. Compartilhe o link /convite com seus convidados.</p>}
          {activeTab === 'rsvps' && rsvps.length > 0 && visibleRsvps.length === 0 && <p className="mb-8 text-sm opacity-60">Nenhuma resposta encontrada com esse filtro.</p>}
          {activeTab === 'registry' && (
            <label className="mb-6 block text-sm">
              <span className="sr-only">Buscar presente</span>
              <input value={registryQuery} onChange={(e) => setRegistryQuery(e.target.value)} placeholder="Buscar presente" className="w-full rounded-2xl border border-gold/10 bg-white/70 px-4 py-3 text-sm outline-none" />
            </label>
          )}
          {activeTab === 'registry' && (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-4 mb-8">
              <div className="rounded-2xl border border-gold/10 bg-white/50 p-5">
                <p className="text-[10px] uppercase tracking-widest opacity-50">Total de Itens</p>
                <p className="text-3xl font-serif mt-2">{registry.length}</p>
              </div>
              <div className="rounded-2xl border border-gold/10 bg-white/50 p-5">
                <p className="text-[10px] uppercase tracking-widest opacity-50">Valor Total</p>
                <p className="text-3xl font-serif mt-2">R$ {registryTotalValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
              </div>
              <div className="rounded-2xl border border-gold/10 bg-white/50 p-5">
                <p className="text-[10px] uppercase tracking-widest opacity-50">Disponíveis</p>
                <p className="text-3xl font-serif mt-2">{registryByStatus.available}</p>
              </div>
              <div className="rounded-2xl border border-gold/10 bg-white/50 p-5">
                <p className="text-[10px] uppercase tracking-widest opacity-50">Reservados</p>
                <p className="text-3xl font-serif mt-2">{registryByStatus.reserved}</p>
              </div>
              <div className="rounded-2xl border border-gold/10 bg-white/50 p-5">
                <p className="text-[10px] uppercase tracking-widest opacity-50">Comprados</p>
                <p className="text-3xl font-serif mt-2">{registryByStatus.bought} <span className="text-sm opacity-60">({boughtProgress}%)</span></p>
              </div>
            </div>
          )}

          {activeTab === 'overview' && (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
              {[
                { label: 'Presentes na lista', value: registry.length },
                { label: 'Ainda disponíveis', value: registryByStatus.available },
                { label: 'Reservados', value: registryByStatus.reserved },
                { label: 'Pessoas confirmadas', value: rsvpSummary.confirmedGuests },
              ].map((stat) => (
                <div key={stat.label} className="rounded-2xl border border-gold/10 bg-white/50 p-5">
                  <p className="text-[10px] uppercase tracking-widest opacity-50">{stat.label}</p>
                  <p className="mt-2 font-serif text-3xl">{stat.value}</p>
                </div>
              ))}
              <p className="sm:col-span-2 xl:col-span-4 text-sm leading-relaxed opacity-70">
                O convite público fica em /convite. Reservas de presentes não significam pagamento confirmado: o PIX continua sendo um aviso enviado pelos convidados.
              </p>
            </div>
          )}

          {activeTab === 'settings' ? (
            <div className="max-w-3xl">
              <div className="flex flex-wrap gap-3 mb-8">
                {[
                  { id: 'account', label: 'Conta Admin' },
                  { id: 'general', label: 'Geral / PIX' },
                  { id: 'invite', label: 'Convite' },
                  { id: 'whatsapp', label: 'Mensagens / Reservas' },
                  { id: 'backup', label: 'Backup' },
                ].map((tab) => (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setSettingsTab(tab.id as 'account' | 'general' | 'invite' | 'whatsapp' | 'backup')}
                    className={`px-5 py-3 rounded-xl text-[10px] uppercase tracking-widest font-bold border transition-all ${
                      settingsTab === tab.id
                        ? 'bg-gold text-white border-gold'
                        : 'bg-white/50 text-gold/70 border-gold/10 hover:border-gold/30'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              {settingsTab === 'account' && (
                <form onSubmit={handleSaveAdminProfile} className="space-y-4 p-6 rounded-2xl border border-gold/10 bg-white/40">
                  <h4 className="text-2xl font-serif">Conta do Administrador</h4>
                  <div className="space-y-2">
                    <label className="text-[10px] uppercase tracking-widest font-bold opacity-60 ml-4">Novo E-mail</label>
                    <input type="email" required value={adminProfile.email} onChange={e => setAdminProfile({ ...adminProfile, email: e.target.value })} className="w-full px-6 py-4 bg-white/50 border border-gold/10 rounded-2xl focus:border-gold outline-none text-sm" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] uppercase tracking-widest font-bold opacity-60 ml-4">Senha Atual</label>
                    <input type="password" required value={adminProfile.currentPassword} onChange={e => setAdminProfile({ ...adminProfile, currentPassword: e.target.value })} className="w-full px-6 py-4 bg-white/50 border border-gold/10 rounded-2xl focus:border-gold outline-none text-sm" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] uppercase tracking-widest font-bold opacity-60 ml-4">Nova Senha (opcional)</label>
                    <input type="password" value={adminProfile.newPassword} onChange={e => setAdminProfile({ ...adminProfile, newPassword: e.target.value })} className="w-full px-6 py-4 bg-white/50 border border-gold/10 rounded-2xl focus:border-gold outline-none text-sm" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] uppercase tracking-widest font-bold opacity-60 ml-4">Confirmar Nova Senha</label>
                    <input type="password" value={adminProfile.confirmPassword} onChange={e => setAdminProfile({ ...adminProfile, confirmPassword: e.target.value })} className="w-full px-6 py-4 bg-white/50 border border-gold/10 rounded-2xl focus:border-gold outline-none text-sm" />
                  </div>
                  <button type="submit" className="px-8 py-3 bg-ink text-white rounded-xl text-[10px] uppercase tracking-widest font-bold">
                    Atualizar Login do Administrador
                  </button>
                </form>
              )}

              {settingsTab === 'general' && (
                <form onSubmit={handleSavePix} className="space-y-6">
                  <div className="space-y-2">
                    <label className="text-[10px] uppercase tracking-widest font-bold opacity-60 ml-4">Chave PIX</label>
                    <input type="text" value={pixSettings.pixKey || ''} onChange={e => setPixSettings({ ...pixSettings, pixKey: e.target.value })} placeholder="E-mail, CPF, Celular ou Chave Aleatória" className="w-full px-6 py-4 bg-white/50 border border-gold/10 rounded-2xl focus:border-gold outline-none text-sm" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] uppercase tracking-widest font-bold opacity-60 ml-4">Nome do Titular</label>
                    <input type="text" value={pixSettings.pixName || ''} onChange={e => setPixSettings({ ...pixSettings, pixName: e.target.value })} placeholder="Nome completo do titular da conta" className="w-full px-6 py-4 bg-white/50 border border-gold/10 rounded-2xl focus:border-gold outline-none text-sm" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] uppercase tracking-widest font-bold opacity-60 ml-4">Nomes do casal (site e mensagens)</label>
                    <input type="text" value={pixSettings.coupleNames || ''} onChange={e => setPixSettings({ ...pixSettings, coupleNames: e.target.value })} placeholder="Ex.: Tais & Yran" className="w-full px-6 py-4 bg-white/50 border border-gold/10 rounded-2xl focus:border-gold outline-none text-sm" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] uppercase tracking-widest font-bold opacity-60 ml-4">Data do Casamento</label>
                    <input type="date" required value={pixSettings.weddingDate || ''} onChange={e => setPixSettings({ ...pixSettings, weddingDate: e.target.value })} className="w-full px-6 py-4 bg-white/50 border border-gold/10 rounded-2xl focus:border-gold outline-none text-sm" />
                  </div>
                  <div className="grid gap-5 md:grid-cols-2">
                    <div className="space-y-2">
                      <label className="text-[10px] uppercase tracking-widest font-bold opacity-60 ml-4">Horário da cerimônia</label>
                      <input type="time" value={pixSettings.ceremonyTime || '16:00'} onChange={e => setPixSettings({ ...pixSettings, ceremonyTime: e.target.value })} className="w-full px-6 py-4 bg-white/50 border border-gold/10 rounded-2xl outline-none text-sm" />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] uppercase tracking-widest font-bold opacity-60 ml-4">Traje sugerido</label>
                      <input type="text" maxLength={120} value={pixSettings.dressCode || ''} onChange={e => setPixSettings({ ...pixSettings, dressCode: e.target.value })} placeholder="Ex.: esporte fino" className="w-full px-6 py-4 bg-white/50 border border-gold/10 rounded-2xl outline-none text-sm" />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] uppercase tracking-widest font-bold opacity-60 ml-4">Local da cerimônia</label>
                    <input type="text" maxLength={180} value={pixSettings.ceremonyVenue || ''} onChange={e => setPixSettings({ ...pixSettings, ceremonyVenue: e.target.value })} placeholder="Nome da igreja ou espaço" className="w-full px-6 py-4 bg-white/50 border border-gold/10 rounded-2xl outline-none text-sm" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] uppercase tracking-widest font-bold opacity-60 ml-4">Endereço da cerimônia</label>
                    <input type="text" maxLength={300} value={pixSettings.ceremonyAddress || ''} onChange={e => setPixSettings({ ...pixSettings, ceremonyAddress: e.target.value })} placeholder="Rua, número, cidade" className="w-full px-6 py-4 bg-white/50 border border-gold/10 rounded-2xl outline-none text-sm" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] uppercase tracking-widest font-bold opacity-60 ml-4">Local da recepção</label>
                    <input type="text" maxLength={180} value={pixSettings.receptionVenue || ''} onChange={e => setPixSettings({ ...pixSettings, receptionVenue: e.target.value })} placeholder="Salão, sítio ou restaurante" className="w-full px-6 py-4 bg-white/50 border border-gold/10 rounded-2xl outline-none text-sm" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] uppercase tracking-widest font-bold opacity-60 ml-4">Endereço da recepção</label>
                    <input type="text" maxLength={300} value={pixSettings.receptionAddress || ''} onChange={e => setPixSettings({ ...pixSettings, receptionAddress: e.target.value })} placeholder="Rua, número, cidade" className="w-full px-6 py-4 bg-white/50 border border-gold/10 rounded-2xl outline-none text-sm" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] uppercase tracking-widest font-bold opacity-60 ml-4">Confirmar presença até</label>
                    <input type="date" value={pixSettings.rsvpDeadline || ''} onChange={e => setPixSettings({ ...pixSettings, rsvpDeadline: e.target.value })} className="w-full px-6 py-4 bg-white/50 border border-gold/10 rounded-2xl outline-none text-sm" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] uppercase tracking-widest font-bold opacity-60 ml-4">Mensagem do convite</label>
                    <textarea rows={4} maxLength={1200} value={pixSettings.invitationMessage || ''} onChange={e => setPixSettings({ ...pixSettings, invitationMessage: e.target.value })} placeholder="Uma mensagem carinhosa para os convidados" className="w-full px-6 py-4 bg-white/50 border border-gold/10 rounded-2xl outline-none text-sm resize-y" />
                  </div>
                  <div className="space-y-2">
                    <label htmlFor="couple-story" className="text-[10px] uppercase tracking-widest font-bold opacity-60 ml-4">História do casal (opcional)</label>
                    <textarea id="couple-story" rows={4} maxLength={2000} value={pixSettings.coupleStory || ''} onChange={e => setPixSettings({ ...pixSettings, coupleStory: e.target.value })} placeholder="Um texto curto. Deixe em branco para não aparecer no convite." className="w-full px-6 py-4 bg-white/50 border border-gold/10 rounded-2xl outline-none text-sm resize-y" />
                  </div>
                  <div className="space-y-3 rounded-2xl border border-gold/10 bg-white/40 p-5">
                    <h4 className="font-serif text-2xl">Música</h4>
                    <p className="text-sm leading-relaxed opacity-70">
                      O site já toca uma música padrão. Envie um MP3, WAV, M4A, OGG ou WEBM de até 12 MB para usar a faixa do casal.
                    </p>
                    <p className="text-xs uppercase tracking-widest opacity-60">{musicCustom ? 'Música personalizada' : 'Música padrão'}</p>
                    <audio key={musicVersion} controls preload="none" src={`/api/music?v=${musicVersion}`} className="w-full" />
                    <label htmlFor="wedding-music" className="block text-[10px] uppercase tracking-widest font-bold opacity-60">Arquivo de áudio</label>
                    <input
                      id="wedding-music"
                      type="file"
                      accept="audio/mpeg,audio/wav,audio/mp4,audio/ogg,audio/webm,audio/aac,.mp3,.wav,.m4a,.ogg,.webm"
                      onChange={(e) => setMusicFile(e.target.files?.[0] ?? null)}
                      className="block w-full text-sm"
                    />
                    <div className="flex flex-wrap gap-3">
                      <button
                        type="button"
                        disabled={!musicFile || musicBusy}
                        onClick={() => {
                          if (!musicFile) return;
                          setMusicBusy(true);
                          api.uploadMusic(musicFile)
                            .then(() => {
                              setMusicCustom(true);
                              setMusicFile(null);
                              setMusicVersion((value) => value + 1);
                              showNotice('success', 'Música atualizada.');
                            })
                            .catch((error: unknown) => showNotice('error', error instanceof Error ? error.message : 'Falha ao enviar a música.'))
                            .finally(() => setMusicBusy(false));
                        }}
                        className="min-h-11 rounded-xl bg-ink px-6 py-3 text-[10px] font-bold uppercase tracking-widest text-white disabled:opacity-50"
                      >
                        {musicBusy ? 'Enviando…' : 'Enviar música'}
                      </button>
                      {musicCustom && (
                        <button
                          type="button"
                          disabled={musicBusy}
                          onClick={() => {
                            setMusicBusy(true);
                            api.delete('/music')
                              .then(() => {
                                setMusicCustom(false);
                                setMusicVersion((value) => value + 1);
                                showNotice('success', 'Voltou a tocar a música padrão.');
                              })
                              .catch((error: unknown) => showNotice('error', error instanceof Error ? error.message : 'Falha ao remover a música.'))
                              .finally(() => setMusicBusy(false));
                          }}
                          className="min-h-11 rounded-xl border border-gold/20 px-6 py-3 text-[10px] font-bold uppercase tracking-widest"
                        >
                          Usar música padrão
                        </button>
                      )}
                    </div>
                  </div>
                  <p className="rounded-2xl border border-gold/10 bg-gold/5 p-4 text-xs leading-relaxed opacity-70">O convite ficará disponível em <strong>/convite</strong>. Preencha os locais e endereços para habilitar os links do mapa. A história só aparece se este campo tiver texto.</p>
                  <button type="submit" className="px-10 py-4 bg-gold text-white rounded-2xl text-[10px] uppercase tracking-widest font-bold shadow-lg shadow-gold/20 flex items-center gap-2">
                    <Save size={16} /> Salvar Configurações Gerais
                  </button>
                </form>
              )}

              {settingsTab === 'invite' && (
                <AdminVisualEditor settings={pixSettings} onChange={setPixSettings} onSave={handleSavePix} />
              )}

              {settingsTab === 'whatsapp' && (
                <form onSubmit={handleSavePix} className="space-y-6">
                  {/* Status do Módulo Zapo */}
                  <div className="rounded-2xl border border-emerald-500/20 bg-emerald-50/50 p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="inline-block w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                        <h4 className="text-sm font-bold text-emerald-950 uppercase tracking-wider">Módulo Nativo Zapo Ativo</h4>
                      </div>
                      <p className="text-xs text-emerald-800 leading-relaxed">
                        Os envios de convites e avisos de presentes usam a conexão direta do WhatsApp com fila inteligente, sem necessidade do Whaticket.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setActiveTab('whatsapp')}
                      className="shrink-0 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-[10px] uppercase font-bold tracking-widest shadow transition-all"
                    >
                      Ver Conexão / QR Code
                    </button>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] uppercase tracking-widest font-bold opacity-60 ml-4">WhatsApp dos Noivos (Para Receber Avisos)</label>
                    <input
                      type="text"
                      value={pixSettings.whatsappNumber || ''}
                      onChange={e => setPixSettings({ ...pixSettings, whatsappNumber: e.target.value.replace(/\D/g, '') })}
                      placeholder="Ex.: 5534999122805 (com DDI e DDD)"
                      className="w-full px-6 py-4 bg-white/50 border border-gold/10 rounded-2xl focus:border-gold outline-none text-sm"
                    />
                    <p className="text-[10px] opacity-50 ml-4 leading-relaxed">
                      Número que receberá uma notificação no WhatsApp sempre que um convidado reservar um presente no site.
                    </p>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] uppercase tracking-widest font-bold opacity-60 ml-4">Mensagem de Aviso aos Noivos (Nova Reserva)</label>
                    <textarea
                      rows={6}
                      value={pixSettings.whaticketTemplate || ''}
                      onChange={e => setPixSettings({ ...pixSettings, whaticketTemplate: e.target.value })}
                      placeholder={defaultReservationTemplate}
                      className="w-full px-6 py-4 bg-white/50 border border-gold/10 rounded-2xl focus:border-gold outline-none text-sm resize-none"
                    />
                    <p className="text-[10px] opacity-50 ml-4 leading-relaxed">
                      Variáveis disponíveis: {'{item}'} {'{nome}'} {'{whatsapp}'} {'{mensagem}'} {'{pixKey}'} {'{pixName}'} {'{couple}'}
                    </p>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] uppercase tracking-widest font-bold opacity-60 ml-4">Mensagem Automática para o Convidado (Confirmação da Reserva)</label>
                    <textarea
                      rows={6}
                      value={pixSettings.guestReplyTemplate || ''}
                      onChange={e => setPixSettings({ ...pixSettings, guestReplyTemplate: e.target.value })}
                      placeholder={defaultGuestReplyTemplate}
                      className="w-full px-6 py-4 bg-white/50 border border-gold/10 rounded-2xl focus:border-gold outline-none text-sm resize-none"
                    />
                    <p className="text-[10px] opacity-50 ml-4 leading-relaxed">
                      Enviada ao convidado após a reserva com opções de entrega física ou PIX.
                    </p>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] uppercase tracking-widest font-bold opacity-60 ml-4">Mensagem Separada com a Chave PIX (Fácil Copiar e Colar)</label>
                    <textarea
                      rows={4}
                      value={pixSettings.guestPixTemplate || ''}
                      onChange={e => setPixSettings({ ...pixSettings, guestPixTemplate: e.target.value })}
                      placeholder={defaultGuestPixTemplate}
                      className="w-full px-6 py-4 bg-white/50 border border-gold/10 rounded-2xl focus:border-gold outline-none text-sm resize-none"
                    />
                    <p className="text-[10px] opacity-50 ml-4 leading-relaxed">
                      Dica: mantenha apenas a chave e o titular para que o convidado possa copiar e colar rapidamente no banco.
                    </p>
                  </div>

                  {/* Configurações Legadas / Avançadas do Whaticket */}
                  <details className="rounded-2xl border border-gold/15 bg-white/30 p-4 text-xs group">
                    <summary className="cursor-pointer font-bold uppercase tracking-wider text-gold/70 select-none flex items-center justify-between">
                      <span>Configurações Legadas / Provedor Externo (Whaticket)</span>
                      <span className="text-[10px] font-normal opacity-60 group-open:hidden">Clique para expandir</span>
                    </summary>
                    <div className="mt-4 space-y-4 pt-3 border-t border-gold/10">
                      <p className="text-[11px] opacity-70">
                        O sistema utiliza nativamente o Zapo. Estes campos são preservados apenas para compatibilidade caso queira enviar via Whaticket externo.
                      </p>
                      <div className="space-y-1">
                        <label className="text-[10px] uppercase tracking-widest font-bold opacity-60 ml-2">URL da API Whaticket</label>
                        <input
                          type="url"
                          value={pixSettings.whaticketApiUrl || ''}
                          onChange={e => setPixSettings({ ...pixSettings, whaticketApiUrl: e.target.value })}
                          placeholder="https://zapoapi.multivus.com.br/api/messages/send"
                          className="w-full px-4 py-3 bg-white/60 border border-gold/10 rounded-xl text-xs"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] uppercase tracking-widest font-bold opacity-60 ml-2">Chave / Token da API Whaticket</label>
                        <input
                          type="password"
                          value={pixSettings.whaticketToken || ''}
                          onChange={e => setPixSettings({ ...pixSettings, whaticketToken: e.target.value })}
                          placeholder="Token da API Whaticket"
                          className="w-full px-4 py-3 bg-white/60 border border-gold/10 rounded-xl text-xs"
                        />
                      </div>
                    </div>
                  </details>

                  <div className="flex flex-wrap gap-3 pt-2">
                    <button type="submit" className="px-10 py-4 bg-gold text-white rounded-2xl text-[10px] uppercase tracking-widest font-bold shadow-lg shadow-gold/20 flex items-center gap-2">
                      <Save size={16} /> Salvar Mensagens
                    </button>
                    <button type="button" onClick={handleTestWhatsApp} className="px-10 py-4 bg-ink text-white rounded-2xl text-[10px] uppercase tracking-widest font-bold shadow-lg">
                      Testar WhatsApp
                    </button>
                  </div>
                </form>
              )}

              {settingsTab === 'backup' && (
                <div className="space-y-6">
                  <div className="p-6 rounded-2xl border border-gold/10 bg-white/40">
                    <h4 className="text-2xl font-serif mb-2">Exportar Backup</h4>
                    <p className="text-sm opacity-70 mb-4">
                      Baixa um arquivo JSON no seu computador e grava uma cópia na pasta <code className="text-xs bg-black/5 px-1 rounded">backups/</code> do projeto no servidor (Docker: volume mapeado no host).
                    </p>
                    <button
                      type="button"
                      onClick={handleExportBackup}
                      className="px-8 py-3 bg-ink text-white rounded-xl text-[10px] uppercase tracking-widest font-bold inline-flex items-center gap-2"
                    >
                      <Download size={14} /> Exportar Backup
                    </button>
                  </div>

                  <div className="p-6 rounded-2xl border border-red-300/30 bg-red-50/40">
                    <h4 className="text-2xl font-serif mb-2">Importar Backup</h4>
                    <p className="text-sm opacity-70 mb-4">
                      Importa um backup completo e substitui todos os dados atuais do sistema.
                    </p>
                    <input
                      type="file"
                      accept=".json,application/json"
                      onChange={(e) => setBackupFile(e.target.files?.[0] || null)}
                      className="block w-full text-sm mb-4"
                    />
                    <button
                      type="button"
                      onClick={handleImportBackup}
                      className="px-8 py-3 bg-red-500 text-white rounded-xl text-[10px] uppercase tracking-widest font-bold inline-flex items-center gap-2 disabled:opacity-50"
                      disabled={!backupFile}
                    >
                      <Upload size={14} /> Importar Backup
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : activeTab === 'overview' ? null : activeTab === 'siteEditor' ? (
            <AdminVisualEditor
              settings={pixSettings}
              onChange={setPixSettings}
              onSave={handleSavePix}
            />
          ) : activeTab === 'whatsapp' ? (
            <AdminWhatsAppZapo />
          ) : activeTab === 'guests' ? (
            <AdminGuests
              onNotice={showNotice}
              coupleNames={pixSettings.coupleNames || 'Tais & Yran'}
              weddingDate={pixSettings.weddingDate}
              ceremonyTime={pixSettings.ceremonyTime || '16:00'}
              ceremonyVenue={pixSettings.ceremonyVenue || ''}
              theme={pixSettings.inviteTheme || 'classico'}
            />
          ) : (
            <>
            {activeTab === 'rsvps' && (
              <div className="mb-6 space-y-3 md:hidden">
                {visibleRsvps.map((rsvp) => (
                  <article key={rsvp.id} className="rounded-2xl border border-gold/10 bg-white/70 p-4">
                    <h4 className="font-serif text-xl">{rsvp.name}</h4>
                    {rsvp.guest?.name && <p className="text-xs uppercase tracking-widest opacity-60">Convite de {rsvp.guest.name}</p>}
                    <p className="mt-1 text-sm">{rsvp.attending ? `Confirmado · ${rsvp.guests} ${rsvp.guests === 1 ? 'pessoa' : 'pessoas'}` : 'Não poderá comparecer'}</p>
                    <a href={whatsappChatUrl(String(rsvp.whatsapp))} target="_blank" rel="noreferrer" className="mt-2 inline-flex min-h-11 items-center text-sm text-green-800 underline">{rsvp.whatsapp}</a>
                    {rsvp.message && <p className="mt-2 text-sm opacity-70">{rsvp.message}</p>}
                    <p className="mt-2 text-xs opacity-50">{new Date(rsvp.createdAt).toLocaleString('pt-BR')}</p>
                    <button type="button" onClick={() => handleDelete(rsvp.id, '/rsvps')} className="mt-3 min-h-11 text-sm text-red-700">Apagar resposta</button>
                  </article>
                ))}
              </div>
            )}
            <table className={`w-full border-collapse text-left ${activeTab === 'rsvps' ? 'hidden md:table' : ''}`}>
            <thead>
              {activeTab === 'rsvps' ? (
                <tr className="border-b border-gold/10">
                  <th className="pb-6 text-[10px] uppercase tracking-widest font-bold opacity-40">Convidado</th>
                  <th className="pb-6 text-[10px] uppercase tracking-widest font-bold opacity-40">WhatsApp</th>
                  <th className="pb-6 text-[10px] uppercase tracking-widest font-bold opacity-40">Resposta</th>
                  <th className="pb-6 text-[10px] uppercase tracking-widest font-bold opacity-40">Pessoas</th>
                  <th className="pb-6 text-[10px] uppercase tracking-widest font-bold opacity-40">Recebida em</th>
                  <th className="pb-6 text-[10px] uppercase tracking-widest font-bold opacity-40">Ações</th>
                </tr>
              ) : (
              <tr className="border-b border-gold/10">
                {activeTab === 'registry' && (
                  <th className="pb-6 w-10 pr-2 align-bottom">
                    <input
                      ref={registryHeaderCheckboxRef}
                      type="checkbox"
                      checked={visibleRegistry.length > 0 && selectedRegistryIds.length === visibleRegistry.length}
                      onChange={toggleSelectAllRegistry}
                      className="h-4 w-4 rounded border-gold/30 text-gold focus:ring-gold"
                      title="Selecionar todos"
                      aria-label="Selecionar todos os itens do enxoval"
                    />
                  </th>
                )}
                <th className="pb-6 text-[10px] uppercase tracking-widest font-bold opacity-40">Nome</th>
                <th className="pb-6 text-[10px] uppercase tracking-widest font-bold opacity-40">
                  {activeTab === 'reservations' ? 'Convidado' : 'Valor'}
                </th>
                <th className="pb-6 text-[10px] uppercase tracking-widest font-bold opacity-40">
                  {activeTab === 'reservations' ? 'WhatsApp' : activeTab === 'registry' ? 'Status' : 'Categoria'}
                </th>
                <th className="pb-6 text-[10px] uppercase tracking-widest font-bold opacity-40 text-right">Ações</th>
              </tr>
              )}
            </thead>
            <tbody className="divide-y divide-gold/5">
              {activeTab === 'registry' && visibleRegistry.map(item => (
                <tr key={item.id} className="group hover:bg-gold/5 transition-colors">
                  <td className="py-6 pr-2 w-10 align-middle">
                    <input
                      type="checkbox"
                      checked={selectedRegistryIds.includes(item.id)}
                      onChange={() => toggleRegistrySelect(item.id)}
                      className="h-4 w-4 rounded border-gold/30 text-gold focus:ring-gold"
                      aria-label={`Selecionar ${item.nome}`}
                    />
                  </td>
                  <td className="py-6 pr-4">
                    <div className="font-serif text-xl">{item.nome}</div>
                    <div className="text-[10px] uppercase tracking-widest opacity-40">{item.prioridade} Prioridade</div>
                  </td>
                  <td className="py-6 pr-4 font-serif text-gold">R$ {item.valor.toLocaleString('pt-BR')}</td>
                  <td className="py-6 pr-4">
                    <span className={`px-3 py-1 rounded-full text-[8px] uppercase tracking-widest font-bold ${
                      item.status === 'Disponível' ? 'bg-gold/10 text-gold' : 
                      item.status === 'Reservado' ? 'bg-blue-500/10 text-blue-500' : 'bg-green-500/10 text-green-500'
                    }`}>
                      {item.status}
                    </span>
                  </td>
                  <td className="py-6 text-right">
                    <div className="flex justify-end gap-2">
                      <button onClick={() => { setEditingItem(item); setFormData(item); setIsModalOpen(true); }} className="p-2 text-gold/40 hover:text-gold transition-colors"><Edit2 size={16} /></button>
                      <button onClick={() => handleDelete(item.id, '/registry')} className="p-2 text-red-400/40 hover:text-red-400 transition-colors"><Trash2 size={16} /></button>
                    </div>
                  </td>
                </tr>
              ))}

              {activeTab === 'purchased' && purchased.map(item => (
                <tr key={item.id} className="group hover:bg-gold/5 transition-colors">
                  <td className="py-6 pr-4">
                    <div className="font-serif text-xl">{item.nome}</div>
                    <div className="text-[10px] uppercase tracking-widest opacity-40">{new Date(item.dataCompra).toLocaleDateString()}</div>
                  </td>
                  <td className="py-6 pr-4 font-serif text-gold">R$ {item.valor.toLocaleString('pt-BR')}</td>
                  <td className="py-6 pr-4 text-[10px] uppercase tracking-widest font-bold opacity-60">{item.categoria}</td>
                  <td className="py-6 text-right">
                    <div className="flex justify-end gap-2">
                      <button onClick={() => { setEditingItem(item); setFormData(item); setIsModalOpen(true); }} className="p-2 text-gold/40 hover:text-gold transition-colors"><Edit2 size={16} /></button>
                      <button onClick={() => handleDelete(item.id, '/purchased')} className="p-2 text-red-400/40 hover:text-red-400 transition-colors"><Trash2 size={16} /></button>
                    </div>
                  </td>
                </tr>
              ))}

              {activeTab === 'rsvps' && visibleRsvps.map(rsvp => (
                <tr key={rsvp.id} className="hover:bg-gold/5 transition-colors">
                  <td className="py-5 pr-4">
                    <div className="font-serif text-lg">{rsvp.name}</div>
                    {rsvp.guest?.name && <div className="text-[10px] uppercase tracking-widest opacity-50">Convite de {rsvp.guest.name}</div>}
                    {rsvp.message && <div className="mt-1 max-w-xs text-xs opacity-60">{rsvp.message}</div>}
                  </td>
                  <td className="py-5 pr-4">
                    <a href={whatsappChatUrl(String(rsvp.whatsapp))} target="_blank" rel="noreferrer" className="text-green-800 hover:underline text-xs">{rsvp.whatsapp}</a>
                  </td>
                  <td className="py-5 pr-4">
                    <span className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-[10px] font-bold ${rsvp.attending ? 'bg-green-100 text-green-800' : 'bg-amber-100 text-amber-800'}`}>
                      <CheckCircle2 size={13} /> {rsvp.attending ? 'Confirmado' : 'Não poderá ir'}
                    </span>
                  </td>
                  <td className="py-5 pr-4 text-sm">{rsvp.attending ? rsvp.guests : '—'}</td>
                  <td className="py-5 pr-4 text-xs opacity-60">{new Date(rsvp.createdAt).toLocaleString('pt-BR')}</td>
                  <td className="py-5 text-right">
                    <button type="button" onClick={() => handleDelete(rsvp.id, '/rsvps')} aria-label={`Apagar resposta de ${rsvp.name}`} className="min-h-11 min-w-11 p-2 text-red-700"><Trash2 size={16} /></button>
                  </td>
                </tr>
              ))}

              {activeTab === 'reservations' && reservations.map(res => {
                return (
                  <tr key={res.id} className="group hover:bg-gold/5 transition-colors">
                    <td className="py-6 pr-4">
                      <div className="font-serif text-xl">{res.enxovalItem?.nome || 'Item excluído'}</div>
                      <div className="text-[10px] uppercase tracking-widest opacity-40">{new Date(res.dataReserva).toLocaleString()}</div>
                    </td>
                    <td className="py-6 pr-4 font-medium">{res.nome}</td>
                    <td className="py-6 pr-4">
                      <a href={whatsappChatUrl(String(res.whatsapp))} target="_blank" rel="noreferrer" className="flex items-center gap-2 text-green-800 hover:underline text-xs">
                        <Phone size={12} /> {res.whatsapp}
                      </a>
                    </td>
                    <td className="py-6 text-right">
                      <button onClick={() => handleDelete(res.id, '/reservations')} className="p-2 text-red-400/40 hover:text-red-400 transition-colors"><Trash2 size={16} /></button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
            </>
          )}
        </div>
      </div>

      {/* Form Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsModalOpen(false)} className="absolute inset-0 bg-ink/40 backdrop-blur-sm" />
            <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }} className="relative max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-[40px] border border-gold/20 bg-beige p-6 shadow-2xl sm:p-12">
              <button onClick={() => setIsModalOpen(false)} className="absolute top-8 right-8 text-gold/40 hover:text-gold"><X size={24} /></button>
              <h3 className="text-4xl font-serif mb-10">{editingItem ? 'Editar' : 'Adicionar'} {activeTab === 'purchased' ? 'Produto' : 'Item'}</h3>
              
              <form onSubmit={handleSave} className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="md:col-span-2 space-y-2">
                  <label className="text-[10px] uppercase tracking-widest font-bold opacity-60 ml-4">Nome</label>
                  <input required type="text" value={formData.nome || ''} onChange={e => setFormData({...formData, nome: e.target.value})} className="w-full px-6 py-4 bg-white/50 border border-gold/10 rounded-2xl focus:border-gold outline-none text-sm" />
                </div>

                {activeTab === 'purchased' ? (
                  <>
                    <div className="space-y-2">
                      <label className="text-[10px] uppercase tracking-widest font-bold opacity-60 ml-4">Categoria</label>
                      <input required type="text" value={formData.categoria || ''} onChange={e => setFormData({...formData, categoria: e.target.value})} className="w-full px-6 py-4 bg-white/50 border border-gold/10 rounded-2xl focus:border-gold outline-none text-sm" />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] uppercase tracking-widest font-bold opacity-60 ml-4">Data da Compra</label>
                      <input required type="date" value={formData.dataCompra ? new Date(formData.dataCompra).toISOString().split('T')[0] : ''} onChange={e => setFormData({...formData, dataCompra: e.target.value})} className="w-full px-6 py-4 bg-white/50 border border-gold/10 rounded-2xl focus:border-gold outline-none text-sm" />
                    </div>
                  </>
                ) : (
                  <>
                    <div className="space-y-2">
                      <label className="text-[10px] uppercase tracking-widest font-bold opacity-60 ml-4">Prioridade</label>
                      <select required value={formData.prioridade || 'Média'} onChange={e => setFormData({...formData, prioridade: e.target.value})} className="w-full px-6 py-4 bg-white/50 border border-gold/10 rounded-2xl focus:border-gold outline-none text-sm appearance-none">
                        <option value="Alta">Alta</option>
                        <option value="Média">Média</option>
                        <option value="Baixa">Baixa</option>
                      </select>
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] uppercase tracking-widest font-bold opacity-60 ml-4">Status</label>
                      <select required value={formData.status || 'Disponível'} onChange={e => setFormData({...formData, status: e.target.value})} className="w-full px-6 py-4 bg-white/50 border border-gold/10 rounded-2xl focus:border-gold outline-none text-sm appearance-none">
                        <option value="Disponível">Disponível</option>
                        <option value="Reservado">Reservado</option>
                        <option value="Comprado">Comprado</option>
                      </select>
                    </div>
                  </>
                )}

                <div className="space-y-2">
                  <label className="text-[10px] uppercase tracking-widest font-bold opacity-60 ml-4">Valor (R$)</label>
                  <input required type="number" step="0.01" value={formData.valor || ''} onChange={e => setFormData({...formData, valor: parseFloat(e.target.value)})} className="w-full px-6 py-4 bg-white/50 border border-gold/10 rounded-2xl focus:border-gold outline-none text-sm" />
                </div>

                {activeTab === 'registry' && (
                  <div className="md:col-span-2 space-y-2">
                    <label className="text-[10px] uppercase tracking-widest font-bold opacity-60 ml-4">Descrição</label>
                    <textarea value={formData.descricao || ''} onChange={e => setFormData({...formData, descricao: e.target.value})} rows={3} className="w-full px-6 py-4 bg-white/50 border border-gold/10 rounded-2xl focus:border-gold outline-none text-sm resize-none" />
                  </div>
                )}

                <div className="md:col-span-2 pt-6">
                  <button type="submit" className="w-full py-5 bg-gold text-white rounded-2xl text-sm uppercase tracking-widest font-bold shadow-xl shadow-gold/20 flex items-center justify-center gap-3">
                    <Save size={18} /> Salvar Alterações
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {confirmDialog && (
          <div className="fixed inset-0 z-[130] flex items-center justify-center p-6">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-ink/40 backdrop-blur-sm"
              onClick={() => setConfirmDialog(null)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="relative w-full max-w-md bg-beige border border-gold/20 rounded-[28px] shadow-2xl p-8"
            >
              <h4 className="text-2xl font-serif mb-3">{confirmDialog.title}</h4>
              <p className="text-sm opacity-70 leading-relaxed mb-8">{confirmDialog.message}</p>
              <div className="flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setConfirmDialog(null)}
                  className="px-5 py-3 rounded-xl border border-gold/20 text-xs uppercase tracking-widest font-bold text-gold/70 hover:text-gold hover:border-gold/40 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={async () => {
                    const action = confirmDialog.onConfirm;
                    setConfirmDialog(null);
                    await action();
                  }}
                  className={`px-5 py-3 rounded-xl text-xs uppercase tracking-widest font-bold text-white transition-colors ${
                    confirmDialog.tone === 'danger'
                      ? 'bg-red-500 hover:bg-red-600'
                      : 'bg-gold hover:bg-gold/90'
                  }`}
                >
                  {confirmDialog.confirmLabel || 'Confirmar'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
