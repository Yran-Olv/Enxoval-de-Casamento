-- AlterTable
ALTER TABLE "Settings"
ADD COLUMN "whaticketTemplate" TEXT NOT NULL DEFAULT 'Nova reserva no site.
Item: {item}
Convidado: {nome}
WhatsApp: {whatsapp}
Mensagem: {mensagem}';
