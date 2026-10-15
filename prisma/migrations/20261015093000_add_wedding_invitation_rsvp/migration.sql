ALTER TABLE "Settings"
  ADD COLUMN "ceremonyTime" TEXT NOT NULL DEFAULT '16:00',
  ADD COLUMN "ceremonyVenue" TEXT NOT NULL DEFAULT '',
  ADD COLUMN "ceremonyAddress" TEXT NOT NULL DEFAULT '',
  ADD COLUMN "receptionVenue" TEXT NOT NULL DEFAULT '',
  ADD COLUMN "receptionAddress" TEXT NOT NULL DEFAULT '',
  ADD COLUMN "invitationMessage" TEXT NOT NULL DEFAULT 'Com muito amor, queremos compartilhar esse momento especial com você. Sua presença tornará nosso dia ainda mais inesquecível.',
  ADD COLUMN "rsvpDeadline" TEXT NOT NULL DEFAULT '',
  ADD COLUMN "dressCode" TEXT NOT NULL DEFAULT '';

CREATE TABLE "WeddingRsvp" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "whatsapp" TEXT NOT NULL,
  "guests" INTEGER NOT NULL DEFAULT 1,
  "attending" BOOLEAN NOT NULL,
  "message" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "WeddingRsvp_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "WeddingRsvp_createdAt_idx" ON "WeddingRsvp"("createdAt");
CREATE INDEX "WeddingRsvp_attending_idx" ON "WeddingRsvp"("attending");
