import type { PrismaClient } from "@prisma/client";
import { zapoService, ZapoWhatsAppService } from "./zapoClient";
import { EmailNotificationService } from "../notifications/email";

export interface MonitorOptions {
  checkIntervalMs?: number;
  panelBaseUrl?: string;
}

export class WhatsAppMonitorService {
  private prisma: PrismaClient;
  private zapo: ZapoWhatsAppService;
  private emailService: EmailNotificationService;
  private timer: NodeJS.Timeout | null = null;
  private checkIntervalMs: number;
  private panelBaseUrl: string;

  private currentIncidentId: string | null = null;
  private incidentStartedAt: Date | null = null;
  private reconnectAttempts = 0;
  private reconnectBackoffMs = 5000;
  private lastReconnectAttemptAt = 0;
  private isReconnecting = false;
  private alertSentForCurrentIncident = false;

  constructor(
    prisma: PrismaClient,
    emailService: EmailNotificationService,
    zapo: ZapoWhatsAppService = zapoService,
    options: MonitorOptions = {}
  ) {
    this.prisma = prisma;
    this.emailService = emailService;
    this.zapo = zapo;
    this.checkIntervalMs = options.checkIntervalMs ?? 15_000;
    this.panelBaseUrl = options.panelBaseUrl || process.env.APP_URL || "http://localhost:3000";

    // Registra listeners de eventos do Zapo
    this.zapo.setListeners({
      onConnected: (phone) => {
        this.handleRecovery();
      },
      onDisconnected: (reason, isLogout) => {
        this.handleDisconnection(reason, isLogout);
      },
    });
  }

  start() {
    if (this.timer) return;
    this.timer = setInterval(() => {
      this.tick().catch((err) => {
        console.error("[WhatsAppMonitor] Erro no ciclo de verificação:", err);
      });
    }, this.checkIntervalMs);
    console.log("[WhatsAppMonitor] Monitor de conexão ativo em background.");
  }

