import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { mkdir, writeFile } from "fs/promises";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import cors from "cors";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import cookieParser from "cookie-parser";
import dotenv from "dotenv";
import { applyDatabaseUrlToEnv } from "./config/database";
import { getPreferredPort, resolveAvailablePort } from "./config/server-port";

dotenv.config();
applyDatabaseUrlToEnv();

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  throw new Error("Defina DATABASE_URL ou DB_USER, DB_PASS, DB_NAME (e opcionalmente DB_HOST, DB_PORT) no .env");
}
const pool = new Pool({ connectionString: databaseUrl });
const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });
const app = express();
const JWT_SECRET = process.env.JWT_SECRET || "fallback_secret";

if (process.env.NODE_ENV === "production") {
  app.set("trust proxy", 1);
}

/** Em produção (HTTPS) cookies precisam de Secure + SameSite=None; em http://localhost não. */
const isProd = process.env.NODE_ENV === "production";
const authCookie = {
  httpOnly: true,
  maxAge: 24 * 60 * 60 * 1000,
  secure: isProd,
  sameSite: isProd ? ("none" as const) : ("lax" as const),
};

app.use(express.json());
app.use(cookieParser());
app.use(
  cors({
    origin: true,
    credentials: true,
    exposedHeaders: ["X-Backup-Saved-Path", "X-Backup-Filename"],
  })
);

const DEFAULT_WHATSAPP_RESERVATION_TEMPLATE =
  "🎁 Nova reserva no site ({couple})\n\n" +
  "Presente: {item}\n" +
  "Convidado(a): {nome}\n" +
  "WhatsApp: {whatsapp}\n" +
  "Recado: {mensagem}\n\n" +
  "Opções de presente: podem comprar o item por conta própria e entregar aos noivos, ou enviar o valor via PIX:\n" +
  "Chave PIX: {pixKey}\n" +
  "Titular: {pixName}";
const DEFAULT_WHATSAPP_GUEST_REPLY_TEMPLATE =
  "Oi, {nome}! Obrigado pelo carinho com {couple}. 💛\n\n" +
  'Recebemos sua reserva do presente: "{item}".\n\n' +
  "Você pode escolher a melhor forma de presentear:\n" +
  "1) Comprar o item por conta própria e entregar aos noivos.\n" +
  "2) Enviar o valor via PIX.\n\n" +
  "Se preferir PIX, mando a chave na próxima mensagem para facilitar copiar e colar.";
const DEFAULT_WHATSAPP_GUEST_PIX_TEMPLATE =
  "Chave PIX (copiar e colar):\n{pixKey}\nTitular: {pixName}";

/** Corpo aceite pelo Prisma para PurchasedItem (evita campos extra e formatos que rebentam o processo → 502 no Nginx). */
function parsePurchasedPayload(body: Record<string, unknown>) {
  const nome = String(body.nome ?? "").trim();
  const categoria = String(body.categoria ?? "").trim();
  if (!nome || !categoria) {
    throw new Error("Nome e categoria são obrigatórios.");
  }
  let rawValor = body.valor;
  if (typeof rawValor === "string") {
    rawValor = parseFloat(rawValor.replace(/\s/g, "").replace(",", "."));
  }
  const valor = typeof rawValor === "number" ? rawValor : Number(rawValor);
  if (!Number.isFinite(valor)) {
    throw new Error("Valor inválido. Use número (ex.: 1.99 ou 1,99).");
  }
  let dataCompra: Date;
  if (body.dataCompra != null && body.dataCompra !== "") {
    const d = new Date(String(body.dataCompra));
    if (Number.isNaN(d.getTime())) {
      throw new Error("Data da compra inválida.");
    }
    dataCompra = d;
  } else {
    dataCompra = new Date();
  }
  return { nome, categoria, valor, dataCompra };
}

