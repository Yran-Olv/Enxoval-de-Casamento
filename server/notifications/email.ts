import nodemailer from "nodemailer";
import type { PrismaClient } from "@prisma/client";

export interface SendAlertParams {
  state: string;
  reason: string;
  startedAt: Date;
  incidentId: string;
  panelUrl: string;
}

export interface SendRecoveryParams {
  startedAt: Date;
  recoveredAt: Date;
  durationSec: number;
  panelUrl: string;
}

/**
 * Retorna a data no formato YYYY-MM-DD no fuso horário oficial de São Paulo.
 */
export function getSaoPauloDateString(date: Date = new Date()): string {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  return formatter.format(date); // Retorna "YYYY-MM-DD"
}

export class EmailNotificationService {
  private prisma: PrismaClient;
  private lastAlertSentAt: Date | null = null;

  constructor(prisma: PrismaClient) {
    this.prisma = prisma;
  }

  /**
   * Cria um transportador nodemailer baseado nas configurações do banco.
   */
  private createTransporter(settings: {
    smtpHost: string;
    smtpPort: number;
    smtpUser: string;
    smtpPassEncrypted: string;
    smtpSecure: boolean;
  }) {
    if (!settings.smtpHost || !settings.smtpUser) {
      throw new Error("Configurações de SMTP incompletas.");
    }

    return nodemailer.createTransport({
      host: settings.smtpHost,
      port: settings.smtpPort || 587,
      secure: Boolean(settings.smtpSecure),
      auth: {
        user: settings.smtpUser,
        pass: settings.smtpPassEncrypted,
      },
      connectionTimeout: 15_000,
      greetingTimeout: 10_000,
    });
  }

  /**
   * Verifica e consome o contador diário de alertas de queda.
   * Retorna true se puder enviar, ou false se o limite diário tiver sido atingido.
   */
  private async checkAndIncrementDailyLimit(maxDaily: number): Promise<boolean> {
    const today = getSaoPauloDateString();
    
    // Transação para evitar concorrência
    const allowed = await this.prisma.$transaction(async (tx) => {
      const record = await tx.whatsAppAlertDaily.findUnique({
        where: { date: today },
      });

      const currentCount = record ? record.count : 0;
      if (currentCount >= maxDaily) {
        return false;
      }

      await tx.whatsAppAlertDaily.upsert({
        where: { date: today },
        create: { date: today, count: currentCount + 1 },
        update: { count: currentCount + 1 },
      });

      return true;
    });

    return allowed;
  }

  /**
   * Envia alerta de queda de conexão, respeitando limites, tolerâncias e intervalos.
   */
  async sendDisconnectionAlert(params: SendAlertParams): Promise<{ sent: boolean; reason?: string }> {
    try {
      const settings = await this.prisma.settings.findUnique({ where: { id: "global" } });
      if (!settings || !settings.smtpAlertsEnabled) {
        return { sent: false, reason: "Alertas por e-mail desativados nas configurações." };
      }

      const recipients = (settings.smtpTo || "").trim();
      if (!recipients) {
        return { sent: false, reason: "Nenhum destinatário de e-mail configurado." };
      }

      // 1. Verificar intervalo mínimo entre notificações
      const minIntervalMs = (settings.smtpMinIntervalMin || 30) * 60 * 1000;
      if (this.lastAlertSentAt && Date.now() - this.lastAlertSentAt.getTime() < minIntervalMs) {
        const remainingMin = Math.ceil((minIntervalMs - (Date.now() - this.lastAlertSentAt.getTime())) / 60000);
        return { sent: false, reason: `Intervalo mínimo ativo. Próximo envio permitido em ${remainingMin} minuto(s).` };
      }

      // 2. Verificar limite diário (fuso de São Paulo)
      const maxDaily = settings.smtpMaxDailyAlerts ?? 3;
      const canSendToday = await this.checkAndIncrementDailyLimit(maxDaily);
      if (!canSendToday) {
        return { sent: false, reason: `Limite diário de alertas de queda (${maxDaily}/dia) atingido para hoje.` };
      }

      // 3. Montar e enviar e-mail
      const transporter = this.createTransporter(settings);
      const startedStr = params.startedAt.toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" });
      const systemName = "Enxoval de Casamento";

      const html = `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; border: 1px solid #fee2e2; border-radius: 12px; background: #fffaf0;">
          <h2 style="color: #b91c1c; margin-top: 0;">⚠️ Alerta de Queda de Conexão — ${systemName}</h2>
          <p style="font-size: 15px; color: #374151;">A conexão do WhatsApp com o sistema foi interrompida.</p>
          
          <table style="width: 100%; border-collapse: collapse; margin: 16px 0; font-size: 14px;">
            <tr><td style="padding: 8px 0; color: #6b7280; font-weight: bold;">Sistema:</td><td style="padding: 8px 0; color: #111827;">${systemName}</td></tr>
            <tr><td style="padding: 8px 0; color: #6b7280; font-weight: bold;">Estado:</td><td style="padding: 8px 0; color: #dc2626; font-weight: bold;">${params.state.toUpperCase()}</td></tr>
            <tr><td style="padding: 8px 0; color: #6b7280; font-weight: bold;">Horário da queda:</td><td style="padding: 8px 0; color: #111827;">${startedStr}</td></tr>
            <tr><td style="padding: 8px 0; color: #6b7280; font-weight: bold;">Motivo detectado:</td><td style="padding: 8px 0; color: #111827;">${params.reason || "Desconexão inesperada da rede ou transporte"}</td></tr>
            <tr><td style="padding: 8px 0; color: #6b7280; font-weight: bold;">Ação automática:</td><td style="padding: 8px 0; color: #111827;">O monitor está tentando restabelecer a conexão automaticamente com backoff progressivo.</td></tr>
          </table>

          <div style="margin-top: 24px; text-align: center;">
            <a href="${params.panelUrl}" style="background: #b91c1c; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block;">
              Acessar Painel do WhatsApp
            </a>
          </div>
          
          <p style="margin-top: 24px; font-size: 12px; color: #9ca3af; text-align: center;">
            Este é um e-mail automático do monitor de disponibilidade do ${systemName}.
          </p>
        </div>
      `;

      await transporter.sendMail({
        from: settings.smtpFrom || `"Enxoval de Casamento" <${settings.smtpUser}>`,
        to: recipients,
        subject: `[ALERTA] WhatsApp desconectado — ${systemName}`,
        html,
      });

      this.lastAlertSentAt = new Date();

      // Atualiza o incidente com registro do alerta
      await this.prisma.whatsAppIncident.updateMany({
        where: { id: params.incidentId },
        data: { alertSent: true, alertRecipient: recipients, alertError: null },
      });

      return { sent: true };
    } catch (err: any) {
      console.error("[EmailNotificationService] Falha ao enviar alerta de queda:", err?.message || err);
      if (params.incidentId) {
        await this.prisma.whatsAppIncident.updateMany({
          where: { id: params.incidentId },
          data: { alertError: String(err?.message || "Erro desconhecido ao enviar email") },
        });
      }
      return { sent: false, reason: err?.message || "Erro de envio no SMTP" };
    }
  }

