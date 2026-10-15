export const WEDDING_TIME_ZONE = "America/Sao_Paulo";
export const DEFAULT_INVITATION_MESSAGE =
  "Com muito amor, queremos compartilhar esse momento especial com você. Sua presença tornará nosso dia ainda mais inesquecível.";

const PRIORITIES = ["Alta", "Média", "Baixa"] as const;
const ITEM_STATUSES = ["Disponível", "Reservado", "Comprado"] as const;

export class InputError extends Error {
  status: number;
  constructor(message: string, status = 400) {
    super(message);
    this.name = "InputError";
    this.status = status;
  }
}

export function digitsOnly(value: unknown): string {
  return String(value ?? "").replace(/\D/g, "");
}

export function todayInWeddingZone(now = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: WEDDING_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}

export function isRsvpClosed(deadline: string, now = new Date()): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(deadline)) return false;
  return todayInWeddingZone(now) > deadline;
}

export function parseCeremonyTime(value: unknown): string {
  const raw = String(value ?? "").trim();
  const match = /^(\d{2}):(\d{2})/.exec(raw);
  if (!match) return "16:00";
  const hour = Number(match[1]);
  const minute = Number(match[2]);
  if (hour > 23 || minute > 59) return "16:00";
  return `${match[1]}:${match[2]}`;
}

export function parseIsoDate(value: unknown, fallback = ""): string {
  const raw = String(value ?? "").trim();
  return /^\d{4}-\d{2}-\d{2}$/.test(raw) ? raw : fallback;
}

export function parseMoney(value: unknown, label = "Valor"): number {
  let raw = value;
  if (typeof raw === "string") {
    raw = parseFloat(raw.replace(/\s/g, "").replace(",", "."));
  }
  const amount = typeof raw === "number" ? raw : Number(raw);
  if (!Number.isFinite(amount) || amount < 0 || amount > 10_000_000) {
    throw new InputError(`${label} inválido.`);
  }
  return Math.round(amount * 100) / 100;
}

export type RsvpInput = {
  name: string;
  whatsapp: string;
  attending: boolean;
  guests: number;
  message: string | null;
};

export function parseRsvpInput(body: Record<string, unknown>, options?: { maxGuests?: number }): RsvpInput {
  const maxGuests = options?.maxGuests ?? 6;
  const name = String(body.name ?? "").trim().slice(0, 120);
  const whatsapp = digitsOnly(body.whatsapp);
  if (!name) throw new InputError("Informe seu nome.");
  if (whatsapp.length < 10 || whatsapp.length > 13) {
    throw new InputError("Informe um WhatsApp válido com DDD.");
  }
  if (typeof body.attending !== "boolean") {
    throw new InputError("Informe se você poderá comparecer.");
  }
  const attending = body.attending;
  const guests = attending ? Number(body.guests ?? 1) : 0;
  if (attending && (!Number.isInteger(guests) || guests < 1 || guests > maxGuests)) {
    throw new InputError(
      maxGuests === 6
        ? "A quantidade de pessoas deve ser entre 1 e 6."
        : `Este convite permite no máximo ${maxGuests} ${maxGuests === 1 ? "pessoa" : "pessoas"}.`,
    );
  }
  const messageRaw = String(body.message ?? "").trim().slice(0, 1000);
  return { name, whatsapp, attending, guests, message: messageRaw || null };
}

export type ReservationInput = {
  enxovalId: string;
  nome: string;
  whatsapp: string;
  mensagem: string | null;
};

export function parseReservationInput(body: Record<string, unknown>): ReservationInput {
  const enxovalId = String(body.enxovalId ?? "").trim();
  const nome = String(body.nome ?? "").trim().slice(0, 120);
  const whatsapp = digitsOnly(body.whatsapp);
  const mensagemRaw = String(body.mensagem ?? "").trim().slice(0, 1000);
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(enxovalId)) {
    throw new InputError("Presente inválido.");
  }
  if (!nome) throw new InputError("Nome é obrigatório.");
  if (whatsapp.length < 10 || whatsapp.length > 13) {
    throw new InputError("Informe um WhatsApp válido com DDD.");
  }
  return { enxovalId, nome, whatsapp, mensagem: mensagemRaw || null };
}

export type RegistryWrite = {
  nome: string;
  descricao: string | null;
  valor: number;
  prioridade: (typeof PRIORITIES)[number];
  status: (typeof ITEM_STATUSES)[number];
  reservadoPor: string | null;
};

export function parseRegistryWrite(body: Record<string, unknown>): RegistryWrite {
  const nome = String(body.nome ?? "").trim().slice(0, 180);
  const descricaoRaw = String(body.descricao ?? "").trim().slice(0, 1000);
  const prioridade = String(body.prioridade ?? "").trim();
  const status = String(body.status ?? "Disponível").trim();
  if (!nome) throw new InputError("Nome é obrigatório.");
  if (!PRIORITIES.includes(prioridade as RegistryWrite["prioridade"])) {
    throw new InputError("Prioridade é obrigatória.");
  }
  if (!ITEM_STATUSES.includes(status as RegistryWrite["status"])) {
    throw new InputError("Status inválido.");
  }
  const reservadoPorRaw = String(body.reservadoPor ?? "").trim().slice(0, 120);
  return {
    nome,
    descricao: descricaoRaw || null,
    valor: parseMoney(body.valor),
    prioridade: prioridade as RegistryWrite["prioridade"],
    status: status as RegistryWrite["status"],
    reservadoPor: reservadoPorRaw || null,
  };
}