  stop() {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
      console.log("[WhatsAppMonitor] Monitor de conexão interrompido.");
    }
  }

  private async handleDisconnection(reason: string, isLogout: boolean) {
    if (this.currentIncidentId) {
      // Incidente já aberto, não abre outro
      return;
    }

    this.incidentStartedAt = new Date();
    this.reconnectAttempts = 0;
    this.reconnectBackoffMs = 5000;
    this.alertSentForCurrentIncident = false;

    try {
      const incident = await this.prisma.whatsAppIncident.create({
        data: {
          startedAt: this.incidentStartedAt,
          reason: isLogout ? `Autenticação revogada: ${reason}` : reason,
          reconnectAttempts: 0,
          alertSent: false,
        },
      });
      this.currentIncidentId = incident.id;
      console.log(`[WhatsAppMonitor] Incidente de desconexão aberto (ID: ${incident.id}, Motivo: ${reason})`);
    } catch (err) {
      console.error("[WhatsAppMonitor] Erro ao registrar incidente no banco:", err);
    }
  }

  private async handleRecovery() {
    if (!this.currentIncidentId || !this.incidentStartedAt) {
      return;
    }

    const endedAt = new Date();
    const durationSec = Math.max(1, Math.round((endedAt.getTime() - this.incidentStartedAt.getTime()) / 1000));
    const incidentId = this.currentIncidentId;
    const alertWasSent = this.alertSentForCurrentIncident;

    // Reseta estado local do incidente
    this.currentIncidentId = null;
    this.incidentStartedAt = null;
    this.reconnectAttempts = 0;
    this.reconnectBackoffMs = 5000;
    this.alertSentForCurrentIncident = false;

    try {
      await this.prisma.whatsAppIncident.update({
        where: { id: incidentId },
        data: {
          endedAt,
          durationSec,
        },
      });
      console.log(`[WhatsAppMonitor] Incidente ${incidentId} finalizado após ${durationSec}s de indisponibilidade.`);

      // Se um alerta de e-mail havia sido enviado durante este incidente, envia aviso de recuperação
      if (alertWasSent) {
        await this.emailService.sendRecoveryNotification({
          startedAt: endedAt,
          recoveredAt: endedAt,
          durationSec,
          panelUrl: `${this.panelBaseUrl}/admin`,
        });
      }
    } catch (err) {
      console.error("[WhatsAppMonitor] Erro ao fechar incidente no banco:", err);
    }
  }

  /**
   * Ciclo periódico de verificação de saúde e reconexão controlada.
   */
  async tick() {
    const state = this.zapo.getState();

    // Se estiver conectado ou em pareamento ativo, não faz tentativa de reconexão
    if (state === "connected" || state === "pairing") {
      return;
    }

    // Se estiver deslogado por revogação de credenciais, não faz reconexão automática
    if (this.zapo.getRequiresNewPairing() || state === "auth_error") {
      return;
    }

    // Verifica envio de alerta por e-mail após a tolerância configurada
    if (this.currentIncidentId && this.incidentStartedAt && !this.alertSentForCurrentIncident) {
      await this.checkAndTriggerDisconnectionAlert();
    }

    // Tenta reconectar com intervalo progressivo
    const now = Date.now();
    if (now - this.lastReconnectAttemptAt >= this.reconnectBackoffMs && !this.isReconnecting) {
      await this.attemptReconnect();
    }
  }

  /**
   * Verifica o tempo de tolerância e dispara o alerta por e-mail se ainda estiver desconectado.
   */
  private async checkAndTriggerDisconnectionAlert() {
    if (!this.incidentStartedAt || !this.currentIncidentId) return;

    try {
      const settings = await this.prisma.settings.findUnique({ where: { id: "global" } });
      if (!settings || !settings.smtpAlertsEnabled) return;

      const toleranceMin = settings.smtpDropToleranceMin ?? 2;
      const toleranceMs = toleranceMin * 60 * 1000;
      const elapsedMs = Date.now() - this.incidentStartedAt.getTime();

      if (elapsedMs >= toleranceMs) {
        // Tolerância atingida e conexão continua fora
        console.log(`[WhatsAppMonitor] Tempo de tolerância (${toleranceMin} min) atingido. Disparando alerta...`);
        const result = await this.emailService.sendDisconnectionAlert({
          state: this.zapo.getState(),
          reason: this.zapo.getLastDisconnectReason() || "Falha de rede ou queda de transporte",
          startedAt: this.incidentStartedAt,
          incidentId: this.currentIncidentId,
          panelUrl: `${this.panelBaseUrl}/admin`,
        });

        if (result.sent) {
          this.alertSentForCurrentIncident = true;
          console.log("[WhatsAppMonitor] Alerta de e-mail enviado com sucesso.");
        } else {
          console.log(`[WhatsAppMonitor] Alerta de e-mail não enviado: ${result.reason}`);
        }
      }
    } catch (err) {
      console.error("[WhatsAppMonitor] Erro ao verificar tolerância de alerta:", err);
    }
  }

  /**
   * Executa tentativa de reconexão controlada com backoff exponencial.
   */
  private async attemptReconnect() {
    this.isReconnecting = true;
    this.lastReconnectAttemptAt = Date.now();
    this.reconnectAttempts++;

    console.log(
      `[WhatsAppMonitor] Tentativa de reconexão #${this.reconnectAttempts} (backoff atual: ${Math.round(
        this.reconnectBackoffMs / 1000
      )}s)...`
    );

    try {
      if (this.currentIncidentId) {
        await this.prisma.whatsAppIncident.updateMany({
          where: { id: this.currentIncidentId },
          data: { reconnectAttempts: this.reconnectAttempts },
        });
      }

      await this.zapo.connect();
      // Se conectar com sucesso, handleRecovery() será acionado pelo listener
    } catch (err: any) {
      console.warn(`[WhatsAppMonitor] Tentativa #${this.reconnectAttempts} falhou: ${err?.message || err}`);
      // Aumenta backoff progressivamente: 5s, 10s, 20s, 40s, até o teto de 120s
      this.reconnectBackoffMs = Math.min(120_000, this.reconnectBackoffMs * 2);
    } finally {
      this.isReconnecting = false;
    }
  }
}
