import { useEffect, useState, useRef } from 'react';
import { api } from '../api';
import {
  MessageCircle,
  X,
  Save,
  RotateCcw,
  Sparkles,
  Check,
  Calendar,
  Clock,
  User,
  Heart,
  MapPin,
  ExternalLink,
} from 'lucide-react';
import {
  DEFAULT_INVITE_TEMPLATE,
  DEFAULT_SAVE_THE_DATE_TEMPLATE,
  DEFAULT_REMINDER_TEMPLATE,
  DEFAULT_SOON_TEMPLATE,
  renderInviteMessage,
} from '../../server/domain';

type CampaignKey = 'official' | 'save-the-date' | 'reminder' | 'soon';

const CAMPAIGN_OPTIONS: Array<{
  id: CampaignKey;
  field: 'inviteTemplate' | 'saveTheDateTemplate' | 'reminderTemplate' | 'soonTemplate';
  label: string;
  defaultText: string;
}> = [
  {
    id: 'official',
    field: 'inviteTemplate',
    label: '💌 Convite Oficial',
    defaultText: DEFAULT_INVITE_TEMPLATE,
  },
  {
    id: 'save-the-date',
    field: 'saveTheDateTemplate',
    label: '📅 Save the Date',
    defaultText: DEFAULT_SAVE_THE_DATE_TEMPLATE,
  },
  {
    id: 'reminder',
    field: 'reminderTemplate',
    label: '⏰ Lembrete de Resposta',
    defaultText: DEFAULT_REMINDER_TEMPLATE,
  },
  {
    id: 'soon',
    field: 'soonTemplate',
    label: '⏳ Lembrete da Data',
    defaultText: DEFAULT_SOON_TEMPLATE,
  },
];

const VARIABLE_TAGS = [
  { tag: '{nome}', label: 'Nome do Convidado', icon: User, example: 'yran' },
  { tag: '{data}', label: 'Data do Casamento', icon: Calendar, example: '02 de janeiro de 2027' },
  { tag: '{horario}', label: 'Horário', icon: Clock, example: '16:00' },
  { tag: '{link}', label: 'Link do Convite Webview', icon: ExternalLink, example: 'https://taiseyran.com.br/c/exemplo?wa=1' },
  { tag: '{casal}', label: 'Nomes dos Noivos', icon: Heart, example: 'Tais & Yran' },
  { tag: '{local}', label: 'Local / Endereço', icon: MapPin, example: 'Espaço dos Sonhos' },
];