export function assertHttpsApiUrl(value: unknown, fallback: string): string {
  const raw = String(value ?? "").trim() || fallback;
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    throw new InputError("URL da API WhatsApp inválida.");
  }
  if (url.protocol !== "https:") {
    throw new InputError("A URL da API WhatsApp precisa usar HTTPS.");
  }
  return url.toString();
}

export function addCalendarDays(isoDate: string, days: number): string {
  const [year, month, day] = isoDate.split("-").map(Number);
  const next = new Date(Date.UTC(year, month - 1, day + days));
  return next.toISOString().slice(0, 10);
}

export function calendarRange(date: string, time: string, durationHours = 4) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    throw new InputError("Data do evento inválida.");
  }
  const parsed = parseCeremonyTime(time);
  const [hourText, minuteText] = parsed.split(":");
  const hour = Number(hourText);
  const minute = Number(minuteText);
  const totalMinutes = hour * 60 + minute + durationHours * 60;
  const extraDays = Math.floor(totalMinutes / (24 * 60));
  const endMinutes = totalMinutes % (24 * 60);
  const pad = (n: number) => String(n).padStart(2, "0");
  const startStamp = `${date.replaceAll("-", "")}T${pad(hour)}${pad(minute)}00`;
  const endDate = addCalendarDays(date, extraDays);
  const endStamp = `${endDate.replaceAll("-", "")}T${pad(Math.floor(endMinutes / 60))}${pad(endMinutes % 60)}00`;
  return { startStamp, endStamp, timeZone: WEDDING_TIME_ZONE };
}

export function googleCalendarUrl(input: {
  coupleNames: string;
  weddingDate: string;
  ceremonyTime: string;
  invitationMessage: string;
  location: string;
}): string {
  const range = calendarRange(input.weddingDate, input.ceremonyTime);
  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: `Casamento — ${input.coupleNames || "Nosso casamento"}`,
    dates: `${range.startStamp}/${range.endStamp}`,
    ctz: range.timeZone,
    details: input.invitationMessage || DEFAULT_INVITATION_MESSAGE,
    location: input.location,
  });
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

function icsEscape(value: string): string {
  return value.replaceAll("\\", "\\\\").replaceAll("\n", "\\n").replaceAll(",", "\\,").replaceAll(";", "\\;");
}

export function buildIcs(input: {
  coupleNames: string;
  weddingDate: string;
  ceremonyTime: string;
  invitationMessage: string;
  location: string;
}): string {
  const range = calendarRange(input.weddingDate, input.ceremonyTime);
  const summary = icsEscape(`Casamento — ${input.coupleNames || "Nosso casamento"}`);
  const description = icsEscape(input.invitationMessage || DEFAULT_INVITATION_MESSAGE);
  const location = icsEscape(input.location);
  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Nosso Enxoval//Convite//PT",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `DTSTART;TZID=${range.timeZone}:${range.startStamp}`,
    `DTEND;TZID=${range.timeZone}:${range.endStamp}`,
    `SUMMARY:${summary}`,
    `DESCRIPTION:${description}`,
    `LOCATION:${location}`,
    "END:VEVENT",
    "END:VCALENDAR",
    "",
  ].join("\r\n");
}

export function invitationUrl(origin: string): string {
  return `${origin.replace(/\/+$/, "")}/convite`;
}

export function whatsappChatUrl(raw: string): string {
  const digits = digitsOnly(raw);
  const withCountry = digits.length === 10 || digits.length === 11 ? `55${digits}` : digits;
  return `https://wa.me/${withCountry}`;
}

const AUDIO_SIGNATURES: Array<{ ext: string; mime: string; test: (buf: Buffer) => boolean }> = [
  { ext: "mp3", mime: "audio/mpeg", test: (buf) => buf.length > 3 && buf.subarray(0, 3).toString("ascii") === "ID3" },
  { ext: "mp3", mime: "audio/mpeg", test: (buf) => buf.length > 2 && buf[0] === 0xff && (buf[1] & 0xe0) === 0xe0 },
  { ext: "wav", mime: "audio/wav", test: (buf) => buf.length > 12 && buf.subarray(0, 4).toString("ascii") === "RIFF" && buf.subarray(8, 12).toString("ascii") === "WAVE" },
  { ext: "ogg", mime: "audio/ogg", test: (buf) => buf.length > 4 && buf.subarray(0, 4).toString("ascii") === "OggS" },
  { ext: "webm", mime: "audio/webm", test: (buf) => buf.length > 4 && buf[0] === 0x1a && buf[1] === 0x45 && buf[2] === 0xdf && buf[3] === 0xa3 },
  { ext: "m4a", mime: "audio/mp4", test: (buf) => buf.length > 12 && buf.subarray(4, 8).toString("ascii") === "ftyp" },
];

export function detectAudio(buf: Buffer): { ext: string; mime: string } | null {
  if (!Buffer.isBuffer(buf) || buf.length < 1024 || buf.length > 12 * 1024 * 1024) return null;
  const match = AUDIO_SIGNATURES.find((item) => item.test(buf));
  return match ? { ext: match.ext, mime: match.mime } : null;
}

export const INVITE_THEMES = ["boho", "romantico", "minimal", "editorial", "jardim", "gala"] as const;
// "classico" permanece aceito para compatibilidade com configurações antigas.
export type InviteTheme = (typeof INVITE_THEMES)[number] | "classico";
export const INVITE_CAMPAIGNS = ["official", "save-the-date", "reminder", "soon"] as const;
export type InviteCampaign = (typeof INVITE_CAMPAIGNS)[number];
export const GUEST_GROUPS = ["familia", "amigos", "padrinhos", "outros"] as const;

