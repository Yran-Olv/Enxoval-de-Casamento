-- AlterTable Settings
ALTER TABLE "Settings" ADD COLUMN "videoUrl" TEXT NOT NULL DEFAULT '';
ALTER TABLE "Settings" ADD COLUMN "menuJson" TEXT NOT NULL DEFAULT '[]';
ALTER TABLE "Settings" ADD COLUMN "groomsmenJson" TEXT NOT NULL DEFAULT '[]';
ALTER TABLE "Settings" ADD COLUMN "quizJson" TEXT NOT NULL DEFAULT '[]';
ALTER TABLE "Settings" ADD COLUMN "hotelsJson" TEXT NOT NULL DEFAULT '[]';
ALTER TABLE "Settings" ADD COLUMN "cityGuideJson" TEXT NOT NULL DEFAULT '[]';
ALTER TABLE "Settings" ADD COLUMN "faqJson" TEXT NOT NULL DEFAULT '[]';
ALTER TABLE "Settings" ADD COLUMN "guestPhotosJson" TEXT NOT NULL DEFAULT '[]';
ALTER TABLE "Settings" ADD COLUMN "sectionStylesJson" TEXT NOT NULL DEFAULT '{}';
ALTER TABLE "Settings" ADD COLUMN "sectionOrderJson" TEXT NOT NULL DEFAULT '[]';
ALTER TABLE "Settings" ADD COLUMN "showVideo" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Settings" ADD COLUMN "showMenu" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Settings" ADD COLUMN "showGroomsmen" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Settings" ADD COLUMN "showQuiz" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Settings" ADD COLUMN "showHotels" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Settings" ADD COLUMN "showCityGuide" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Settings" ADD COLUMN "showFaq" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Settings" ADD COLUMN "showGuestAlbum" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable GuestPhoto
CREATE TABLE "GuestPhoto" (
    "id" TEXT NOT NULL,
    "guestName" TEXT NOT NULL,
    "photoUrl" TEXT NOT NULL,
    "caption" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GuestPhoto_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "GuestPhoto_status_idx" ON "GuestPhoto"("status");
CREATE INDEX "GuestPhoto_createdAt_idx" ON "GuestPhoto"("createdAt");
