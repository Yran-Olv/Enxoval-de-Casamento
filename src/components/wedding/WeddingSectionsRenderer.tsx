import { motion } from 'motion/react';
import type { WeddingThemeConfig } from './ThemeDefinitions';
import { WEDDING_THEMES } from './ThemeDefinitions';
import type { InviteTheme } from '../../../server/domain';
import { DEFAULT_SECTION_ORDER } from '../../../server/domain';
import HeroSection from './HeroSection';
import CountdownSection from './CountdownSection';
import StorySection from './StorySection';
import VideoSection from './VideoSection';
import CeremonySection from './CeremonySection';
import ScheduleSection from './ScheduleSection';
import MenuSection from './MenuSection';
import GroomsmenSection from './GroomsmenSection';
import QuizSection from './QuizSection';
import HotelsSection from './HotelsSection';
import CityGuideSection from './CityGuideSection';
import GallerySection from './GallerySection';
import FaqSection from './FaqSection';
import ManualSection from './ManualSection';
import GuestAlbumSection from './GuestAlbumSection';
import CalendarButtons from './CalendarButtons';
import { Gift, CheckCircle2, Heart, Share2 } from 'lucide-react';

export type SectionsSettings = {
  coupleNames: string;
  weddingDate: string;
  ceremonyTime: string;
  ceremonyVenue: string;
  ceremonyAddress: string;
  ceremonyNotes: string;
  receptionVenue: string;
  receptionAddress: string;
  receptionNotes: string;
  romanticLine: string;
  coverPhotoUrl: string;
  videoUrl: string;
  coupleStory: string;
  dressCode: string;
  extraInfo: string;
  rsvpDeadline: string;
  rsvpText: string;
  inviteTheme: InviteTheme;
  showStory: boolean;
  showGallery: boolean;
  showSchedule: boolean;
  showDress: boolean;
  showGifts: boolean;
  showVideo: boolean;
  showMenu: boolean;
  showGroomsmen: boolean;
  showQuiz: boolean;
  showHotels: boolean;
  showCityGuide: boolean;
  showFaq: boolean;
  showGuestAlbum: boolean;
  gallery: any[];
  schedule: any[];
  menu: any[];
  groomsmen: any[];
  quiz: any[];
  hotels: any[];
  cityGuide: any[];
  faq: any[];
  sectionStyles: Record<string, string>;
  sectionOrder: string[];
};

type Props = {
  settings: SectionsSettings;
  guestName?: string;
  token?: string;
  seatLimit?: number;
  preview?: boolean;
  // RSVP form props
  name: string;
  setName: (v: string) => void;
  whatsapp: string;
  setWhatsapp: (v: string) => void;
  guests: string;
  setGuests: (v: string) => void;
  message: string;
  setMessage: (v: string) => void;
  submitting: boolean;
  result: 'yes' | 'no' | null;
  setResult: (v: 'yes' | 'no' | null) => void;
  error: string;
  onRespond: (attendance: 'yes' | 'no') => void;
  onShare: () => void;
  shareNote: string;
  onNavigateToRegistry: () => void;
};

