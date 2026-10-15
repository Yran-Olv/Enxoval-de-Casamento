ALTER TABLE "Settings" ADD COLUMN "inviteTheme" TEXT NOT NULL DEFAULT 'classico';
ALTER TABLE "Settings" ADD COLUMN "openingText" TEXT NOT NULL DEFAULT 'Você recebeu um convite especial';
ALTER TABLE "Settings" ADD COLUMN "romanticLine" TEXT NOT NULL DEFAULT '';
ALTER TABLE "Settings" ADD COLUMN "coverPhotoUrl" TEXT NOT NULL DEFAULT '';
ALTER TABLE "Settings" ADD COLUMN "galleryJson" TEXT NOT NULL DEFAULT '[]';
ALTER TABLE "Settings" ADD COLUMN "scheduleJson" TEXT NOT NULL DEFAULT '[]';
ALTER TABLE "Settings" ADD COLUMN "ceremonyNotes" TEXT NOT NULL DEFAULT '';
ALTER TABLE "Settings" ADD COLUMN "receptionNotes" TEXT NOT NULL DEFAULT '';
ALTER TABLE "Settings" ADD COLUMN "extraInfo" TEXT NOT NULL DEFAULT '';
ALTER TABLE "Settings" ADD COLUMN "rsvpText" TEXT NOT NULL DEFAULT 'Sua presença é o presente mais importante. Conte se poderemos comemorar juntos.';
ALTER TABLE "Settings" ADD COLUMN "showStory" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "Settings" ADD COLUMN "showGallery" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "Settings" ADD COLUMN "showSchedule" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "Settings" ADD COLUMN "showDress" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "Settings" ADD COLUMN "showGifts" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "Settings" ADD COLUMN "inviteTemplate" TEXT NOT NULL DEFAULT 'Olá, {nome}! ❤️

Preparamos um convite muito especial para você.

Nós vamos nos casar e ficaremos muito felizes em compartilhar esse momento com você!

📅 Data: {data}
🕒 Horário: {horario}

Abra seu convite especial:
{link}

Esperamos você! Com carinho, {casal}.';
ALTER TABLE "Settings" ADD COLUMN "saveTheDateTemplate" TEXT NOT NULL DEFAULT 'Olá, {nome}! Guarde esta data com carinho.

📅 {data}, às {horario}

{casal} vão se casar. O convite completo está aqui:
{link}';
ALTER TABLE "Settings" ADD COLUMN "reminderTemplate" TEXT NOT NULL DEFAULT 'Olá, {nome}! Ainda não recebemos sua resposta para o casamento de {casal}.

📅 {data} às {horario}

Abra o convite e confirme sua presença:
{link}';
ALTER TABLE "Settings" ADD COLUMN "soonTemplate" TEXT NOT NULL DEFAULT 'Olá, {nome}! O casamento de {casal} está chegando.

📅 {data} às {horario}

Veja os detalhes no seu convite:
{link}';

CREATE TABLE "WeddingGuest" (
  "id" TEXT NOT NULL,
  "token" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "whatsapp" TEXT NOT NULL,
  "groupName" TEXT NOT NULL DEFAULT 'amigos',
  "seats" INTEGER NOT NULL DEFAULT 1,
  "notes" TEXT NOT NULL DEFAULT '',
  "optedOut" BOOLEAN NOT NULL DEFAULT false,
  "status" TEXT NOT NULL DEFAULT 'pending',
  "lastError" TEXT NOT NULL DEFAULT '',
  "attemptCount" INTEGER NOT NULL DEFAULT 0,
  "lastRequestId" TEXT NOT NULL DEFAULT '',
  "sentAt" TIMESTAMP(3),
  "lastAttemptAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "WeddingGuest_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "WeddingGuest_token_key" ON "WeddingGuest"("token");
CREATE UNIQUE INDEX "WeddingGuest_whatsapp_key" ON "WeddingGuest"("whatsapp");
CREATE INDEX "WeddingGuest_status_idx" ON "WeddingGuest"("status");
CREATE INDEX "WeddingGuest_groupName_idx" ON "WeddingGuest"("groupName");

CREATE TABLE "WeddingInviteAttempt" (
  "id" TEXT NOT NULL,
  "guestId" TEXT NOT NULL,
  "campaign" TEXT NOT NULL,
  "status" TEXT NOT NULL,
  "requestId" TEXT NOT NULL DEFAULT '',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "WeddingInviteAttempt_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "WeddingInviteAttempt_guestId_createdAt_idx" ON "WeddingInviteAttempt"("guestId", "createdAt");

ALTER TABLE "WeddingRsvp" ADD COLUMN "guestId" TEXT;
CREATE UNIQUE INDEX "WeddingRsvp_guestId_key" ON "WeddingRsvp"("guestId");

ALTER TABLE "WeddingInviteAttempt"
  ADD CONSTRAINT "WeddingInviteAttempt_guestId_fkey"
  FOREIGN KEY ("guestId") REFERENCES "WeddingGuest"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "WeddingRsvp"
  ADD CONSTRAINT "WeddingRsvp_guestId_fkey"
  FOREIGN KEY ("guestId") REFERENCES "WeddingGuest"("id") ON DELETE SET NULL ON UPDATE CASCADE;
