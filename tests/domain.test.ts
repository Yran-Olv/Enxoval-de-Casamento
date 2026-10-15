import assert from "node:assert/strict";
import test from "node:test";
import {
  buildIcs,
  calendarRange,
  detectAudio,
  createRateLimiter,
  googleCalendarUrl,
  InputError,
  isRsvpClosed,
  parseRegistryWrite,
  parseReservationInput,
  parseRsvpInput,
  whatsappChatUrl,
} from "../server/domain.ts";

const itemId = "11111111-1111-4111-8111-111111111111";

test("RSVP aceita confirmação e recusa", () => {
  const yes = parseRsvpInput({
    name: "  Ana Silva ",
    whatsapp: "(34) 99999-8888",
    attending: true,
    guests: 2,
    message: "Com amor",
  });
  assert.equal(yes.whatsapp, "34999998888");
  assert.equal(yes.guests, 2);
  assert.equal(yes.name, "Ana Silva");

  const no = parseRsvpInput({ name: "Ana", whatsapp: "34999998888", attending: false, guests: 4 });
  assert.equal(no.attending, false);
  assert.equal(no.guests, 0);
});

test("RSVP rejeita telefone, quantidade e presença ausente", () => {
  assert.throws(() => parseRsvpInput({ name: "Ana", whatsapp: "123", attending: true, guests: 1 }), InputError);
  assert.throws(() => parseRsvpInput({ name: "Ana", whatsapp: "34999998888", attending: true, guests: 9 }), InputError);
  assert.throws(() => parseRsvpInput({ name: "", whatsapp: "34999998888", attending: true, guests: 1 }), InputError);
  assert.throws(() => parseRsvpInput({ name: "Ana", whatsapp: "34999998888", attending: "true", guests: 1 }), InputError);
});

test("prazo de RSVP usa o calendário de São Paulo e inclui o próprio dia", () => {
  const stillThe14th = new Date("2026-10-15T02:30:00.000Z");
  const alreadyThe15th = new Date("2026-10-15T03:30:00.000Z");
  assert.equal(isRsvpClosed("2026-10-14", stillThe14th), false);
  assert.equal(isRsvpClosed("2026-10-14", alreadyThe15th), true);
  assert.equal(isRsvpClosed("2026-10-15", alreadyThe15th), false);
  assert.equal(isRsvpClosed("", alreadyThe15th), false);
});

test("reserva exige presente, nome e WhatsApp", () => {
  const parsed = parseReservationInput({
    enxovalId: itemId,
    nome: "Bruno",
    whatsapp: "34 98888-7777",
    mensagem: "Presente",
  });
  assert.equal(parsed.enxovalId, itemId);
  assert.equal(parsed.whatsapp, "34988887777");
  assert.throws(() => parseReservationInput({ enxovalId: "abc", nome: "Bruno", whatsapp: "34988887777" }), InputError);
});

test("cadastro de presente ignora campos fora da lista permitida", () => {
  const item = parseRegistryWrite({
    nome: "Jogo de pratos",
    prioridade: "Alta",
    status: "Disponível",
    valor: "120,50",
    descricao: "Branco",
    password: "nao-entra",
  });
  assert.equal(item.valor, 120.5);
  assert.equal("password" in item, false);
  assert.throws(() => parseRegistryWrite({ nome: "X", prioridade: "Urgente", valor: 10 }), InputError);
});

test("calendário mantém o horário local de São Paulo, sem converter para UTC", () => {
  const range = calendarRange("2027-02-02", "16:00", 4);
  assert.equal(range.startStamp, "20270202T160000");
  assert.equal(range.endStamp, "20270202T200000");
  assert.equal(range.timeZone, "America/Sao_Paulo");

  const late = calendarRange("2027-02-02", "22:30", 4);
  assert.equal(late.endStamp, "20270203T023000");

  const url = googleCalendarUrl({
    coupleNames: "Tais & Yran",
    weddingDate: "2027-02-02",
    ceremonyTime: "16:00",
    invitationMessage: "Venha celebrar",
    location: "Igreja",
  });
  assert.match(url, /dates=20270202T160000%2F20270202T200000/);
  assert.match(url, /ctz=America%2FSao_Paulo/);
  assert.doesNotMatch(url, /Z/);

  const ics = buildIcs({
    coupleNames: "Tais & Yran",
    weddingDate: "2027-02-02",
    ceremonyTime: "16:00",
    invitationMessage: "Venha celebrar",
    location: "Igreja",
  });
  assert.match(ics, /DTSTART;TZID=America\/Sao_Paulo:20270202T160000/);
  assert.match(ics, /DTEND;TZID=America\/Sao_Paulo:20270202T200000/);
});

test("link de WhatsApp completa o DDI brasileiro", () => {
  assert.equal(whatsappChatUrl("(34) 99999-8888"), "https://wa.me/5534999998888");
  assert.equal(whatsappChatUrl("5534999998888"), "https://wa.me/5534999998888");
});

test("reconhece áudio real e recusa arquivo curto ou desconhecido", () => {
  const wav = Buffer.alloc(1200);
  wav.write("RIFF", 0);
  wav.write("WAVE", 8);
  assert.deepEqual(detectAudio(wav), { ext: "wav", mime: "audio/wav" });
  const mp3 = Buffer.alloc(1200);
  mp3.write("ID3", 0);
  assert.equal(detectAudio(mp3)?.ext, "mp3");
  assert.equal(detectAudio(Buffer.from("nao-e-audio")), null);
});

test("limite de tentativas bloqueia a chamada seguinte na mesma janela", () => {
  const allow = createRateLimiter(2, 60_000);
  assert.equal(allow("ip", 1_000), true);
  assert.equal(allow("ip", 1_100), true);
  assert.equal(allow("ip", 1_200), false);
  assert.equal(allow("ip", 62_000), true);
});