export const DEFAULT_OPENING_TEXT = "Você recebeu um convite especial";
export const DEFAULT_RSVP_TEXT = "Sua presença é o presente mais importante. Conte se poderemos comemorar juntos.";
export const DEFAULT_INVITE_TEMPLATE =
  "Olá, {nome}! ❤️\n\nPreparamos um convite muito especial para você.\n\nNós vamos nos casar e ficaremos muito felizes em compartilhar esse momento com você!\n\n📅 Data: {data}\n🕒 Horário: {horario}\n\nAbra seu convite especial:\n{link}\n\nEsperamos você! Com carinho, {casal}.";
export const DEFAULT_SAVE_THE_DATE_TEMPLATE =
  "Olá, {nome}! Guarde esta data com carinho.\n\n📅 {data}, às {horario}\n\n{casal} vão se casar. O convite completo está aqui:\n{link}";
export const DEFAULT_REMINDER_TEMPLATE =
  "Olá, {nome}! Ainda não recebemos sua resposta para o casamento de {casal}.\n\n📅 {data} às {horario}\n\nAbra o convite e confirme sua presença:\n{link}";
export const DEFAULT_SOON_TEMPLATE =
  "Olá, {nome}! O casamento de {casal} está chegando.\n\n📅 {data} às {horario}\n\nVeja os detalhes no seu convite:\n{link}";

export const INVITE_PALETTES: Record<InviteTheme, {
  label: string;
  bg: string;
  paper: string;
  ink: string;
  accent: string;
  seal: string;
  muted: string;
  line: string;
  onAccent: string;
}> = {
  classico: { label: "Romântico clássico", bg: "#f6f0e7", paper: "#fffdf9", ink: "#3f332b", accent: "#7d6244", seal: "#6f5438", muted: "#7d6d5e", line: "#eadfd2", onAccent: "#fffaf4" },
  romantico: { label: "Romântico", bg: "#fff5f3", paper: "#fffdfc", ink: "#49343a", accent: "#a56c7d", seal: "#865365", muted: "#8d7078", line: "#eedde2", onAccent: "#fffafc" },
  minimal: { label: "Minimal moderno", bg: "#f5f5f3", paper: "#ffffff", ink: "#171717", accent: "#242424", seal: "#111111", muted: "#686868", line: "#dededb", onAccent: "#ffffff" },
  jardim: { label: "Jardim botânico", bg: "#eef3ee", paper: "#fbfdfb", ink: "#243128", accent: "#3f6b4e", seal: "#2f5a40", muted: "#5d6f62", line: "#d5e3d8", onAccent: "#f7fbf7" },
  editorial: { label: "Minimalista editorial", bg: "#f4f4f2", paper: "#ffffff", ink: "#161616", accent: "#111111", seal: "#111111", muted: "#5c5c5c", line: "#e4e4e4", onAccent: "#ffffff" },
  boho: { label: "Boho elegante", bg: "#f8f1e8", paper: "#fffaf5", ink: "#4a3328", accent: "#a15c38", seal: "#8d4d2e", muted: "#8a6d5b", line: "#eddccb", onAccent: "#fff8f3" },
  gala: { label: "Noite de gala", bg: "#141318", paper: "#211e26", ink: "#f4ecdf", accent: "#c6a36a", seal: "#c6a36a", muted: "#b7ab9c", line: "#3a3442", onAccent: "#1a140c" },
};

const CAMPAIGN_FIELD: Record<InviteCampaign, "inviteTemplate" | "saveTheDateTemplate" | "reminderTemplate" | "soonTemplate"> = {
  official: "inviteTemplate",
  "save-the-date": "saveTheDateTemplate",
  reminder: "reminderTemplate",
  soon: "soonTemplate",
};

export function parseInviteTheme(value: unknown): InviteTheme {
  const raw = String(value ?? "").trim();
  // Migra visualmente o antigo tema "classico" para o modelo Romântico sem alterar dados.
  if (raw === "classico" || raw === "") return "romantico";
  return INVITE_THEMES.includes(raw as (typeof INVITE_THEMES)[number])
    ? (raw as (typeof INVITE_THEMES)[number])
    : "romantico";
}

export function parseInviteCampaign(value: unknown): InviteCampaign {
  const raw = String(value ?? "").trim();
  if (!INVITE_CAMPAIGNS.includes(raw as InviteCampaign)) {
    throw new InputError("Escolha o tipo de mensagem antes de enviar.");
  }
  return raw as InviteCampaign;
}

export function isInviteToken(value: unknown): boolean {
  return /^[A-Za-z0-9_-]{22,80}$/.test(String(value ?? ""));
}

export function createInviteToken(): string {
  const bytes = new Uint8Array(18);
  crypto.getRandomValues(bytes);
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replaceAll("+", "-").replaceAll("/", "_").replaceAll("=", "");
}

export function normalizeWhatsappNumber(raw: unknown): string {
  const digits = digitsOnly(raw);
  if (digits.length === 10 || digits.length === 11) return `55${digits}`;
  if ((digits.length === 12 || digits.length === 13) && digits.startsWith("55")) return digits;
  throw new InputError("Informe o WhatsApp com DDD. Ex.: 34999998888 ou 5534999998888.");
}