export default function WeddingSectionsRenderer({
  settings,
  guestName,
  token,
  seatLimit = 6,
  preview = false,
  name,
  setName,
  whatsapp,
  setWhatsapp,
  guests,
  setGuests,
  message,
  setMessage,
  submitting,
  result,
  setResult,
  error,
  onRespond,
  onShare,
  shareNote,
  onNavigateToRegistry,
}: Props) {
  const themeConfig = WEDDING_THEMES[settings.inviteTheme] || WEDDING_THEMES.romantico;
  const p = themeConfig.palette;
  const styles = settings.sectionStyles || {};
  const order = settings.sectionOrder && settings.sectionOrder.length > 0
    ? settings.sectionOrder
    : DEFAULT_SECTION_ORDER;

  const scrollToRsvp = () => {
    document.getElementById('confirmar')?.scrollIntoView({ behavior: 'smooth' });
  };

  const locationLabel = settings.ceremonyVenue || settings.ceremonyAddress;

  const renderSection = (key: string) => {
    switch (key) {
      case 'hero':
        return (
          <HeroSection
            key="hero"
            theme={themeConfig}
            styleVariant={styles.hero || 'tradicional'}
            coupleNames={settings.coupleNames}
            weddingDate={settings.weddingDate}
            ceremonyTime={settings.ceremonyTime}
            location={locationLabel}
            romanticLine={settings.romanticLine}
            coverPhotoUrl={settings.coverPhotoUrl}
            guestName={guestName}
            onRsvpClick={scrollToRsvp}
          />
        );

      case 'countdown':
        return (
          <CountdownSection
            key="countdown"
            theme={themeConfig}
            styleVariant={styles.countdown || 'tradicional'}
            weddingDate={settings.weddingDate}
            ceremonyTime={settings.ceremonyTime}
          />
        );

      case 'story':
        if (!settings.showStory) return null;
        return (
          <StorySection
            key="story"
            theme={themeConfig}
            styleVariant={styles.story || 'cartas'}
            coupleStory={settings.coupleStory}
            coupleNames={settings.coupleNames}
          />
        );

      case 'video':
        if (!settings.showVideo || !settings.videoUrl) return null;
        return (
          <VideoSection
            key="video"
            theme={themeConfig}
            videoUrl={settings.videoUrl}
            coupleNames={settings.coupleNames}
          />
        );

      case 'ceremony':
        return (
          <CeremonySection
            key="ceremony"
            theme={themeConfig}
            styleVariant={styles.ceremony || 'cartao'}
            ceremonyTime={settings.ceremonyTime}
            ceremonyVenue={settings.ceremonyVenue}
            ceremonyAddress={settings.ceremonyAddress}
            ceremonyNotes={settings.ceremonyNotes}
            receptionVenue={settings.receptionVenue}
            receptionAddress={settings.receptionAddress}
            receptionNotes={settings.receptionNotes}
            weddingDate={settings.weddingDate}
          />
        );

      case 'schedule':
        if (!settings.showSchedule) return null;
        return (
          <ScheduleSection
            key="schedule"
            theme={themeConfig}
            schedule={settings.schedule}
          />
        );

      case 'menu':
        if (!settings.showMenu) return null;
        return (
          <MenuSection
            key="menu"
            theme={themeConfig}
            menu={settings.menu}
          />
        );

      case 'groomsmen':
        if (!settings.showGroomsmen) return null;
        return (
          <GroomsmenSection
            key="groomsmen"
            theme={themeConfig}
            groomsmen={settings.groomsmen}
          />
        );

      case 'gallery':
        if (!settings.showGallery) return null;
        return (
          <GallerySection
            key="gallery"
            theme={themeConfig}
            styleVariant={styles.gallery || 'grade'}
            gallery={settings.gallery}
          />
        );

      case 'quiz':
        if (!settings.showQuiz) return null;
        return (
          <QuizSection
            key="quiz"
            theme={themeConfig}
            quiz={settings.quiz}
            coupleNames={settings.coupleNames}
          />
        );

      case 'hotels':
        if (!settings.showHotels) return null;
        return (
          <HotelsSection
            key="hotels"
            theme={themeConfig}
            hotels={settings.hotels}
          />
        );

      case 'cityGuide':
        if (!settings.showCityGuide) return null;
        return (
          <CityGuideSection
            key="cityGuide"
            theme={themeConfig}
            cityGuide={settings.cityGuide}
          />
        );

      case 'faq':
        if (!settings.showFaq) return null;
        return (
          <FaqSection
            key="faq"
            theme={themeConfig}
            styleVariant={styles.faq || 'accordion'}
            faq={settings.faq}
          />
        );

      case 'manual':
        if (!settings.showDress) return null;
        return (
          <ManualSection
            key="manual"
            theme={themeConfig}
            dressCode={settings.dressCode}
            extraInfo={settings.extraInfo}
          />
        );

      case 'registry':
        if (!settings.showGifts) return null;
        return (
          <section key="registry" className="py-20 px-4 text-center">
            <div className={`max-w-3xl mx-auto p-10 sm:p-14 ${themeConfig.cardClass}`}>
              <div
                className="w-16 h-16 mx-auto mb-6 rounded-2xl grid place-items-center shadow-md"
                style={{ background: `${p.accent}20`, color: p.accent }}
              >
                <Gift size={32} />
              </div>

              <span className="text-xs uppercase tracking-[0.25em] font-semibold opacity-60">
                Nosso Novo Começo
              </span>
              <h2 className="text-3xl sm:text-5xl font-serif mt-2 mb-4" style={{ fontFamily: themeConfig.fontTitle }}>
                Lista de Presentes & Enxoval
              </h2>
              <p className="text-sm sm:text-base opacity-80 max-w-lg mx-auto mb-8 leading-relaxed">
                Preparamos uma lista de presentes e itens do nosso enxoval com muito carinho. Você pode escolher presentear com o item ou contribuir com PIX!
              </p>

              <button
                type="button"
                onClick={onNavigateToRegistry}
                className={themeConfig.buttonClass}
              >
                Ver Lista de Presentes Completa
              </button>
            </div>
          </section>
        );

      case 'guestAlbum':
        if (!settings.showGuestAlbum) return null;
        return (
          <GuestAlbumSection
            key="guestAlbum"
            theme={themeConfig}
            coupleNames={settings.coupleNames}
          />
        );

      case 'rsvp':
        return (
          <section key="rsvp" id="confirmar" className="py-20 px-4">
            <div className="max-w-4xl mx-auto">
              <div className="text-center mb-12">
                <span className="text-xs uppercase tracking-[0.25em] font-semibold opacity-60">Sua Presença é o Maior Presente</span>
                <h2 className="text-3xl sm:text-5xl font-serif mt-2" style={{ fontFamily: themeConfig.fontTitle }}>
                  Confirmação de Presença
                </h2>
                <p className="mt-3 text-sm opacity-80 max-w-md mx-auto">
                  {settings.rsvpText || 'Por favor, confirme se poderemos comemorar juntos até a data limite.'}
                </p>
              </div>

              <div className={`p-8 sm:p-12 ${themeConfig.cardClass} shadow-xl max-w-2xl mx-auto`}>
                {result ? (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="text-center py-6"
                  >
                    <CheckCircle2 size={48} className="mx-auto mb-4" style={{ color: p.accent }} />
                    <h3 className="text-2xl sm:text-3xl font-serif font-bold mb-2" style={{ fontFamily: themeConfig.fontTitle }}>
                      {result === 'yes' ? 'Presença Confirmada com Sucesso!' : 'Agradecemos por Avisar!'}
                    </h3>
                    <p className="text-sm opacity-80 max-w-md mx-auto leading-relaxed">
                      {result === 'yes'
                        ? 'Ficamos muito felizes! Guardamos sua resposta com muito amor.'
                        : 'Sentiremos sua falta nesse dia tão especial! Obrigado pelo carinho.'}
                    </p>
                    {!preview && (
                      <button
                        type="button"
                        onClick={() => setResult(null)}
                        className="mt-6 text-xs uppercase tracking-wider font-semibold underline hover:opacity-100 opacity-70"
                        style={{ color: p.accent }}
                      >
                        Corrigir resposta
                      </button>
                    )}
                  </motion.div>
                ) : (
                  <form onSubmit={(e) => e.preventDefault()} className="space-y-5 text-left">
                    <div>
                      <label className="block text-xs uppercase font-bold tracking-wider opacity-70 mb-1.5">
                        Seu Nome Completo *
                      </label>
                      <input
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="Ex.: Carolina & Thiago"
                        required
                        className="w-full px-4 py-3 rounded-xl border border-current/20 bg-current/5 text-sm focus:outline-none focus:ring-2 focus:ring-current text-inherit"
                      />
                    </div>

                    {!token && (
                      <div>
                        <label className="block text-xs uppercase font-bold tracking-wider opacity-70 mb-1.5">
                          WhatsApp (com DDD) *
                        </label>
                        <input
                          type="tel"
                          value={whatsapp}
                          onChange={(e) => setWhatsapp(e.target.value)}
                          placeholder="Ex.: (34) 99999-8888"
                          required
                          className="w-full px-4 py-3 rounded-xl border border-current/20 bg-current/5 text-sm focus:outline-none focus:ring-2 focus:ring-current text-inherit"
                        />
                      </div>
                    )}

                    <div>
                      <label className="block text-xs uppercase font-bold tracking-wider opacity-70 mb-1.5">
                        Quantidade de Pessoas:
                      </label>
                      <select
                        value={guests}
                        onChange={(e) => setGuests(e.target.value)}
                        className="w-full px-4 py-3 rounded-xl border border-current/20 bg-current/5 text-sm focus:outline-none focus:ring-2 focus:ring-current text-inherit"
                      >
                        {Array.from({ length: token ? seatLimit : 6 }, (_, i) => i + 1).map((n) => (
                          <option key={n} value={n} className="text-black">
                            {n} {n === 1 ? 'pessoa' : 'pessoas'}
                          </option>
                        ))}
                      </select>
                      {token && (
                        <p className="mt-1 text-[11px] opacity-65">
                          Este convite autoriza até {seatLimit} {seatLimit === 1 ? 'pessoa' : 'pessoas'}.
                        </p>
                      )}
                    </div>

                    <div>
                      <label className="block text-xs uppercase font-bold tracking-wider opacity-70 mb-1.5">
                        Deixe um recado carinhoso para os noivos:
                      </label>
                      <textarea
                        value={message}
                        onChange={(e) => setMessage(e.target.value)}
                        rows={3}
                        placeholder="Escreva sua mensagem aqui..."
                        className="w-full px-4 py-3 rounded-xl border border-current/20 bg-current/5 text-sm focus:outline-none focus:ring-2 focus:ring-current text-inherit"
                      />
                    </div>

                    {error && (
                      <p className="p-3 bg-rose-50 text-rose-800 text-xs rounded-xl font-medium">
                        {error}
                      </p>
                    )}

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                      <button
                        type="button"
                        disabled={submitting || preview}
                        onClick={() => onRespond('yes')}
                        className={`w-full ${themeConfig.buttonClass} disabled:opacity-50 text-center justify-center`}
                      >
                        {submitting ? 'Confirmando…' : 'Sim! Estarei lá ✨'}
                      </button>

                      <button
                        type="button"
                        disabled={submitting || preview}
                        onClick={() => onRespond('no')}
                        className="w-full rounded-full border border-current/30 px-6 py-3 text-xs font-semibold uppercase tracking-wider hover:bg-current/10 transition-colors disabled:opacity-50 text-center"
                      >
                        Não poderei ir
                      </button>
                    </div>
                  </form>
                )}
              </div>

              {/* Botões de Calendário e Compartilhamento */}
              <div className="mt-12 flex flex-col items-center gap-4 text-center">
                <CalendarButtons
                  coupleNames={settings.coupleNames}
                  weddingDate={settings.weddingDate}
                  ceremonyTime={settings.ceremonyTime}
                  invitationMessage={settings.romanticLine || settings.rsvpText}
                  location={locationLabel}
                />

                <div className="flex items-center gap-3 mt-2">
                  <button
                    type="button"
                    onClick={onShare}
                    className="inline-flex items-center gap-1.5 text-xs uppercase tracking-wider font-semibold opacity-70 hover:opacity-100"
                  >
                    <Share2 size={14} /> Compartilhar Convite
                  </button>
                  {shareNote && <span className="text-xs opacity-90 font-medium">({shareNote})</span>}
                </div>
              </div>
            </div>
          </section>
        );

      default:
        return null;
    }
  };

  return (
    <div className={`min-h-screen ${themeConfig.containerClass} transition-colors duration-500`}>
      {order.map((key) => renderSection(key))}

      {/* Footer elegante */}
      <footer className="py-16 px-4 text-center border-t border-current/10 opacity-75">
        <p className="text-3xl sm:text-4xl" style={{ fontFamily: themeConfig.fontScript }}>
          {settings.coupleNames}
        </p>
        <p className="mt-2 text-xs uppercase tracking-[0.25em] opacity-60">
          Feito com muito amor para o nosso grande dia
        </p>
      </footer>
    </div>
  );
}