function parseSettingsPayload(body: Record<string, unknown>) {
  const pixKey = String(body.pixKey ?? "").trim();
  const pixName = String(body.pixName ?? "").trim();
  const coupleNamesRaw = String(body.coupleNames ?? "").trim();
  const coupleNames = coupleNamesRaw || "Tais & Yran";
  const weddingDateRaw = String(body.weddingDate ?? "").trim();
  const weddingDate = /^\d{4}-\d{2}-\d{2}$/.test(weddingDateRaw) ? weddingDateRaw : "2027-02-02";
  const whatsappNumber = String(body.whatsappNumber ?? "").replace(/\D/g, "");
  const whaticketApiUrl =
    String(body.whaticketApiUrl ?? "").trim() || "https://api.whaticketup.com.br/api/messages/send";
  const whaticketToken = String(body.whaticketToken ?? "").trim();
  const whaticketUserId = String(body.whaticketUserId ?? "").trim();
  const whaticketQueueId = String(body.whaticketQueueId ?? "").trim();
  const whaticketTemplateRaw = String(body.whaticketTemplate ?? DEFAULT_WHATSAPP_RESERVATION_TEMPLATE).trim();
  const whaticketTemplate = whaticketTemplateRaw || DEFAULT_WHATSAPP_RESERVATION_TEMPLATE;
  const guestReplyTemplateRaw = String(body.guestReplyTemplate ?? DEFAULT_WHATSAPP_GUEST_REPLY_TEMPLATE).trim();
  const guestReplyTemplate = guestReplyTemplateRaw || DEFAULT_WHATSAPP_GUEST_REPLY_TEMPLATE;
  const guestPixTemplateRaw = String(body.guestPixTemplate ?? DEFAULT_WHATSAPP_GUEST_PIX_TEMPLATE).trim();
  const guestPixTemplate = guestPixTemplateRaw || DEFAULT_WHATSAPP_GUEST_PIX_TEMPLATE;
  const whaticketSign = Boolean(body.whaticketSign ?? true);
  const whaticketClose = Boolean(body.whaticketClose ?? false);
  return {
    pixKey,
    pixName,
    coupleNames,
    weddingDate,
    whatsappNumber,
    whaticketApiUrl,
    whaticketToken,
    whaticketUserId,
    whaticketQueueId,
    whaticketTemplate,
    guestReplyTemplate,
    guestPixTemplate,
    whaticketSign,
    whaticketClose,
  };
}

function buildWhaticketOptionalIds(userIdRaw: string, queueIdRaw: string) {
  const userId = String(userIdRaw ?? "").trim();
  const queueId = String(queueIdRaw ?? "").trim();
  const out: Record<string, number> = {};
  if (userId) {
    const parsed = Number(userId);
    if (Number.isInteger(parsed) && parsed > 0) out.userId = parsed;
  }
  if (queueId) {
    const parsed = Number(queueId);
    if (Number.isInteger(parsed) && parsed > 0) out.queueId = parsed;
  }
  return out;
}

