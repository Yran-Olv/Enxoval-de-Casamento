import { useState, useEffect, useRef, type FormEvent } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Palette,
  Layout,
  Smartphone,
  Monitor,
  ExternalLink,
  Save,
  RotateCcw,
  Sparkles,
  Layers,
  Eye,
  CheckCircle2,
  AlertCircle,
  Plus,
  Trash2,
  ArrowUp,
  ArrowDown,
  Video,
  Utensils,
  Users,
  HelpCircle,
  Building,
  MapPin,
  Camera,
  Image as ImageIcon,
  Check,
  X,
  Clock,
  Shirt,
  Calendar,
} from 'lucide-react';
import { api } from '../api';
import type { SettingsData } from '../types';
import {
  INVITE_THEMES,
  parseInviteTheme,
  DEFAULT_SECTION_ORDER,
  type InviteTheme,
  type MenuItem,
  type GroomsmanItem,
  type QuizItem,
  type HotelItem,
  type CityGuideItem,
  type FaqItem,
  type SectionStyles,
} from '../../server/domain';
import { WEDDING_THEMES } from './wedding/ThemeDefinitions';

type EditorTab =
  | 'themes'
  | 'sections'
  | 'content'
  | 'menu'
  | 'groomsmen'
  | 'quiz'
  | 'guide'
  | 'faq'
  | 'guestPhotos';

type GuestPhotoAdmin = {
  id: string;
  url: string;
  caption: string | null;
  authorName: string;
  status: 'pending' | 'approved' | 'rejected';
  createdAt: string;
};

