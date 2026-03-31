import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
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
app.use(cors({
  origin: true,
  credentials: true
}));

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
  const weddingDateRaw = String(body.weddingDate ?? "").trim();
  const weddingDate = /^\d{4}-\d{2}-\d{2}$/.test(weddingDateRaw) ? weddingDateRaw : "2027-02-02";
  const whatsappNumber = String(body.whatsappNumber ?? "").replace(/\D/g, "");
  const whaticketToken = String(body.whaticketToken ?? "").trim();
  const whaticketUserId = String(body.whaticketUserId ?? "").trim();
  const whaticketQueueId = String(body.whaticketQueueId ?? "").trim();
  const whaticketTemplate = String(
    body.whaticketTemplate ??
      "Nova reserva no site.\nItem: {item}\nConvidado: {nome}\nWhatsApp: {whatsapp}\nMensagem: {mensagem}"
  ).trim();
  const whaticketSign = Boolean(body.whaticketSign ?? true);
  const whaticketClose = Boolean(body.whaticketClose ?? false);
  return {
    pixKey,
    pixName,
    weddingDate,
    whatsappNumber,
    whaticketToken,
    whaticketUserId,
    whaticketQueueId,
    whaticketTemplate,
    whaticketSign,
    whaticketClose,
  };
}

async function sendReservationToWhaticket(
  settings: {
    whatsappNumber: string;
    whaticketToken: string;
    whaticketUserId: string;
    whaticketQueueId: string;
    whaticketTemplate: string;
    whaticketSign: boolean;
    whaticketClose: boolean;
  },
  payload: { itemNome: string; convidado: string; whatsapp: string; mensagem?: string }
) {
  const number = (settings.whatsappNumber || "").replace(/\D/g, "");
  const token = settings.whaticketToken?.trim();
  if (!number || !token) return;

  const template = settings.whaticketTemplate?.trim() ||
    "Nova reserva no site.\nItem: {item}\nConvidado: {nome}\nWhatsApp: {whatsapp}\nMensagem: {mensagem}";
  const msg = template
    .replace(/\{item\}/gi, payload.itemNome)
    .replace(/\{nome\}/gi, payload.convidado)
    .replace(/\{whatsapp\}/gi, payload.whatsapp)
    .replace(/\{mensagem\}/gi, payload.mensagem?.trim() || "(sem mensagem)");

  const body = {
    number,
    body: msg,
    userId: settings.whaticketUserId || "",
    queueId: settings.whaticketQueueId || "",
    sendSignature: settings.whaticketSign,
    closeTicket: settings.whaticketClose,
  };

  const resp = await fetch("https://api.multivus.com.br/api/messages/send", {
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

async function sendPixDonationToWhaticket(
  settings: {
    whatsappNumber: string;
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
    userId: settings.whaticketUserId || "",
    queueId: settings.whaticketQueueId || "",
    sendSignature: settings.whaticketSign,
    closeTicket: settings.whaticketClose,
  };

  const resp = await fetch("https://api.multivus.com.br/api/messages/send", {
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
    userId: settings.whaticketUserId || "",
    queueId: settings.whaticketQueueId || "",
    sendSignature: settings.whaticketSign,
    closeTicket: settings.whaticketClose,
  };

  const resp = await fetch("https://api.multivus.com.br/api/messages/send", {
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
            whaticketToken: settings.whaticketToken,
            whaticketUserId: settings.whaticketUserId,
            whaticketQueueId: settings.whaticketQueueId,
            whaticketTemplate: settings.whaticketTemplate,
            whaticketSign: settings.whaticketSign,
            whaticketClose: settings.whaticketClose,
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
