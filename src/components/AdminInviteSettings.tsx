import type { FormEvent } from 'react';
import { INVITE_PALETTES, INVITE_THEMES, buildInviteArtSvg, parseInviteTheme } from '../../server/domain';
import type { SettingsData } from '../types';

function galleryLines(value?: string) {
  try {
    const parsed = JSON.parse(value || '[]');
    return Array.isArray(parsed) ? parsed.map((item) => String(item?.url ?? '')).filter(Boolean).join('\n') : '';
  } catch {
    return '';
  }
}

function scheduleLines(value?: string) {
  try {
    const parsed = JSON.parse(value || '[]');
    return Array.isArray(parsed) ? parsed.map((item) => [item.time, item.title, item.detail].filter(Boolean).join(' | ')).join('\n') : '';
  } catch {
    return '';
  }
}

export default function AdminInviteSettings({ settings, onChange, onSave }: {
  settings: SettingsData;
  onChange: (next: SettingsData) => void;
  onSave: (event: FormEvent) => void;
}) {
  const set = (patch: Partial<SettingsData>) => onChange({ ...settings, ...patch });
  const preview = () => {
    sessionStorage.setItem('enxoval-invite-draft', JSON.stringify(settings));
    window.open('/convite?preview=1', '_blank', 'noopener');
  };
  const download = () => {
    const svg = buildInviteArtSvg({
      coupleNames: settings.coupleNames || 'Nosso casamento',
      dateLabel: settings.weddingDate || '',
      time: settings.ceremonyTime || '',
      venue: settings.ceremonyVenue || '',
      theme: parseInviteTheme(settings.inviteTheme),
    });
    const url = URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = 'convite.svg';
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <form onSubmit={onSave} className="space-y-4">
      <h4 className="font-serif text-2xl">Convite</h4>
      <p className="text-sm opacity-70">Trocar o estilo não apaga os textos. A pré-visualização abre o rascunho atual sem gravar respostas.</p>
      <div>
        <p className="text-xs font-bold uppercase tracking-widest opacity-60">Modelos do site de casamento</p>
        <p className="mt-1 text-sm opacity-70">Seis estilos completos. A troca muda a identidade visual, sem apagar os textos, fotos, locais ou respostas.</p>
        <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {INVITE_THEMES.map((theme) => {
            const palette = INVITE_PALETTES[theme];
            const selected = (settings.inviteTheme || 'romantico') === theme || (settings.inviteTheme === 'classico' && theme === 'romantico');
            return (
              <button key={theme} type="button" onClick={() => set({ inviteTheme: theme })} aria-pressed={selected}
                className="overflow-hidden rounded-2xl border text-left transition-transform hover:-translate-y-0.5 focus-visible:outline-2"
                style={{ borderColor: selected ? palette.accent : '#e7ded4', boxShadow: selected ? `0 0 0 2px ${palette.accent}30` : 'none', background: palette.bg, color: palette.ink }}>
                <div className="flex min-h-28 flex-col items-center justify-center px-3 py-4 text-center" style={{ background: palette.bg }}>
                  <span className="text-3xl" style={{ fontFamily: '"Great Vibes", cursive' }}>Tais & Yran</span>
                  <span className="mt-2 text-[9px] uppercase tracking-[.22em]" style={{ color: palette.muted }}>02 · fevereiro · 2027</span>
                  <span className="mt-2 h-px w-12" style={{ background: palette.accent }} />
                </div>
                <div className="flex items-center justify-between gap-2 px-3 py-3" style={{ background: palette.paper, borderTop: `1px solid ${palette.line}` }}>
                  <span className="text-xs font-semibold">{palette.label}</span>
                  <span className="text-[10px] uppercase tracking-wider">{selected ? 'Selecionado' : 'Usar modelo'}</span>
                </div>
              </button>
            );
          })}
        </div>
      </div>
      <label className="block text-xs font-bold uppercase tracking-widest opacity-60">Texto do envelope
        <input value={settings.openingText || ''} onChange={(e) => set({ openingText: e.target.value })} className="mt-2 w-full rounded-2xl border border-gold/10 px-4 py-3 text-sm normal-case" />
      </label>
      <label className="block text-xs font-bold uppercase tracking-widest opacity-60">Frase romântica
        <input value={settings.romanticLine || ''} onChange={(e) => set({ romanticLine: e.target.value })} className="mt-2 w-full rounded-2xl border border-gold/10 px-4 py-3 text-sm normal-case" />
      </label>
      <label className="block text-xs font-bold uppercase tracking-widest opacity-60">Foto de capa (HTTPS)
        <input value={settings.coverPhotoUrl || ''} onChange={(e) => set({ coverPhotoUrl: e.target.value })} placeholder="https://" className="mt-2 w-full rounded-2xl border border-gold/10 px-4 py-3 text-sm normal-case" />
      </label>
      <label className="block text-xs font-bold uppercase tracking-widest opacity-60">Galeria, um link HTTPS por linha
        <textarea rows={4} value={galleryLines(settings.galleryJson)} onChange={(e) => set({ galleryJson: JSON.stringify(e.target.value.split('\n').map((line) => line.trim()).filter(Boolean).map((url) => ({ url, alt: '' }))) })} className="mt-2 w-full rounded-2xl border border-gold/10 px-4 py-3 text-sm normal-case" />
      </label>
      <label className="block text-xs font-bold uppercase tracking-widest opacity-60">Programação: horário | título | detalhe
        <textarea rows={4} value={scheduleLines(settings.scheduleJson)} onChange={(e) => {
          const schedule = e.target.value.split('\n').map((line) => line.trim()).filter(Boolean).map((line) => {
            const [time = '', title = '', detail = ''] = line.split('|').map((part) => part.trim());
            return { time, title, detail };
          });
          set({ scheduleJson: JSON.stringify(schedule) });
        }} className="mt-2 w-full rounded-2xl border border-gold/10 px-4 py-3 text-sm normal-case" />
      </label>
      <label className="block text-xs font-bold uppercase tracking-widest opacity-60">Chegada e estacionamento da cerimônia
        <textarea rows={2} value={settings.ceremonyNotes || ''} onChange={(e) => set({ ceremonyNotes: e.target.value })} className="mt-2 w-full rounded-2xl border border-gold/10 px-4 py-3 text-sm normal-case" />
      </label>
      <label className="block text-xs font-bold uppercase tracking-widest opacity-60">Orientações da recepção
        <textarea rows={2} value={settings.receptionNotes || ''} onChange={(e) => set({ receptionNotes: e.target.value })} className="mt-2 w-full rounded-2xl border border-gold/10 px-4 py-3 text-sm normal-case" />
      </label>
      <label className="block text-xs font-bold uppercase tracking-widest opacity-60">Informações adicionais
        <textarea rows={2} value={settings.extraInfo || ''} onChange={(e) => set({ extraInfo: e.target.value })} className="mt-2 w-full rounded-2xl border border-gold/10 px-4 py-3 text-sm normal-case" />
      </label>
      <label className="block text-xs font-bold uppercase tracking-widest opacity-60">Texto da confirmação
        <textarea rows={2} value={settings.rsvpText || ''} onChange={(e) => set({ rsvpText: e.target.value })} className="mt-2 w-full rounded-2xl border border-gold/10 px-4 py-3 text-sm normal-case" />
      </label>
      <div className="grid gap-2 sm:grid-cols-2">
        {[
          ['showStory', 'Mostrar história'],
          ['showGallery', 'Mostrar galeria'],
          ['showSchedule', 'Mostrar programação'],
          ['showDress', 'Mostrar traje e informações'],
          ['showGifts', 'Mostrar lista de presentes'],
        ].map(([key, label]) => (
          <label key={key} className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={settings[key as 'showStory'] !== false} onChange={(e) => set({ [key]: e.target.checked })} /> {label}
          </label>
        ))}
      </div>
      <label className="block text-xs font-bold uppercase tracking-widest opacity-60">Mensagem do convite oficial. Variáveis: {'{nome}'} {'{data}'} {'{horario}'} {'{link}'} {'{casal}'} {'{local}'}
        <textarea rows={6} value={settings.inviteTemplate || ''} onChange={(e) => set({ inviteTemplate: e.target.value })} className="mt-2 w-full rounded-2xl border border-gold/10 px-4 py-3 text-sm normal-case" />
      </label>
      <label className="block text-xs font-bold uppercase tracking-widest opacity-60">Save the date
        <textarea rows={3} value={settings.saveTheDateTemplate || ''} onChange={(e) => set({ saveTheDateTemplate: e.target.value })} className="mt-2 w-full rounded-2xl border border-gold/10 px-4 py-3 text-sm normal-case" />
      </label>
      <label className="block text-xs font-bold uppercase tracking-widest opacity-60">Lembrete para quem não respondeu
        <textarea rows={3} value={settings.reminderTemplate || ''} onChange={(e) => set({ reminderTemplate: e.target.value })} className="mt-2 w-full rounded-2xl border border-gold/10 px-4 py-3 text-sm normal-case" />
      </label>
      <label className="block text-xs font-bold uppercase tracking-widest opacity-60">Lembrete perto da data
        <textarea rows={3} value={settings.soonTemplate || ''} onChange={(e) => set({ soonTemplate: e.target.value })} className="mt-2 w-full rounded-2xl border border-gold/10 px-4 py-3 text-sm normal-case" />
      </label>
      <div className="flex flex-wrap gap-3">
        <button type="submit" className="min-h-11 rounded-2xl bg-gold px-6 text-xs font-bold uppercase tracking-widest text-white">Salvar convite</button>
        <button type="button" onClick={preview} className="min-h-11 rounded-2xl border border-gold/20 px-6 text-xs font-bold uppercase tracking-widest">Pré-visualizar</button>
        <button type="button" onClick={download} className="min-h-11 rounded-2xl border border-gold/20 px-6 text-xs font-bold uppercase tracking-widest">Baixar arte</button>
      </div>
    </form>
  );
}