export default function AdminVisualEditor({
  settings,
  onChange,
  onSave,
}: {
  settings: SettingsData;
  onChange: (next: SettingsData) => void;
  onSave: (e: FormEvent) => Promise<void> | void;
}) {
  const [editorTab, setEditorTab] = useState<EditorTab>('themes');
  const [previewDevice, setPreviewDevice] = useState<'mobile' | 'desktop'>('mobile');
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [iframeKey, setIframeKey] = useState(0);

  // Guest photos moderation
  const [guestPhotos, setGuestPhotos] = useState<GuestPhotoAdmin[]>([]);
  const [loadingPhotos, setLoadingPhotos] = useState(false);

  const iframeRef = useRef<HTMLIFrameElement>(null);

  // Sync draft to sessionStorage for real-time preview
  useEffect(() => {
    try {
      sessionStorage.setItem('enxoval-invite-draft', JSON.stringify(settings));
      // Reload or trigger update in iframe if possible
      if (iframeRef.current && iframeRef.current.contentWindow) {
        iframeRef.current.contentWindow.postMessage({ type: 'UPDATE_PREVIEW', settings }, '*');
      }
    } catch {
      // ignore
    }
  }, [settings]);

  // Load guest photos when moderation tab is opened
  useEffect(() => {
    if (editorTab === 'guestPhotos') {
      loadGuestPhotos();
    }
  }, [editorTab]);

  const loadGuestPhotos = async () => {
    setLoadingPhotos(true);
    try {
      const data = await api.get('/admin/guest-photos');
      setGuestPhotos(data.photos || []);
    } catch (err) {
      console.error('Failed to load guest photos', err);
    } finally {
      setLoadingPhotos(false);
    }
  };

  const handleModeratePhoto = async (id: string, status: 'approved' | 'rejected') => {
    try {
      await api.put(`/admin/guest-photos/${id}`, { status });
      setGuestPhotos((prev) =>
        prev.map((p) => (p.id === id ? { ...p, status } : p))
      );
    } catch (err) {
      alert('Falha ao atualizar foto.');
    }
  };

  const handleDeletePhoto = async (id: string) => {
    if (!confirm('Excluir esta foto permanentemente?')) return;
    try {
      await api.delete(`/admin/guest-photos/${id}`);
      setGuestPhotos((prev) => prev.filter((p) => p.id !== id));
    } catch (err) {
      alert('Falha ao excluir foto.');
    }
  };

  const update = (patch: Partial<SettingsData>) => {
    onChange({ ...settings, ...patch });
  };

  const currentTheme = parseInviteTheme(settings.inviteTheme);

  // Parse JSON helpers safely
  const parseJsonArray = <T,>(json?: string, fallback: T[] = []): T[] => {
    if (!json) return fallback;
    try {
      const res = JSON.parse(json);
      return Array.isArray(res) ? res : fallback;
    } catch {
      return fallback;
    }
  };

  const parseJsonObject = <T extends Record<string, any>>(json?: string, fallback: T = {} as T): T => {
    if (!json) return fallback;
    try {
      const res = JSON.parse(json);
      return typeof res === 'object' && res !== null ? res : fallback;
    } catch {
      return fallback;
    }
  };

  // Section Order
  const sectionOrder: string[] = parseJsonArray(settings.sectionOrderJson, [...DEFAULT_SECTION_ORDER]);
  const sectionStyles: SectionStyles = parseJsonObject(settings.sectionStylesJson, {});

  const updateSectionStyle = (sectionKey: string, styleVariant: string) => {
    const nextStyles = { ...sectionStyles, [sectionKey]: styleVariant };
    update({ sectionStylesJson: JSON.stringify(nextStyles) });
  };

  const moveSection = (index: number, direction: 'up' | 'down') => {
    const target = direction === 'up' ? index - 1 : index + 1;
    if (target < 0 || target >= sectionOrder.length) return;
    const next = [...sectionOrder];
    const [moved] = next.splice(index, 1);
    next.splice(target, 0, moved);
    update({ sectionOrderJson: JSON.stringify(next) });
  };

  const handleSave = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSaveSuccess(false);
    setSaveError('');
    try {
      await onSave(e);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 4000);
      setIframeKey((k) => k + 1);
    } catch (err: any) {
      setSaveError(err?.message || 'Erro ao salvar alterações.');
    } finally {
      setSaving(false);
    }
  };

  const openFullPreview = () => {
    sessionStorage.setItem('enxoval-invite-draft', JSON.stringify(settings));
    window.open('/convite?preview=1', '_blank', 'noopener,noreferrer');
  };

  // Section labels map
  const sectionLabels: Record<string, { label: string; icon: any; toggleKey?: keyof SettingsData }> = {
    hero: { label: 'Capa / Abertura', icon: Layout },
    countdown: { label: 'Contagem Regressiva', icon: Clock },
    story: { label: 'Nossa História', icon: Sparkles, toggleKey: 'showStory' },
    video: { label: 'Vídeo dos Noivos', icon: Video, toggleKey: 'showVideo' },
    ceremony: { label: 'Cerimônia & Recepção', icon: Building },
    schedule: { label: 'Programação do Dia', icon: Calendar, toggleKey: 'showSchedule' },
    menu: { label: 'Cardápio / Gastronomia', icon: Utensils, toggleKey: 'showMenu' },
    groomsmen: { label: 'Padrinhos & Madrinhas', icon: Users, toggleKey: 'showGroomsmen' },
    quiz: { label: 'Quiz dos Noivos', icon: HelpCircle, toggleKey: 'showQuiz' },
    hotels: { label: 'Hospedagem', icon: Building, toggleKey: 'showHotels' },
    cityGuide: { label: 'Guia da Cidade', icon: MapPin, toggleKey: 'showCityGuide' },
    gallery: { label: 'Galeria de Fotos', icon: Camera, toggleKey: 'showGallery' },
    faq: { label: 'Perguntas Frequentes', icon: HelpCircle, toggleKey: 'showFaq' },
    manual: { label: 'Manual & Dress Code', icon: Shirt, toggleKey: 'showDress' },
    guestAlbum: { label: 'Álbum dos Convidados', icon: ImageIcon, toggleKey: 'showGuestAlbum' },
    rsvp: { label: 'Confirmação de Presença (RSVP)', icon: CheckCircle2 },
  };

  return (
    <div className="space-y-6">
      {/* Top Header bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-6 bg-stone-900 text-stone-100 rounded-3xl shadow-xl">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-amber-500/20 text-amber-300 rounded-full text-[11px] font-semibold uppercase tracking-wider mb-2">
            <Sparkles size={13} />
            Editor Visual Amorei Premium
          </div>
          <h2 className="text-2xl sm:text-3xl font-serif">Personalização do Site de Casamento</h2>
          <p className="text-xs text-stone-400 mt-1">
            Alterne entre os 6 modelos exclusivos, configure estilos de cada seção e veja as mudanças em tempo real.
          </p>
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto">
          <button
            type="button"
            onClick={openFullPreview}
            className="flex-1 sm:flex-none inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-stone-700 bg-stone-800 text-stone-200 hover:bg-stone-700 text-xs font-semibold uppercase tracking-wider transition-all"
          >
            <ExternalLink size={14} /> Abrir em Nova Aba
          </button>

          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="flex-1 sm:flex-none inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl bg-amber-500 text-stone-950 hover:bg-amber-400 text-xs font-bold uppercase tracking-wider shadow-lg shadow-amber-500/20 transition-all disabled:opacity-50"
          >
            {saving ? (
              <>
                <RotateCcw size={14} className="animate-spin" /> Salvando...
              </>
            ) : (
              <>
                <Save size={14} /> Salvar & Publicar
              </>
            )}
          </button>
        </div>
      </div>

      {/* Notifications */}
      {saveSuccess && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-2xl flex items-center gap-3 text-sm font-medium animate-fade-in">
          <CheckCircle2 size={18} className="text-emerald-600 flex-shrink-0" />
          Alterações salvas e publicadas com sucesso! O site e convite já estão atualizados.
        </div>
      )}
      {saveError && (
        <div className="p-4 bg-rose-50 border border-rose-200 text-rose-800 rounded-2xl flex items-center gap-3 text-sm font-medium animate-fade-in">
          <AlertCircle size={18} className="text-rose-600 flex-shrink-0" />
          {saveError}
        </div>
      )}

      {/* Navigation tabs */}
      <div className="flex flex-wrap gap-2 border-b border-stone-200 pb-3">
        {[
          { id: 'themes', label: '6 Modelos', icon: Palette },
          { id: 'sections', label: 'Estilos & Ordem', icon: Layers },
          { id: 'content', label: 'Dados Principais', icon: Layout },
          { id: 'menu', label: 'Cardápio', icon: Utensils },
          { id: 'groomsmen', label: 'Padrinhos', icon: Users },
          { id: 'quiz', label: 'Quiz dos Noivos', icon: HelpCircle },
          { id: 'guide', label: 'Hospedagem & Guia', icon: MapPin },
          { id: 'faq', label: 'FAQ', icon: HelpCircle },
          { id: 'guestPhotos', label: 'Álbum dos Convidados', icon: Camera },
        ].map((tab) => {
          const Icon = tab.icon;
          const active = editorTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setEditorTab(tab.id as EditorTab)}
              className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold uppercase tracking-wider transition-all ${
                active
                  ? 'bg-stone-900 text-white shadow-md'
                  : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
              }`}
            >
              <Icon size={14} />
              {tab.label}
              {tab.id === 'guestPhotos' && guestPhotos.filter((p) => p.status === 'pending').length > 0 && (
                <span className="ml-1 px-1.5 py-0.5 text-[10px] bg-amber-500 text-stone-950 font-bold rounded-full">
                  {guestPhotos.filter((p) => p.status === 'pending').length}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Main Dual-Column Workspace: Controls on Left, Live Responsive Preview on Right */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-8 items-start">
        {/* Left Column: Form / Editor Controls (7 cols on desktop) */}
        <div className="xl:col-span-7 bg-white rounded-3xl p-6 sm:p-8 border border-stone-200 shadow-sm space-y-6">
          {/* TAB 1: 6 MODELOS DE CASAMENTO */}
          {editorTab === 'themes' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-xl font-serif text-stone-900">Escolha o Modelo do Site</h3>
                <p className="text-xs text-stone-500 mt-1">
                  Cada modelo possui tipografia, composição, cartões e elementos visuais próprios. A troca de modelo nunca apaga seus dados.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {INVITE_THEMES.map((themeKey) => {
                  const theme = WEDDING_THEMES[themeKey];
                  const selected = currentTheme === themeKey;
                  return (
                    <div
                      key={themeKey}
                      onClick={() => update({ inviteTheme: themeKey })}
                      className={`group cursor-pointer rounded-2xl border-2 p-5 transition-all text-left relative ${
                        selected
                          ? 'border-amber-600 bg-amber-50/50 shadow-md ring-2 ring-amber-500/20'
                          : 'border-stone-200 hover:border-stone-300 bg-white hover:shadow-sm'
                      }`}
                    >
                      {selected && (
                        <div className="absolute top-3 right-3 px-2 py-0.5 bg-amber-600 text-white text-[10px] font-bold uppercase tracking-wider rounded-full flex items-center gap-1">
                          <Check size={11} /> Ativo
                        </div>
                      )}

                      {/* Color dots */}
                      <div className="flex items-center gap-1.5 mb-3">
                        <span className="w-4 h-4 rounded-full border border-stone-300" style={{ background: theme.palette.bg }} />
                        <span className="w-4 h-4 rounded-full border border-stone-300" style={{ background: theme.palette.accent }} />
                        <span className="w-4 h-4 rounded-full border border-stone-300" style={{ background: theme.palette.ink }} />
                      </div>

                      <h4 className="font-serif text-lg text-stone-900 font-bold">{theme.name}</h4>
                      <p className="text-xs text-stone-500 mt-1 leading-relaxed">{theme.description}</p>

                      <div className="mt-4 pt-3 border-t border-stone-100 flex items-center justify-between text-[11px] text-stone-400">
                        <span>{theme.fontTitle.split(',')[0].replace(/"/g, '')}</span>
                        <span className="font-medium text-amber-700">{selected ? 'Em uso' : 'Clique para usar'}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* TAB 2: ESTILOS INDEPENDENTES DAS SEÇÕES & REORDENAÇÃO */}
          {editorTab === 'sections' && (
            <div className="space-y-8">
              <div>
                <h3 className="text-xl font-serif text-stone-900">Estilos Modulares por Seção</h3>
                <p className="text-xs text-stone-500 mt-1">
                  Personalize o layout visual individual de cada bloco do site, independentemente do tema geral.
                </p>
              </div>

              {/* Section Variants Pickers */}
              <div className="space-y-6">
                {/* Hero / Capa */}
                <div className="p-4 rounded-2xl bg-stone-50 border border-stone-200 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="font-serif text-base font-bold text-stone-900">Capa (Hero)</span>
                    <span className="text-[10px] uppercase tracking-wider text-stone-500 font-semibold">3 Estilos</span>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { id: 'tradicional', label: 'Tradicional' },
                      { id: 'fotografica', label: 'Foto Destaque' },
                      { id: 'editorial', label: 'Editorial' },
                    ].map((opt) => (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => updateSectionStyle('hero', opt.id)}
                        className={`px-3 py-2 rounded-xl text-xs font-medium border text-center transition-all ${
                          (sectionStyles.hero || 'tradicional') === opt.id
                            ? 'bg-amber-600 text-white border-amber-600 font-bold'
                            : 'bg-white text-stone-700 border-stone-200 hover:border-stone-300'
                        }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Countdown */}
                <div className="p-4 rounded-2xl bg-stone-50 border border-stone-200 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="font-serif text-base font-bold text-stone-900">Contagem Regressiva</span>
                    <span className="text-[10px] uppercase tracking-wider text-stone-500 font-semibold">3 Estilos</span>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { id: 'tradicional', label: 'Cartões' },
                      { id: 'calendario', label: 'Calendário' },
                      { id: 'painel', label: 'Painel Aeroporto' },
                    ].map((opt) => (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => updateSectionStyle('countdown', opt.id)}
                        className={`px-3 py-2 rounded-xl text-xs font-medium border text-center transition-all ${
                          (sectionStyles.countdown || 'tradicional') === opt.id
                            ? 'bg-amber-600 text-white border-amber-600 font-bold'
                            : 'bg-white text-stone-700 border-stone-200 hover:border-stone-300'
                        }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Story */}
                <div className="p-4 rounded-2xl bg-stone-50 border border-stone-200 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="font-serif text-base font-bold text-stone-900">Nossa História</span>
                    <span className="text-[10px] uppercase tracking-wider text-stone-500 font-semibold">3 Estilos</span>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { id: 'cartas', label: 'Cartas Românticas' },
                      { id: 'timeline', label: 'Linha do Tempo' },
                      { id: 'diario', label: 'Diário Íntimo' },
                    ].map((opt) => (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => updateSectionStyle('story', opt.id)}
                        className={`px-3 py-2 rounded-xl text-xs font-medium border text-center transition-all ${
                          (sectionStyles.story || 'cartas') === opt.id
                            ? 'bg-amber-600 text-white border-amber-600 font-bold'
                            : 'bg-white text-stone-700 border-stone-200 hover:border-stone-300'
                        }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Ceremony */}
                <div className="p-4 rounded-2xl bg-stone-50 border border-stone-200 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="font-serif text-base font-bold text-stone-900">Cerimônia & Recepção</span>
                    <span className="text-[10px] uppercase tracking-wider text-stone-500 font-semibold">3 Estilos</span>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { id: 'cartao', label: 'Cartões Modernos' },
                      { id: 'ingresso', label: 'Ingresso / Ticket' },
                      { id: 'formal', label: 'Convite Formal' },
                    ].map((opt) => (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => updateSectionStyle('ceremony', opt.id)}
                        className={`px-3 py-2 rounded-xl text-xs font-medium border text-center transition-all ${
                          (sectionStyles.ceremony || 'cartao') === opt.id
                            ? 'bg-amber-600 text-white border-amber-600 font-bold'
                            : 'bg-white text-stone-700 border-stone-200 hover:border-stone-300'
                        }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Gallery */}
                <div className="p-4 rounded-2xl bg-stone-50 border border-stone-200 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="font-serif text-base font-bold text-stone-900">Galeria de Fotos</span>
                    <span className="text-[10px] uppercase tracking-wider text-stone-500 font-semibold">3 Estilos</span>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { id: 'grade', label: 'Grade Editorial' },
                      { id: 'varal', label: 'Varal de Fotos' },
                      { id: 'pelicula', label: 'Película Cinema' },
                    ].map((opt) => (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => updateSectionStyle('gallery', opt.id)}
                        className={`px-3 py-2 rounded-xl text-xs font-medium border text-center transition-all ${
                          (sectionStyles.gallery || 'grade') === opt.id
                            ? 'bg-amber-600 text-white border-amber-600 font-bold'
                            : 'bg-white text-stone-700 border-stone-200 hover:border-stone-300'
                        }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* FAQ */}
                <div className="p-4 rounded-2xl bg-stone-50 border border-stone-200 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="font-serif text-base font-bold text-stone-900">Perguntas Frequentes (FAQ)</span>
                    <span className="text-[10px] uppercase tracking-wider text-stone-500 font-semibold">3 Estilos</span>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { id: 'accordion', label: 'Acordeão' },
                      { id: 'cartoes', label: 'Cartões' },
                      { id: 'chat', label: 'Conversa / Chat' },
                    ].map((opt) => (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => updateSectionStyle('faq', opt.id)}
                        className={`px-3 py-2 rounded-xl text-xs font-medium border text-center transition-all ${
                          (sectionStyles.faq || 'accordion') === opt.id
                            ? 'bg-amber-600 text-white border-amber-600 font-bold'
                            : 'bg-white text-stone-700 border-stone-200 hover:border-stone-300'
                        }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Section Order & Visibility Toggles */}
              <div className="pt-6 border-t border-stone-200 space-y-4">
                <h4 className="font-serif text-lg text-stone-900 font-bold">Ordem e Exibição das Seções</h4>
                <p className="text-xs text-stone-500">
                  Use as setas para mover seções para cima ou para baixo, e desative as seções que não deseja exibir.
                </p>

                <div className="space-y-2">
                  {sectionOrder.map((secKey, idx) => {
                    const info = sectionLabels[secKey] || { label: secKey, icon: Layout };
                    const Icon = info.icon;
                    const toggleKey = info.toggleKey;
                    const isVisible = toggleKey ? settings[toggleKey] !== false : true;

                    return (
                      <div
                        key={secKey}
                        className={`flex items-center justify-between p-3 rounded-xl border transition-all ${
                          isVisible
                            ? 'bg-white border-stone-200'
                            : 'bg-stone-50 border-stone-100 opacity-60'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <Icon size={16} className="text-stone-400" />
                          <span className="text-xs font-semibold text-stone-800">{info.label}</span>
                        </div>

                        <div className="flex items-center gap-2">
                          {toggleKey && (
                            <label className="flex items-center gap-1.5 text-xs text-stone-600 cursor-pointer mr-2">
                              <input
                                type="checkbox"
                                checked={isVisible}
                                onChange={(e) => update({ [toggleKey]: e.target.checked })}
                                className="rounded text-amber-600 focus:ring-amber-500"
                              />
                              <span className="text-[11px]">{isVisible ? 'Exibir' : 'Oculto'}</span>
                            </label>
                          )}

                          <button
                            type="button"
                            disabled={idx === 0}
                            onClick={() => moveSection(idx, 'up')}
                            className="p-1 rounded hover:bg-stone-100 disabled:opacity-20 text-stone-600"
                            title="Mover para cima"
                          >
                            <ArrowUp size={14} />
                          </button>
                          <button
                            type="button"
                            disabled={idx === sectionOrder.length - 1}
                            onClick={() => moveSection(idx, 'down')}
                            className="p-1 rounded hover:bg-stone-100 disabled:opacity-20 text-stone-600"
                            title="Mover para baixo"
                          >
                            <ArrowDown size={14} />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: DADOS PRINCIPAIS & MÍDIA */}
          {editorTab === 'content' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-xl font-serif text-stone-900">Informações Principais & Mídia</h3>
                <p className="text-xs text-stone-500 mt-1">
                  Preencha dados do casal, fotos, vídeo e endereços.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <label className="block text-xs font-bold uppercase tracking-wider text-stone-600">
                  Nomes do Casal
                  <input
                    type="text"
                    value={settings.coupleNames || ''}
                    onChange={(e) => update({ coupleNames: e.target.value })}
                    className="mt-1 w-full rounded-xl border border-stone-200 px-3 py-2.5 text-sm outline-none focus:border-amber-500"
                  />
                </label>

                <label className="block text-xs font-bold uppercase tracking-wider text-stone-600">
                  Data do Casamento
                  <input
                    type="date"
                    value={settings.weddingDate || ''}
                    onChange={(e) => update({ weddingDate: e.target.value })}
                    className="mt-1 w-full rounded-xl border border-stone-200 px-3 py-2.5 text-sm outline-none focus:border-amber-500"
                  />
                </label>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <label className="block text-xs font-bold uppercase tracking-wider text-stone-600">
                  Horário da Cerimônia
                  <input
                    type="time"
                    value={settings.ceremonyTime || '16:00'}
                    onChange={(e) => update({ ceremonyTime: e.target.value })}
                    className="mt-1 w-full rounded-xl border border-stone-200 px-3 py-2.5 text-sm outline-none focus:border-amber-500"
                  />
                </label>

                <label className="block text-xs font-bold uppercase tracking-wider text-stone-600">
                  Confirmar presença até
                  <input
                    type="date"
                    value={settings.rsvpDeadline || ''}
                    onChange={(e) => update({ rsvpDeadline: e.target.value })}
                    className="mt-1 w-full rounded-xl border border-stone-200 px-3 py-2.5 text-sm outline-none focus:border-amber-500"
                  />
                </label>
              </div>

              <label className="block text-xs font-bold uppercase tracking-wider text-stone-600">
                Frase Romântica
                <input
                  type="text"
                  value={settings.romanticLine || ''}
                  onChange={(e) => update({ romanticLine: e.target.value })}
                  placeholder="Ex: O amor é paciente, o amor é bondoso..."
                  className="mt-1 w-full rounded-xl border border-stone-200 px-3 py-2.5 text-sm outline-none focus:border-amber-500"
                />
              </label>

              <label className="block text-xs font-bold uppercase tracking-wider text-stone-600">
                Texto de Abertura do Envelope
                <input
                  type="text"
                  value={settings.openingText || ''}
                  onChange={(e) => update({ openingText: e.target.value })}
                  placeholder="Ex: Você foi especialmente convidado..."
                  className="mt-1 w-full rounded-xl border border-stone-200 px-3 py-2.5 text-sm outline-none focus:border-amber-500"
                />
              </label>

              {/* Mídia */}
              <div className="pt-4 border-t border-stone-200 space-y-4">
                <h4 className="font-serif text-lg text-stone-900 font-bold">Mídia & Fotos</h4>

                <label className="block text-xs font-bold uppercase tracking-wider text-stone-600">
                  Foto de Capa Principal (URL HTTPS)
                  <input
                    type="url"
                    value={settings.coverPhotoUrl || ''}
                    onChange={(e) => update({ coverPhotoUrl: e.target.value })}
                    placeholder="https://..."
                    className="mt-1 w-full rounded-xl border border-stone-200 px-3 py-2.5 text-sm outline-none focus:border-amber-500"
                  />
                </label>

                <label className="block text-xs font-bold uppercase tracking-wider text-stone-600">
                  Vídeo dos Noivos (YouTube / Vimeo / MP4)
                  <input
                    type="url"
                    value={settings.videoUrl || ''}
                    onChange={(e) => update({ videoUrl: e.target.value })}
                    placeholder="https://www.youtube.com/watch?v=..."
                    className="mt-1 w-full rounded-xl border border-stone-200 px-3 py-2.5 text-sm outline-none focus:border-amber-500"
                  />
                </label>

                <label className="block text-xs font-bold uppercase tracking-wider text-stone-600">
                  Galeria de Fotos (um link HTTPS por linha)
                  <textarea
                    rows={4}
                    value={parseJsonArray(settings.galleryJson)
                      .map((item: any) => item?.url || '')
                      .filter(Boolean)
                      .join('\n')}
                    onChange={(e) => {
                      const urls = e.target.value
                        .split('\n')
                        .map((l) => l.trim())
                        .filter(Boolean);
                      update({
                        galleryJson: JSON.stringify(urls.map((url) => ({ url, alt: '' }))),
                      });
                    }}
                    placeholder="https://images.unsplash.com/..."
                    className="mt-1 w-full rounded-xl border border-stone-200 px-3 py-2 text-xs font-mono outline-none focus:border-amber-500"
                  />
                </label>
              </div>

              {/* Locais */}
              <div className="pt-4 border-t border-stone-200 space-y-4">
                <h4 className="font-serif text-lg text-stone-900 font-bold">Locais & Horários</h4>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <label className="block text-xs font-bold uppercase tracking-wider text-stone-600">
                    Local da Cerimônia
                    <input
                      type="text"
                      value={settings.ceremonyVenue || ''}
                      onChange={(e) => update({ ceremonyVenue: e.target.value })}
                      placeholder="Igreja São Francisco"
                      className="mt-1 w-full rounded-xl border border-stone-200 px-3 py-2.5 text-sm outline-none focus:border-amber-500"
                    />
                  </label>

                  <label className="block text-xs font-bold uppercase tracking-wider text-stone-600">
                    Endereço da Cerimônia
                    <input
                      type="text"
                      value={settings.ceremonyAddress || ''}
                      onChange={(e) => update({ ceremonyAddress: e.target.value })}
                      placeholder="Rua das Flores, 123"
                      className="mt-1 w-full rounded-xl border border-stone-200 px-3 py-2.5 text-sm outline-none focus:border-amber-500"
                    />
                  </label>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <label className="block text-xs font-bold uppercase tracking-wider text-stone-600">
                    Local da Recepção
                    <input
                      type="text"
                      value={settings.receptionVenue || ''}
                      onChange={(e) => update({ receptionVenue: e.target.value })}
                      placeholder="Espaço Jardins"
                      className="mt-1 w-full rounded-xl border border-stone-200 px-3 py-2.5 text-sm outline-none focus:border-amber-500"
                    />
                  </label>

                  <label className="block text-xs font-bold uppercase tracking-wider text-stone-600">
                    Endereço da Recepção
                    <input
                      type="text"
                      value={settings.receptionAddress || ''}
                      onChange={(e) => update({ receptionAddress: e.target.value })}
                      placeholder="Av. dos Noivos, 456"
                      className="mt-1 w-full rounded-xl border border-stone-200 px-3 py-2.5 text-sm outline-none focus:border-amber-500"
                    />
                  </label>
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: CARDÁPIO (MENU) */}
          {editorTab === 'menu' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xl font-serif text-stone-900">Cardápio & Gastronomia</h3>
                  <p className="text-xs text-stone-500 mt-1">
                    Cadastre os pratos, entradas, sobremesas e bebidas do evento.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    const current: MenuItem[] = parseJsonArray(settings.menuJson, []);
                    current.push({
                      id: Math.random().toString(36).substring(2, 9),
                      category: 'principais',
                      title: 'Novo Prato',
                      description: 'Descrição deliciosa dos ingredientes.',
                    });
                    update({ menuJson: JSON.stringify(current) });
                  }}
                  className="inline-flex items-center gap-1.5 px-3 py-2 bg-amber-500 text-stone-950 rounded-xl text-xs font-bold uppercase tracking-wider hover:bg-amber-400"
                >
                  <Plus size={14} /> Adicionar Item
                </button>
              </div>

              {parseJsonArray<MenuItem>(settings.menuJson, []).length === 0 ? (
                <p className="p-8 text-center text-sm text-stone-400 bg-stone-50 rounded-2xl border border-stone-200">
                  Nenhum item cadastrado no cardápio ainda. Clique em "Adicionar Item" acima.
                </p>
              ) : (
                <div className="space-y-3">
                  {parseJsonArray<MenuItem>(settings.menuJson, []).map((item, idx) => (
                    <div key={item.id || idx} className="p-4 rounded-2xl border border-stone-200 bg-stone-50 space-y-3">
                      <div className="flex items-center justify-between gap-3">
                        <select
                          value={item.category}
                          onChange={(e) => {
                            const list = parseJsonArray<MenuItem>(settings.menuJson, []);
                            list[idx].category = e.target.value as MenuItem['category'];
                            update({ menuJson: JSON.stringify(list) });
                          }}
                          className="rounded-lg border border-stone-200 bg-white px-2.5 py-1 text-xs font-semibold text-stone-700"
                        >
                          <option value="entradas">Entrada</option>
                          <option value="principais">Prato Principal</option>
                          <option value="sobremesas">Sobremesa</option>
                          <option value="bebidas">Bebidas</option>
                          <option value="outro">Outro</option>
                        </select>

                        <button
                          type="button"
                          onClick={() => {
                            const list = parseJsonArray<MenuItem>(settings.menuJson, []);
                            list.splice(idx, 1);
                            update({ menuJson: JSON.stringify(list) });
                          }}
                          className="text-stone-400 hover:text-rose-600 p-1"
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>

                      <input
                        type="text"
                        value={item.title}
                        onChange={(e) => {
                          const list = parseJsonArray<MenuItem>(settings.menuJson, []);
                          list[idx].title = e.target.value;
                          update({ menuJson: JSON.stringify(list) });
                        }}
                        placeholder="Nome do prato ou bebida"
                        className="w-full rounded-xl border border-stone-200 bg-white px-3 py-2 text-sm font-semibold"
                      />

                      <textarea
                        rows={2}
                        value={item.description}
                        onChange={(e) => {
                          const list = parseJsonArray<MenuItem>(settings.menuJson, []);
                          list[idx].description = e.target.value;
                          update({ menuJson: JSON.stringify(list) });
                        }}
                        placeholder="Descrição dos ingredientes ou modo de preparo"
                        className="w-full rounded-xl border border-stone-200 bg-white px-3 py-2 text-xs"
                      />
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 5: PADRINHOS & MADRINHAS */}
          {editorTab === 'groomsmen' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xl font-serif text-stone-900">Padrinhos & Madrinhas</h3>
                  <p className="text-xs text-stone-500 mt-1">
                    Apresente os casais e amigos especiais que estarão no altar.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    const current: GroomsmanItem[] = parseJsonArray(settings.groomsmenJson, []);
                    current.push({
                      id: Math.random().toString(36).substring(2, 9),
                      name: 'Nome da Pessoa',
                      role: 'padrinho',
                      photoUrl: '',
                      description: 'Amigo de longa data.',
                    });
                    update({ groomsmenJson: JSON.stringify(current) });
                  }}
                  className="inline-flex items-center gap-1.5 px-3 py-2 bg-amber-500 text-stone-950 rounded-xl text-xs font-bold uppercase tracking-wider hover:bg-amber-400"
                >
                  <Plus size={14} /> Adicionar Pessoa
                </button>
              </div>

              {parseJsonArray<GroomsmanItem>(settings.groomsmenJson, []).length === 0 ? (
                <p className="p-8 text-center text-sm text-stone-400 bg-stone-50 rounded-2xl border border-stone-200">
                  Nenhum padrinho ou madrinha cadastrado ainda.
                </p>
              ) : (
                <div className="space-y-3">
                  {parseJsonArray<GroomsmanItem>(settings.groomsmenJson, []).map((item, idx) => (
                    <div key={item.id || idx} className="p-4 rounded-2xl border border-stone-200 bg-stone-50 space-y-3">
                      <div className="flex items-center justify-between gap-3">
                        <select
                          value={item.role}
                          onChange={(e) => {
                            const list = parseJsonArray<GroomsmanItem>(settings.groomsmenJson, []);
                            list[idx].role = e.target.value as GroomsmanItem['role'];
                            update({ groomsmenJson: JSON.stringify(list) });
                          }}
                          className="rounded-lg border border-stone-200 bg-white px-2.5 py-1 text-xs font-semibold text-amber-700"
                        >
                          <option value="padrinho">Padrinho</option>
                          <option value="madrinha">Madrinha</option>
                          <option value="dama">Dama de Honra</option>
                          <option value="pajem">Pajem</option>
                          <option value="outro">Outro</option>
                        </select>

                        <button
                          type="button"
                          onClick={() => {
                            const list = parseJsonArray<GroomsmanItem>(settings.groomsmenJson, []);
                            list.splice(idx, 1);
                            update({ groomsmenJson: JSON.stringify(list) });
                          }}
                          className="text-stone-400 hover:text-rose-600 p-1"
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <input
                          type="text"
                          value={item.name}
                          onChange={(e) => {
                            const list = parseJsonArray<GroomsmanItem>(settings.groomsmenJson, []);
                            list[idx].name = e.target.value;
                            update({ groomsmenJson: JSON.stringify(list) });
                          }}
                          placeholder="Nome da pessoa"
                          className="rounded-xl border border-stone-200 bg-white px-3 py-2 text-sm font-semibold"
                        />
                        <input
                          type="url"
                          value={item.photoUrl || ''}
                          onChange={(e) => {
                            const list = parseJsonArray<GroomsmanItem>(settings.groomsmenJson, []);
                            list[idx].photoUrl = e.target.value;
                            update({ groomsmenJson: JSON.stringify(list) });
                          }}
                          placeholder="Foto URL (HTTPS opcional)"
                          className="rounded-xl border border-stone-200 bg-white px-3 py-2 text-xs"
                        />
                      </div>

                      <input
                        type="text"
                        value={item.description || ''}
                        onChange={(e) => {
                          const list = parseJsonArray<GroomsmanItem>(settings.groomsmenJson, []);
                          list[idx].description = e.target.value;
                          update({ groomsmenJson: JSON.stringify(list) });
                        }}
                        placeholder="Mensagem ou descrição (ex: Amiga de infância)"
                        className="w-full rounded-xl border border-stone-200 bg-white px-3 py-2 text-xs text-stone-600"
                      />
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 6: QUIZ DOS NOIVOS */}
          {editorTab === 'quiz' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xl font-serif text-stone-900">Quiz dos Noivos</h3>
                  <p className="text-xs text-stone-500 mt-1">
                    Um jogo interativo de perguntas para divertir os convidados.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    const current: QuizItem[] = parseJsonArray(settings.quizJson, []);
                    current.push({
                      id: Math.random().toString(36).substring(2, 9),
                      question: 'Onde os noivos se conheceram?',
                      options: ['Na faculdade', 'Em uma viagem', 'Pela internet', 'Em um café'],
                      answerIndex: 0,
                      explanation: 'Eles estudavam no mesmo campus em 2018!',
                    });
                    update({ quizJson: JSON.stringify(current) });
                  }}
                  className="inline-flex items-center gap-1.5 px-3 py-2 bg-amber-500 text-stone-950 rounded-xl text-xs font-bold uppercase tracking-wider hover:bg-amber-400"
                >
                  <Plus size={14} /> Adicionar Pergunta
                </button>
              </div>

              {parseJsonArray<QuizItem>(settings.quizJson, []).length === 0 ? (
                <p className="p-8 text-center text-sm text-stone-400 bg-stone-50 rounded-2xl border border-stone-200">
                  Nenhuma pergunta adicionada ao quiz ainda.
                </p>
              ) : (
                <div className="space-y-4">
                  {parseJsonArray<QuizItem>(settings.quizJson, []).map((q, idx) => (
                    <div key={q.id || idx} className="p-4 rounded-2xl border border-stone-200 bg-stone-50 space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold uppercase tracking-wider text-amber-700">
                          Pergunta #{idx + 1}
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            const list = parseJsonArray<QuizItem>(settings.quizJson, []);
                            list.splice(idx, 1);
                            update({ quizJson: JSON.stringify(list) });
                          }}
                          className="text-stone-400 hover:text-rose-600 p-1"
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>

                      <input
                        type="text"
                        value={q.question}
                        onChange={(e) => {
                          const list = parseJsonArray<QuizItem>(settings.quizJson, []);
                          list[idx].question = e.target.value;
                          update({ quizJson: JSON.stringify(list) });
                        }}
                        placeholder="Pergunta sobre o casal"
                        className="w-full rounded-xl border border-stone-200 bg-white px-3 py-2 text-sm font-semibold"
                      />

                      <div className="space-y-1.5">
                        <span className="text-[10px] uppercase tracking-wider text-stone-500 font-bold">
                          Alternativas (marque a correta):
                        </span>
                        {q.options.map((opt, optIdx) => (
                          <div key={optIdx} className="flex items-center gap-2">
                            <input
                              type="radio"
                              name={`correct-${idx}`}
                              checked={q.answerIndex === optIdx}
                              onChange={() => {
                                const list = parseJsonArray<QuizItem>(settings.quizJson, []);
                                list[idx].answerIndex = optIdx;
                                update({ quizJson: JSON.stringify(list) });
                              }}
                              className="text-amber-600 focus:ring-amber-500"
                            />
                            <input
                              type="text"
                              value={opt}
                              onChange={(e) => {
                                const list = parseJsonArray<QuizItem>(settings.quizJson, []);
                                list[idx].options[optIdx] = e.target.value;
                                update({ quizJson: JSON.stringify(list) });
                              }}
                              placeholder={`Opção ${optIdx + 1}`}
                              className="flex-1 rounded-lg border border-stone-200 bg-white px-2.5 py-1.5 text-xs"
                            />
                          </div>
                        ))}
                      </div>

                      <input
                        type="text"
                        value={q.explanation || ''}
                        onChange={(e) => {
                          const list = parseJsonArray<QuizItem>(settings.quizJson, []);
                          list[idx].explanation = e.target.value;
                          update({ quizJson: JSON.stringify(list) });
                        }}
                        placeholder="Explicação da resposta (mostrada após responder)"
                        className="w-full rounded-xl border border-stone-200 bg-white px-3 py-1.5 text-xs text-stone-500"
                      />
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 7: HOSPEDAGEM & GUIA DA CIDADE */}
          {editorTab === 'guide' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-xl font-serif text-stone-900">Hospedagem & Guia Local</h3>
                <p className="text-xs text-stone-500 mt-1">
                  Ajude quem vem de fora com dicas de hotéis, descontos e pontos recomendados.
                </p>
              </div>

              {/* Hotéis */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="font-serif text-base font-bold text-stone-900">Hotéis & Pousadas</h4>
                  <button
                    type="button"
                    onClick={() => {
                      const current: HotelItem[] = parseJsonArray(settings.hotelsJson, []);
                      current.push({
                        id: Math.random().toString(36).substring(2, 9),
                        name: 'Hotel Conforto',
                        address: 'Av. Beira Mar, 100',
                        phone: '(85) 99999-9999',
                        link: 'https://hotel.com',
                        discountCode: 'CASAMENTOTAIS',
                        notes: 'Tarifa especial mencionando o casamento.',
                      });
                      update({ hotelsJson: JSON.stringify(current) });
                    }}
                    className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-stone-100 hover:bg-stone-200 rounded-lg text-xs font-semibold"
                  >
                    <Plus size={13} /> Hotel
                  </button>
                </div>

                {parseJsonArray<HotelItem>(settings.hotelsJson, []).map((h, idx) => (
                  <div key={h.id || idx} className="p-3.5 rounded-xl border border-stone-200 bg-stone-50 space-y-2">
                    <div className="flex items-center justify-between">
                      <input
                        type="text"
                        value={h.name}
                        onChange={(e) => {
                          const list = parseJsonArray<HotelItem>(settings.hotelsJson, []);
                          list[idx].name = e.target.value;
                          update({ hotelsJson: JSON.stringify(list) });
                        }}
                        placeholder="Nome do Hotel"
                        className="font-bold text-sm bg-white rounded-lg px-2.5 py-1 border border-stone-200 flex-1 mr-2"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          const list = parseJsonArray<HotelItem>(settings.hotelsJson, []);
                          list.splice(idx, 1);
                          update({ hotelsJson: JSON.stringify(list) });
                        }}
                        className="text-stone-400 hover:text-rose-600"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <input
                        type="text"
                        value={h.address}
                        onChange={(e) => {
                          const list = parseJsonArray<HotelItem>(settings.hotelsJson, []);
                          list[idx].address = e.target.value;
                          update({ hotelsJson: JSON.stringify(list) });
                        }}
                        placeholder="Endereço"
                        className="text-xs bg-white rounded-lg px-2 py-1.5 border border-stone-200"
                      />
                      <input
                        type="text"
                        value={h.discountCode || ''}
                        onChange={(e) => {
                          const list = parseJsonArray<HotelItem>(settings.hotelsJson, []);
                          list[idx].discountCode = e.target.value;
                          update({ hotelsJson: JSON.stringify(list) });
                        }}
                        placeholder="Código de desconto / Cupom"
                        className="text-xs bg-white rounded-lg px-2 py-1.5 border border-stone-200 font-mono text-amber-700"
                      />
                    </div>
                  </div>
                ))}
              </div>

              {/* Guia da cidade */}
              <div className="pt-4 border-t border-stone-200 space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="font-serif text-base font-bold text-stone-900">Locais Recomendados da Cidade</h4>
                  <button
                    type="button"
                    onClick={() => {
                      const current: CityGuideItem[] = parseJsonArray(settings.cityGuideJson, []);
                      current.push({
                        id: Math.random().toString(36).substring(2, 9),
                        category: 'restaurante',
                        name: 'Café Parisiense',
                        tip: 'O melhor brunch da cidade, pertinho do hotel.',
                        address: 'Rua das Flores, 45',
                        link: '',
                      });
                      update({ cityGuideJson: JSON.stringify(current) });
                    }}
                    className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-stone-100 hover:bg-stone-200 rounded-lg text-xs font-semibold"
                  >
                    <Plus size={13} /> Dica
                  </button>
                </div>

                {parseJsonArray<CityGuideItem>(settings.cityGuideJson, []).map((c, idx) => (
                  <div key={c.id || idx} className="p-3.5 rounded-xl border border-stone-200 bg-stone-50 space-y-2">
                    <div className="flex items-center justify-between">
                      <select
                        value={c.category}
                        onChange={(e) => {
                          const list = parseJsonArray<CityGuideItem>(settings.cityGuideJson, []);
                          list[idx].category = e.target.value as CityGuideItem['category'];
                          update({ cityGuideJson: JSON.stringify(list) });
                        }}
                        className="text-xs font-bold text-amber-700 bg-white rounded-lg px-2 py-1 border border-stone-200"
                      >
                        <option value="restaurante">Restaurante</option>
                        <option value="beleza">Beleza / Barbearia</option>
                        <option value="passeio">Passeio / Ponto Turístico</option>
                        <option value="hotel">Hospedagem</option>
                        <option value="outro">Outro</option>
                      </select>
                      <button
                        type="button"
                        onClick={() => {
                          const list = parseJsonArray<CityGuideItem>(settings.cityGuideJson, []);
                          list.splice(idx, 1);
                          update({ cityGuideJson: JSON.stringify(list) });
                        }}
                        className="text-stone-400 hover:text-rose-600"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                    <input
                      type="text"
                      value={c.name}
                      onChange={(e) => {
                        const list = parseJsonArray<CityGuideItem>(settings.cityGuideJson, []);
                        list[idx].name = e.target.value;
                        update({ cityGuideJson: JSON.stringify(list) });
                      }}
                      placeholder="Nome do local"
                      className="w-full text-sm font-semibold bg-white rounded-lg px-2.5 py-1.5 border border-stone-200"
                    />
                    <input
                      type="text"
                      value={c.tip}
                      onChange={(e) => {
                        const list = parseJsonArray<CityGuideItem>(settings.cityGuideJson, []);
                        list[idx].tip = e.target.value;
                        update({ cityGuideJson: JSON.stringify(list) });
                      }}
                      placeholder="Dica ou observação"
                      className="w-full text-xs text-stone-600 bg-white rounded-lg px-2.5 py-1 border border-stone-200"
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 8: FAQ (PERGUNTAS FREQUENTES) */}
          {editorTab === 'faq' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xl font-serif text-stone-900">Perguntas Frequentes (FAQ)</h3>
                  <p className="text-xs text-stone-500 mt-1">
                    Esclareça dúvidas comuns dos convidados com antecedência.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    const current: FaqItem[] = parseJsonArray(settings.faqJson, []);
                    current.push({
                      id: Math.random().toString(36).substring(2, 9),
                      question: 'Posso levar acompanhante?',
                      answer: 'Apenas os nomes indicados no convite individual. Qualquer dúvida fale conosco!',
                    });
                    update({ faqJson: JSON.stringify(current) });
                  }}
                  className="inline-flex items-center gap-1.5 px-3 py-2 bg-amber-500 text-stone-950 rounded-xl text-xs font-bold uppercase tracking-wider hover:bg-amber-400"
                >
                  <Plus size={14} /> Adicionar FAQ
                </button>
              </div>

              {parseJsonArray<FaqItem>(settings.faqJson, []).map((faq, idx) => (
                <div key={faq.id || idx} className="p-4 rounded-2xl border border-stone-200 bg-stone-50 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-amber-700 uppercase tracking-wider">
                      Dúvida #{idx + 1}
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        const list = parseJsonArray<FaqItem>(settings.faqJson, []);
                        list.splice(idx, 1);
                        update({ faqJson: JSON.stringify(list) });
                      }}
                      className="text-stone-400 hover:text-rose-600 p-1"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                  <input
                    type="text"
                    value={faq.question}
                    onChange={(e) => {
                      const list = parseJsonArray<FaqItem>(settings.faqJson, []);
                      list[idx].question = e.target.value;
                      update({ faqJson: JSON.stringify(list) });
                    }}
                    placeholder="Pergunta (ex: Há estacionamento no local?)"
                    className="w-full text-sm font-semibold bg-white rounded-xl px-3 py-2 border border-stone-200"
                  />
                  <textarea
                    rows={2}
                    value={faq.answer}
                    onChange={(e) => {
                      const list = parseJsonArray<FaqItem>(settings.faqJson, []);
                      list[idx].answer = e.target.value;
                      update({ faqJson: JSON.stringify(list) });
                    }}
                    placeholder="Resposta detalhada"
                    className="w-full text-xs text-stone-700 bg-white rounded-xl px-3 py-2 border border-stone-200"
                  />
                </div>
              ))}
            </div>
          )}

          {/* TAB 9: MODERAÇÃO DO ÁLBUM DE FOTOS DOS CONVIDADOS */}
          {editorTab === 'guestPhotos' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xl font-serif text-stone-900">Moderação do Álbum dos Convidados</h3>
                  <p className="text-xs text-stone-500 mt-1">
                    Aprove ou recuse as fotos enviadas pelos convidados antes de aparecerem no site público.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={loadGuestPhotos}
                  disabled={loadingPhotos}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-stone-100 hover:bg-stone-200 rounded-lg text-xs font-semibold"
                >
                  <RotateCcw size={13} className={loadingPhotos ? 'animate-spin' : ''} /> Atualizar
                </button>
              </div>

              {loadingPhotos ? (
                <div className="p-8 text-center text-sm text-stone-400">Carregando fotos...</div>
              ) : guestPhotos.length === 0 ? (
                <div className="p-8 text-center text-sm text-stone-400 bg-stone-50 rounded-2xl border border-stone-200">
                  Nenhuma foto enviada pelos convidados até o momento.
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {guestPhotos.map((photo) => (
                    <div
                      key={photo.id}
                      className="rounded-2xl border border-stone-200 bg-stone-50 p-4 space-y-3"
                    >
                      <img
                        src={photo.url}
                        alt={photo.caption || 'Foto de convidado'}
                        className="w-full h-44 object-cover rounded-xl"
                      />
                      <div>
                        <p className="text-xs font-bold text-stone-800">{photo.authorName}</p>
                        {photo.caption && <p className="text-xs text-stone-600 mt-0.5">{photo.caption}</p>}
                        <div className="mt-2 flex items-center justify-between">
                          <span
                            className={`text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full ${
                              photo.status === 'approved'
                                ? 'bg-emerald-100 text-emerald-800'
                                : photo.status === 'rejected'
                                ? 'bg-rose-100 text-rose-800'
                                : 'bg-amber-100 text-amber-800'
                            }`}
                          >
                            {photo.status === 'approved'
                              ? 'Aprovada'
                              : photo.status === 'rejected'
                              ? 'Recusada'
                              : 'Pendente'}
                          </span>

                          <div className="flex items-center gap-1">
                            {photo.status !== 'approved' && (
                              <button
                                type="button"
                                onClick={() => handleModeratePhoto(photo.id, 'approved')}
                                className="p-1.5 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700"
                                title="Aprovar e exibir no site"
                              >
                                <Check size={14} />
                              </button>
                            )}
                            {photo.status !== 'rejected' && (
                              <button
                                type="button"
                                onClick={() => handleModeratePhoto(photo.id, 'rejected')}
                                className="p-1.5 rounded-lg bg-stone-300 text-stone-700 hover:bg-stone-400"
                                title="Recusar"
                              >
                                <X size={14} />
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() => handleDeletePhoto(photo.id)}
                              className="p-1.5 rounded-lg text-stone-400 hover:text-rose-600"
                              title="Excluir"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Right Column: Interactive Live Preview (5 cols on desktop, sticky) */}
        <div className="xl:col-span-5 sticky top-6 space-y-4">
          <div className="flex items-center justify-between p-3 bg-stone-900 text-stone-100 rounded-2xl shadow">
            <div className="flex items-center gap-2">
              <Eye size={15} className="text-amber-400" />
              <span className="text-xs font-bold uppercase tracking-wider">Pré-visualização Ao Vivo</span>
            </div>

            <div className="flex items-center gap-1 bg-stone-800 p-1 rounded-xl">
              <button
                type="button"
                onClick={() => setPreviewDevice('mobile')}
                className={`p-1.5 rounded-lg text-xs transition-all ${
                  previewDevice === 'mobile'
                    ? 'bg-amber-500 text-stone-950 font-bold'
                    : 'text-stone-400 hover:text-stone-200'
                }`}
                title="Visualização Celular"
              >
                <Smartphone size={15} />
              </button>
              <button
                type="button"
                onClick={() => setPreviewDevice('desktop')}
                className={`p-1.5 rounded-lg text-xs transition-all ${
                  previewDevice === 'desktop'
                    ? 'bg-amber-500 text-stone-950 font-bold'
                    : 'text-stone-400 hover:text-stone-200'
                }`}
                title="Visualização Computador"
              >
                <Monitor size={15} />
              </button>
            </div>
          </div>

          {/* Device Mockup Frame */}
          <div
            className={`mx-auto transition-all duration-300 ${
              previewDevice === 'mobile'
                ? 'w-[390px] max-w-full rounded-[42px] border-[10px] border-stone-800 shadow-2xl overflow-hidden bg-stone-900'
                : 'w-full rounded-2xl border-2 border-stone-300 shadow-lg overflow-hidden bg-white'
            }`}
            style={{ height: '720px' }}
          >
            {/* Phone Notch/Speaker if mobile */}
            {previewDevice === 'mobile' && (
              <div className="h-5 bg-stone-800 flex items-center justify-center">
                <span className="w-16 h-3 bg-stone-950 rounded-full" />
              </div>
            )}

            <iframe
              key={iframeKey}
              ref={iframeRef}
              src="/convite?preview=1"
              title="Prévia do site de casamento"
              className="w-full h-full border-0 bg-white"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