async function sendReservationToWhaticket(
  settings: {
    whatsappNumber: string;
    whaticketApiUrl: string;
    whaticketToken: string;
    whaticketUserId: string;
    whaticketQueueId: string;
    whaticketTemplate: string;
    guestReplyTemplate: string;
    guestPixTemplate: string;
    whaticketSign: boolean;
    whaticketClose: boolean;
    pixKey: string;
    pixName: string;
    coupleNames: string;
  },
  payload: { itemNome: string; convidado: string; whatsapp: string; mensagem?: string }
) {
  const ownerNumber = (settings.whatsappNumber || "").replace(/\D/g, "");
  const token = settings.whaticketToken?.trim();
  if (!ownerNumber || !token) return;

  const template = settings.whaticketTemplate?.trim() || DEFAULT_WHATSAPP_RESERVATION_TEMPLATE;
  const pixKey = (settings.pixKey || "").trim() || "(cadastre a chave PIX no painel do site)";
  const pixName = (settings.pixName || "").trim() || "(cadastre o titular no painel)";
  const couple = (settings.coupleNames || "").trim() || "o casal";
  const ownerMsg = template
    .replace(/\{item\}/gi, payload.itemNome)
    .replace(/\{nome\}/gi, payload.convidado)
    .replace(/\{whatsapp\}/gi, payload.whatsapp)
    .replace(/\{mensagem\}/gi, payload.mensagem?.trim() || "(sem recado)")
    .replace(/\{pixKey\}/gi, pixKey)
    .replace(/\{pixName\}/gi, pixName)
    .replace(/\{couple\}/gi, couple);

  const ownerBody = {
    number: ownerNumber,
    body: ownerMsg,
    ...buildWhaticketOptionalIds(settings.whaticketUserId, settings.whaticketQueueId),
    sendSignature: settings.whaticketSign,
    closeTicket: settings.whaticketClose,
  };

  const ownerResp = await fetch(settings.whaticketApiUrl, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(ownerBody),
  });

  if (!ownerResp.ok) {
    const out = await ownerResp.text();
    throw new Error(`Whaticket falhou (${ownerResp.status}): ${out}`);
  }

  // Mensagem de retorno para o convidado que reservou.
  const guestRaw = String(payload.whatsapp ?? "").replace(/\D/g, "");
  const guestNumber =
    guestRaw.length === 11 || guestRaw.length === 10
      ? `55${guestRaw}`
      : guestRaw;

  if (guestNumber) {
    const guestBodyText =
      (settings.guestReplyTemplate?.trim() || DEFAULT_WHATSAPP_GUEST_REPLY_TEMPLATE)
        .replace(/\{item\}/gi, payload.itemNome)
        .replace(/\{nome\}/gi, payload.convidado)
        .replace(/\{whatsapp\}/gi, payload.whatsapp)
        .replace(/\{mensagem\}/gi, payload.mensagem?.trim() || "(sem recado)")
        .replace(/\{pixKey\}/gi, pixKey)
        .replace(/\{pixName\}/gi, pixName)
        .replace(/\{couple\}/gi, couple);

    const guestBody = {
      number: guestNumber,
      body: guestBodyText,
      ...buildWhaticketOptionalIds(settings.whaticketUserId, settings.whaticketQueueId),
      sendSignature: settings.whaticketSign,
      closeTicket: false,
    };

    const guestResp = await fetch(settings.whaticketApiUrl, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(guestBody),
    });
    if (!guestResp.ok) {
      const out = await guestResp.text();
      throw new Error(`Whaticket convidado falhou (${guestResp.status}): ${out}`);
    }

    const guestPixBody = {
      number: guestNumber,
      body: (settings.guestPixTemplate?.trim() || DEFAULT_WHATSAPP_GUEST_PIX_TEMPLATE)
        .replace(/\{item\}/gi, payload.itemNome)
        .replace(/\{nome\}/gi, payload.convidado)
        .replace(/\{whatsapp\}/gi, payload.whatsapp)
        .replace(/\{mensagem\}/gi, payload.mensagem?.trim() || "(sem recado)")
        .replace(/\{pixKey\}/gi, pixKey)
        .replace(/\{pixName\}/gi, pixName)
        .replace(/\{couple\}/gi, couple),
      ...buildWhaticketOptionalIds(settings.whaticketUserId, settings.whaticketQueueId),
      sendSignature: settings.whaticketSign,
      closeTicket: settings.whaticketClose,
    };

    const guestPixResp = await fetch(settings.whaticketApiUrl, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(guestPixBody),
    });
    if (!guestPixResp.ok) {
      const out = await guestPixResp.text();
      throw new Error(`Whaticket PIX convidado falhou (${guestPixResp.status}): ${out}`);
    }
  }
}