  /**
   * Envia aviso de recuperação quando o WhatsApp reconectar com sucesso.
   */
  async sendRecoveryNotification(params: SendRecoveryParams): Promise<boolean> {
    try {
      const settings = await this.prisma.settings.findUnique({ where: { id: "global" } });
      if (!settings || !settings.smtpAlertsEnabled || !settings.smtpSendRecovery) {
        return false;
      }

      const recipients = (settings.smtpTo || "").trim();
      if (!recipients) return false;

      const transporter = this.createTransporter(settings);
      const systemName = "Enxoval de Casamento";
      const durationMin = Math.round(params.durationSec / 60);

      const html = `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; border: 1px solid #bbf7d0; border-radius: 12px; background: #f0fdf4;">
          <h2 style="color: #166534; margin-top: 0;">✅ Conexão Restabelecida — ${systemName}</h2>
          <p style="font-size: 15px; color: #374151;">A conexão do WhatsApp foi restabelecida com sucesso e a fila de mensagens voltou a ser processada.</p>
          
          <table style="width: 100%; border-collapse: collapse; margin: 16px 0; font-size: 14px;">
            <tr><td style="padding: 8px 0; color: #6b7280; font-weight: bold;">Sistema:</td><td style="padding: 8px 0; color: #111827;">${systemName}</td></tr>
            <tr><td style="padding: 8px 0; color: #6b7280; font-weight: bold;">Estado:</td><td style="padding: 8px 0; color: #16a34a; font-weight: bold;">CONECTADO</td></tr>
            <tr><td style="padding: 8px 0; color: #6b7280; font-weight: bold;">Duração da indisponibilidade:</td><td style="padding: 8px 0; color: #111827;">${params.durationSec}s (~${durationMin} min)</td></tr>
            <tr><td style="padding: 8px 0; color: #6b7280; font-weight: bold;">Horário de recuperação:</td><td style="padding: 8px 0; color: #111827;">${params.recoveredAt.toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" })}</td></tr>
          </table>

          <div style="margin-top: 24px; text-align: center;">
            <a href="${params.panelUrl}" style="background: #166534; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block;">
              Ver Status no Painel
            </a>
          </div>
        </div>
      `;

      await transporter.sendMail({
        from: settings.smtpFrom || `"Enxoval de Casamento" <${settings.smtpUser}>`,
        to: recipients,
        subject: `[RECUPERADO] WhatsApp conectado novamente — ${systemName}`,
        html,
      });

      return true;
    } catch (err: any) {
      console.error("[EmailNotificationService] Falha ao enviar aviso de recuperação:", err?.message || err);
      return false;
    }
  }

  /**
   * Envia e-mail de teste para validar a configuração SMTP.
   */
  async sendTestEmail(testRecipient: string): Promise<{ success: boolean; message: string }> {
    const settings = await this.prisma.settings.findUnique({ where: { id: "global" } });
    if (!settings) {
      throw new Error("Configurações não encontradas.");
    }

    const transporter = this.createTransporter(settings);
    const target = (testRecipient || settings.smtpTo || "").trim();
    if (!target) {
      throw new Error("Informe o destinatário para o envio do teste.");
    }

    await transporter.verify();

    const info = await transporter.sendMail({
      from: settings.smtpFrom || `"Enxoval de Casamento" <${settings.smtpUser}>`,
      to: target,
      subject: `[TESTE] Configuração SMTP — Enxoval de Casamento`,
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; border: 1px solid #e5e7eb; border-radius: 12px; background: #ffffff;">
          <h2 style="color: #4338ca; margin-top: 0;">🔔 Teste de Notificação SMTP</h2>
          <p style="font-size: 15px; color: #374151;">Se você recebeu este e-mail, as credenciais e o servidor SMTP do <strong>Enxoval de Casamento</strong> estão configurados corretamente!</p>
          <p style="font-size: 13px; color: #6b7280;">Horário do envio: ${new Date().toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" })}</p>
        </div>
      `,
    });

    return { success: true, message: `E-mail de teste enviado com sucesso para ${target} (ID: ${info.messageId})` };
  }
}
