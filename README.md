# Nosso Enxoval (Tais & Yran)

Site de lista de casamento: convidados reservam presentes e o casal gerencia enxoval, comprados, reservas e configurações no painel administrativo.

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
9. [Problemas frequentes](#problemas-frequentes)

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
DB_PASS=yrandev
JWT_SECRET=cole_um_secret_gerado
ADMIN_PASSWORD=yrandev
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
DB_PASS=yrandev
DB_NAME=enxoval
DB_PORT=5432

JWT_SECRET=gere_com_openssl_rand_hex_32
ADMIN_PASSWORD=yrandev
ADMIN_EMAIL=sistemazapzap@gmail.com
```

Opcional: em vez de `DB_*`, pode usar uma única linha `DATABASE_URL` (não é obrigatório no Compose atual).

**Regras:** use `=` nas variáveis; não deixe valores obrigatórios vazios; evite caracteres estranhos nas senhas.

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

## Painel administrativo

- **Enxoval / Comprados / Reservas:** CRUD e métricas do enxoval.
- **Configurações:** sub-abas — Conta admin, Geral/PIX, WhatsApp, Backup.
- **WhatsApp:** URL da API (ex.: `https://api.whaticketup.com.br/api/messages/send`), número de destino, chave da API e template de mensagem. Cada instalação pode apontar para um Whaticket diferente.
- **Backup:** exportar/importar JSON (lista, reservas, comprados, configurações, usuários) para migrar VPS ou clonar para outro cliente.

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
```

Abrir: `http://localhost:3000`

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
