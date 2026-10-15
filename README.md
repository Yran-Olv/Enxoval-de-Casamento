# Nosso Enxoval (Tais & Yran)

Plataforma de casamento com convite online, contagem regressiva, confirmação de presença (RSVP), lista de presentes, acompanhamento do enxoval e painel administrativo.

---

## Índice

1. [Requisitos](#requisitos)
2. [Produção com Docker](#produção-com-docker)
3. [Domínio e HTTPS (Nginx + Certbot)](#domínio-e-https-nginx--certbot)
4. [Atualizar em produção](#atualizar-em-produção)
5. [Comandos úteis (Docker)](#comandos-úteis-docker)
6. [Painel administrativo](#painel-administrativo)
7. [App Android / iOS (Capacitor)](#app-android--ios-capacitor)
8. [Desenvolvimento local](#desenvolvimento-local)
9. [Convite online e confirmações](#convite-online-e-confirmações)
10. [Problemas frequentes](#problemas-frequentes)

---

## Requisitos

- Docker e Docker Compose no servidor
- Domínio apontando para o IP (opcional, para HTTPS)
- Repositório clonado no servidor (ex.: `/home/deploy/taiseyran`)

---

## Produção com Docker

### 1. Entrar na pasta do projeto

```bash
cd /home/deploy/taiseyran
```

### 2. Criar o `.env`

Crie o arquivo `.env` na raiz (pode copiar de um modelo se existir no repositório) e preencha as variáveis abaixo.

**Mínimo para começar:**

```env
APP_URL=http://IP-DO-SERVIDOR
PORT=3010
DB_PASS=gere_uma_senha_forte_para_o_banco
JWT_SECRET=gere_com_openssl_rand_hex_32
ADMIN_PASSWORD=gere_uma_senha_forte_para_o_painel
```

Gerar `JWT_SECRET`:

```bash
openssl rand -hex 32
```

**Exemplo completo (produção via `docker-compose.yml`):**

```env
APP_URL=https://taiseyran.com.br
PORT=3010

DB_DIALECT=postgres
DB_USER=enxoval
DB_PASS=gere_uma_senha_forte_para_o_banco
DB_NAME=enxoval
DB_PORT=5432

JWT_SECRET=gere_com_openssl_rand_hex_32
ADMIN_PASSWORD=gere_uma_senha_forte_para_o_painel
ADMIN_EMAIL=seu-email@exemplo.com
```

Opcional: em vez de `DB_*`, pode usar uma única linha `DATABASE_URL` (não é obrigatório no Compose atual).

**Segurança:** gere `JWT_SECRET` com `openssl rand -hex 32`, use senhas diferentes e fortes para banco e painel e não reutilize os exemplos literalmente. Em produção, o servidor recusa iniciar se `JWT_SECRET` tiver menos de 32 caracteres. Não publique o arquivo `.env`.

### 3. Subir os containers

```bash
docker compose up -d --build
```

Na primeira vez o build pode demorar. O container da aplicação aplica migrações do Prisma ao iniciar (`docker/entrypoint.sh`).

> **Atenção:** `docker compose down -v` apaga o volume do PostgreSQL. Use só se quiser **zerar o banco** de propósito.

### 4. Acessar

- Site: `http://IP-DO-SERVIDOR:3010` (ou a porta definida em `PORT`)
- Admin: `/admin`

**Login inicial:** e-mail conforme `ADMIN_EMAIL` (padrão documentado no projeto) e senha `ADMIN_PASSWORD`.

---

## Domínio e HTTPS (Nginx + Certbot)

### DNS

| Tipo | Nome | Valor        |
|------|------|--------------|
| A    | @    | IP do servidor |
| A    | www  | IP do servidor |

### Nginx e Certbot

```bash
apt update
apt install -y nginx certbot python3-certbot-nginx
```

Ativar site (ajuste caminho e nome do arquivo conforme o repositório):

```bash
cd /home/deploy/taiseyran

sudo cp deploy/nginx-taiseyran-com-br.conf /etc/nginx/sites-available/taiseyran
sudo ln -sf /etc/nginx/sites-available/taiseyran /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default

sudo nginx -t
sudo systemctl restart nginx
```

SSL:

```bash
certbot --nginx -d taiseyran.com.br -d www.taiseyran.com.br --redirect -m seu@email.com --agree-tos --non-interactive
```

Atualize o `.env`:

```env
APP_URL=https://taiseyran.com.br
```

Reinicie a aplicação:

```bash
docker compose up -d
```

---

## Atualizar em produção

Após enviar alterações para o GitHub:

```bash
cd /home/deploy/taiseyran
git pull origin main
docker compose up -d --build
```

### Migrações novas (tabelas/colunas)

O mesmo fluxo acima basta: ao subir, o entrypoint executa `migrate deploy`. Confira os logs:

```bash
docker compose logs -f app
```

**Fluxo recomendado para mudanças no schema:**

1. No ambiente de desenvolvimento: alterar `prisma/schema.prisma` e gerar migration.
2. Commitar a pasta `prisma/migrations` e fazer push.
3. Em produção: `git pull` + `docker compose up -d --build`.

Exemplo local para criar migration (ajuste `DATABASE_URL` ao seu Postgres):

```bash
DATABASE_URL="postgresql://enxoval:yrandev@127.0.0.1:5432/enxoval?schema=public" npm run db:migrate
docker compose exec app sh -c 'DATABASE_URL="postgresql://enxoval:yrandev@db:5432/enxoval?schema=public" npm run db:migrate'
```

### Conflito no `git pull` (“local changes would be overwritten”)

```bash
git stash push -u -m "temp-prod"
git pull origin main
# depois, se não precisar do stash:
git stash drop
```

---

## Comandos úteis (Docker)

```bash
docker compose ps
docker compose logs -f app
docker compose down
docker compose up -d --build
```

---

## Variáveis de ambiente

O modelo está em `.env.example`. Em produção, `JWT_SECRET` precisa ter pelo menos 32 caracteres e `ADMIN_PASSWORD` não pode ficar vazio: sem isso o processo não aceita o login de ambiente. O cookie de sessão usa `SameSite=Lax` no site servido pelo Nginx. Defina `COOKIE_SAMESITE=none` só se o app Capacitor chamar a API a partir de outra origem.

`scripts/seedEnxoval.ts` é local e está no `.gitignore`. Não coloque senha, PIX ou telefone reais nesse arquivo e não faça commit dele.

## Painel administrativo

- **Enxoval / Comprados / Presentes reservados:** cadastro, edição, métricas e acompanhamento de presentes.
- **Confirmações:** lista de RSVPs, WhatsApp dos convidados, quantidade de pessoas confirmadas e recusas.
- **Configurações:** conta admin, dados do casal, data e horário do casamento, locais e endereços da cerimônia/recepção, traje, texto do convite, prazo de confirmação, PIX, WhatsApp e backup.
- **WhatsApp:** URL da API (ex.: `https://api.whaticketup.com.br/api/messages/send`), número de destino, chave da API e template de mensagem. Cada instalação pode apontar para um Whaticket diferente.
- **Backup:** exportar/importar JSON (lista, reservas, comprados, configurações, usuários) para migrar VPS ou clonar para outro cliente.
- **Guia técnico da integração WhatsApp:** veja `docs/WHATSAPP_API.md` para reutilizar em outros projetos.

---

## App Android / iOS (Capacitor)

O front pode ser empacotado com Capacitor. A API no mobile precisa ser absoluta.

1. Criar `.env.mobile` (ex.: `cp .env.mobile.example .env.mobile`):

```env
VITE_API_URL=https://taiseyran.com.br
```

2. Build e sync:

```bash
npm install
npm run mobile:sync
```

3. **Android (primeira vez):**

```bash
npx cap add android
npm run mobile:android
```

4. **iOS (macOS):**

```bash
npx cap add ios
npm run mobile:ios
```

Após mudanças no front: `npm run mobile:sync` de novo.

---

## Desenvolvimento local

Postgres opcional via Docker:

```bash
docker compose -f docker-compose.dev.yml up -d
```

No `.env` local, aponte `DATABASE_URL` para o Postgres (ex.: porta `5433` conforme `docker-compose.dev.yml`).

```bash
npm install
npm run db:migrate
npm run dev
npm test
npm run lint
npm run build
```

Abrir: `http://localhost:3000`

---

## Convite online e confirmações

- A página pública do convite fica em `/convite` (por exemplo, `https://seu-dominio.com/convite`).
- No painel `/admin`, abra **Configurações → Geral / PIX** para definir data, horário, mensagem, locais, endereços, traje, prazo de RSVP e, se quiser, a história do casal. A história só aparece no convite quando o campo tem texto.
- Os convidados podem responder **Estarei presente** ou **Não poderei ir**. A confirmação registra nome, WhatsApp, número de pessoas e recado. Uma nova resposta com o mesmo WhatsApp atualiza a anterior. Os dados aparecem só na aba **Confirmações**; não há listagem pública.
- Compartilhar copia ou envia a URL real do navegador (`origem/convite`).
- Os endereços geram links do Google Maps. Google Agenda e o arquivo `.ics` usam o horário de parede em `America/Sao_Paulo`, sem converter a cerimônia para UTC.
- O casal pode apagar uma resposta no painel. As confirmações entram no backup JSON. Faça um backup antes de importar outro arquivo: a importação substitui os dados atuais.
- Reservar um presente não significa que o PIX foi pago. O aviso de PIX só registra a intenção enviada pelo convidado.

Depois de atualizar o código em um servidor que já está no ar:

```bash
git pull origin main
docker compose -f docker-compose.prod.yml up -d --build
```

O entrypoint aplica as migrações, inclusive a que torna o WhatsApp da confirmação único e adiciona a história do casal. Não apague o volume do Postgres.

---

## Problemas frequentes

### `DB_PASS` / variáveis obrigatórias

O `docker-compose.yml` exige `DB_PASS` (e demais variáveis indicadas no compose). Verifique o `.env`.

### DNS não resolve

```bash
sudo nano /etc/resolv.conf
```

Exemplo: `nameserver 8.8.8.8` e `nameserver 1.1.1.1`.

### Porta em uso

Altere `PORT` no `.env` (ex.: `8080`).

### WhatsApp / Whaticket retorna 403 (token inválido)

Gere um token válido no painel do Whaticket (conexão) e salve no admin. Confirme a **URL da API** correta para aquela instância e o número no formato internacional (ex.: `5585999999999`).

### Erro de conexão com PostgreSQL (Prisma)

Ajuste usuário/senha no Postgres ou no `.env`. Exemplo em servidor com Postgres nativo:

```bash
sudo -u postgres psql
```

```sql
ALTER USER enxoval WITH PASSWORD 'sua_senha';
```

---

## Repositório

Código: [Yran-Olv/Enxoval-de-Casamento](https://github.com/Yran-Olv/Enxoval-de-Casamento)
