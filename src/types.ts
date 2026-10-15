export interface ProdutoComprado {
  id: string;
  nome: string;
  categoria: string;
  valor: number;
  dataCompra: string;
  imagem?: string;
}

export interface EnxovalItem {
  id: string;
  nome: string;
  descricao?: string;
  valor: number;
  prioridade: 'Alta' | 'Média' | 'Baixa';
  status: 'Disponível' | 'Reservado' | 'Comprado';
  reservadoPor?: string;
}

export interface Reserva {
  id: string;
  enxovalId: string;
  nome: string;
  whatsapp: string;
  mensagem?: string;
  dataReserva: string;
}

export interface SettingsData {
  id?: string;
  pixKey: string;
  pixName: string;
  coupleNames?: string;
  weddingDate: string;
  whatsappNumber?: string;
  whaticketApiUrl?: string;
  whaticketToken?: string;
  whaticketUserId?: string;
  whaticketQueueId?: string;
  whaticketTemplate?: string;
  guestReplyTemplate?: string;
  guestPixTemplate?: string;
  whaticketSign?: boolean;
  whaticketClose?: boolean;
  ceremonyTime?: string;
  ceremonyVenue?: string;
  ceremonyAddress?: string;
  receptionVenue?: string;
  receptionAddress?: string;
  invitationMessage?: string;
  rsvpDeadline?: string;
  dressCode?: string;
  coupleStory?: string;
  inviteTheme?: string;
  openingText?: string;
  romanticLine?: string;
  coverPhotoUrl?: string;
  galleryJson?: string;
  scheduleJson?: string;
  ceremonyNotes?: string;
  receptionNotes?: string;
  extraInfo?: string;
  rsvpText?: string;
  showStory?: boolean;
  showGallery?: boolean;
  showSchedule?: boolean;
  showDress?: boolean;
  showGifts?: boolean;
  showVideo?: boolean;
  showMenu?: boolean;
  showGroomsmen?: boolean;
  showQuiz?: boolean;
  showHotels?: boolean;
  showCityGuide?: boolean;
  showFaq?: boolean;
  showGuestAlbum?: boolean;
  videoUrl?: string;
  menuJson?: string;
  groomsmenJson?: string;
  quizJson?: string;
  hotelsJson?: string;
  cityGuideJson?: string;
  faqJson?: string;
  guestPhotosJson?: string;
  sectionStylesJson?: string;
  sectionOrderJson?: string;
  inviteTemplate?: string;
  saveTheDateTemplate?: string;
  reminderTemplate?: string;
  soonTemplate?: string;
  whatsappProvider?: 'zapo' | 'whaticket';
  smtpHost?: string;
  smtpPort?: number;
  smtpUser?: string;
  smtpPassEncrypted?: string;
  smtpSecure?: boolean;
  smtpFrom?: string;
  smtpTo?: string;
  smtpAlertsEnabled?: boolean;
  smtpMaxDailyAlerts?: number;
  smtpMinIntervalMin?: number;
  smtpDropToleranceMin?: number;
  smtpSendRecovery?: boolean;
}

