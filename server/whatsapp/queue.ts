import type { PrismaClient, WhatsAppMessage } from "@prisma/client";
import { zapoService, ZapoWhatsAppService } from "./zapoClient";
import type { EnqueueMessageInput } from "./types";

export interface QueueOptions {
  intervalMs?: number;
  maxAttempts?: number;
  baseBackoffMs?: number;
}

export class WhatsAppQueueService {
  private prisma: PrismaClient;
  private zapo: ZapoWhatsAppService;
  private isProcessing = false;
  private timer: NodeJS.Timeout | null = null;
  private intervalMs: number;
  private maxAttempts: number;
  private baseBackoffMs: number;

  constructor(
    prisma: PrismaClient,
    zapo: ZapoWhatsAppService = zapoService,
    options: QueueOptions = {}
  ) {
    this.prisma = prisma;
    this.zapo = zapo;
    this.intervalMs = options.intervalMs ?? 800; // Intervalo seguro entre mensagens para evitar spam
    this.maxAttempts = options.maxAttempts ?? 5;
    this.baseBackoffMs = options.baseBackoffMs ?? 5000;
  }

  /**
   * Inicia o trabalhador de fila.
   */
  start() {
    if (this.timer) return;
    this.timer = setInterval(() => {
      this.processNext().catch((err) => {
        console.error("[WhatsAppQueue] Erro ao processar fila:", err);
      });
    }, 2000);
    console.log("[WhatsAppQueue] Worker de fila iniciado.");
  }

  /**
   * Para o trabalhador de fila.
   */
  stop() {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
      console.log("[WhatsAppQueue] Worker de fila interrompido.");
    }
  }

  /**
   * Enfileira uma nova mensagem com suporte a idempotência.
   */
  async enqueue(input: EnqueueMessageInput): Promise<WhatsAppMessage> {
    const cleanDigits = input.recipient.replace(/\D/g, "");
    if (!cleanDigits) {
      throw new Error("Destinatário inválido para envio de WhatsApp.");
    }

    if (input.idempotencyKey) {
      const existing = await this.prisma.whatsAppMessage.findUnique({
        where: { idempotencyKey: input.idempotencyKey },
      });
      if (existing) {
        // Se já foi enviada ou está na fila, preserva a existente para evitar duplicação
        return existing;
      }
    }

    const message = await this.prisma.whatsAppMessage.create({
      data: {
        recipient: cleanDigits,
        content: input.content,
        type: input.type ?? "invite",
        status: "pending",
        idempotencyKey: input.idempotencyKey || null,
        guestId: input.guestId || null,
        reservationId: input.reservationId || null,
      },
    });

    // Se a conexão estiver ativa, processa imediatamente
    if (this.zapo.getState() === "connected") {
      setImmediate(() => {
        this.processNext().catch(() => {});
      });
    }

    return message;
  }

  /**
   * Processa a próxima mensagem pendente na fila.
   */
  async processNext(): Promise<boolean> {
    if (this.isProcessing) return false;
    if (this.zapo.getState() !== "connected") {
      // Se não estiver conectado, não tenta disparar mensagens descontroladamente
      return false;
    }

    this.isProcessing = true;

    try {
      const now = new Date();

      // Busca mensagens 'pending' ou 'failed_temp' cujo tempo de backoff já tenha passado
      const candidate = await this.prisma.whatsAppMessage.findFirst({
        where: {
          OR: [
            { status: "pending" },
            {
              status: "failed_temp",
              attempts: { lt: this.maxAttempts },
            },
          ],
        },
        orderBy: { createdAt: "asc" },
      });

      if (!candidate) {
        return false;
      }

      // Verifica se o tempo de backoff já passou para mensagens que falharam temporariamente
      if (candidate.status === "failed_temp" && candidate.lastAttemptAt) {
        const backoffMs = this.baseBackoffMs * Math.pow(2, candidate.attempts - 1);
        const nextAllowedTime = new Date(candidate.lastAttemptAt.getTime() + backoffMs);
        if (now < nextAllowedTime) {
          return false;
        }
      }

      // Bloqueia a mensagem definindo status 'sending'
      const locked = await this.prisma.whatsAppMessage.updateMany({
        where: {
          id: candidate.id,
          status: candidate.status,
        },
        data: {
          status: "sending",
          lastAttemptAt: now,
          attempts: { increment: 1 },
        },
      });

      if (locked.count === 0) {
        // Outro processo ou lock concorrente pegou a mensagem
        return false;
      }

      // Envia a mensagem via Zapo
      try {
        const sendResult = await this.zapo.sendMessage(
          candidate.recipient,
          candidate.content,
          candidate.idempotencyKey ? { id: candidate.idempotencyKey } : undefined
        );

        await this.prisma.whatsAppMessage.update({
          where: { id: candidate.id },
          data: {
            status: "sent",
            sentAt: new Date(),
            error: null,
          },
        });

        console.log(`[WhatsAppQueue] Mensagem ${candidate.id} enviada com sucesso para ${candidate.recipient}. MsgId: ${sendResult.messageId}`);
        return true;
      } catch (err: any) {
        const attempts = candidate.attempts + 1;
        const isPerm = attempts >= this.maxAttempts;
        const newStatus = isPerm ? "failed_perm" : "failed_temp";
        const errMsg = String(err?.message || "Erro no envio").slice(0, 500);

        await this.prisma.whatsAppMessage.update({
          where: { id: candidate.id },
          data: {
            status: newStatus,
            error: errMsg,
          },
        });

        console.warn(`[WhatsAppQueue] Falha no envio da mensagem ${candidate.id} (tentativa ${attempts}/${this.maxAttempts}): ${errMsg}`);
        return false;
      }
    } finally {
      this.isProcessing = false;
    }
  }

  /**
   * Força uma retentativa manual de uma mensagem com falha.
   */
  async retryMessage(id: string): Promise<WhatsAppMessage> {
    const updated = await this.prisma.whatsAppMessage.update({
      where: { id },
      data: {
        status: "pending",
        error: null,
      },
    });

    if (this.zapo.getState() === "connected") {
      setImmediate(() => {
        this.processNext().catch(() => {});
      });
    }

    return updated;
  }

  /**
   * Retorna estatísticas da fila.
   */
  async getQueueStats() {
    const [pending, sending, sent, failedTemp, failedPerm] = await Promise.all([
      this.prisma.whatsAppMessage.count({ where: { status: "pending" } }),
      this.prisma.whatsAppMessage.count({ where: { status: "sending" } }),
      this.prisma.whatsAppMessage.count({ where: { status: "sent" } }),
      this.prisma.whatsAppMessage.count({ where: { status: "failed_temp" } }),
      this.prisma.whatsAppMessage.count({ where: { status: "failed_perm" } }),
    ]);

    return {
      pending,
      sending,
      sent,
      failedTemp,
      failedPerm,
      total: pending + sending + sent + failedTemp + failedPerm,
    };
  }
}