async function sendPixDonationToWhaticket(
  settings: {
    whatsappNumber: string;
    whaticketApiUrl: string;
    whaticketToken: string;
    whaticketUserId: string;
    whaticketQueueId: string;
    whaticketSign: boolean;
    whaticketClose: boolean;
  },
  payload: { nome: string; whatsapp: string; valor?: number; mensagem?: string }
) {
  const number = (settings.whatsappNumber || "").replace(/\D/g, "");
  const token = settings.whaticketToken?.trim();
  if (!number || !token) return;

  const valorFmt =
    typeof payload.valor === "number" && Number.isFinite(payload.valor)
      ? `R$ ${payload.valor.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
      : "Não informado";
  const bodyText =
    "Novo aviso de doação PIX no site.\n" +
    `Nome: ${payload.nome}\n` +
    `WhatsApp: ${payload.whatsapp}\n` +
    `Valor: ${valorFmt}\n` +
    `Mensagem: ${payload.mensagem?.trim() || "(sem mensagem)"}`;

  const body = {
    number,
    body: bodyText,
    ...buildWhaticketOptionalIds(settings.whaticketUserId, settings.whaticketQueueId),
    sendSignature: settings.whaticketSign,
    closeTicket: settings.whaticketClose,
  };

  const resp = await fetch(settings.whaticketApiUrl, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!resp.ok) {
    const out = await resp.text();
    throw new Error(`Whaticket falhou (${resp.status}): ${out}`);
  }
}

async function sendWhaticketTestMessage(
  settings: {
    whatsappNumber: string;
    whaticketApiUrl: string;
    whaticketToken: string;
    whaticketUserId: string;
    whaticketQueueId: string;
    whaticketSign: boolean;
    whaticketClose: boolean;
  },
  bodyText: string
) {
  const number = (settings.whatsappNumber || "").replace(/\D/g, "");
  const token = settings.whaticketToken?.trim();
  if (!number || !token) {
    throw new Error("Configure WhatsApp de destino e token do Whaticket.");
  }

  const body = {
    number,
    body: bodyText,
    ...buildWhaticketOptionalIds(settings.whaticketUserId, settings.whaticketQueueId),
    sendSignature: settings.whaticketSign,
    closeTicket: settings.whaticketClose,
  };

  const resp = await fetch(settings.whaticketApiUrl, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!resp.ok) {
    const out = await resp.text();
    throw new Error(`Whaticket falhou (${resp.status}): ${out}`);
  }
}

// Auth Middleware
const authenticate = (req: any, res: any, next: any) => {
  const token = req.cookies.token;
  if (!token) return res.status(401).json({ error: "Unauthorized" });
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    res.status(401).json({ error: "Invalid token" });
  }
};

// --- API Routes ---

// Auth
app.post("/api/login", async (req, res) => {
  const emailRaw = String(req.body?.email ?? "").trim();
  const password = String(req.body?.password ?? "");
  const adminEmail = (process.env.ADMIN_EMAIL || "sistemazapzap@gmail.com").trim().toLowerCase();
  const adminPassword = process.env.ADMIN_PASSWORD || "admin123";

  try {
    // 1) Utilizadores na tabela User (ex.: criados pelo script de instalação)
    if (emailRaw) {
      const user = await prisma.user.findUnique({ where: { email: emailRaw } });
      if (user && (await bcrypt.compare(password, user.password))) {
        const token = jwt.sign({ id: user.id, email: user.email, role: user.role }, JWT_SECRET, {
          expiresIn: "24h",
        });
        res.cookie("token", token, authCookie);
        return res.json({ user: { email: user.email, role: user.role } });
      }
    }

    // 2) Admin de ambiente (.env): funciona sempre, mesmo com users na BD
    //    (antes só era aceite quando não havia nenhum user — isso bloqueava o login “documentado”.)
    if (emailRaw.toLowerCase() === adminEmail && password === adminPassword) {
      const token = jwt.sign({ email: emailRaw, role: "admin" }, JWT_SECRET, { expiresIn: "24h" });
      res.cookie("token", token, authCookie);
      return res.json({ user: { email: emailRaw, role: "admin" } });
    }
  } catch (err) {
    console.error("Login error:", err);
    return res.status(500).json({ error: "Erro interno no servidor" });
  }

  res.status(401).json({ error: "Credenciais inválidas" });
});

app.post("/api/logout", (req, res) => {
  res.clearCookie("token", { ...authCookie, maxAge: 0 });
  res.json({ message: "Logged out" });
});

app.get("/api/me", (req, res) => {
  const token = req.cookies.token;
  if (!token) return res.status(401).json({ error: "Not logged in" });
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    res.json({ user: decoded });
  } catch (err) {
    res.status(401).json({ error: "Invalid token" });
  }
});

app.post("/api/admin/profile", authenticate, async (req: any, res) => {
  try {
    const currentPassword = String(req.body?.currentPassword ?? "");
    const newEmailRaw = String(req.body?.email ?? "").trim().toLowerCase();
    const newPassword = String(req.body?.newPassword ?? "");
    if (!currentPassword) {
      return res.status(400).json({ error: "Senha atual é obrigatória." });
    }

    const envAdminEmail = (process.env.ADMIN_EMAIL || "sistemazapzap@gmail.com").trim().toLowerCase();
    const envAdminPassword = process.env.ADMIN_PASSWORD || "admin123";

    const tokenUserEmail = String(req.user?.email ?? "").trim().toLowerCase();
    let dbUser = req.user?.id
      ? await prisma.user.findUnique({ where: { id: String(req.user.id) } })
      : null;
    if (!dbUser && tokenUserEmail) {
      dbUser = await prisma.user.findUnique({ where: { email: tokenUserEmail } });
    }

    let isValidCurrentPassword = false;
    if (dbUser) {
      isValidCurrentPassword = await bcrypt.compare(currentPassword, dbUser.password);
    } else if (tokenUserEmail === envAdminEmail) {
      isValidCurrentPassword = currentPassword === envAdminPassword;
    }
    if (!isValidCurrentPassword) {
      return res.status(401).json({ error: "Senha atual inválida." });
    }

    const finalEmail = (newEmailRaw || tokenUserEmail || envAdminEmail).toLowerCase();
    if (!finalEmail) {
      return res.status(400).json({ error: "E-mail inválido." });
    }

    const finalPassword = newPassword.trim() || currentPassword;
    let savedUser;
    if (dbUser) {
      const updateData: any = {};
      if (finalEmail && finalEmail !== dbUser.email) updateData.email = finalEmail;
      if (newPassword.trim()) updateData.password = await bcrypt.hash(newPassword, 10);
      savedUser =
        Object.keys(updateData).length > 0
          ? await prisma.user.update({ where: { id: dbUser.id }, data: updateData })
          : dbUser;
    } else {
      savedUser = await prisma.user.create({
        data: {
          email: finalEmail,
          password: await bcrypt.hash(finalPassword, 10),
          role: "admin",
        },
      });
    }

    const token = jwt.sign(
      { id: savedUser.id, email: savedUser.email, role: savedUser.role },
      JWT_SECRET,
      { expiresIn: "24h" }
    );
    res.cookie("token", token, authCookie);
    return res.json({ user: { email: savedUser.email, role: savedUser.role } });
  } catch (err: unknown) {
    console.error("POST /api/admin/profile:", err);
    const code =
      err && typeof err === "object" && "code" in err && (err as { code?: string }).code === "P2002"
        ? 409
        : 400;
    const message = code === 409 ? "Este e-mail já está em uso." : "Falha ao atualizar conta de administrador.";
    return res.status(code).json({ error: message });
  }
});

// Registry (Enxoval)
app.get("/api/registry", async (req, res) => {
  const items = await prisma.enxovalItem.findMany({
    orderBy: { createdAt: "desc" }
  });
  res.json(items);
});

app.post("/api/registry", authenticate, async (req, res) => {
  try {
    const data = req.body ?? {};
    if (!String(data.nome ?? "").trim()) {
      return res.status(400).json({ error: "Nome é obrigatório." });
    }
    if (!String(data.prioridade ?? "").trim()) {
      return res.status(400).json({ error: "Prioridade é obrigatória." });
    }
    const item = await prisma.enxovalItem.create({
      data
    });
    res.json(item);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Erro ao criar item.";
    console.error("POST /api/registry:", err);
    res.status(400).json({ error: msg });
  }
});

app.put("/api/registry/:id", async (req, res) => {
  const { id } = req.params;
  try {
    // If it's a guest reservation, we only allow updating status and reservadoPor
    // If it's an admin, we allow everything (but for now we simplify)
    const item = await prisma.enxovalItem.update({
      where: { id },
      data: req.body
    });
    res.json(item);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Erro ao atualizar item.";
    console.error("PUT /api/registry:", err);
    const code =
      err && typeof err === "object" && "code" in err && (err as { code?: string }).code === "P2025"
        ? 404
        : 400;
    res.status(code).json({ error: msg });
  }
});

app.delete("/api/registry/:id", authenticate, async (req, res) => {
  const { id } = req.params;
  try {
    await prisma.$transaction(async (tx) => {
      await tx.reservation.deleteMany({ where: { enxovalId: id } });
      await tx.enxovalItem.delete({ where: { id } });
    });
    res.json({ success: true });
  } catch (err: unknown) {
    console.error("DELETE /api/registry:", err);
    const code =
      err && typeof err === "object" && "code" in err && (err as { code?: string }).code === "P2025"
        ? 404
        : 500;
    res.status(code).json({ error: "Erro ao eliminar item." });
  }
});

// Purchased Items
app.get("/api/purchased", async (req, res) => {
  const items = await prisma.purchasedItem.findMany({
    orderBy: { dataCompra: "desc" }
  });
  res.json(items);
});

app.post("/api/purchased", authenticate, async (req, res) => {
  try {
    const data = parsePurchasedPayload(req.body ?? {});
    const item = await prisma.purchasedItem.create({ data });
    res.json(item);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Erro ao criar item.";
    console.error("POST /api/purchased:", err);
    res.status(400).json({ error: msg });
  }
});

app.put("/api/purchased/:id", authenticate, async (req, res) => {
  try {
    const data = parsePurchasedPayload(req.body ?? {});
    const item = await prisma.purchasedItem.update({
      where: { id: req.params.id },
      data,
    });
    res.json(item);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Erro ao atualizar item.";
    console.error("PUT /api/purchased:", err);
    const code = err && typeof err === "object" && "code" in err && (err as { code?: string }).code === "P2025" ? 404 : 400;
    res.status(code).json({ error: msg });
  }
});

app.delete("/api/purchased/:id", authenticate, async (req, res) => {
  try {
    await prisma.purchasedItem.delete({ where: { id: req.params.id } });
    res.json({ success: true });
  } catch (err) {
    console.error("DELETE /api/purchased:", err);
    res.status(500).json({ error: "Erro ao eliminar item." });
  }
});

// Reservations
app.get("/api/reservations", authenticate, async (req, res) => {
  const reservations = await prisma.reservation.findMany({
    include: { enxovalItem: true },
    orderBy: { dataReserva: "desc" }
  });
  res.json(reservations);
});

app.post("/api/reservations", async (req, res) => {
  try {
    const reservation = await prisma.reservation.create({
      data: req.body
    });
    // Also update the item status
    const item = await prisma.enxovalItem.update({
      where: { id: req.body.enxovalId },
      data: { status: "Reservado", reservadoPor: req.body.nome }
    });

    const settings = await prisma.settings.findUnique({ where: { id: "global" } });
    if (settings) {
      try {
        await sendReservationToWhaticket(
          {
            whatsappNumber: settings.whatsappNumber,
            whaticketApiUrl: settings.whaticketApiUrl,
            whaticketToken: settings.whaticketToken,
            whaticketUserId: settings.whaticketUserId,
            whaticketQueueId: settings.whaticketQueueId,
            whaticketTemplate: settings.whaticketTemplate,
            guestReplyTemplate: settings.guestReplyTemplate,
            guestPixTemplate: settings.guestPixTemplate,
            whaticketSign: settings.whaticketSign,
            whaticketClose: settings.whaticketClose,
            pixKey: settings.pixKey,
            pixName: settings.pixName,
            coupleNames: settings.coupleNames,
          },
          {
            itemNome: item.nome,
            convidado: String(req.body.nome ?? ""),
            whatsapp: String(req.body.whatsapp ?? ""),
            mensagem: req.body.mensagem ? String(req.body.mensagem) : "",
          }
        );
      } catch (notifyErr) {
        // Não bloqueia a reserva se API externa falhar.
        console.error("Falha ao enviar aviso via Whaticket:", notifyErr);
      }
    }

    res.json(reservation);
  } catch (err) {
    console.error("POST /api/reservations:", err);
    res.status(500).json({ error: "Erro ao criar reserva." });
  }
});

app.post("/api/pix-donations", async (req, res) => {
  try {
    const nome = String(req.body?.nome ?? "").trim();
    const whatsapp = String(req.body?.whatsapp ?? "").replace(/\D/g, "");
    const mensagem = String(req.body?.mensagem ?? "").trim();
    const rawValor = req.body?.valor;
    const valor =
      rawValor == null || rawValor === ""
        ? undefined
        : typeof rawValor === "number"
          ? rawValor
          : Number(String(rawValor).replace(/\s/g, "").replace(",", "."));

    if (!nome) return res.status(400).json({ error: "Nome é obrigatório." });
    if (!whatsapp) return res.status(400).json({ error: "WhatsApp é obrigatório." });
    if (valor != null && !Number.isFinite(valor)) {
      return res.status(400).json({ error: "Valor do PIX inválido." });
    }

    const settings = await prisma.settings.findUnique({ where: { id: "global" } });
    if (!settings) {
      return res.status(400).json({ error: "Configurações não encontradas." });
    }

    try {
      await sendPixDonationToWhaticket(
        {
          whatsappNumber: settings.whatsappNumber,
          whaticketApiUrl: settings.whaticketApiUrl,
          whaticketToken: settings.whaticketToken,
          whaticketUserId: settings.whaticketUserId,
          whaticketQueueId: settings.whaticketQueueId,
          whaticketSign: settings.whaticketSign,
          whaticketClose: settings.whaticketClose,
        },
        { nome, whatsapp, valor, mensagem }
      );
    } catch (notifyErr) {
      console.error("Falha ao enviar aviso de PIX via Whaticket:", notifyErr);
      const msg = notifyErr instanceof Error ? notifyErr.message : "Falha no envio de WhatsApp.";
      return res.status(400).json({ error: msg });
    }

    res.json({ success: true });
  } catch (err) {
    console.error("POST /api/pix-donations:", err);
    res.status(500).json({ error: "Erro ao registrar aviso de PIX." });
  }
});

app.delete("/api/reservations/:id", authenticate, async (req, res) => {
  const reservation = await prisma.reservation.findUnique({ where: { id: req.params.id } });
  if (reservation) {
    // Reset item status
    await prisma.enxovalItem.update({
      where: { id: reservation.enxovalId },
      data: { status: "Disponível", reservadoPor: null }
    });
    await prisma.reservation.delete({ where: { id: req.params.id } });
  }
  res.json({ success: true });
});

// Settings
app.get("/api/settings", async (req, res) => {
  let settings = await prisma.settings.findUnique({ where: { id: "global" } });
  if (!settings) {
    settings = await prisma.settings.create({ data: { id: "global" } });
  }
  // Resposta pública: não expor token/sensíveis.
  res.json({
    id: settings.id,
    pixKey: settings.pixKey,
    pixName: settings.pixName,
    coupleNames: settings.coupleNames,
    weddingDate: settings.weddingDate,
  });
});

app.get("/api/settings/admin", authenticate, async (req, res) => {
  let settings = await prisma.settings.findUnique({ where: { id: "global" } });
  if (!settings) {
    settings = await prisma.settings.create({ data: { id: "global" } });
  }
  res.json(settings);
});

app.get("/api/backup/export", authenticate, async (req, res) => {
  try {
    const [users, registry, purchased, reservations, settings] = await Promise.all([
      prisma.user.findMany({ orderBy: { createdAt: "asc" } }),
      prisma.enxovalItem.findMany({ orderBy: { createdAt: "asc" } }),
      prisma.purchasedItem.findMany({ orderBy: { createdAt: "asc" } }),
      prisma.reservation.findMany({ orderBy: { createdAt: "asc" } }),
      prisma.settings.findUnique({ where: { id: "global" } }),
    ]);

    const backup = {
      version: 1,
      exportedAt: new Date().toISOString(),
      app: "enxoval",
      data: {
        users,
        registry,
        purchased,
        reservations,
        settings,
      },
    };

    const stamp = new Date().toISOString().replace(/[:.]/g, "-");
    const filename = `enxoval-backup-${stamp}.json`;
    const backupsDir = path.join(process.cwd(), "backups");
    const absolutePath = path.join(backupsDir, filename);
    const relativeForClient = path.posix.join("backups", filename);

    try {
      await mkdir(backupsDir, { recursive: true });
      await writeFile(absolutePath, `${JSON.stringify(backup, null, 2)}\n`, "utf8");
      res.setHeader("X-Backup-Saved-Path", relativeForClient);
    } catch (diskErr) {
      console.error("Backup: não foi possível gravar em backups/: ", diskErr);
    }

    res.setHeader("Content-Type", "application/json; charset=utf-8");
    res.setHeader("X-Backup-Filename", filename);
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    return res.status(200).json(backup);
  } catch (err) {
    console.error("GET /api/backup/export:", err);
    return res.status(500).json({ error: "Falha ao exportar backup." });
  }
});

app.post("/api/backup/import", authenticate, async (req, res) => {
  try {
    const payload = req.body?.backup ?? req.body;
    const data = payload?.data ?? payload;
    if (!data || typeof data !== "object") {
      return res.status(400).json({ error: "Arquivo de backup inválido." });
    }

    const users = Array.isArray(data.users) ? data.users : [];
    const registry = Array.isArray(data.registry) ? data.registry : [];
    const purchased = Array.isArray(data.purchased) ? data.purchased : [];
    const reservations = Array.isArray(data.reservations) ? data.reservations : [];
    const settings = data.settings && typeof data.settings === "object" ? data.settings : null;

    await prisma.$transaction(async (tx) => {
      await tx.reservation.deleteMany({});
      await tx.purchasedItem.deleteMany({});
      await tx.enxovalItem.deleteMany({});
      await tx.user.deleteMany({});
      await tx.settings.deleteMany({});

      if (settings) {
        await tx.settings.create({
          data: {
            id: "global",
            pixKey: String(settings.pixKey ?? ""),
            pixName: String(settings.pixName ?? ""),
            coupleNames: String(settings.coupleNames ?? "Tais & Yran"),
            weddingDate: String(settings.weddingDate ?? "2027-02-02"),
            whatsappNumber: String(settings.whatsappNumber ?? ""),
            whaticketApiUrl: String(settings.whaticketApiUrl ?? "https://api.whaticketup.com.br/api/messages/send"),
            whaticketToken: String(settings.whaticketToken ?? ""),
            whaticketUserId: String(settings.whaticketUserId ?? ""),
            whaticketQueueId: String(settings.whaticketQueueId ?? ""),
            whaticketTemplate: String(settings.whaticketTemplate ?? ""),
            guestReplyTemplate: String(settings.guestReplyTemplate ?? DEFAULT_WHATSAPP_GUEST_REPLY_TEMPLATE),
            guestPixTemplate: String(settings.guestPixTemplate ?? DEFAULT_WHATSAPP_GUEST_PIX_TEMPLATE),
            whaticketSign: Boolean(settings.whaticketSign ?? true),
            whaticketClose: Boolean(settings.whaticketClose ?? false),
          },
        });
      } else {
        await tx.settings.create({ data: { id: "global" } });
      }

      if (users.length > 0) {
        await tx.user.createMany({
          data: users.map((u: any) => ({
            id: String(u.id),
            email: String(u.email),
            password: String(u.password),
            role: String(u.role ?? "admin"),
            createdAt: u.createdAt ? new Date(u.createdAt) : new Date(),
          })),
        });
      }

      if (registry.length > 0) {
        await tx.enxovalItem.createMany({
          data: registry.map((i: any) => ({
            id: String(i.id),
            nome: String(i.nome),
            descricao: i.descricao ? String(i.descricao) : null,
            valor: Number(i.valor ?? 0),
            prioridade: String(i.prioridade ?? "Média"),
            status: String(i.status ?? "Disponível"),
            reservadoPor: i.reservadoPor ? String(i.reservadoPor) : null,
            createdAt: i.createdAt ? new Date(i.createdAt) : new Date(),
          })),
        });
      }

      if (purchased.length > 0) {
        await tx.purchasedItem.createMany({
          data: purchased.map((p: any) => ({
            id: String(p.id),
            nome: String(p.nome),
            categoria: String(p.categoria),
            valor: Number(p.valor ?? 0),
            dataCompra: p.dataCompra ? new Date(p.dataCompra) : new Date(),
            createdAt: p.createdAt ? new Date(p.createdAt) : new Date(),
          })),
        });
      }

      if (reservations.length > 0) {
        await tx.reservation.createMany({
          data: reservations.map((r: any) => ({
            id: String(r.id),
            enxovalId: String(r.enxovalId),
            nome: String(r.nome ?? ""),
            whatsapp: String(r.whatsapp ?? ""),
            mensagem: r.mensagem ? String(r.mensagem) : null,
            dataReserva: r.dataReserva ? new Date(r.dataReserva) : new Date(),
            createdAt: r.createdAt ? new Date(r.createdAt) : new Date(),
          })),
        });
      }
    });

    return res.json({ success: true });
  } catch (err) {
    console.error("POST /api/backup/import:", err);
    return res.status(400).json({ error: "Falha ao importar backup. Verifique se o arquivo é válido." });
  }
});

app.post("/api/settings", authenticate, async (req, res) => {
  try {
    const data = parseSettingsPayload(req.body ?? {});
    const settings = await prisma.settings.upsert({
      where: { id: "global" },
      update: data,
      create: { id: "global", ...data }
    });
    res.json(settings);
  } catch (err) {
    console.error("POST /api/settings:", err);
    res.status(400).json({ error: "Erro ao salvar configurações." });
  }
});

app.post("/api/whatsapp/test", authenticate, async (req, res) => {
  try {
    const settings = await prisma.settings.findUnique({ where: { id: "global" } });
    if (!settings) {
      return res.status(400).json({ error: "Salve as configurações primeiro." });
    }
    const testMsg = String(req.body?.message ?? "").trim() ||
      "Teste de integração WhatsApp enviado com sucesso pelo painel do site.";
    await sendWhaticketTestMessage(
      {
        whatsappNumber: settings.whatsappNumber,
        whaticketApiUrl: settings.whaticketApiUrl,
        whaticketToken: settings.whaticketToken,
        whaticketUserId: settings.whaticketUserId,
        whaticketQueueId: settings.whaticketQueueId,
        whaticketSign: settings.whaticketSign,
        whaticketClose: settings.whaticketClose,
      },
      testMsg
    );
    res.json({ success: true });
  } catch (err) {
    console.error("POST /api/whatsapp/test:", err);
    const message = err instanceof Error ? err.message : "Falha no teste do WhatsApp.";
    res.status(400).json({ error: message });
  }
});

// --- Vite Integration ---

async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  const preferred = getPreferredPort();
  const port = await resolveAvailablePort(preferred, { host: "0.0.0.0" });
  if (port !== preferred) {
    console.warn(
      `Porta ${preferred} em uso; usando ${port}. Ajuste PORT no .env ou libere a porta (Nginx/PM2 devem apontar para esta porta).`
    );
  }
  app.listen(port, "0.0.0.0", () => {
    console.log(`Server running on http://0.0.0.0:${port}`);
  });
}

startServer();