export function coupleInitials(coupleNames: string): string {
  const parts = coupleNames.split(/\s*(?:&|e)\s*/i).map((part) => part.trim()).filter(Boolean);
  const letters = (parts.length >= 2 ? parts.slice(0, 2) : coupleNames.trim().split(/\s+/).slice(0, 2))
    .map((part) => part.charAt(0).toLocaleUpperCase("pt-BR"))
    .join(" & ");
  return letters || "T & Y";
}

function clipText(value: unknown, max: number, fallback = ""): string {
  const text = String(value ?? "").replace(/\s+/g, " ").trim();
  return (text || fallback).slice(0, max);
}

function httpsUrlOrEmpty(value: unknown, label: string): string {
  const raw = String(value ?? "").trim();
  if (!raw) return "";
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    throw new InputError(`${label} precisa ser um link HTTPS.`);
  }
  if (url.protocol !== "https:" || url.username || url.password) {
    throw new InputError(`${label} precisa ser um link HTTPS.`);
  }
  return url.toString().slice(0, 500);
}

export type GalleryItem = { url: string; alt: string };
export type ScheduleItem = { time: string; title: string; detail: string };

export function parseGallery(value: unknown): GalleryItem[] {
  let raw = value;
  if (typeof raw === "string") {
    if (!raw.trim()) return [];
    try {
      raw = JSON.parse(raw);
    } catch {
      throw new InputError("A galeria de fotos está em um formato inválido.");
    }
  }
  if (raw == null) return [];
  if (!Array.isArray(raw)) throw new InputError("A galeria de fotos está em um formato inválido.");
  return raw.slice(0, 8).flatMap((entry) => {
    if (!entry || typeof entry !== "object") return [];
    const record = entry as Record<string, unknown>;
    const url = httpsUrlOrEmpty(record.url, "Cada foto");
    if (!url) return [];
    return [{ url, alt: clipText(record.alt, 80) }];
  });
}

export function parseSchedule(value: unknown): ScheduleItem[] {
  let raw = value;
  if (typeof raw === "string") {
    if (!raw.trim()) return [];
    try {
      raw = JSON.parse(raw);
    } catch {
      throw new InputError("A programação está em um formato inválido.");
    }
  }
  if (raw == null) return [];
  if (!Array.isArray(raw)) throw new InputError("A programação está em um formato inválido.");
  return raw.slice(0, 12).flatMap((entry) => {
    if (!entry || typeof entry !== "object") return [];
    const record = entry as Record<string, unknown>;
    const title = clipText(record.title, 80);
    if (!title) return [];
    return [{ time: parseCeremonyTime(record.time), title, detail: clipText(record.detail, 180) }];
  });
}

function flag(value: unknown, fallback: boolean): boolean {
  if (typeof value === "boolean") return value;
  if (value === "true" || value === "1") return true;
  if (value === "false" || value === "0") return false;
  return fallback;
}

export type MenuItem = {
  id: string;
  category: "entradas" | "principais" | "sobremesas" | "bebidas" | "outro";
  title: string;
  description: string;
};

export type GroomsmanItem = {
  id: string;
  name: string;
  role: "padrinho" | "madrinha" | "dama" | "pajem" | "outro";
  photoUrl: string;
  description: string;
};

export type QuizItem = {
  id: string;
  question: string;
  options: string[];
  answerIndex: number;
  explanation: string;
};

export type HotelItem = {
  id: string;
  name: string;
  address: string;
  phone: string;
  link: string;
  discountCode: string;
  notes: string;
};

export type CityGuideItem = {
  id: string;
  category: "restaurante" | "beleza" | "passeio" | "hotel" | "outro";
  name: string;
  tip: string;
  address: string;
  link: string;
};

export type FaqItem = {
  id: string;
  question: string;
  answer: string;
};

export type SectionStyles = {
  hero?: string;
  countdown?: string;
  story?: string;
  ceremony?: string;
  gallery?: string;
  registry?: string;
  faq?: string;
  album?: string;
  menu?: string;
  groomsmen?: string;
};

export const DEFAULT_SECTION_ORDER = [
  "hero",
  "countdown",
  "story",
  "video",
  "ceremony",
  "schedule",
  "menu",
  "groomsmen",
  "gallery",
  "quiz",
  "hotels",
  "cityGuide",
  "faq",
  "manual",
  "registry",
  "guestAlbum",
  "rsvp",
];

export function parseMenu(value: unknown): MenuItem[] {
  let raw = value;
  if (typeof raw === "string") {
    if (!raw.trim()) return [];
    try { raw = JSON.parse(raw); } catch { return []; }
  }
  if (!Array.isArray(raw)) return [];
  return raw.slice(0, 30).flatMap((item, idx) => {
    if (!item || typeof item !== "object") return [];
    const r = item as Record<string, unknown>;
    const title = clipText(r.title, 100);
    if (!title) return [];
    const category = String(r.category || "entradas").toLowerCase() as MenuItem["category"];
    return [{
      id: String(r.id || `menu-${idx}-${Date.now()}`),
      category: ["entradas", "principais", "sobremesas", "bebidas"].includes(category) ? category : "outro",
      title,
      description: clipText(r.description, 300),
    }];
  });
}

