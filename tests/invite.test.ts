import assert from "node:assert/strict";
import test from "node:test";
import {
  applyInviteMeta,
  buildInviteArtSvg,
  createInviteToken,
  decideInviteSend,
  isInviteToken,
  parseGallery,
  parseGuestWrite,
  parseRsvpInput,
  renderInviteMessage,
} from "../server/domain";

test("token de convite é aleatório e não sequencial", () => {
  const first = createInviteToken();
  const second = createInviteToken();
  assert.equal(isInviteToken(first), true);
  assert.notEqual(first, second);
  assert.equal(isInviteToken("1"), false);
  assert.equal(isInviteToken("convidado-1"), false);
});

test("mensagem do convite substitui os campos e não inclui telefone", () => {
  const message = renderInviteMessage("Olá, {{nome}}! {{data}} às {horario}. {link_convite} — {nomes_do_casal}", {
    nome: "Ana\nSilva",
    data: "02 de janeiro de 2027",
    horario: "16:00",
    link: "https://exemplo.com/c/token-seguro",
    casal: "Tais & Yran",
    local: "Capela",
  });
  assert.match(message, /Ana Silva/);
  assert.match(message, /https:\/\/exemplo.com\/c\/token-seguro/);
  assert.match(message, /Tais & Yran/);
  assert.doesNotMatch(message, /99999/);
});

test("limite do convite individual impede acompanhantes a mais", () => {
  assert.throws(
    () => parseRsvpInput({ name: "Ana", whatsapp: "34999998888", attending: true, guests: 5 }, { maxGuests: 2 }),
    /no máximo 2/,
  );
  const ok = parseRsvpInput({ name: "Ana", whatsapp: "34999998888", attending: true, guests: 2 }, { maxGuests: 2 });
  assert.equal(ok.guests, 2);
});

test("convidado exige WhatsApp com DDI ou DDD e grupo conhecido", () => {
  const guest = parseGuestWrite({ name: "Família Silva", whatsapp: "(34) 98888-7777", groupName: "familia", seats: 4 });
  assert.equal(guest.whatsapp, "5534988887777");
  assert.equal(guest.seats, 4);
  assert.throws(() => parseGuestWrite({ name: "Ana", whatsapp: "123", groupName: "amigos", seats: 1 }));
  assert.throws(() => parseGuestWrite({ name: "Ana", whatsapp: "34999998888", groupName: "trabalho", seats: 1 }));
});

test("envio repetido com o mesmo pedido não dispara de novo", () => {
  const guest = { optedOut: false, status: "sent", lastRequestId: "pedido1234", lastAttemptAt: new Date() };
  const same = decideInviteSend(guest, { requestId: "pedido1234", force: true, now: new Date() });
  assert.deepEqual(same, { action: "return", status: "sent", duplicate: true });
  const opted = decideInviteSend({ ...guest, optedOut: true, status: "pending", lastRequestId: "" }, { requestId: "outro1234", force: true, now: new Date() });
  assert.equal(opted.action, "return");
  if (opted.action === "return") assert.equal(opted.status, "skipped");
});

test("galeria recusa link que não seja HTTPS", () => {
  assert.throws(() => parseGallery([{ url: "javascript:alert(1)", alt: "" }]));
  const photos = parseGallery([{ url: "https://exemplo.com/foto.jpg", alt: "Casal" }]);
  assert.equal(photos[0]?.alt, "Casal");
});

test("prévia pública do convite não leva o nome do convidado", () => {
  const html = applyInviteMeta(
    `<html><head><title>Antigo</title><meta name="description" content="antiga" /><meta name="theme-color" content="#000000" /><meta property="og:title" content="antigo" /><meta property="og:description" content="antigo" /></head><body></body></html>`,
    { title: "Tais & Yran — convite de casamento", description: "Venha celebrar.", themeColor: "#f6f0e7", url: "https://exemplo.com/convite" },
  );
  assert.match(html, /Tais &amp; Yran/);
  assert.doesNotMatch(html, /Ana/);
  assert.match(html, /og:url/);
});

test("arte do convite escapa texto e pode incluir o nome", () => {
  const svg = buildInviteArtSvg({
    coupleNames: "Tais & Yran",
    dateLabel: "02/01/2027",
    time: "16:00",
    venue: "Capela",
    guestName: "Ana <3",
    theme: "jardim",
  });
  assert.match(svg, /Ana &lt;3/);
  assert.match(svg, /Jardim botânico/);
});
