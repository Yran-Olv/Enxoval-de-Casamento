import assert from "node:assert/strict";
import test from "node:test";
import {
  applyInviteMeta,
  buildInviteArtSvg,
  buildInviteWebviewUrl,
  createInviteToken,
  decideInviteSend,
  isInviteToken,
  parseCityGuide,
  parseFaq,
  parseGallery,
  parseGroomsmen,
  parseGuestWrite,
  parseHotels,
  parseInviteTheme,
  parseMenu,
  parseQuiz,
  parseRsvpInput,
  readInviteContent,
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

test("reconhece os 6 modelos de casamento e preserva compatibilidade", () => {
  assert.equal(parseInviteTheme("boho"), "boho");
  assert.equal(parseInviteTheme("romantico"), "romantico");
  assert.equal(parseInviteTheme("minimal"), "minimal");
  assert.equal(parseInviteTheme("editorial"), "editorial");
  assert.equal(parseInviteTheme("jardim"), "jardim");
  assert.equal(parseInviteTheme("gala"), "gala");
  // Legado clássico mapeia para romântico
  assert.equal(parseInviteTheme("classico"), "romantico");
  // Desconhecido cai em romântico
  assert.equal(parseInviteTheme("desconhecido"), "romantico");
});

test("parsers de módulos sanitizam entradas e respeitam limites", () => {
  // Menu
  const menu = parseMenu([
    { category: "entradas", title: "Bruschetta", description: "Tomate e manjericão" },
    { category: "invalida", title: "Outro" },
  ]);
  assert.equal(menu.length, 2);
  assert.equal(menu[0].category, "entradas");
  assert.equal(menu[1].category, "outro");

  // Groomsmen
  const groomsmen = parseGroomsmen([
    { name: "Lucas", role: "padrinho", photoUrl: "https://example.com/lucas.jpg" },
    { name: "Mariana", role: "madrinha", photoUrl: "" },
  ]);
  assert.equal(groomsmen.length, 2);
  assert.equal(groomsmen[0].photoUrl, "https://example.com/lucas.jpg");
  assert.equal(groomsmen[1].photoUrl, "");
  assert.throws(
    () => parseGroomsmen([{ name: "Mariana", role: "madrinha", photoUrl: "http://inseguro.com/foto.jpg" }]),
    /precisa ser um link HTTPS/
  );

  // Quiz
  const quiz = parseQuiz([
    {
      question: "Onde se conheceram?",
      options: ["Praia", "Faculdade", "Parque"],
      answerIndex: 1,
      explanation: "Em 2018!",
    },
    {
      question: "Fora dos limites?",
      options: ["A", "B"],
      answerIndex: 99, // Inválido
    },
  ]);
  assert.equal(quiz.length, 2);
  assert.equal(quiz[0].answerIndex, 1);
  assert.equal(quiz[1].answerIndex, 1); // Ajustado para o último índice válido (options.length - 1)

  // Hotéis
  const hotels = parseHotels([
    { name: "Hotel Praia", address: "Av. Mar", discountCode: "AMOR10", link: "https://hotel.com" },
  ]);
  assert.equal(hotels.length, 1);
  assert.equal(hotels[0].discountCode, "AMOR10");

  // Guia
  const guide = parseCityGuide([
    { category: "restaurante", name: "Pizzaria Bela", tip: "Peça a de burrata" },
  ]);
  assert.equal(guide.length, 1);
  assert.equal(guide[0].category, "restaurante");

  // FAQ
  const faq = parseFaq([
    { question: "Tem estacionamento?", answer: "Sim, gratuito no local." },
  ]);
  assert.equal(faq.length, 1);
  assert.equal(faq[0].question, "Tem estacionamento?");
});

test("readInviteContent carrega configurações visuais completas sem destruir dados", () => {
  const content = readInviteContent({
    inviteTheme: "editorial",
    videoUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
    showVideo: true,
    showMenu: true,
    sectionStylesJson: JSON.stringify({ hero: "editorial", countdown: "painel" }),
    sectionOrderJson: JSON.stringify(["hero", "countdown", "video", "rsvp"]),
    menuJson: JSON.stringify([{ category: "principais", title: "Risoto de Cogumelos", description: "Com trufas" }]),
  });

  assert.equal(content.inviteTheme, "editorial");
  assert.equal(content.videoUrl, "https://www.youtube.com/watch?v=dQw4w9WgXcQ");
  assert.equal(content.showVideo, true);
  assert.equal(content.sectionStyles.hero, "editorial");
  assert.equal(content.sectionStyles.countdown, "painel");
  assert.deepEqual(content.sectionOrder, ["hero", "countdown", "video", "rsvp"]);
  assert.equal(content.menu.length, 1);
  assert.equal(content.menu[0].title, "Risoto de Cogumelos");
});

test("buildInviteWebviewUrl gera URL com token, whatsapp, nome e wa=1 para o WhatsApp Webview", () => {
  const url = buildInviteWebviewUrl("https://taiseyran.com.br", {
    token: "token-seguro-1234567890",
    name: "Carolina & Thiago",
    whatsapp: "5534999998888",
  });
  assert.match(url, /https:\/\/taiseyran\.com\.br\/c\/token-seguro-1234567890\?/);
  assert.match(url, /whatsapp=5534999998888/);
  assert.match(url, /nome=Carolina(\+|%20)%26(\+|%20)Thiago/);
  assert.match(url, /wa=1/);

  const fallback = buildInviteWebviewUrl("https://taiseyran.com.br", {
    name: "Convidado Geral",
  });
  assert.match(fallback, /https:\/\/taiseyran\.com\.br\/convite\?/);
  assert.match(fallback, /nome=Convidado(\+|%20)Geral/);
  assert.match(fallback, /wa=1/);
});

