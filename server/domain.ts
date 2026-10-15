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

export function parseRsvpInput(body: Record<string, unknown>): RsvpInput {
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
  if (attending && (!Number.isInteger(guests) || guests < 1 || guests > 6)) {
    throw new InputError("A quantidade de pessoas deve ser entre 1 e 6.");
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