export default function AdminInviteMessageModal({
  isOpen,
  onClose,
  onNotice,
  initialCampaign = 'official',
  onSaved,
}: {
  isOpen: boolean;
  onClose: () => void;
  onNotice: (type: 'success' | 'error', message: string) => void;
  initialCampaign?: string;
  onSaved?: () => void;
}) {
  const [selectedCampaign, setSelectedCampaign] = useState<CampaignKey>(
    (initialCampaign as CampaignKey) || 'official'
  );
  const [templates, setTemplates] = useState<Record<string, string>>({
    inviteTemplate: DEFAULT_INVITE_TEMPLATE,
    saveTheDateTemplate: DEFAULT_SAVE_THE_DATE_TEMPLATE,
    reminderTemplate: DEFAULT_REMINDER_TEMPLATE,
    soonTemplate: DEFAULT_SOON_TEMPLATE,
  });
  const [coupleNames, setCoupleNames] = useState('Tais & Yran');
  const [weddingDate, setWeddingDate] = useState('2027-01-02');
  const [ceremonyTime, setCeremonyTime] = useState('16:00');
  const [ceremonyVenue, setCeremonyVenue] = useState('');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    setLoading(true);
    api.get('/settings/admin')
      .then((settings) => {
        setTemplates({
          inviteTemplate: settings.inviteTemplate || DEFAULT_INVITE_TEMPLATE,
          saveTheDateTemplate: settings.saveTheDateTemplate || DEFAULT_SAVE_THE_DATE_TEMPLATE,
          reminderTemplate: settings.reminderTemplate || DEFAULT_REMINDER_TEMPLATE,
          soonTemplate: settings.soonTemplate || DEFAULT_SOON_TEMPLATE,
        });
        if (settings.coupleNames) setCoupleNames(settings.coupleNames);
        if (settings.weddingDate) setWeddingDate(settings.weddingDate);
        if (settings.ceremonyTime) setCeremonyTime(settings.ceremonyTime);
        if (settings.ceremonyVenue || settings.ceremonyAddress) {
          setCeremonyVenue(settings.ceremonyVenue || settings.ceremonyAddress);
        }
      })
      .catch((err) => {
        onNotice('error', 'Não foi possível carregar o modelo de mensagem atual.');
      })
      .finally(() => setLoading(false));
  }, [isOpen]);

  if (!isOpen) return null;

  const currentOption = CAMPAIGN_OPTIONS.find((c) => c.id === selectedCampaign) || CAMPAIGN_OPTIONS[0];
  const currentText = templates[currentOption.field] || currentOption.defaultText;

  const handleTextChange = (val: string) => {
    setTemplates((prev) => ({
      ...prev,
      [currentOption.field]: val,
    }));
  };

  const insertVariable = (tag: string) => {
    const el = textareaRef.current;
    if (!el) {
      handleTextChange(currentText + ' ' + tag);
      return;
    }
    const start = el.selectionStart;
    const end = el.selectionEnd;
    const before = currentText.substring(0, start);
    const after = currentText.substring(end);
    const updated = before + tag + after;
    handleTextChange(updated);
    setTimeout(() => {
      el.focus();
      el.setSelectionRange(start + tag.length, start + tag.length);
    }, 0);
  };

  const handleRestoreDefault = () => {
    handleTextChange(currentOption.defaultText);
    onNotice('success', `Texto padrão restaurado para ${currentOption.label}.`);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await api.post('/settings', {
        [currentOption.field]: currentText.trim(),
      });
      onNotice(
        'success',
        `Mensagem do ${currentOption.label} salva com sucesso! Os novos disparos já usarão esse texto.`
      );
      if (onSaved) onSaved();
      onClose();
    } catch (err: any) {
      onNotice('error', err?.message || 'Falha ao salvar o modelo de mensagem.');
    } finally {
      setSaving(false);
    }
  };

  // Monta a data formatada para a simulação
  let formattedDate = '02 de janeiro de 2027';
  if (/^\d{4}-\d{2}-\d{2}$/.test(weddingDate)) {
    formattedDate = new Date(`${weddingDate}T12:00:00`).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
    });
  }

  // Renderiza a prévia hidratada
  const simulatedMessage = renderInviteMessage(currentText, {
    nome: 'yran',
    data: formattedDate,
    horario: ceremonyTime || '16:00',
    link: `${window.location.origin}/c/exemplo?whatsapp=5534999198782&nome=yran&wa=1`,
    casal: coupleNames || 'Tais & Yran',
    local: ceremonyVenue || 'Igreja / Espaço de Eventos',
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/50 backdrop-blur-sm animate-fade-in overflow-y-auto">
      <div className="bg-[#FAF8F5] border border-gold/25 rounded-3xl p-5 sm:p-8 max-w-3xl w-full shadow-2xl space-y-6 my-auto">
        {/* Cabeçalho */}
        <div className="flex items-start justify-between pb-4 border-b border-gold/15">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="p-2 rounded-xl bg-emerald-500/10 text-emerald-700">
                <MessageCircle size={22} />
              </span>
              <h3 className="font-serif text-2xl text-ink">Personalizar Mensagem do WhatsApp</h3>
            </div>
            <p className="text-xs text-ink/70">
              Edite o texto que é entregue no WhatsApp do convidado junto com o botão oficial interativo Webview.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-9 h-9 rounded-full bg-black/5 hover:bg-black/10 flex items-center justify-center text-ink/70 transition shrink-0"
          >
            <X size={18} />
          </button>
        </div>

        {/* Abas das Campanhas */}
        <div className="flex flex-wrap gap-2 p-1.5 rounded-2xl bg-white/70 border border-gold/15">
          {CAMPAIGN_OPTIONS.map((opt) => (
            <button
              key={opt.id}
              type="button"
              onClick={() => setSelectedCampaign(opt.id)}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition ${
                selectedCampaign === opt.id
                  ? 'bg-gold text-white shadow-sm'
                  : 'text-ink/60 hover:text-ink hover:bg-white/50'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="py-12 text-center text-sm text-ink/60">Carregando modelo atual...</div>
        ) : (
          <div className="grid gap-6 lg:grid-cols-2">
            {/* Coluna 1: Editor */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-[10px] uppercase font-bold tracking-widest text-ink/60">
                  Texto da Mensagem
                </label>
                <button
                  type="button"
                  onClick={handleRestoreDefault}
                  className="text-[10px] font-bold uppercase tracking-wider text-gold hover:underline flex items-center gap-1"
                >
                  <RotateCcw size={11} /> Restaurar Padrão
                </button>
              </div>

              <textarea
                ref={textareaRef}
                rows={9}
                value={currentText}
                onChange={(e) => handleTextChange(e.target.value)}
                placeholder="Digite a mensagem do convite..."
                className="w-full rounded-2xl border border-gold/20 bg-white p-4 font-sans text-sm leading-relaxed text-ink outline-none focus:border-gold resize-y shadow-inner"
              />

              {/* Inserção Rápida de Variáveis */}
              <div className="space-y-1.5">
                <p className="text-[10px] font-bold uppercase tracking-widest text-ink/50">
                  Clique para inserir no texto:
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {VARIABLE_TAGS.map(({ tag, label, icon: Icon }) => (
                    <button
                      key={tag}
                      type="button"
                      onClick={() => insertVariable(tag)}
                      title={`${label} (ex: insere ${tag})`}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300/40 text-[11px] font-semibold transition"
                    >
                      <Icon size={11} className="opacity-70" />
                      {tag}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Coluna 2: Simulação Visual WhatsApp */}
            <div className="space-y-2">
              <p className="text-[10px] uppercase font-bold tracking-widest text-ink/60">
                Como o convidado verá no WhatsApp:
              </p>

              <div className="rounded-2xl bg-[#EFEAE2] p-4 space-y-3 border border-[#ded8cf] shadow-sm max-h-[360px] overflow-y-auto">
                {/* Balão do WhatsApp */}
                <div className="rounded-2xl bg-white p-4 shadow-sm text-sm space-y-3 border border-emerald-900/5">
                  <pre className="font-sans whitespace-pre-wrap text-sm text-ink leading-relaxed break-words">
                    {simulatedMessage}
                  </pre>
                  <div className="text-[10px] text-right text-black/40">14:30 ✓✓</div>
                </div>

                {/* Botão Interativo Webview */}
                <div className="space-y-1">
                  <div className="w-full py-3 px-4 bg-white text-emerald-800 border border-emerald-600/30 rounded-2xl font-bold text-center text-sm shadow-sm flex items-center justify-center gap-2 select-none">
                    <Sparkles size={16} className="text-emerald-600" />
                    Abrir Convite 💌
                  </div>
                  <p className="text-[10px] text-center text-ink/50">
                    O botão abre o envelope e a confirmação de presença em tela cheia direto no app.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Rodapé de Ações */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-gold/15">
          <p className="text-[11px] text-ink/50">
            Dica: mantenha a tag <strong>{'{link}'}</strong> para garantir que o link direto de contingência continue na mensagem.
          </p>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 rounded-xl border border-gold/25 bg-white/70 hover:bg-white text-xs font-bold uppercase tracking-wider text-ink transition"
            >
              Cancelar
            </button>
            <button
              type="button"
              disabled={saving}
              onClick={() => void handleSave()}
              className="px-6 py-2.5 rounded-xl bg-gold hover:brightness-110 text-white text-xs font-bold uppercase tracking-wider flex items-center gap-2 shadow-md transition disabled:opacity-50"
            >
              <Save size={15} />
              {saving ? 'Salvando...' : 'Salvar Mensagem'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
