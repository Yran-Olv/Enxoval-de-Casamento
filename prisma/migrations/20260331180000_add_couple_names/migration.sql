-- AlterTable
ALTER TABLE "Settings" ADD COLUMN "coupleNames" TEXT NOT NULL DEFAULT 'Tais & Yran';

-- Novo texto padrão para novas instalações (linhas já existentes mantêm o template salvo).
ALTER TABLE "Settings" ALTER COLUMN "whaticketTemplate" SET DEFAULT '🎁 Nova reserva no site ({couple})

Presente: {item}
Convidado(a): {nome}
WhatsApp: {whatsapp}
Recado: {mensagem}

Opções de presente: podem comprar o item por conta própria e entregar aos noivos, ou enviar o valor via PIX:
Chave PIX: {pixKey}
Titular: {pixName}';