export function parseGroomsmen(value: unknown): GroomsmanItem[] {
  let raw = value;
  if (typeof raw === "string") {
    if (!raw.trim()) return [];
    try { raw = JSON.parse(raw); } catch { return []; }
  }
  if (!Array.isArray(raw)) return [];
  return raw.slice(0, 40).flatMap((item, idx) => {
    if (!item || typeof item !== "object") return [];
    const r = item as Record<string, unknown>;
    const name = clipText(r.name, 80);
    if (!name) return [];
    const role = String(r.role || "padrinho").toLowerCase() as GroomsmanItem["role"];
    return [{
      id: String(r.id || `groomsman-${idx}-${Date.now()}`),
      name,
      role: ["padrinho", "madrinha", "dama", "pajem"].includes(role) ? role : "outro",
      photoUrl: httpsUrlOrEmpty(r.photoUrl, "Foto do padrinho/madrinha"),
      description: clipText(r.description, 200),
    }];
  });
}

export function parseQuiz(value: unknown): QuizItem[] {
  let raw = value;
  if (typeof raw === "string") {
    if (!raw.trim()) return [];
    try { raw = JSON.parse(raw); } catch { return []; }
  }
  if (!Array.isArray(raw)) return [];
  return raw.slice(0, 15).flatMap((item, idx) => {
    if (!item || typeof item !== "object") return [];
    const r = item as Record<string, unknown>;
    const question = clipText(r.question, 160);
    if (!question) return [];
    const optionsRaw = Array.isArray(r.options) ? r.options : [];
    const options = optionsRaw.slice(0, 4).map((opt) => clipText(opt, 100)).filter(Boolean);
    if (options.length < 2) return [];
    const answerIndex = Math.max(0, Math.min(options.length - 1, Number(r.answerIndex) || 0));
    return [{
      id: String(r.id || `quiz-${idx}-${Date.now()}`),
      question,
      options,
      answerIndex,
      explanation: clipText(r.explanation, 200),
    }];
  });
}

export function parseHotels(value: unknown): HotelItem[] {
  let raw = value;
  if (typeof raw === "string") {
    if (!raw.trim()) return [];
    try { raw = JSON.parse(raw); } catch { return []; }
  }
  if (!Array.isArray(raw)) return [];
  return raw.slice(0, 10).flatMap((item, idx) => {
    if (!item || typeof item !== "object") return [];
    const r = item as Record<string, unknown>;
    const name = clipText(r.name, 100);
    if (!name) return [];
    return [{
      id: String(r.id || `hotel-${idx}-${Date.now()}`),
      name,
      address: clipText(r.address, 160),
      phone: clipText(r.phone, 30),
      link: httpsUrlOrEmpty(r.link, "Link do hotel"),
      discountCode: clipText(r.discountCode, 40),
      notes: clipText(r.notes, 200),
    }];
  });
}

export function parseCityGuide(value: unknown): CityGuideItem[] {
  let raw = value;
  if (typeof raw === "string") {
    if (!raw.trim()) return [];
    try { raw = JSON.parse(raw); } catch { return []; }
  }
  if (!Array.isArray(raw)) return [];
  return raw.slice(0, 20).flatMap((item, idx) => {
    if (!item || typeof item !== "object") return [];
    const r = item as Record<string, unknown>;
    const name = clipText(r.name, 100);
    if (!name) return [];
    const category = String(r.category || "restaurante").toLowerCase() as CityGuideItem["category"];
    return [{
      id: String(r.id || `guide-${idx}-${Date.now()}`),
      category: ["restaurante", "beleza", "passeio", "hotel"].includes(category) ? category : "outro",
      name,
      tip: clipText(r.tip, 250),
      address: clipText(r.address, 160),
      link: httpsUrlOrEmpty(r.link, "Link da dica"),
    }];
  });
}

export function parseFaq(value: unknown): FaqItem[] {
  let raw = value;
  if (typeof raw === "string") {
    if (!raw.trim()) return [];
    try { raw = JSON.parse(raw); } catch { return []; }
  }
  if (!Array.isArray(raw)) return [];
  return raw.slice(0, 20).flatMap((item, idx) => {
    if (!item || typeof item !== "object") return [];
    const r = item as Record<string, unknown>;
    const question = clipText(r.question, 160);
    const answer = clipText(r.answer, 600);
    if (!question || !answer) return [];
    return [{ id: String(r.id || `faq-${idx}-${Date.now()}`), question, answer }];
  });
}

export function parseSectionStyles(value: unknown): SectionStyles {
  let raw = value;
  if (typeof raw === "string") {
    if (!raw.trim()) return {};
    try { raw = JSON.parse(raw); } catch { return {}; }
  }
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return {};
  const res: SectionStyles = {};
  for (const [k, v] of Object.entries(raw as Record<string, unknown>)) {
    if (typeof v === "string" && v.length < 50) {
      res[k as keyof SectionStyles] = clipText(v, 40);
    }
  }
  return res;
}

export function parseSectionOrder(value: unknown): string[] {
  let raw = value;
  if (typeof raw === "string") {
    if (!raw.trim()) return DEFAULT_SECTION_ORDER;
    try { raw = JSON.parse(raw); } catch { return DEFAULT_SECTION_ORDER; }
  }
  if (!Array.isArray(raw)) return DEFAULT_SECTION_ORDER;
  const filtered = raw.map((s) => String(s).trim()).filter((s) => DEFAULT_SECTION_ORDER.includes(s));
  return filtered.length > 0 ? filtered : DEFAULT_SECTION_ORDER;
}

