import type { Express, Request } from "express";
import type { PrismaClient } from "@prisma/client";
import path from "path";
import { readFile } from "fs/promises";
import {
  DEFAULT_INVITATION_MESSAGE,
  InputError,
  INVITE_PALETTES,
  applyInviteMeta,
  campaignTemplate,
  createInviteToken,
  decideInviteSend,
  isInviteToken,
  isRequestId,
  parseGuestWrite,
  parseInviteCampaign,
  readInviteContent,
  renderInviteMessage,
} from "./domain";

type SendSettings = {
  whaticketApiUrl: string;
  whaticketToken: string;
  whaticketUserId: string;
  whaticketQueueId: string;
  whaticketSign: boolean;
  whaticketClose: boolean;
  coupleNames: string;
  weddingDate: string;
  ceremonyTime: string;
  ceremonyVenue: string;
  ceremonyAddress: string;
  inviteTemplate: string;
  saveTheDateTemplate: string;
  reminderTemplate: string;
  soonTemplate: string;
};

function publicOrigin(req: Request): string {
  const configured = process.env.APP_URL?.trim();
  if (configured) {
    try {
      return new URL(configured).origin;
    } catch {
      // Usa o host da requisição quando APP_URL estiver inválida.
    }
  }
  const forwarded = req.get("x-forwarded-proto")?.split(",")[0]?.trim();
  const proto = forwarded || req.protocol;
  return `${proto}://${req.get("x-forwarded-host") || req.get("host")}`;
}

function dateLabel(iso: string): string {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) return "Data a definir";
  return new Date(`${iso}T12:00:00`).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

function messageFor(settings: SendSettings, guest: { name: string; token: string }, campaign: ReturnType<typeof parseInviteCampaign>, origin: string) {
  const place = settings.ceremonyVenue || settings.ceremonyAddress || "";
  return renderInviteMessage(campaignTemplate(settings, campaign), {
    nome: guest.name,
    data: dateLabel(settings.weddingDate),
    horario: settings.ceremonyTime || "16:00",
    link: `${origin}/c/${guest.token}`,
    casal: settings.coupleNames || "o casal",
    local: place,
  });
}

async function postWhaticket(
  settings: SendSettings,
  number: string,
  bodyText: string,
  buildIds: (userId: string, queueId: string) => Record<string, number>,
) {
  const token = settings.whaticketToken?.trim();
  if (!token) throw new InputError("Cadastre o token do Whaticket antes de enviar convites.", 400);
  const response = await fetch(settings.whaticketApiUrl, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      number,
      body: bodyText,
      ...buildIds(settings.whaticketUserId, settings.whaticketQueueId),
      sendSignature: settings.whaticketSign,
      closeTicket: settings.whaticketClose,
    }),
  });
  if (!response.ok) {
    console.error("Whaticket convite falhou", response.status);
    throw new InputError("Não foi possível enviar a mensagem de WhatsApp.", 502);
  }
}

