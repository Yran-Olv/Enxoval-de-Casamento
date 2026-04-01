-- AlterTable
ALTER TABLE "Settings"
ADD COLUMN "guestReplyTemplate" TEXT NOT NULL DEFAULT 'Oi, {nome}! Obrigado pelo carinho com {couple}. 💛

Recebemos sua reserva do presente: "{item}".

Você pode escolher a melhor forma de presentear:
1) Comprar o item por conta própria e entregar aos noivos.
2) Enviar o valor via PIX.

Se preferir PIX, mando a chave na próxima mensagem para facilitar copiar e colar.',
ADD COLUMN "guestPixTemplate" TEXT NOT NULL DEFAULT '{pixKey}';