export type InviteSettings = {
  inviteTheme: InviteTheme;
  openingText: string;
  romanticLine: string;
  coverPhotoUrl: string;
  videoUrl: string;
  galleryJson: string;
  scheduleJson: string;
  menuJson: string;
  groomsmenJson: string;
  quizJson: string;
  hotelsJson: string;
  cityGuideJson: string;
  faqJson: string;
  sectionStylesJson: string;
  sectionOrderJson: string;
  ceremonyNotes: string;
  receptionNotes: string;
  extraInfo: string;
  rsvpText: string;
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
  inviteTemplate: string;
  saveTheDateTemplate: string;
  reminderTemplate: string;
  soonTemplate: string;
};

export function parseInviteSettings(body: Record<string, unknown>): InviteSettings {
  const gallery = parseGallery(body.gallery ?? body.galleryJson ?? "[]");
  const schedule = parseSchedule(body.schedule ?? body.scheduleJson ?? "[]");
  const menu = parseMenu(body.menu ?? body.menuJson ?? "[]");
  const groomsmen = parseGroomsmen(body.groomsmen ?? body.groomsmenJson ?? "[]");
  const quiz = parseQuiz(body.quiz ?? body.quizJson ?? "[]");
  const hotels = parseHotels(body.hotels ?? body.hotelsJson ?? "[]");
  const cityGuide = parseCityGuide(body.cityGuide ?? body.cityGuideJson ?? "[]");
  const faq = parseFaq(body.faq ?? body.faqJson ?? "[]");
  const sectionStyles = parseSectionStyles(body.sectionStyles ?? body.sectionStylesJson ?? "{}");
  const sectionOrder = parseSectionOrder(body.sectionOrder ?? body.sectionOrderJson ?? "[]");

  return {
    inviteTheme: parseInviteTheme(body.inviteTheme),
    openingText: clipText(body.openingText, 160, DEFAULT_OPENING_TEXT),
    romanticLine: clipText(body.romanticLine, 240),
    coverPhotoUrl: httpsUrlOrEmpty(body.coverPhotoUrl, "A foto de capa"),
    videoUrl: httpsUrlOrEmpty(body.videoUrl, "O link de vídeo"),
    galleryJson: JSON.stringify(gallery),
    scheduleJson: JSON.stringify(schedule),
    menuJson: JSON.stringify(menu),
    groomsmenJson: JSON.stringify(groomsmen),
    quizJson: JSON.stringify(quiz),
    hotelsJson: JSON.stringify(hotels),
    cityGuideJson: JSON.stringify(cityGuide),
    faqJson: JSON.stringify(faq),
    sectionStylesJson: JSON.stringify(sectionStyles),
    sectionOrderJson: JSON.stringify(sectionOrder),
    ceremonyNotes: String(body.ceremonyNotes ?? "").trim().slice(0, 500),
    receptionNotes: String(body.receptionNotes ?? "").trim().slice(0, 500),
    extraInfo: String(body.extraInfo ?? "").trim().slice(0, 800),
    rsvpText: clipText(body.rsvpText, 400, DEFAULT_RSVP_TEXT),
    showStory: flag(body.showStory, true),
    showGallery: flag(body.showGallery, true),
    showSchedule: flag(body.showSchedule, true),
    showDress: flag(body.showDress, true),
    showGifts: flag(body.showGifts, true),
    showVideo: flag(body.showVideo, false),
    showMenu: flag(body.showMenu, false),
    showGroomsmen: flag(body.showGroomsmen, false),
    showQuiz: flag(body.showQuiz, false),
    showHotels: flag(body.showHotels, false),
    showCityGuide: flag(body.showCityGuide, false),
    showFaq: flag(body.showFaq, false),
    showGuestAlbum: flag(body.showGuestAlbum, false),
    inviteTemplate: String(body.inviteTemplate ?? "").trim().slice(0, 1500) || DEFAULT_INVITE_TEMPLATE,
    saveTheDateTemplate: String(body.saveTheDateTemplate ?? "").trim().slice(0, 1500) || DEFAULT_SAVE_THE_DATE_TEMPLATE,
    reminderTemplate: String(body.reminderTemplate ?? "").trim().slice(0, 1500) || DEFAULT_REMINDER_TEMPLATE,
    soonTemplate: String(body.soonTemplate ?? "").trim().slice(0, 1500) || DEFAULT_SOON_TEMPLATE,
  };
}

