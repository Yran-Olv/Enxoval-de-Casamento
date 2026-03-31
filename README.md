# 🎁 Nosso Enxoval (Tais & Yran)

Site de lista de casamento onde convidados escolhem presentes e os noivos gerenciam tudo em um painel.

---

# 🚀 INSTALAÇÃO RÁPIDA (PRODUÇÃO COM DOCKER)

> Siga exatamente esses passos — sem pular.

---

## ✅ 1. Entrar no projeto

```bash
cd /home/deploy/taiseyran
```

---

## ✅ 2. Criar o `.env`

```bash
cp .env.docker.example .env
nano .env
```

### ✏️ Edite apenas isso:

```env
APP_URL=http://IP-DO-SERVIDOR
PORT=3010

DB_PASS=devlocal

JWT_SECRET=cole_um_secret_aqui
ADMIN_PASSWORD=123456
```

### 📄 `.env` completo (produção com Docker)

```env
# URL pública do site (com https quando tiver domínio/SSL)
APP_URL=https://taiseyran.com.br

# Porta no host (container app escuta em 3000 internamente)
PORT=3010

# Banco (docker-compose usa DB_HOST=db internamente)
DB_DIALECT=postgres
DB_USER=enxoval
DB_PASS=defina_uma_senha_forte
DB_NAME=enxoval
DB_PORT=5432

# Autenticação
JWT_SECRET=gere_com_openssl_rand_hex_32
ADMIN_PASSWORD=defina_uma_senha_forte
# Opcional: se não definir, usa sistemazapzap@gmail.com
# ADMIN_EMAIL=sistemazapzap@gmail.com
```

### 🔐 Gerar JWT_SECRET:
```bash
openssl rand -hex 32
```

---

## ⚠️ IMPORTANTE
- NÃO use `:` → use `=`
- NÃO deixe vazio
- NÃO use caracteres estranhos na senha

---

## ✅ 3. Subir o projeto

```bash
docker compose up -d --build
```

👉 Aguarde (primeira vez demora)

---

## ✅ 4. Acessar o site

http://IP-DO-SERVIDOR:3010

---

## 🔐 Login admin

- Email: sistemazapzap@gmail.com  
- Senha: a que você colocou em ADMIN_PASSWORD

---

# 🌐 COLOCAR DOMÍNIO + HTTPS

## ✅ 1. Configurar DNS

Criar registros:

Tipo: A  
Nome: @  
Valor: IP_DO_SERVIDOR  

Tipo: A  
Nome: www  
Valor: IP_DO_SERVIDOR  

---

## ✅ 2. Instalar Nginx + Certbot

```bash
apt update
apt install -y nginx certbot python3-certbot-nginx
```

---

## ✅ 3. Ativar configuração do site

```bash
cd /home/deploy/taiseyran

sudo cp deploy/nginx-taiseyran-com-br.conf /etc/nginx/sites-available/taiseyran
sudo ln -s /etc/nginx/sites-available/taiseyran /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default

sudo nginx -t
sudo systemctl restart nginx
```

---

## ✅ 4. Gerar SSL

```bash
certbot --nginx -d taiseyran.com.br -d www.taiseyran.com.br --redirect -m seu@email.com --agree-tos --non-interactive
```

---

## ✅ 5. Atualizar `.env`

```bash
nano .env
```

Trocar:

APP_URL=https://taiseyran.com.br

---

## ✅ 6. Reiniciar

```bash
docker compose up -d
```

---

# 🛠️ COMANDOS ÚTEIS

```bash
docker compose ps
docker compose logs -f
docker compose down
docker compose up -d --build
```

---

# 💻 MODO DESENVOLVIMENTO (PC)

```bash
docker compose -f docker-compose.dev.yml up -d
```

Depois:

```bash
npm install
npm run db:migrate
npm run dev
```

Abrir:
http://localhost:3000

### 📄 `.env` completo (desenvolvimento local)

```env
# Se usar docker-compose.dev.yml:
# usuário: enxoval | senha: devlocal | porta: 5433
DATABASE_URL=postgresql://enxoval:devlocal@127.0.0.1:5433/enxoval?schema=public

JWT_SECRET=dev_altere_em_producao
ADMIN_PASSWORD=admin123
# Opcional:
# ADMIN_EMAIL=sistemazapzap@gmail.com

PORT=3000
```

---

# 📱 ANDROID E iOS (CAPACITOR)

Para gerar aplicativo nativo (Play Store / App Store), use Capacitor.

## ✅ 1. Definir API para o app

No app mobile, não existe o mesmo domínio do servidor web.  
Então a API deve ser absoluta:

```bash
cp .env.mobile.example .env.mobile
nano .env.mobile
```

Exemplo:

```env
VITE_API_URL=https://taiseyran.com.br
```

### 📄 `.env.mobile` completo

```env
# URL base da API em produção (sem /api no final)
VITE_API_URL=https://taiseyran.com.br
```

## ✅ 2. Build web + sync nativo

```bash
npm install
npm run mobile:sync
```

Isso gera `dist/` e sincroniza com Android/iOS.

## ✅ 3. Android

```bash
npx cap add android
npm run mobile:android
```

No Android Studio:
- espere o Gradle terminar
- rode no emulador/dispositivo
- para release, gere `AAB` (Build > Generate Signed Bundle/APK)

## ✅ 4. iOS (somente macOS)

```bash
npx cap add ios
npm run mobile:ios
```

No Xcode:
- configure Team/Signing
- rode no simulador/iPhone
- para release, Archive e envie ao App Store Connect

## ⚠️ Observações

- Login via cookie pode exigir HTTPS e ajustes de SameSite no iOS/Android.
- Se preferir, migre autenticação para JWT em header no app mobile.
- Sempre que alterar front-end, rode novamente:

```bash
npm run mobile:sync -- --mode mobile
npm run mobile:sync
```

---

# ⚠️ ERROS COMUNS

### DB_PASS faltando
DB_PASS=devlocal

---

### DNS não funciona

```bash
nano /etc/resolv.conf
```

Adicionar:
nameserver 8.8.8.8  
nameserver 1.1.1.1  

---

### Porta ocupada
PORT=8080

---

### Token do Whaticket

O token **não é criado neste site**.  
Você precisa configurar no painel do Whaticket:

1. **Conexões**
2. **Editar** a conexão que envia mensagens
3. Preencher/salvar o **Token**

Depois, no nosso painel (`/admin` → Configurações), cole no campo **Token Whaticket** e clique em **Salvar Configurações**.

---

### Erro de banco (Prisma)

```bash
sudo -u postgres psql
```

```sql
ALTER USER enxoval WITH PASSWORD 'devlocal';
ALTER USER enxoval CREATEDB;
```

---

# ✅ PRONTO

Se seguir isso exatamente:
- funciona
- sobe
- SSL ok