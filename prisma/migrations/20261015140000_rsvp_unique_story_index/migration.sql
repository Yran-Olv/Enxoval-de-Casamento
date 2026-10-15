ALTER TABLE "Settings"
  ADD COLUMN "coupleStory" TEXT NOT NULL DEFAULT '';

DELETE FROM "WeddingRsvp" AS older
USING "WeddingRsvp" AS newer
WHERE older.whatsapp = newer.whatsapp
  AND (
    older."updatedAt" < newer."updatedAt"
    OR (older."updatedAt" = newer."updatedAt" AND older."createdAt" < newer."createdAt")
    OR (older."updatedAt" = newer."updatedAt" AND older."createdAt" = newer."createdAt" AND older.id < newer.id)
  );

CREATE UNIQUE INDEX "WeddingRsvp_whatsapp_key" ON "WeddingRsvp"("whatsapp");

CREATE INDEX "Reservation_enxovalId_idx" ON "Reservation"("enxovalId");
CREATE INDEX "EnxovalItem_status_idx" ON "EnxovalItem"("status");
