-- AlterTable Settings
ALTER TABLE "Settings" ADD COLUMN "whatsappProvider" TEXT NOT NULL DEFAULT 'zapo';
ALTER TABLE "Settings" ADD COLUMN "smtpHost" TEXT NOT NULL DEFAULT '';
ALTER TABLE "Settings" ADD COLUMN "smtpPort" INTEGER NOT NULL DEFAULT 587;
ALTER TABLE "Settings" ADD COLUMN "smtpUser" TEXT NOT NULL DEFAULT '';
ALTER TABLE "Settings" ADD COLUMN "smtpPassEncrypted" TEXT NOT NULL DEFAULT '';
ALTER TABLE "Settings" ADD COLUMN "smtpSecure" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Settings" ADD COLUMN "smtpFrom" TEXT NOT NULL DEFAULT '';
ALTER TABLE "Settings" ADD COLUMN "smtpTo" TEXT NOT NULL DEFAULT '';
ALTER TABLE "Settings" ADD COLUMN "smtpAlertsEnabled" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Settings" ADD COLUMN "smtpMaxDailyAlerts" INTEGER NOT NULL DEFAULT 3;
ALTER TABLE "Settings" ADD COLUMN "smtpMinIntervalMin" INTEGER NOT NULL DEFAULT 30;
ALTER TABLE "Settings" ADD COLUMN "smtpDropToleranceMin" INTEGER NOT NULL DEFAULT 2;
ALTER TABLE "Settings" ADD COLUMN "smtpSendRecovery" BOOLEAN NOT NULL DEFAULT true;

-- CreateTable WhatsAppMessage
CREATE TABLE "WhatsAppMessage" (
    "id" TEXT NOT NULL,
    "recipient" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'invite',
    "status" TEXT NOT NULL DEFAULT 'pending',
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "lastAttemptAt" TIMESTAMP(3),
    "sentAt" TIMESTAMP(3),
    "error" TEXT,
    "idempotencyKey" TEXT,
    "guestId" TEXT,
    "reservationId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WhatsAppMessage_pkey" PRIMARY KEY ("id")
);

-- CreateTable WhatsAppIncident
CREATE TABLE "WhatsAppIncident" (
    "id" TEXT NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endedAt" TIMESTAMP(3),
    "durationSec" INTEGER,
    "reason" TEXT NOT NULL DEFAULT '',
    "reconnectAttempts" INTEGER NOT NULL DEFAULT 0,
    "alertSent" BOOLEAN NOT NULL DEFAULT false,
    "alertRecipient" TEXT,
    "alertError" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WhatsAppIncident_pkey" PRIMARY KEY ("id")
);

-- CreateTable WhatsAppAlertDaily
CREATE TABLE "WhatsAppAlertDaily" (
    "date" TEXT NOT NULL,
    "count" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WhatsAppAlertDaily_pkey" PRIMARY KEY ("date")
);

-- CreateIndexes
CREATE UNIQUE INDEX "WhatsAppMessage_idempotencyKey_key" ON "WhatsAppMessage"("idempotencyKey");
CREATE INDEX "WhatsAppMessage_status_idx" ON "WhatsAppMessage"("status");
CREATE INDEX "WhatsAppMessage_createdAt_idx" ON "WhatsAppMessage"("createdAt");
CREATE INDEX "WhatsAppMessage_recipient_idx" ON "WhatsAppMessage"("recipient");

CREATE INDEX "WhatsAppIncident_startedAt_idx" ON "WhatsAppIncident"("startedAt");
CREATE INDEX "WhatsAppIncident_endedAt_idx" ON "WhatsAppIncident"("endedAt");
