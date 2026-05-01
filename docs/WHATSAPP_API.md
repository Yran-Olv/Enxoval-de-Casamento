# Documentacao da Integracao WhatsApp (Whaticket)

Guia pratico para reaproveitar esta integracao em outros projetos (lista de casamento, doacoes, eventos, etc.).

## Objetivo

Este projeto usa a API do Whaticket para:

1. Enviar aviso para o numero do administrador/noivos quando alguem reserva item.
2. Enviar resposta automatica para o convidado (agradecimento/instrucoes).
3. Enviar a chave PIX em mensagem separada para facilitar copiar/colar.
4. Repetir fluxo parecido para aviso de doacao PIX.

## Endpoint externo esperado

- URL base configuravel no painel: `whaticketApiUrl`
- Exemplo: `https://api.whaticketup.com.br/api/messages/send`
- Metodo: `POST`
- Headers:
  - `Authorization: Bearer <TOKEN>`
  - `Content-Type: application/json`

Payload padrao usado:

```json
{
  "number": "5585999999999",
  "body": "Texto da mensagem",
  "userId": 1,
  "queueId": 2,
  "sendSignature": true,
  "closeTicket": false
}
```

Notas:
- `userId` e `queueId` sao opcionais (enviar somente se forem inteiros validos).
- `number` deve ir sem simbolos (somente digitos).

## Campos de configuracao (Settings)

No banco/tela de admin, esta integracao depende destes campos:

- `whatsappNumber`: numero que recebe os avisos do site (admin/noivos)
- `whaticketApiUrl`: URL da API de envio
- `whaticketToken`: token Bearer da API
- `whaticketUserId` e `whaticketQueueId`: opcionais
- `whaticketTemplate`: template da mensagem de aviso de reserva (para admin)
- `guestReplyTemplate`: template da mensagem de retorno ao convidado
- `guestPixTemplate`: template da mensagem com chave PIX (ideal: `{pixKey}`)
- `pixKey`, `pixName`: dados de PIX
- `coupleNames`: nome do casal/conta
- `whaticketSign`, `whaticketClose`: opcoes de assinatura e fechamento do ticket

## Placeholders suportados

Nos templates, os placeholders abaixo sao substituidos em runtime:

- `{item}`
- `{nome}`
- `{whatsapp}`
- `{mensagem}`
- `{pixKey}`
- `{pixName}`
- `{couple}`

## Fluxo 1: Reserva de presente

Quando `POST /api/reservations` recebe uma reserva:

1. Salva reserva no banco.
2. Atualiza status do item para `Reservado`.
3. Envia mensagem para `whatsappNumber` (admin/noivos) usando `whaticketTemplate`.
4. Envia mensagem ao convidado (`payload.whatsapp`) usando `guestReplyTemplate`.
5. Envia chave PIX em mensagem separada usando `guestPixTemplate` (recomendado: somente `{pixKey}`).
6. Envia titular PIX em mensagem separada (`Titular PIX: ...`) quando existir.

## Fluxo 2: Aviso de doacao PIX

Quando `POST /api/pix-donations` recebe aviso:

1. Valida `nome` e `whatsapp`.
2. Envia aviso para `whatsappNumber` (admin/noivos) com nome, numero, valor e recado.
3. Envia agradecimento para o doador no WhatsApp informado.
4. Envia chave PIX em mensagem separada (somente chave).
5. Envia titular PIX em mensagem separada (quando existir).

## Regras de normalizacao de numero

- Remover caracteres nao numericos: `replace(/\D/g, "")`
- Se numero do convidado vier com 10 ou 11 digitos (padrao BR sem DDI), prefixar `55`.
- Se ja vier com DDI, usar como veio.

## Exemplo de implementacao reutilizavel (Node/TS)

```ts
async function sendWhaticketMessage(input: {
  apiUrl: string;
  token: string;
  number: string;
  body: string;
  userId?: number;
  queueId?: number;
  sendSignature?: boolean;
  closeTicket?: boolean;
}) {
  const payload: Record<string, unknown> = {
    number: input.number,
    body: input.body,
    sendSignature: input.sendSignature ?? true,
    closeTicket: input.closeTicket ?? false,
  };
  if (Number.isInteger(input.userId) && (input.userId as number) > 0) payload.userId = input.userId;
  if (Number.isInteger(input.queueId) && (input.queueId as number) > 0) payload.queueId = input.queueId;

  const resp = await fetch(input.apiUrl, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${input.token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!resp.ok) {
    const out = await resp.text();
    throw new Error(`Whaticket falhou (${resp.status}): ${out}`);
  }
}
```

## Checklist rapido para levar para outro projeto

1. Criar tabela/config de `Settings` com os campos acima.
2. Criar funcao unica para envio Whaticket (`sendWhaticketMessage`).
3. Criar templates editaveis no painel admin.
4. Implementar fluxo de mensagens:
   - aviso admin
   - agradecimento convidado
   - chave PIX separada
   - titular separado
5. Tratar erros da API externa sem derrubar operacao principal (log + retorno controlado).
6. Expor erros legiveis para o frontend.

## Troubleshooting

- `403`/`401`: token invalido/expirado ou sem permissao.
- `400`: payload invalido (numero, userId/queueId, body vazio).
- Nao chega mensagem:
  - confirme formato do numero (`55 + DDD + numero`)
  - valide URL da API
  - teste manual com endpoint de teste
- Mensagem com placeholders sem substituir:
  - conferir se o template possui placeholders corretos
  - conferir se os dados estao preenchidos no backend

## Seguranca

- Nunca expor `whaticketToken` em endpoint publico.
- Em respostas publicas (`/api/settings`), retornar somente dados nao sensiveis.
- Armazenar token em banco/segredo com acesso restrito.