export function registerInviteRoutes(
  app: Express,
  deps: {
    prisma: PrismaClient;
    authenticate: (req: any, res: any, next: any) => void;
    clientIp: (req: Request) => string;
    allowInviteRead: (key: string) => boolean;
    allowInviteSend: (key: string) => boolean;
    buildWhaticketOptionalIds: (userId: string, queueId: string) => Record<string, number>;
  },
) {
  const { prisma, authenticate, clientIp, allowInviteRead, allowInviteSend, buildWhaticketOptionalIds } = deps;

  async function deliver(guestId: string, campaignRaw: unknown, force: boolean, requestId: string, origin: string) {
    const campaign = parseInviteCampaign(campaignRaw);
    if (!isRequestId(requestId)) throw new InputError("Identificador de envio inválido.");
    const guest = await prisma.weddingGuest.findUnique({ where: { id: guestId } });
    if (!guest) throw new InputError("Convidado não encontrado.", 404);
    const decision = decideInviteSend(guest, { requestId, force, now: new Date() });
    if (decision.action === "return") return { id: guest.id, name: guest.name, ...decision };

    const cutoff = new Date(Date.now() - 60_000);
    const locked = await prisma.weddingGuest.updateMany({
      where: {
        id: guest.id,
        optedOut: false,
        NOT: [
          { AND: [{ status: "sending" }, { lastAttemptAt: { gt: cutoff } }] },
          ...(force ? [] : [{ status: "sent" as const }]),
        ],
      },
      data: {
        status: "sending",
        lastRequestId: requestId,
        lastAttemptAt: new Date(),
        attemptCount: { increment: 1 },
        lastError: "",
      },
    });
    if (locked.count !== 1) {
      const again = await prisma.weddingGuest.findUnique({ where: { id: guest.id } });
      const second = again ? decideInviteSend(again, { requestId, force, now: new Date() }) : { action: "return" as const, status: "skipped" as const, reason: "não encontrado" };
      return { id: guest.id, name: guest.name, ...(second.action === "return" ? second : { status: "skipped" as const, reason: "envio já em andamento" }) };
    }

    const settings = await prisma.settings.findUnique({ where: { id: "global" } });
    if (!settings?.whaticketToken?.trim()) {
      const reason = "Cadastre o token do Whaticket antes de enviar convites.";
      await prisma.weddingGuest.update({ where: { id: guest.id }, data: { status: "failed", lastError: reason } });
      await prisma.weddingInviteAttempt.create({ data: { guestId: guest.id, campaign, status: "failed", requestId } });
      return { id: guest.id, name: guest.name, status: "failed" as const, action: "return" as const, reason };
    }
    try {
      const body = messageFor(settings, guest, campaign, origin);
      await postWhaticket(settings, guest.whatsapp, body, buildWhaticketOptionalIds);
      await prisma.weddingGuest.update({
        where: { id: guest.id },
        data: { status: "sent", sentAt: new Date(), lastError: "" },
      });
      await prisma.weddingInviteAttempt.create({ data: { guestId: guest.id, campaign, status: "sent", requestId } });
      return { id: guest.id, name: guest.name, status: "sent" as const, action: "return" as const };
    } catch (err) {
      const message = err instanceof InputError ? err.message : "Não foi possível enviar a mensagem de WhatsApp.";
      await prisma.weddingGuest.update({ where: { id: guest.id }, data: { status: "failed", lastError: message } });
      await prisma.weddingInviteAttempt.create({ data: { guestId: guest.id, campaign, status: "failed", requestId } });
      return { id: guest.id, name: guest.name, status: "failed" as const, action: "return" as const, reason: message };
    }
  }

  app.get("/api/invite/:token", async (req, res) => {
    if (!allowInviteRead(clientIp(req))) {
      return res.status(429).json({ error: "Muitas consultas em pouco tempo. Aguarde alguns minutos." });
    }
    if (!isInviteToken(req.params.token)) return res.status(404).json({ error: "Convite não encontrado." });
    const guest = await prisma.weddingGuest.findUnique({
      where: { token: req.params.token },
      select: {
        name: true,
        seats: true,
        groupName: true,
        rsvp: { select: { attending: true, guests: true, message: true, name: true } },
      },
    });
    if (!guest) return res.status(404).json({ error: "Convite não encontrado." });
    return res.json({ guest });
  });

  app.get("/api/guests", authenticate, async (_req, res) => {
    const guests = await prisma.weddingGuest.findMany({
      orderBy: { createdAt: "desc" },
      take: 500,
      include: {
        rsvp: { select: { attending: true, guests: true, updatedAt: true } },
        attempts: { orderBy: { createdAt: "desc" }, take: 6, select: { id: true, campaign: true, status: true, createdAt: true } },
      },
    });
    res.json({ guests });
  });

  app.post("/api/guests", authenticate, async (req, res) => {
    try {
      const data = parseGuestWrite(req.body ?? {});
      const guest = await prisma.weddingGuest.create({ data: { ...data, token: createInviteToken() } });
      res.status(201).json({ id: guest.id, token: guest.token });
    } catch (err) {
      if (err instanceof InputError) return res.status(err.status).json({ error: err.message });
      const duplicate = err && typeof err === "object" && "code" in err && (err as { code?: string }).code === "P2002";
      if (duplicate) return res.status(409).json({ error: "Já existe um convite para este WhatsApp." });
      console.error("POST /api/guests:", err instanceof Error ? err.name : "falha");
      return res.status(400).json({ error: "Não foi possível cadastrar o convidado." });
    }
  });

  app.put("/api/guests/:id", authenticate, async (req, res) => {
    try {
      const data = parseGuestWrite(req.body ?? {});
      const guest = await prisma.weddingGuest.update({ where: { id: req.params.id }, data });
      res.json({ id: guest.id });
    } catch (err) {
      if (err instanceof InputError) return res.status(err.status).json({ error: err.message });
      const duplicate = err && typeof err === "object" && "code" in err && (err as { code?: string }).code === "P2002";
      if (duplicate) return res.status(409).json({ error: "Já existe um convite para este WhatsApp." });
      return res.status(404).json({ error: "Convidado não encontrado." });
    }
  });

  app.delete("/api/guests/:id", authenticate, async (req, res) => {
    try {
      await prisma.weddingGuest.delete({ where: { id: req.params.id } });
      res.json({ success: true });
    } catch {
      res.status(404).json({ error: "Convidado não encontrado." });
    }
  });

  app.post("/api/guests/preview", authenticate, async (req, res) => {
    try {
      const campaign = parseInviteCampaign(req.body?.campaign);
      const settings = await prisma.settings.findUnique({ where: { id: "global" } });
      if (!settings) return res.status(400).json({ error: "Salve as configurações do casamento antes." });
      const guest = req.body?.guestId
        ? await prisma.weddingGuest.findUnique({ where: { id: String(req.body.guestId) } })
        : null;
      const sample = guest ?? { name: "Convidado", token: "pre-visualizacao" };
      const origin = publicOrigin(req);
      const link = guest ? `${origin}/c/${guest.token}` : `${origin}/convite?preview=1`;
      const message = renderInviteMessage(campaignTemplate(settings, campaign), {
        nome: sample.name,
        data: dateLabel(settings.weddingDate),
        horario: settings.ceremonyTime || "16:00",
        link,
        casal: settings.coupleNames,
        local: settings.ceremonyVenue || settings.ceremonyAddress || "",
      });
      res.json({ message, sendsImage: false });
    } catch (err) {
      if (err instanceof InputError) return res.status(err.status).json({ error: err.message });
      return res.status(400).json({ error: "Não foi possível montar a prévia." });
    }
  });

  app.post("/api/guests/:id/send", authenticate, async (req, res) => {
    if (!allowInviteSend(clientIp(req))) return res.status(429).json({ error: "Muitos envios em pouco tempo. Aguarde alguns minutos." });
    try {
      const result = await deliver(req.params.id, req.body?.campaign, Boolean(req.body?.force), String(req.body?.requestId ?? ""), publicOrigin(req));
      res.json(result);
    } catch (err) {
      if (err instanceof InputError) return res.status(err.status).json({ error: err.message });
      console.error("POST /api/guests/send:", err instanceof Error ? err.name : "falha");
      return res.status(400).json({ error: "Não foi possível enviar o convite." });
    }
  });

  app.post("/api/guests/send", authenticate, async (req, res) => {
    if (!allowInviteSend(clientIp(req))) return res.status(429).json({ error: "Muitos envios em pouco tempo. Aguarde alguns minutos." });
    try {
      if (req.body?.confirm !== true) {
        throw new InputError("Confirme a lista e a mensagem antes de enviar.");
      }
      const ids: string[] = [...new Set<string>((Array.isArray(req.body?.ids) ? req.body.ids : []).map((id: unknown) => String(id)))].slice(0, 40);
      if (!ids.length) throw new InputError("Selecione pelo menos um convidado.");
      const requestId = String(req.body?.requestId ?? "");
      const results = [];
      for (const [index, id] of ids.entries()) {
        results.push(await deliver(id, req.body?.campaign, Boolean(req.body?.force), `${requestId}-${index + 1}`, publicOrigin(req)));
        await new Promise((resolve) => setTimeout(resolve, 400));
      }
      res.json({
        total: results.length,
        sent: results.filter((item) => item.status === "sent" && !("duplicate" in item && item.duplicate)).length,
        results,
      });
    } catch (err) {
      if (err instanceof InputError) return res.status(err.status).json({ error: err.message });
      return res.status(400).json({ error: "Não foi possível enviar os convites." });
    }
  });

  async function sendInviteDocument(req: Request, res: any) {
    try {
      const indexPath = process.env.NODE_ENV === "production"
        ? path.join(process.cwd(), "dist", "index.html")
        : path.join(process.cwd(), "index.html");
      const html = await readFile(indexPath, "utf8");
      const settings = await prisma.settings.findUnique({ where: { id: "global" } });
      const visual = readInviteContent(settings);
      const palette = INVITE_PALETTES[visual.inviteTheme];
      const origin = publicOrigin(req);
      const description = (settings?.invitationMessage || DEFAULT_INVITATION_MESSAGE).slice(0, 180);
      res.setHeader("Content-Type", "text/html; charset=utf-8");
      res.setHeader("Cache-Control", "no-store");
      res.send(applyInviteMeta(html, {
        title: `${settings?.coupleNames || "Convite"} — convite de casamento`,
        description,
        themeColor: palette.bg,
        url: `${origin}/convite`,
      }));
    } catch (err) {
      console.error("Convite HTML:", err instanceof Error ? err.message : "falha");
      res.status(500).send("Convite indisponível.");
    }
  }

  app.get("/convite", (req, res, next) => {
    if (process.env.NODE_ENV !== "production") return next();
    if (req.headers.accept && !req.headers.accept.includes("text/html")) return next();
    return sendInviteDocument(req, res);
  });

  app.get("/c/:token", (req, res, next) => {
    if (process.env.NODE_ENV !== "production") return next();
    if (!isInviteToken(req.params.token)) return next();
    if (req.headers.accept && !req.headers.accept.includes("text/html")) return next();
    return sendInviteDocument(req, res);
  });
}