export function readInviteContent(settings: (Partial<Omit<InviteSettings, "inviteTheme">> & {
  inviteTheme?: string;
  gallery?: unknown;
  schedule?: unknown;
  menu?: unknown;
  groomsmen?: unknown;
  quiz?: unknown;
  hotels?: unknown;
  cityGuide?: unknown;
  faq?: unknown;
  sectionStyles?: unknown;
  sectionOrder?: unknown;
}) | null | undefined) {
  let gallery: GalleryItem[] = [];
  let schedule: ScheduleItem[] = [];
  let menu: MenuItem[] = [];
  let groomsmen: GroomsmanItem[] = [];
  let quiz: QuizItem[] = [];
  let hotels: HotelItem[] = [];
  let cityGuide: CityGuideItem[] = [];
  let faq: FaqItem[] = [];
  let sectionStyles: SectionStyles = {};
  let sectionOrder: string[] = DEFAULT_SECTION_ORDER;

  try { gallery = parseGallery(typeof settings?.galleryJson === "string" ? settings.galleryJson : settings?.gallery ?? "[]"); } catch { gallery = []; }
  try { schedule = parseSchedule(typeof settings?.scheduleJson === "string" ? settings.scheduleJson : settings?.schedule ?? "[]"); } catch { schedule = []; }
  try { menu = parseMenu(typeof settings?.menuJson === "string" ? settings.menuJson : settings?.menu ?? "[]"); } catch { menu = []; }
  try { groomsmen = parseGroomsmen(typeof settings?.groomsmenJson === "string" ? settings.groomsmenJson : settings?.groomsmen ?? "[]"); } catch { groomsmen = []; }
  try { quiz = parseQuiz(typeof settings?.quizJson === "string" ? settings.quizJson : settings?.quiz ?? "[]"); } catch { quiz = []; }
  try { hotels = parseHotels(typeof settings?.hotelsJson === "string" ? settings.hotelsJson : settings?.hotels ?? "[]"); } catch { hotels = []; }
  try { cityGuide = parseCityGuide(typeof settings?.cityGuideJson === "string" ? settings.cityGuideJson : settings?.cityGuide ?? "[]"); } catch { cityGuide = []; }
  try { faq = parseFaq(typeof settings?.faqJson === "string" ? settings.faqJson : settings?.faq ?? "[]"); } catch { faq = []; }
  try { sectionStyles = parseSectionStyles(typeof settings?.sectionStylesJson === "string" ? settings.sectionStylesJson : settings?.sectionStyles ?? "{}"); } catch { sectionStyles = {}; }
  try { sectionOrder = parseSectionOrder(typeof settings?.sectionOrderJson === "string" ? settings.sectionOrderJson : settings?.sectionOrder ?? "[]"); } catch { sectionOrder = DEFAULT_SECTION_ORDER; }

  return {
    inviteTheme: parseInviteTheme(settings?.inviteTheme),
    openingText: settings?.openingText || DEFAULT_OPENING_TEXT,
    romanticLine: settings?.romanticLine || "",
    coverPhotoUrl: settings?.coverPhotoUrl || "",
    videoUrl: settings?.videoUrl || "",
    gallery,
    schedule,
    menu,
    groomsmen,
    quiz,
    hotels,
    cityGuide,
    faq,
    sectionStyles,
    sectionOrder,
    ceremonyNotes: settings?.ceremonyNotes || "",
    receptionNotes: settings?.receptionNotes || "",
    extraInfo: settings?.extraInfo || "",
    rsvpText: settings?.rsvpText || DEFAULT_RSVP_TEXT,
    showStory: settings?.showStory !== false,
    showGallery: settings?.showGallery !== false,
    showSchedule: settings?.showSchedule !== false,
    showDress: settings?.showDress !== false,
    showGifts: settings?.showGifts !== false,
    showVideo: Boolean(settings?.showVideo),
    showMenu: Boolean(settings?.showMenu),
    showGroomsmen: Boolean(settings?.showGroomsmen),
    showQuiz: Boolean(settings?.showQuiz),
    showHotels: Boolean(settings?.showHotels),
    showCityGuide: Boolean(settings?.showCityGuide),
    showFaq: Boolean(settings?.showFaq),
    showGuestAlbum: Boolean(settings?.showGuestAlbum),
  };
}

export function campaignTemplate(settings: Partial<Record<(typeof CAMPAIGN_FIELD)[InviteCampaign], string>>, campaign: InviteCampaign): string {
  const field = CAMPAIGN_FIELD[campaign];
  const value = String(settings[field] ?? "").trim();
  if (campaign === "official") return value || DEFAULT_INVITE_TEMPLATE;
  if (campaign === "save-the-date") return value || DEFAULT_SAVE_THE_DATE_TEMPLATE;
  if (campaign === "reminder") return value || DEFAULT_REMINDER_TEMPLATE;
  return value || DEFAULT_SOON_TEMPLATE;
}

export function renderInviteMessage(template: string, vars: {
  nome: string;
  data: string;
  horario: string;
  link: string;
  casal: string;
  local: string;
}): string {
  const clean = (value: string) => value.replace(/[\u0000-\u001F]+/g, " ").replace(/\s+/g, " ").trim().slice(0, 300);
  const values: Record<string, string> = {
    nome: clean(vars.nome) || "convidado",
    data: clean(vars.data),
    horario: clean(vars.horario),
    link: clean(vars.link),
    link_convite: clean(vars.link),
    casal: clean(vars.casal) || "o casal",
    nomes_do_casal: clean(vars.casal) || "o casal",
    local: clean(vars.local),
  };
  let text = String(template ?? "");
  for (const [key, value] of Object.entries(values)) {
    text = text.replace(new RegExp(`\\{\\{\\s*${key}\\s*\\}\\}|\\{\\s*${key}\\s*\\}`, "gi"), value);
  }
  text = text.trim().slice(0, 1500);
  if (!text) throw new InputError("A mensagem do convite está vazia.");
  return text;
}

export type GuestWrite = {
  name: string;
  whatsapp: string;
  groupName: (typeof GUEST_GROUPS)[number];
  seats: number;
  notes: string;
  optedOut: boolean;
};

export function parseGuestWrite(body: Record<string, unknown>): GuestWrite {
  const name = String(body.name ?? "").trim().slice(0, 120);
  if (!name) throw new InputError("Informe o nome do convidado ou da família.");
  const groupName = String(body.groupName ?? "amigos").trim();
  if (!GUEST_GROUPS.includes(groupName as GuestWrite["groupName"])) {
    throw new InputError("Escolha um grupo: família, amigos, padrinhos ou outros.");
  }
  const seats = Number(body.seats ?? 1);
  if (!Number.isInteger(seats) || seats < 1 || seats > 12) {
    throw new InputError("A quantidade autorizada deve ser entre 1 e 12 pessoas.");
  }
  return {
    name,
    whatsapp: normalizeWhatsappNumber(body.whatsapp),
    groupName: groupName as GuestWrite["groupName"],
    seats,
    notes: String(body.notes ?? "").trim().slice(0, 500),
    optedOut: flag(body.optedOut, false),
  };
}

