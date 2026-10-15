import type { Express, Request } from "express";
import type { PrismaClient } from "@prisma/client";
import path from "path";
import { readFile } from "fs/promises";
import {
  DEFAULT_INVITATION_MESSAGE,
  InputError,
  INVITE_PALETTES,
  applyInviteMeta,
  buildInviteWebviewUrl,
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

function wantsInviteDocument(accept: string | undefined): boolean {
  if (!accept) return true;
  return accept.includes("text/html") || accept.includes("application/xhtml") || accept.includes("*/*");
}

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

function messageFor(
  settings: SendSettings,
  guest: { name: string; token: string; whatsapp?: string },
  campaign: ReturnType<typeof parseInviteCampaign>,
  origin: string
) {
  const place = settings.ceremonyVenue || settings.ceremonyAddress || "";
  const webviewLink = buildInviteWebviewUrl(origin, guest);
  return renderInviteMessage(campaignTemplate(settings, campaign), {
    nome: guest.name,
    data: dateLabel(settings.weddingDate),
    horario: settings.ceremonyTime || "16:00",
    link: webviewLink,
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

import type { WhatsAppQueueService } from "./whatsapp/queue";
import { zapoService } from "./whatsapp/zapoClient";
import crypto from "crypto";

export function registerInviteRoutes(
  app: Express,
  deps: {
    prisma: PrismaClient;
    authenticate: (req: any, res: any, next: any) => void;
    clientIp: (req: Request) => string;
    allowInviteRead: (key: string) => boolean;
    allowInviteSend: (key: string) => boolean;
    buildWhaticketOptionalIds: (userId: string, queueId: string) => Record<string, number>;
    whatsAppQueue?: WhatsAppQueueService;
  },
) {
  const { prisma, authenticate, clientIp, allowInviteRead, allowInviteSend, buildWhaticketOptionalIds, whatsAppQueue } = deps;

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
    const isWhaticket = settings?.whatsappProvider === "whaticket";

    if (isWhaticket) {
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

    // Fluxo Zapo (módulo nativo próprio)
    try {
      const body = messageFor(settings || ({} as any), guest, campaign, origin);
      if (whatsAppQueue) {
        const queued = await whatsAppQueue.enqueue({
          recipient: guest.whatsapp,
          content: body,
          type: "invite",
          guestId: guest.id,
          idempotencyKey: requestId,
        });

        const newStatus = queued.status === "failed_perm" ? "failed" : "sent";
        await prisma.weddingGuest.update({
          where: { id: guest.id },
          data: { status: newStatus, sentAt: new Date(), lastError: queued.error || "" },
        });
        await prisma.weddingInviteAttempt.create({
          data: { guestId: guest.id, campaign, status: newStatus, requestId },
        });
        return { id: guest.id, name: guest.name, status: newStatus as "sent" | "failed", action: "return" as const };
      } else {
        await prisma.weddingGuest.update({
          where: { id: guest.id },
          data: { status: "sent", sentAt: new Date(), lastError: "" },
        });
        await prisma.weddingInviteAttempt.create({ data: { guestId: guest.id, campaign, status: "sent", requestId } });
        return { id: guest.id, name: guest.name, status: "sent" as const, action: "return" as const };
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Falha ao processar convite no WhatsApp.";
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

  app.get("/api/invite-lookup", async (req, res) => {
    if (!allowInviteRead(clientIp(req))) {
      return res.status(429).json({ error: "Muitas consultas em pouco tempo. Aguarde alguns minutos." });
    }
    const phone = String(req.query.phone || "").replace(/\D/g, "");
    if (!phone || phone.length < 8) {
      return res.status(400).json({ error: "Telefone inválido para consulta." });
    }
    const normalized = phone.length === 10 || phone.length === 11 ? `55${phone}` : phone;
    const digitsEnd = normalized.slice(-8);
    const guest = await prisma.weddingGuest.findFirst({
      where: {
        OR: [
          { whatsapp: normalized },
          { whatsapp: phone },
          { whatsapp: { endsWith: digitsEnd } },
        ],
      },
      select: {
        token: true,
        name: true,
        seats: true,
        groupName: true,
        rsvp: { select: { attending: true, guests: true, message: true, name: true } },
      },
    });
    if (!guest) return res.status(404).json({ error: "Convidado não encontrado." });
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
      const link = guest ? buildInviteWebviewUrl(origin, guest) : `${origin}/convite?preview=1`;
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

  // --- Rotas de Contatos do WhatsApp & Disparador Direto ---

  app.get("/api/admin/whatsapp/contacts", authenticate, async (_req, res) => {
    try {
      const zapoContacts = await zapoService.getSyncedContacts();
      const [allGuests, sentMessages] = await Promise.all([
        prisma.weddingGuest.findMany({
          select: {
            id: true,
            name: true,
            whatsapp: true,
            status: true,
            sentAt: true,
            seats: true,
            groupName: true,
            token: true,
            rsvp: { select: { attending: true, guests: true } },
          },
        }),
        prisma.whatsAppMessage.findMany({
          where: { status: "sent" },
          select: { recipient: true, sentAt: true },
          orderBy: { sentAt: "desc" },
        }),
      ]);

      const guestByPhone = new Map<string, typeof allGuests[0]>();
      for (const g of allGuests) {
        const clean = g.whatsapp.replace(/\D/g, "");
        const norm = clean.length === 10 || clean.length === 11 ? `55${clean}` : clean;
        guestByPhone.set(norm, g);
      }

      const sentHistory = new Map<string, Date>();
      for (const m of sentMessages) {
        const clean = m.recipient.replace(/\D/g, "");
        const norm = clean.length === 10 || clean.length === 11 ? `55${clean}` : clean;
        if (!sentHistory.has(norm) && m.sentAt) {
          sentHistory.set(norm, m.sentAt);
        }
      }

      const contactsMap = new Map<string, {
        phone: string;
        name: string;
        source: "whatsapp" | "guest_list" | "both";
        isGuest: boolean;
        guestId: string | null;
        token: string | null;
        alreadySent: boolean;
        lastSentAt: string | null;
        rsvp: { attending: boolean; guests: number } | null;
        groupName?: string;
        seats?: number;
      }>();

      // 1. Processa contatos obtidos via WhatsApp
      for (const c of zapoContacts) {
        const clean = c.phone.replace(/\D/g, "");
        const norm = clean.length === 10 || clean.length === 11 ? `55${clean}` : clean;
        const g = guestByPhone.get(norm);
        const lastSent = g?.sentAt || sentHistory.get(norm) || null;
        const alreadySent = g?.status === "sent" || !!sentHistory.get(norm);
        const name = g?.name || c.name || c.pushName || "";

        contactsMap.set(norm, {
          phone: norm,
          name,
          source: g ? "both" : "whatsapp",
          isGuest: !!g,
          guestId: g?.id || null,
          token: g?.token || null,
          alreadySent,
          lastSentAt: lastSent ? new Date(lastSent).toISOString() : null,
          rsvp: g?.rsvp || null,
          groupName: g?.groupName,
          seats: g?.seats,
        });
      }

      // 2. Adiciona convidados cadastrados que não estavam na lista do WhatsApp
      for (const g of allGuests) {
        const clean = g.whatsapp.replace(/\D/g, "");
        const norm = clean.length === 10 || clean.length === 11 ? `55${clean}` : clean;
        if (!contactsMap.has(norm)) {
          const lastSent = g.sentAt || sentHistory.get(norm) || null;
          const alreadySent = g.status === "sent" || !!sentHistory.get(norm);
          contactsMap.set(norm, {
            phone: norm,
            name: g.name,
            source: "guest_list",
            isGuest: true,
            guestId: g.id,
            token: g.token,
            alreadySent,
            lastSentAt: lastSent ? new Date(lastSent).toISOString() : null,
            rsvp: g.rsvp || null,
            groupName: g.groupName,
            seats: g.seats,
          });
        }
      }

      const list = Array.from(contactsMap.values()).sort((a, b) => {
        if (a.name && !b.name) return -1;
        if (!a.name && b.name) return 1;
        return a.name.localeCompare(b.name);
      });

      const alreadySentCount = list.filter((c) => c.alreadySent).length;
      const pendingCount = list.length - alreadySentCount;

      res.json({
        contacts: list,
        total: list.length,
        alreadySentCount,
        pendingCount,
        whatsappConnected: zapoService.getState() === "connected",
        connectedPhone: zapoService.getPhone(),
      });
    } catch (err: any) {
      console.error("[GET /api/admin/whatsapp/contacts] Erro:", err);
      res.status(500).json({ error: err?.message || "Erro ao consultar contatos do WhatsApp." });
    }
  });

  app.post("/api/admin/whatsapp/contacts/send", authenticate, async (req, res) => {
    if (!allowInviteSend(clientIp(req))) return res.status(429).json({ error: "Muitos envios em pouco tempo. Aguarde alguns minutos." });
    try {
      const numbers: string[] = Array.isArray(req.body?.numbers) ? req.body.numbers : [];
      if (!numbers.length) {
        return res.status(400).json({ error: "Informe ao menos um número de telefone para disparo." });
      }

      const names: Record<string, string> = req.body?.names || {};
      const campaign = req.body?.campaign || "official";
      const force = Boolean(req.body?.force);
      const requestId = String(req.body?.requestId || crypto.randomUUID().replaceAll("-", "").slice(0, 20));

      const results = [];
      let sent = 0;
      let skipped = 0;

      for (const [idx, rawNum] of numbers.slice(0, 50).entries()) {
        const clean = String(rawNum).replace(/\D/g, "");
        if (!clean || clean.length < 8) {
          results.push({ phone: rawNum, status: "failed", reason: "Número de telefone inválido." });
          skipped++;
          continue;
        }

        const normPhone = clean.length === 10 || clean.length === 11 ? `55${clean}` : clean;

        // Localiza ou cria convidado para persistência do token do convite
        let guest = await prisma.weddingGuest.findFirst({ where: { whatsapp: normPhone } });
        if (!guest) {
          const providedName = (names[rawNum] || names[normPhone] || "Convidado").trim().slice(0, 80);
          guest = await prisma.weddingGuest.create({
            data: {
              token: createInviteToken(),
              name: providedName || "Convidado",
              whatsapp: normPhone,
              groupName: "outros",
              seats: 2,
              notes: "Disparo rápido WhatsApp",
              optedOut: false,
              status: "pending",
            },
          });
        }

        // Se já foi enviado e force=false, avisa e pula
        if (!force && guest.status === "sent") {
          results.push({
            phone: normPhone,
            name: guest.name,
            status: "skipped",
            reason: "Já enviado anteriormente. Ative a opção de forçar reenvio se desejar reenviar.",
          });
          skipped++;
          continue;
        }

        const deliveryResult = await deliver(
          guest.id,
          campaign,
          force,
          `${requestId}-${idx + 1}`,
          publicOrigin(req)
        );

        if (deliveryResult.status === "sent") {
          sent++;
        } else {
          skipped++;
        }

        results.push({
          phone: normPhone,
          name: guest.name,
          ...deliveryResult,
        });

        await new Promise((resolve) => setTimeout(resolve, 350));
      }

      res.json({
        total: numbers.length,
        sent,
        skipped,
        results,
      });
    } catch (err: any) {
      console.error("[POST /api/admin/whatsapp/contacts/send] Erro:", err);
      res.status(500).json({ error: err?.message || "Falha ao disparar convites." });
    }
  });

  app.post("/api/admin/whatsapp/contacts/import", authenticate, async (req, res) => {
    try {
      const contacts: Array<{ phone: string; name?: string; groupName?: string; seats?: number }> =
        Array.isArray(req.body?.contacts) ? req.body.contacts : [];

      if (!contacts.length) {
        return res.status(400).json({ error: "Nenhum contato selecionado para importação." });
      }

      let imported = 0;
      let alreadyExists = 0;

      for (const item of contacts.slice(0, 100)) {
        const clean = String(item.phone || "").replace(/\D/g, "");
        if (!clean || clean.length < 8) continue;
        const normPhone = clean.length === 10 || clean.length === 11 ? `55${clean}` : clean;

        const existing = await prisma.weddingGuest.findFirst({ where: { whatsapp: normPhone } });
        if (existing) {
          alreadyExists++;
          continue;
        }

        await prisma.weddingGuest.create({
          data: {
            token: createInviteToken(),
            name: (item.name || "Convidado").trim().slice(0, 80) || "Convidado",
            whatsapp: normPhone,
            groupName: item.groupName || "amigos",
            seats: item.seats || 2,
            notes: "Importado da agenda do WhatsApp",
            optedOut: false,
            status: "pending",
          },
        });
        imported++;
      }

      res.json({
        success: true,
        imported,
        alreadyExists,
        message: `${imported} contato(s) importado(s) para a lista oficial.${alreadyExists ? ` (${alreadyExists} já existiam).` : ""}`,
      });
    } catch (err: any) {
      console.error("[POST /api/admin/whatsapp/contacts/import] Erro:", err);
      res.status(500).json({ error: err?.message || "Falha ao importar contatos." });
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
    if (!wantsInviteDocument(req.headers.accept)) return next();
    return sendInviteDocument(req, res);
  });

  app.get("/c/:token", (req, res, next) => {
    if (process.env.NODE_ENV !== "production") return next();
    if (!isInviteToken(req.params.token)) return next();
    if (!wantsInviteDocument(req.headers.accept)) return next();
    return sendInviteDocument(req, res);
  });
}
