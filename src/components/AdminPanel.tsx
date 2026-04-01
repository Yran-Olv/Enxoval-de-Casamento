import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { api } from '../api';
import { ProdutoComprado, EnxovalItem, SettingsData } from '../types';
import { Plus, Edit2, Trash2, LogIn, LogOut, Shield, ShoppingBag, Gift, MessageSquare, X, Save, Phone, Database, Eye, EyeOff, Download, Upload } from 'lucide-react';

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
  const [activeTab, setActiveTab] = useState<'purchased' | 'registry' | 'reservations' | 'settings'>('registry');

  // Data states
  const [purchased, setPurchased] = useState<ProdutoComprado[]>([]);
  const [registry, setRegistry] = useState<EnxovalItem[]>([]);
  const [reservations, setReservations] = useState<any[]>([]);
  const defaultReservationTemplate =
    '🎁 Nova reserva no site ({couple})\n\n' +
    'Presente: {item}\n' +
    'Convidado(a): {nome}\n' +
    'WhatsApp: {whatsapp}\n' +
    'Recado: {mensagem}\n\n' +
    'Opções de presente: podem comprar o item por conta própria e entregar aos noivos, ou enviar o valor via PIX:\n' +
    'Chave PIX: {pixKey}\n' +
    'Titular: {pixName}';

  const [pixSettings, setPixSettings] = useState<SettingsData>({
    pixKey: '',
    pixName: '',
    coupleNames: 'Tais & Yran',
    weddingDate: '2027-02-02',
    whaticketApiUrl: 'https://api.whaticketup.com.br/api/messages/send',
    whaticketTemplate: defaultReservationTemplate,
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
  const [settingsTab, setSettingsTab] = useState<'account' | 'general' | 'whatsapp' | 'backup'>('general');
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
      const [reg, pur, res, set] = await Promise.all([
        api.get('/registry'),
        api.get('/purchased'),
        api.get('/reservations'),
        api.get('/settings/admin')
      ]);
      setRegistry(reg);
      setPurchased(pur);
      setReservations(res);
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
    if (registry.length === 0) return;
    if (selectedRegistryIds.length === registry.length) {
      setSelectedRegistryIds([]);
    } else {
      setSelectedRegistryIds(registry.map((r) => r.id));
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
      message: 'Isso substituirá todos os dados atuais (enxoval, reservas, comprados, configurações e usuários). Deseja continuar?',
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

  if (loading) return <div className="min-h-screen flex items-center justify-center text-gold font-serif text-2xl animate-pulse">Verificando Acesso...</div>;

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center px-6">
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="glass-card p-12 rounded-[40px] text-center max-w-md w-full"
        >
          <div className="w-20 h-20 bg-gold/10 text-gold rounded-full flex items-center justify-center mx-auto mb-8">
            <Shield size={40} />
          </div>
          <h2 className="text-4xl font-serif mb-4">Acesso Restrito</h2>
          <p className="text-sm opacity-60 mb-10">Este painel é exclusivo para os noivos Tais & Yran.</p>
          
          <form onSubmit={handleLogin} className="space-y-4 text-left">
            <div className="space-y-2">
              <label className="text-[10px] uppercase tracking-widest font-bold opacity-60 ml-4">E-mail</label>
              <input 
                required 
                type="email" 
                value={email} 
                onChange={e => setEmail(e.target.value)}
                className="w-full px-6 py-4 bg-white/50 border border-gold/10 rounded-2xl focus:border-gold outline-none text-sm"
              />
            </div>
            <div className="space-y-2 relative">
              <label className="text-[10px] uppercase tracking-widest font-bold opacity-60 ml-4">Senha</label>
              <input 
                required 
                type={showPassword ? "text" : "password"} 
                value={password} 
                onChange={e => setPassword(e.target.value)}
                className="w-full px-6 py-4 bg-white/50 border border-gold/10 rounded-2xl focus:border-gold outline-none text-sm"
              />
              <button 
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-6 bottom-4 text-gold/40 hover:text-gold"
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
            {loginError && <p className="text-[10px] text-red-500 font-bold uppercase tracking-widest text-center">{loginError}</p>}
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
          <button onClick={handleLogout} className="p-3 text-gold/40 hover:text-gold transition-colors">
            <LogOut size={20} />
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap gap-4 mb-12">
        {[
          { id: 'registry', label: 'Enxoval', icon: Gift },
          { id: 'purchased', label: 'Comprados', icon: ShoppingBag },
          { id: 'reservations', label: 'Reservas', icon: MessageSquare },
          { id: 'settings', label: 'Configurações', icon: Database },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`flex items-center gap-3 px-8 py-4 rounded-2xl text-[10px] uppercase tracking-widest font-bold transition-all border ${
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
            {activeTab === 'registry' ? 'Lista de Desejos' : activeTab === 'purchased' ? 'Itens Adquiridos' : activeTab === 'reservations' ? 'Reservas Recebidas' : 'Configurações Gerais'}
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
            {activeTab !== 'reservations' && activeTab !== 'settings' && (
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

          {activeTab === 'settings' ? (
            <div className="max-w-3xl">
              <div className="flex flex-wrap gap-3 mb-8">
                {[
                  { id: 'account', label: 'Conta Admin' },
                  { id: 'general', label: 'Geral / PIX' },
                  { id: 'whatsapp', label: 'WhatsApp' },
                  { id: 'backup', label: 'Backup' },
                ].map((tab) => (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setSettingsTab(tab.id as 'account' | 'general' | 'whatsapp' | 'backup')}
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
                  <button type="submit" className="px-10 py-4 bg-gold text-white rounded-2xl text-[10px] uppercase tracking-widest font-bold shadow-lg shadow-gold/20 flex items-center gap-2">
                    <Save size={16} /> Salvar Configurações Gerais
                  </button>
                </form>
              )}

              {settingsTab === 'whatsapp' && (
                <form onSubmit={handleSavePix} className="space-y-6">
                  <div className="space-y-2">
                    <label className="text-[10px] uppercase tracking-widest font-bold opacity-60 ml-4">URL da API WhatsApp</label>
                    <input type="url" value={pixSettings.whaticketApiUrl || ''} onChange={e => setPixSettings({ ...pixSettings, whaticketApiUrl: e.target.value })} placeholder="https://api.whaticketup.com.br/api/messages/send" className="w-full px-6 py-4 bg-white/50 border border-gold/10 rounded-2xl focus:border-gold outline-none text-sm" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] uppercase tracking-widest font-bold opacity-60 ml-4">WhatsApp para aviso</label>
                    <input type="text" value={pixSettings.whatsappNumber || ''} onChange={e => setPixSettings({ ...pixSettings, whatsappNumber: e.target.value.replace(/\D/g, '') })} placeholder="Ex.: 5585999999999 (pais+ddd+número)" className="w-full px-6 py-4 bg-white/50 border border-gold/10 rounded-2xl focus:border-gold outline-none text-sm" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] uppercase tracking-widest font-bold opacity-60 ml-4">Chave da API</label>
                    <input type="password" value={pixSettings.whaticketToken || ''} onChange={e => setPixSettings({ ...pixSettings, whaticketToken: e.target.value })} placeholder="Chave/token de autenticação da API" className="w-full px-6 py-4 bg-white/50 border border-gold/10 rounded-2xl focus:border-gold outline-none text-sm" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] uppercase tracking-widest font-bold opacity-60 ml-4">Template da mensagem WhatsApp</label>
                    <textarea rows={8} value={pixSettings.whaticketTemplate || ''} onChange={e => setPixSettings({ ...pixSettings, whaticketTemplate: e.target.value })} placeholder={defaultReservationTemplate} className="w-full px-6 py-4 bg-white/50 border border-gold/10 rounded-2xl focus:border-gold outline-none text-sm resize-none" />
                    <p className="text-[10px] opacity-50 ml-4 leading-relaxed">
                      Variáveis: {'{item}'} {'{nome}'} {'{whatsapp}'} {'{mensagem}'} {'{pixKey}'} {'{pixName}'} {'{couple}'}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-3">
                    <button type="submit" className="px-10 py-4 bg-gold text-white rounded-2xl text-[10px] uppercase tracking-widest font-bold shadow-lg shadow-gold/20 flex items-center gap-2">
                      <Save size={16} /> Salvar WhatsApp
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
          ) : (
            <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-gold/10">
                {activeTab === 'registry' && (
                  <th className="pb-6 w-10 pr-2 align-bottom">
                    <input
                      ref={registryHeaderCheckboxRef}
                      type="checkbox"
                      checked={registry.length > 0 && selectedRegistryIds.length === registry.length}
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
            </thead>
            <tbody className="divide-y divide-gold/5">
              {activeTab === 'registry' && registry.map(item => (
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

              {activeTab === 'reservations' && reservations.map(res => {
                return (
                  <tr key={res.id} className="group hover:bg-gold/5 transition-colors">
                    <td className="py-6 pr-4">
                      <div className="font-serif text-xl">{res.enxovalItem?.nome || 'Item excluído'}</div>
                      <div className="text-[10px] uppercase tracking-widest opacity-40">{new Date(res.dataReserva).toLocaleString()}</div>
                    </td>
                    <td className="py-6 pr-4 font-medium">{res.nome}</td>
                    <td className="py-6 pr-4">
                      <a href={`https://wa.me/${res.whatsapp.replace(/\D/g, '')}`} target="_blank" className="flex items-center gap-2 text-green-600 hover:underline text-xs">
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
          )}
        </div>
      </div>

      {/* Form Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsModalOpen(false)} className="absolute inset-0 bg-ink/40 backdrop-blur-sm" />
            <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }} className="relative w-full max-w-2xl bg-beige p-12 rounded-[40px] shadow-2xl border border-gold/20">
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