export function isRequestId(value: unknown): boolean {
  return /^[A-Za-z0-9_-]{8,80}$/.test(String(value ?? ""));
}

export type SendDecision =
  | { action: "return"; status: "sent" | "failed" | "skipped"; duplicate?: boolean; reason?: string }
  | { action: "send" };

export function decideInviteSend(guest: {
  optedOut: boolean;
  status: string;
  lastRequestId: string;
  lastAttemptAt: Date | null;
}, input: { requestId: string; force: boolean; now: Date }): SendDecision {
  if (guest.optedOut) return { action: "return", status: "skipped", reason: "pediu para não receber" };
  if (guest.lastRequestId && guest.lastRequestId === input.requestId) {
    if (guest.status === "sent") return { action: "return", status: "sent", duplicate: true };
    if (guest.status === "failed") return { action: "return", status: "failed", duplicate: true };
    return { action: "return", status: "skipped", duplicate: true, reason: "envio já em andamento" };
  }
  if (!input.force && guest.status === "sent") return { action: "return", status: "skipped", reason: "já enviado ao provedor" };
  if (guest.status === "sending" && guest.lastAttemptAt && input.now.getTime() - guest.lastAttemptAt.getTime() < 60_000) {
    return { action: "return", status: "skipped", reason: "envio já em andamento" };
  }
  return { action: "send" };
}

export function inviteStatusLabel(status: string): string {
  if (status === "sending") return "Enfileirado";
  if (status === "sent") return "Enviado ao provedor";
  if (status === "failed") return "Falhou";
  if (status === "skipped") return "Não enviado";
  return "Pendente";
}

export function xmlEscape(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

export function buildInviteArtSvg(input: {
  coupleNames: string;
  dateLabel: string;
  time: string;
  venue: string;
  guestName?: string;
  theme: InviteTheme;
}): string {
  const palette = INVITE_PALETTES[parseInviteTheme(input.theme)];
  const guest = input.guestName?.trim() ? xmlEscape(input.guestName.trim().slice(0, 80)) : "";
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="1080" height="1350" viewBox="0 0 1080 1350">
  <rect width="1080" height="1350" fill="${palette.bg}"/>
  <rect x="70" y="70" width="940" height="1210" rx="36" fill="${palette.paper}" stroke="${palette.line}" stroke-width="2"/>
  <text x="540" y="220" text-anchor="middle" fill="${palette.accent}" font-family="Georgia, serif" font-size="34">${xmlEscape(palette.label)}</text>
  <text x="540" y="430" text-anchor="middle" fill="${palette.ink}" font-family="Georgia, serif" font-size="84">${xmlEscape(input.coupleNames.slice(0, 48) || "Nosso casamento")}</text>
  <text x="540" y="560" text-anchor="middle" fill="${palette.muted}" font-family="Georgia, serif" font-size="36">${xmlEscape(input.dateLabel.slice(0, 60))}</text>
  <text x="540" y="630" text-anchor="middle" fill="${palette.muted}" font-family="Georgia, serif" font-size="32">${xmlEscape(input.time.slice(0, 8))} · ${xmlEscape(input.venue.slice(0, 48) || "Local a confirmar")}</text>
  ${guest ? `<text x="540" y="820" text-anchor="middle" fill="${palette.ink}" font-family="Georgia, serif" font-size="42">Para ${guest}</text>` : ""}
  <text x="540" y="1120" text-anchor="middle" fill="${palette.accent}" font-family="Georgia, serif" font-size="28">Com carinho</text>
</svg>`;
}

export function applyInviteMeta(html: string, meta: { title: string; description: string; themeColor: string; url: string }): string {
  const title = xmlEscape(meta.title).slice(0, 140);
  const description = xmlEscape(meta.description).slice(0, 220);
  const themeColor = /^#[0-9a-fA-F]{6}$/.test(meta.themeColor) ? meta.themeColor : "#f6f0e7";
  const url = xmlEscape(meta.url);
  let next = html
    .replace(/<title>[\s\S]*?<\/title>/i, `<title>${title}</title>`)
    .replace(/<meta name="description" content="[^"]*"\s*\/?>/i, `<meta name="description" content="${description}" />`)
    .replace(/<meta name="theme-color" content="[^"]*"\s*\/?>/i, `<meta name="theme-color" content="${themeColor}" />`)
    .replace(/<meta property="og:title" content="[^"]*"\s*\/?>/i, `<meta property="og:title" content="${title}" />`)
    .replace(/<meta property="og:description" content="[^"]*"\s*\/?>/i, `<meta property="og:description" content="${description}" />`);
  if (!/property="og:url"/i.test(next)) {
    next = next.replace("</head>", `    <meta property="og:url" content="${url}" />\n  </head>`);
  }
  return next;
}

export function createRateLimiter(limit: number, windowMs: number) {
  const hits = new Map<string, number[]>();
  return (key: string, now = Date.now()): boolean => {
    const recent = (hits.get(key) ?? []).filter((stamp) => now - stamp < windowMs);
    if (recent.length >= limit) {
      hits.set(key, recent);
      return false;
    }
    recent.push(now);
    hits.set(key, recent);
    return true;
  };
}
