export type WhatsAppConnectionState =
  | "disconnected"
  | "connecting"
  | "pairing"
  | "connected"
  | "reconnecting"
  | "auth_error";

export interface WhatsAppStatus {
  state: WhatsAppConnectionState;
  phone: string | null;
  qrCodeDataUrl: string | null;
  lastConnectedAt: string | null;
  lastDisconnectedAt: string | null;
  lastDisconnectReason: string | null;
  isReconnecting: boolean;
  requiresNewPairing: boolean;
  pendingQueueCount: number;
  failedQueueCount: number;
  uptimeSeconds: number | null;
  provider: "zapo" | "whaticket";
}

export interface EnqueueMessageInput {
  recipient: string;
  content: string;
  type?: "invite" | "reservation_alert" | "reservation_reply" | "pix_donation" | "rsvp_confirm" | "test";
  idempotencyKey?: string;
  guestId?: string;
  reservationId?: string;
}

export interface SmtpSettings {
  smtpHost: string;
  smtpPort: number;
  smtpUser: string;
  smtpPassEncrypted: string;
  smtpSecure: boolean;
  smtpFrom: string;
  smtpTo: string;
  smtpAlertsEnabled: boolean;
  smtpMaxDailyAlerts: number;
  smtpMinIntervalMin: number;
  smtpDropToleranceMin: number;
  smtpSendRecovery: boolean;
}
